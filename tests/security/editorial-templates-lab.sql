\ir planning-foundation-lab.sql
\ir ../../supabase/migrations/20261023003335_planning_reusable_editorial_templates.sql
CREATE FUNCTION lab_template_slot(p_id uuid,p_position integer DEFAULT 2) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('id',p_id,'position',p_position,'title','','guidance','','pillar_id',NULL,'series_id',NULL,'campaign_id',NULL,
  'objective','','funnel','','format',NULL,'priority','main','recurrence','every_cycle','quantity',1,'destinations','[]'::jsonb,'is_active',true)
$$;
CREATE FUNCTION lab_template_input(p_slots jsonb DEFAULT '[]',p_positions integer DEFAULT 14) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('name','Modelo fictício','notes','','position_count',p_positions,'slots',p_slots,'is_active',true)
$$;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',false);
SELECT save_client_editorial_template('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000101',0,lab_template_input());
SELECT lab_assert('empty relative template has no date obligation',(SELECT position_count=14 AND slots='[]' AND revision=1 FROM client_editorial_templates));
SELECT lab_assert('first immutable version exists',(SELECT count(*)=1 FROM client_editorial_template_revisions));
SELECT save_client_editorial_template('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000101',1,
 lab_template_input(jsonb_build_array(lab_template_slot('00000000-0000-0000-0000-000000000201'),lab_template_slot('00000000-0000-0000-0000-000000000202')||'{"priority":"optional","funnel":"institucional"}')));
SELECT lab_assert('two slots in one position kept in order',(SELECT jsonb_array_length(slots)=2 AND slots->0->>'id'='00000000-0000-0000-0000-000000000201' FROM client_editorial_templates));
SELECT lab_assert('old version unchanged',(SELECT snapshot->'slots'='[]' FROM client_editorial_template_revisions WHERE revision=1));
SELECT lab_denied('stale model revision rejected',$s$SELECT save_client_editorial_template('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000101',1,lab_template_input())$s$);
SELECT lab_denied('cannot forge model directly',$s$UPDATE client_editorial_templates SET name='Forbidden'$s$);
SELECT lab_denied('cannot forge model history',$s$UPDATE client_editorial_template_revisions SET snapshot='{}'$s$);
SELECT lab_denied('out of range positions rejected',$s$SELECT save_client_editorial_template('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000101',2,lab_template_input(jsonb_build_array(lab_template_slot('00000000-0000-0000-0000-000000000201',15))))$s$);
SELECT lab_denied('duplicate slots rejected',$s$SELECT save_client_editorial_template('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000101',2,lab_template_input(jsonb_build_array(lab_template_slot('00000000-0000-0000-0000-000000000201'),lab_template_slot('00000000-0000-0000-0000-000000000201'))))$s$);
SELECT lab_denied('invalid content format rejected',$s$SELECT save_client_editorial_template('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000101',2,lab_template_input(jsonb_build_array(lab_template_slot('00000000-0000-0000-0000-000000000201')||'{"format":"static_post"}')))$s$);
SELECT lab_denied('zero quantity rejected',$s$SELECT save_client_editorial_template('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000101',2,lab_template_input(jsonb_build_array(lab_template_slot('00000000-0000-0000-0000-000000000201')||'{"quantity":0}')))$s$);
SELECT lab_denied('foreign client pillar rejected',$s$SELECT save_client_editorial_template('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000101',2,lab_template_input(jsonb_build_array(lab_template_slot('00000000-0000-0000-0000-000000000201')||'{"pillar_id":"00000000-0000-0000-0000-000000000042"}')))$s$);
SELECT lab_denied('nonexistent series rejected',$s$SELECT save_client_editorial_template('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000101',2,lab_template_input(jsonb_build_array(lab_template_slot('00000000-0000-0000-0000-000000000201')||'{"series_id":"00000000-0000-0000-0000-000000000999"}')))$s$);
SELECT lab_denied('nonexistent campaign rejected',$s$SELECT save_client_editorial_template('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000101',2,lab_template_input(jsonb_build_array(lab_template_slot('00000000-0000-0000-0000-000000000201')||'{"campaign_id":"00000000-0000-0000-0000-000000000999"}')))$s$);
SELECT lab_denied('duplicate normalized destinations rejected',$s$SELECT save_client_editorial_template('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000101',2,lab_template_input(jsonb_build_array(lab_template_slot('00000000-0000-0000-0000-000000000201')||'{"destinations":[{"channel":"instagram","profile":" @A "},{"channel":"instagram","profile":"@a"}]}')))$s$);
SELECT lab_assert('invalid payloads do not change current or history',(SELECT revision=2 FROM client_editorial_templates) AND (SELECT count(*)=2 FROM client_editorial_template_revisions));
SELECT save_client_editorial_template('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000101',2,
 lab_template_input(jsonb_build_array(lab_template_slot('00000000-0000-0000-0000-000000000201')||'{"pillar_id":"00000000-0000-0000-0000-000000000041","destinations":[{"channel":"instagram","profile":"@a"},{"channel":"instagram","profile":"@b"}]}'))||'{"is_active":false}');
SELECT lab_assert('archive keeps model slots and versions',(SELECT NOT is_active AND jsonb_array_length(slots)=1 AND revision=3 FROM client_editorial_templates) AND (SELECT count(*)=3 FROM client_editorial_template_revisions));
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000012',false);
SELECT lab_assert('foreign admin cannot read templates or history',(SELECT count(*)=0 FROM client_editorial_templates) AND (SELECT count(*)=0 FROM client_editorial_template_revisions));
SELECT lab_denied('foreign client cannot overwrite known template id',$s$SELECT save_client_editorial_template('00000000-0000-0000-0000-000000000022','00000000-0000-0000-0000-000000000101',3,lab_template_input())$s$);
SELECT lab_denied('foreign admin cannot operate first client',$s$SELECT save_client_editorial_template('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000101',3,lab_template_input())$s$);
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000013',false);
SELECT lab_assert('assigned view can read only own model',(SELECT count(*)=1 FROM client_editorial_templates));
SELECT lab_denied('view cannot save model',$s$SELECT save_client_editorial_template('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000101',3,lab_template_input())$s$);
RESET ROLE;
SET ROLE anon;
SELECT lab_denied('anon cannot call template rpc',$s$SELECT save_client_editorial_template(NULL,NULL,0,'{}')$s$);
SELECT lab_denied('anon cannot read model history',$s$SELECT * FROM client_editorial_template_revisions$s$);
RESET ROLE;
SELECT lab_assert('two templates tables have RLS',(SELECT count(*)=2 FROM pg_class WHERE relname IN ('client_editorial_templates','client_editorial_template_revisions') AND relrowsecurity));
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','',false);
SELECT lab_assert('no identity cannot read models',(SELECT count(*)=0 FROM client_editorial_templates));
SELECT lab_denied('no identity cannot save model',$s$SELECT save_client_editorial_template('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000101',3,lab_template_input())$s$);
RESET ROLE;
UPDATE workspace_members SET status='suspended' WHERE user_id='00000000-0000-0000-0000-000000000011';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',false);
SELECT lab_denied('suspended membership cannot save model',$s$SELECT save_client_editorial_template('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000101',3,lab_template_input())$s$);
RESET ROLE;
UPDATE workspace_members SET status='active' WHERE user_id='00000000-0000-0000-0000-000000000011';
UPDATE workspaces SET status='suspended' WHERE id='00000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
SELECT lab_denied('suspended workspace cannot save model',$s$SELECT save_client_editorial_template('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000101',3,lab_template_input())$s$);
RESET ROLE;
UPDATE workspaces SET status='active' WHERE id='00000000-0000-0000-0000-000000000001';
