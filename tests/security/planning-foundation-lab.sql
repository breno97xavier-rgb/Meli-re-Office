\ir planning-authorization-lab.sql
-- Reutiliza os helpers reais e a fundação histórica já testada; reativa o fixture.
UPDATE workspaces SET status='active';
\ir ../../supabase/migrations/20261022212647_planning_briefing_strategy_revisions_series.sql
CREATE FUNCTION lab_reject(label text,statement text,expected_state text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE<>expected_state THEN RAISE; END IF; RAISE NOTICE 'PASS: % [%]',label,SQLSTATE; RETURN;
 END; RAISE EXCEPTION 'FAIL allowed: %',label;
END $$;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',false);
SELECT lab_assert('initial strategy snapshots preserved',(SELECT count(*)=2 FROM client_strategy_revisions));
SELECT lab_assert('new briefing starts absent',(SELECT count(*)=0 FROM client_briefings));
SELECT save_client_briefing('00000000-0000-0000-0000-000000000021',0,'[{"id":"q1","block":"Negócio","label":"Objetivo?","type":"text","options":[],"answer":"Resposta fictícia"}]','draft');
SELECT lab_assert('briefing persisted',(SELECT revision=1 AND questions->0->>'answer'='Resposta fictícia' FROM client_briefings));
SELECT lab_assert('briefing independent of strategy',(SELECT revision=1 AND positioning='Estratégia fictícia' FROM client_strategies WHERE client_id='00000000-0000-0000-0000-000000000021'));
SELECT lab_denied('stale briefing rejected',$s$SELECT save_client_briefing('00000000-0000-0000-0000-000000000021',0,'[]','draft')$s$);
SELECT save_client_briefing('00000000-0000-0000-0000-000000000021',1,'[]','ready');
SELECT lab_assert('briefing history contains original answer',(SELECT count(*)=1 FROM client_briefing_revisions WHERE revision=1 AND snapshot->'questions'->0->>'answer'='Resposta fictícia'));
SELECT lab_assert('briefing can be empty',(SELECT questions='[]'::jsonb AND revision=2 FROM client_briefings));
SELECT lab_denied('multiple choice foreign answer',$s$SELECT save_client_briefing('00000000-0000-0000-0000-000000000021',2,'[{"id":"q1","block":"A","label":"B","type":"multiple","options":["A"],"answer":["B"]}]','draft')$s$);
SELECT lab_denied('duplicate question id',$s$SELECT save_client_briefing('00000000-0000-0000-0000-000000000021',2,'[{"id":"q1","block":"A","label":"B","type":"text","options":[],"answer":""},{"id":"q1","block":"A","label":"B","type":"text","options":[],"answer":""}]','draft')$s$);
SELECT lab_denied('cannot forge history',$s$INSERT INTO client_briefing_revisions(client_id,revision,snapshot) VALUES('00000000-0000-0000-0000-000000000021',99,'{}')$s$);
SELECT save_client_strategy_revision('00000000-0000-0000-0000-000000000021',1,'{"positioning":"Posicionamento novo","priority_channels":["instagram"],"valid_from":"2026-10-19","valid_until":"2026-12-31","review_on":"2026-11-19"}');
SELECT lab_assert('strategy current updated once',(SELECT revision=2 AND positioning='Posicionamento novo' FROM client_strategies WHERE client_id='00000000-0000-0000-0000-000000000021'));
SELECT lab_assert('strategy old snapshot retained',(SELECT snapshot->>'positioning'='Estratégia fictícia' FROM client_strategy_revisions WHERE client_id='00000000-0000-0000-0000-000000000021' AND revision=1));
SELECT lab_denied('stale strategy',$s$SELECT save_client_strategy_revision('00000000-0000-0000-0000-000000000021',1,'{}')$s$);
SELECT lab_reject('bad validity rollback',$s$SELECT save_client_strategy_revision('00000000-0000-0000-0000-000000000021',2,'{"valid_from":"2026-12-01","valid_until":"2026-10-01"}')$s$,'23514');
SELECT lab_assert('invalid validity left revision unchanged',(SELECT revision=2 FROM client_strategies WHERE client_id='00000000-0000-0000-0000-000000000021'));
RESET ROLE;
INSERT INTO clients VALUES('00000000-0000-0000-0000-000000000024','00000000-0000-0000-0000-000000000001');
SET ROLE authenticated;
SELECT save_client_strategy_revision('00000000-0000-0000-0000-000000000024',0,'{"positioning":"Primeira versão completa"}');
SELECT lab_assert('new strategy has no blank intermediate version',(SELECT count(*)=1 AND bool_and(snapshot->>'positioning'='Primeira versão completa') FROM client_strategy_revisions WHERE client_id='00000000-0000-0000-0000-000000000024'));
SELECT save_client_strategy_revision('00000000-0000-0000-0000-000000000023',1,'{"positioning":"Atualizado"}');
-- Compatibilidade: escrita antiga segue gerando histórico, sem apagar revisões.
UPDATE client_strategies SET business_goals='Objetivo legado' WHERE client_id='00000000-0000-0000-0000-000000000023';
SELECT lab_assert('legacy update audited',(SELECT count(*)=3 FROM client_strategy_revisions WHERE client_id='00000000-0000-0000-0000-000000000023'));
INSERT INTO client_pillars(id,client_id,name) VALUES('00000000-0000-0000-0000-000000000043','00000000-0000-0000-0000-000000000021','Segundo pilar A');
SELECT save_client_editorial_series('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000061',0,'{"name":"Bastidores","description":"Fictício","channels":["instagram"],"is_active":true,"pillar_ids":["00000000-0000-0000-0000-000000000041","00000000-0000-0000-0000-000000000043"]}');
SELECT lab_assert('series has two pillars without duplicating them',(SELECT count(*)=2 FROM client_editorial_series_pillars));
SELECT lab_denied('stale series',$s$SELECT save_client_editorial_series('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000061',0,'{"name":"B","channels":[],"is_active":true,"pillar_ids":[]}')$s$);
SELECT lab_denied('foreign pillar rollback',$s$SELECT save_client_editorial_series('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000061',1,'{"name":"B","channels":[],"is_active":true,"pillar_ids":["00000000-0000-0000-0000-000000000042"]}')$s$);
UPDATE client_pillars SET is_active=false WHERE id='00000000-0000-0000-0000-000000000041';
SELECT save_client_editorial_series('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000061',1,'{"name":"Bastidores","channels":["instagram"],"is_active":false,"pillar_ids":["00000000-0000-0000-0000-000000000041"]}');
SELECT lab_assert('archive retains inactive pillar',(SELECT count(*)=1 FROM client_editorial_series_pillars));
SELECT lab_assert('series archived not removed',(SELECT revision=2 AND NOT is_active FROM client_editorial_series));
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000012',false);
SELECT lab_assert('B cannot read A briefing',(SELECT count(*)=0 FROM client_briefings));
SELECT lab_assert('B cannot read A history',(SELECT count(*)=0 FROM client_briefing_revisions));
SELECT lab_assert('B cannot read A series',(SELECT count(*)=0 FROM client_editorial_series));
SELECT lab_denied('B cannot save A strategy',$s$SELECT save_client_strategy_revision('00000000-0000-0000-0000-000000000021',2,'{}')$s$);
SELECT lab_denied('B cannot save A briefing',$s$SELECT save_client_briefing('00000000-0000-0000-0000-000000000021',2,'[]','ready')$s$);
SELECT lab_denied('B cannot use A series id',$s$SELECT save_client_editorial_series('00000000-0000-0000-0000-000000000022','00000000-0000-0000-0000-000000000061',2,'{"name":"B","channels":[],"is_active":true,"pillar_ids":[]}')$s$);
RESET ROLE;
UPDATE workspace_member_permissions SET access_level='view';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000013',false);
SELECT lab_assert('assigned view reads own briefing',(SELECT count(*)=1 FROM client_briefings));
SELECT lab_denied('view cannot save briefing',$s$SELECT save_client_briefing('00000000-0000-0000-0000-000000000021',2,'[]','draft')$s$);
SELECT lab_denied('view cannot write series directly',$s$UPDATE client_editorial_series SET name='Forbidden'$s$);
RESET ROLE;
SET ROLE anon;
SELECT lab_denied('anon briefing RPC',$s$SELECT save_client_briefing(NULL,0,'[]','draft')$s$);
SELECT lab_denied('anon strategy history',$s$SELECT * FROM client_strategy_revisions$s$);
RESET ROLE;
