\ir editorial-templates-lab.sql
-- Completa o fixture mínimo com as colunas/constraints de Contents observadas no remoto.
CREATE FUNCTION cycle_id(n integer) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$ SELECT ('10000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid $$;
ALTER TABLE contents ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE contents ADD COLUMN internal_title text NOT NULL DEFAULT 'Peça fictícia', ADD COLUMN format text NOT NULL DEFAULT 'feed_single',
 ADD COLUMN primary_channel text NOT NULL DEFAULT 'instagram', ADD COLUMN goal text, ADD COLUMN funnel_stage text, ADD COLUMN copy text,
 ADD COLUMN caption text, ADD COLUMN visual_copy text, ADD COLUMN script text, ADD COLUMN planned_date date, ADD COLUMN notes text, ADD COLUMN editorial_status text NOT NULL DEFAULT 'draft',
 ADD COLUMN assigned_to uuid REFERENCES profiles, ADD COLUMN created_at timestamptz DEFAULT now(), ADD COLUMN updated_at timestamptz DEFAULT now();
ALTER TABLE contents ADD CONSTRAINT contents_format_check CHECK(format IN ('feed_single','carousel','reels','story')),
 ADD CONSTRAINT contents_primary_channel_check CHECK(primary_channel IN ('instagram','facebook','linkedin','tiktok','youtube','blog','newsletter')),
 ADD CONSTRAINT contents_funnel_stage_check CHECK(funnel_stage IN ('topo','meio','fundo'));
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access to contents" ON contents FOR ALL USING (EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin'));
GRANT SELECT,INSERT,UPDATE,DELETE ON contents TO authenticated;
\ir ../../supabase/migrations/20261024015103_planning_cycle_content_execution.sql
CREATE FUNCTION cycle_apply(p_plan uuid DEFAULT '00000000-0000-0000-0000-000000000051') RETURNS jsonb LANGUAGE sql AS $$
 SELECT apply_editorial_template('00000000-0000-0000-0000-000000000021',p_plan,'00000000-0000-0000-0000-000000000101',3)
$$;
CREATE FUNCTION cycle_resolve(p_unit integer DEFAULT 1,p_existing uuid DEFAULT NULL,p_input jsonb DEFAULT '{"internal_title":"Peça da vaga","format":"reels","editorial_status":"draft","primary_channel":null,"funnel_stage":"relacionamento"}') RETURNS jsonb LANGUAGE sql AS $$
 SELECT resolve_editorial_slot_content('00000000-0000-0000-0000-000000000021',
 (SELECT id FROM editorial_cycle_applications WHERE editorial_plan_id='00000000-0000-0000-0000-000000000051'),
 '00000000-0000-0000-0000-000000000201',p_unit,p_existing,p_input)
$$;
UPDATE editorial_plans SET status='draft';
INSERT INTO contents(id,client_id) VALUES(cycle_id(1),'00000000-0000-0000-0000-000000000021'),(cycle_id(2),'00000000-0000-0000-0000-000000000022');
-- Quantidade três e dois destinos, sem produzir três cópias por canal.
UPDATE client_editorial_templates SET slots=jsonb_build_array(lab_template_slot('00000000-0000-0000-0000-000000000201')||'{"quantity":3,"destinations":[{"channel":"instagram","profile":"a"},{"channel":"whatsapp","profile":"b"}]}'),is_active=true WHERE id='00000000-0000-0000-0000-000000000101';
SET ROLE authenticated;
SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000011';
SELECT lab_assert('content owner cannot read foreign workspace',(SELECT count(*)=0 FROM contents WHERE id=cycle_id(2)));
WITH changed AS (UPDATE contents SET internal_title='foreign' WHERE id=cycle_id(2) RETURNING id) SELECT lab_assert('foreign update changes no rows',count(*)=0) FROM changed;
SELECT lab_denied('owner cannot insert foreign content',$s$INSERT INTO contents(client_id) VALUES('00000000-0000-0000-0000-000000000022')$s$);
SELECT lab_denied('owner cannot move content to foreign client',$s$UPDATE contents SET client_id='00000000-0000-0000-0000-000000000022' WHERE id=cycle_id(1)$s$);
SELECT lab_denied('cannot apply to foreign cycle',$s$SELECT cycle_apply('00000000-0000-0000-0000-000000000052')$s$);
SELECT lab_denied('stale template rejected',$s$SELECT apply_editorial_template('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000051','00000000-0000-0000-0000-000000000101',2)$s$);
SELECT cycle_apply();
SELECT cycle_apply();
SELECT lab_assert('retry applies model once',(SELECT count(*)=1 FROM editorial_cycle_applications));
SELECT lab_assert('apply creates no real pieces',(SELECT count(*)=1 FROM contents));
SELECT lab_assert('snapshot retains two destinations',(SELECT jsonb_array_length(snapshot->'slots'->0->'destinations')=2 FROM editorial_cycle_applications));
SELECT lab_denied('cannot edit snapshot directly',$s$UPDATE editorial_cycle_applications SET snapshot='{}'$s$);
SELECT lab_denied('invalid unit rejected',$s$SELECT cycle_resolve(4)$s$);
SELECT cycle_resolve();
SELECT cycle_resolve();
SELECT lab_assert('double request creates one piece',(SELECT count(*)=2 FROM contents));
SELECT lab_assert('one piece keeps multiple destinations in snapshot',(SELECT count(*)=1 FROM editorial_cycle_content_links));
SELECT lab_assert('no automatic date or default channel',(SELECT planned_date IS NULL AND primary_channel IS NULL AND funnel_stage='relacionamento' FROM contents WHERE id=(SELECT content_id FROM editorial_cycle_content_links)));
SELECT lab_reject('invalid format rolls back whole creation',$s$SELECT cycle_resolve(2,NULL,'{"internal_title":"Invalid","format":"invalid","editorial_status":"draft"}')$s$,'23514');
SELECT lab_assert('failed creation leaves unit available',(SELECT count(*)=1 FROM editorial_cycle_content_links));
SELECT lab_denied('foreign existing piece rejected',$s$SELECT cycle_resolve(2,cycle_id(2),NULL)$s$);
SELECT cycle_resolve(2,cycle_id(1),NULL);
SELECT lab_assert('existing piece adopted by cycle',(SELECT editorial_plan_id='00000000-0000-0000-0000-000000000051' FROM contents WHERE id=cycle_id(1)));
SELECT lab_denied('cannot replace occupied unit',$s$SELECT cycle_resolve(1,cycle_id(1),NULL)$s$);
SELECT lab_reject('one piece cannot fill two units',$s$SELECT cycle_resolve(3,cycle_id(1),NULL)$s$,'23505');
SELECT lab_denied('linked content cannot change cycle',$s$UPDATE contents SET editorial_plan_id=NULL WHERE id=cycle_id(1)$s$);
UPDATE contents SET internal_title='Título final' WHERE id=cycle_id(1);
SELECT lab_assert('normal content editing stays available',(SELECT internal_title='Título final' FROM contents WHERE id=cycle_id(1)));
SELECT lab_reject('linked content history prevents deletion',$s$DELETE FROM contents WHERE id=cycle_id(1)$s$,'23503');
RESET ROLE;
UPDATE client_editorial_templates SET name='Alterado',slots='[]' WHERE id='00000000-0000-0000-0000-000000000101';
SET ROLE authenticated;
SELECT lab_assert('model changes do not rewrite cycle',(SELECT jsonb_array_length(snapshot->'slots')=1 AND snapshot->>'name'<>'Alterado' FROM editorial_cycle_applications));
INSERT INTO editorial_plans(id,client_id,title,start_date,end_date) VALUES(cycle_id(3),'00000000-0000-0000-0000-000000000021','Sem datas',NULL,NULL);
SELECT lab_reject('one-sided cycle dates rejected',$s$INSERT INTO editorial_plans(client_id,title,start_date) VALUES('00000000-0000-0000-0000-000000000021','Incompleto','2026-10-23')$s$,'23514');
SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000012';
SELECT lab_assert('reciprocal workspace isolation',(SELECT count(*)=1 FROM contents));
SELECT lab_assert('reciprocal snapshot isolation',(SELECT count(*)=0 FROM editorial_cycle_applications));
RESET ROLE;
INSERT INTO workspace_member_permissions VALUES('00000000-0000-0000-0000-000000000033','contents','view');
SET ROLE authenticated;
SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000013';
SELECT lab_assert('assigned member sees own client pieces',(SELECT count(*)=2 FROM contents));
SELECT lab_denied('view member cannot create',$s$INSERT INTO contents(client_id) VALUES('00000000-0000-0000-0000-000000000021')$s$);
SELECT lab_denied('planning operation cannot bypass contents view',$s$SELECT cycle_resolve(3)$s$);
RESET ROLE;
UPDATE workspace_member_permissions SET access_level='operation' WHERE permission_key='contents';
UPDATE workspace_member_permissions SET access_level='operation' WHERE permission_key='planning';
SET ROLE authenticated;
SELECT cycle_resolve(3,NULL,'{"internal_title":"Terceira","format":"story","editorial_status":"draft","primary_channel":"whatsapp"}');
SELECT lab_assert('member may operate with both permissions',(SELECT count(*)=3 FROM editorial_cycle_content_links));
WITH deleted AS (DELETE FROM contents WHERE client_id='00000000-0000-0000-0000-000000000021' RETURNING id) SELECT lab_assert('operation does not grant management delete',count(*)=0) FROM deleted;
RESET ROLE;
UPDATE workspace_members SET status='suspended' WHERE user_id='00000000-0000-0000-0000-000000000011';
SET ROLE authenticated;
SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000011';
SELECT lab_assert('suspended global admin cannot read contents',(SELECT count(*)=0 FROM contents));
SELECT lab_denied('suspended global admin cannot use create rpc',$s$SELECT cycle_resolve()$s$);
RESET ROLE;
UPDATE workspace_members SET status='active';
UPDATE workspaces SET status='suspended' WHERE id='00000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
SELECT lab_assert('inactive workspace hides contents',(SELECT count(*)=0 FROM contents));
SET request.jwt.claim.sub='';
SELECT lab_assert('identity missing hides contents',(SELECT count(*)=0 FROM contents));
RESET ROLE;
SET ROLE anon;
SELECT lab_denied('anon cannot apply model',$s$SELECT apply_editorial_template(NULL,NULL,NULL,1)$s$);
SELECT lab_denied('anon cannot resolve unit',$s$SELECT resolve_editorial_slot_content(NULL,NULL,NULL,1)$s$);
RESET ROLE;
UPDATE workspaces SET status='active';
UPDATE client_editorial_templates SET slots=(SELECT snapshot->'slots' FROM editorial_cycle_applications WHERE editorial_plan_id='00000000-0000-0000-0000-000000000051');
INSERT INTO editorial_plans(id,client_id,title,status) VALUES(cycle_id(4),'00000000-0000-0000-0000-000000000021','Validações','draft'),(cycle_id(5),'00000000-0000-0000-0000-000000000021','Encerrado','archived');
SET ROLE authenticated;
SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000011';
SELECT lab_denied('archived cycle cannot receive model',$s$SELECT cycle_apply(cycle_id(5))$s$);
SELECT cycle_apply(cycle_id(4));
CREATE FUNCTION pg_temp.cycle_validate(p_input jsonb) RETURNS jsonb LANGUAGE sql AS $$
 SELECT resolve_editorial_slot_content('00000000-0000-0000-0000-000000000021',(SELECT id FROM editorial_cycle_applications WHERE editorial_plan_id=cycle_id(4)),
 '00000000-0000-0000-0000-000000000201',1,NULL,'{"internal_title":"Validação","format":"reels","editorial_status":"draft"}'::jsonb||p_input)
$$;
SELECT lab_denied('client cannot be forged through payload',$s$SELECT pg_temp.cycle_validate('{"client_id":"00000000-0000-0000-0000-000000000022"}')$s$);
SELECT lab_denied('foreign pillar rejected before content creation',$s$SELECT pg_temp.cycle_validate('{"pillar_id":"00000000-0000-0000-0000-000000000042"}')$s$);
SELECT lab_denied('foreign assignee rejected',$s$SELECT pg_temp.cycle_validate('{"assigned_to":"00000000-0000-0000-0000-000000000012"}')$s$);
SELECT lab_denied('relative text cannot become a civil date',$s$SELECT pg_temp.cycle_validate('{"planned_date":"tomorrow"}')$s$);
SELECT lab_denied('new piece cannot start approved',$s$SELECT pg_temp.cycle_validate('{"editorial_status":"approved"}')$s$);
SELECT lab_denied('other cycle content is not silently moved',$s$SELECT resolve_editorial_slot_content('00000000-0000-0000-0000-000000000021',(SELECT id FROM editorial_cycle_applications WHERE editorial_plan_id=cycle_id(4)),'00000000-0000-0000-0000-000000000201',1,cycle_id(1),NULL)$s$);
SELECT lab_assert('invalid payloads leave no partial links',(SELECT count(*)=0 FROM editorial_cycle_content_links WHERE application_id=(SELECT id FROM editorial_cycle_applications WHERE editorial_plan_id=cycle_id(4))));
SELECT lab_denied('direct link fabrication denied',$s$INSERT INTO editorial_cycle_content_links(application_id,client_id,slot_id,unit_index,content_id) VALUES(cycle_id(9),cycle_id(9),cycle_id(9),1,cycle_id(1))$s$);
RESET ROLE;
INSERT INTO contents(id,client_id) VALUES(cycle_id(7),'00000000-0000-0000-0000-000000000023');
SET ROLE authenticated;
SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000013';
SELECT lab_assert('assigned member cannot read other client in same workspace',(SELECT count(*)=0 FROM contents WHERE id=cycle_id(7)));
WITH changed AS(UPDATE contents SET internal_title='Forbidden' WHERE id=cycle_id(7) RETURNING id) SELECT lab_assert('assigned operation cannot alter unassigned client',count(*)=0) FROM changed;
RESET ROLE;
INSERT INTO profiles VALUES(cycle_id(8),'admin');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',cycle_id(8)::text,false);
SELECT lab_assert('global admin without membership cannot read contents',(SELECT count(*)=0 FROM contents));
RESET ROLE;
