\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon,authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;
CREATE TABLE workspaces(id uuid PRIMARY KEY,status text NOT NULL);
CREATE TABLE profiles(id uuid PRIMARY KEY,role text);
CREATE TABLE clients(id uuid PRIMARY KEY,workspace_id uuid NOT NULL REFERENCES workspaces);
CREATE TABLE contents(id uuid PRIMARY KEY,client_id uuid REFERENCES clients,pillar text);
CREATE TABLE workspace_members(id uuid PRIMARY KEY,workspace_id uuid,user_id uuid,role text,status text,client_scope text);
CREATE TABLE workspace_member_permissions(membership_id uuid,permission_key text,access_level text);
CREATE TABLE workspace_member_client_assignments(workspace_id uuid,membership_id uuid,client_id uuid);
CREATE TABLE workspace_member_client_responsibilities(workspace_id uuid,membership_id uuid,client_id uuid,area_key text,responsibility_role text);
\ir ../../supabase/migrations/20260913180000_planning_foundation.sql
\ir ../../supabase/migrations/20260928221857_s4_1_membership_auth_foundation.sql
\ir ../../supabase/migrations/20261009232133_harden_workspace_authorization_helpers.sql
\ir ../../supabase/migrations/20261020010158_scope_planning_authorization_to_workspace.sql
-- Reaplicação também deve manter exatamente quatro policies por tabela.
\ir ../../supabase/migrations/20261020010158_scope_planning_authorization_to_workspace.sql
CREATE FUNCTION lab_assert(label text,ok boolean) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF; RAISE NOTICE 'PASS: %',label;
END $$;
CREATE FUNCTION lab_denied(label text,statement text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN insufficient_privilege OR raise_exception THEN RAISE NOTICE 'PASS: % [%]',label,SQLSTATE; RETURN; END;
 RAISE EXCEPTION 'FAIL allowed: %',label;
END $$;
INSERT INTO workspaces VALUES ('00000000-0000-0000-0000-000000000001','active'),('00000000-0000-0000-0000-000000000002','active');
INSERT INTO profiles VALUES ('00000000-0000-0000-0000-000000000011','admin'),('00000000-0000-0000-0000-000000000012','admin'),('00000000-0000-0000-0000-000000000013','team');
INSERT INTO clients VALUES ('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000022','00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000023','00000000-0000-0000-0000-000000000001');
INSERT INTO workspace_members VALUES
 ('00000000-0000-0000-0000-000000000031','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','owner','active','all'),
 ('00000000-0000-0000-0000-000000000032','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000012','admin','active','all'),
 ('00000000-0000-0000-0000-000000000033','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000013','member','active','assigned');
INSERT INTO workspace_member_permissions VALUES ('00000000-0000-0000-0000-000000000033','planning','view');
INSERT INTO workspace_member_client_assignments VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000033','00000000-0000-0000-0000-000000000021');
INSERT INTO client_pillars(id,client_id,name) VALUES ('00000000-0000-0000-0000-000000000041','00000000-0000-0000-0000-000000000021','Pilar A'),('00000000-0000-0000-0000-000000000042','00000000-0000-0000-0000-000000000022','Pilar B');
INSERT INTO editorial_plans(id,client_id,title,start_date,end_date) VALUES ('00000000-0000-0000-0000-000000000051','00000000-0000-0000-0000-000000000021','Plano A','2026-10-01','2026-10-31'),('00000000-0000-0000-0000-000000000052','00000000-0000-0000-0000-000000000022','Plano B','2026-10-01','2026-10-31');
INSERT INTO client_strategies(client_id,positioning) SELECT id,'Estratégia fictícia' FROM clients;
INSERT INTO campaigns(client_id,name) SELECT id,'Campanha fictícia' FROM clients;
SELECT lab_assert('20 policies, no legacy',(SELECT count(*)=20 FROM pg_policies WHERE schemaname='public' AND tablename IN ('client_strategies','client_pillars','editorial_plans','editorial_plan_pillars','campaigns')));
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',false);
SELECT lab_assert('owner sees own clients strategies',(SELECT count(*)=2 FROM client_strategies));
SELECT lab_assert('owner cannot see foreign plan',(SELECT count(*)=1 FROM editorial_plans));
SELECT lab_denied('foreign insert',$s$INSERT INTO client_pillars(client_id,name) VALUES ('00000000-0000-0000-0000-000000000022','Forbidden')$s$);
UPDATE campaigns SET notes='Owner update';
SELECT lab_assert('owner updates own campaigns',(SELECT count(*)=2 FROM campaigns WHERE notes='Owner update'));
SELECT * FROM set_editorial_plan_pillars('00000000-0000-0000-0000-000000000051','00000000-0000-0000-0000-000000000021','[{"pillar_id":"00000000-0000-0000-0000-000000000041","target_count":2}]');
SELECT lab_assert('allocation stored',(SELECT target_count=2 FROM editorial_plan_pillars));
SELECT lab_denied('RPC foreign workspace',$s$SELECT * FROM set_editorial_plan_pillars('00000000-0000-0000-0000-000000000052','00000000-0000-0000-0000-000000000022',NULL)$s$);
SELECT lab_denied('RPC foreign pillar',$s$SELECT * FROM set_editorial_plan_pillars('00000000-0000-0000-0000-000000000051','00000000-0000-0000-0000-000000000021','[{"pillar_id":"00000000-0000-0000-0000-000000000042","target_count":2}]')$s$);
SELECT lab_denied('RPC fraction',$s$SELECT * FROM set_editorial_plan_pillars('00000000-0000-0000-0000-000000000051','00000000-0000-0000-0000-000000000021','[{"pillar_id":"00000000-0000-0000-0000-000000000041","target_count":1.5}]')$s$);
SELECT lab_denied('RPC duplicate',$s$SELECT * FROM set_editorial_plan_pillars('00000000-0000-0000-0000-000000000051','00000000-0000-0000-0000-000000000021','[{"pillar_id":"00000000-0000-0000-0000-000000000041","target_count":1},{"pillar_id":"00000000-0000-0000-0000-000000000041","target_count":2}]')$s$);
SELECT lab_assert('invalid payload preserved allocation',(SELECT target_count=2 FROM editorial_plan_pillars));
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000012',false);
SELECT lab_assert('reciprocal isolation',(SELECT count(*)=1 FROM client_strategies));
UPDATE campaigns SET notes='Admin B';
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000013',false);
SELECT lab_assert('assigned view only sees assigned strategy',(SELECT count(*)=1 FROM client_strategies));
SELECT lab_assert('assigned view cannot access unassigned client',NOT can_access_planning_client('00000000-0000-0000-0000-000000000023'));
SELECT lab_denied('view cannot create',$s$INSERT INTO client_pillars(client_id,name) VALUES ('00000000-0000-0000-0000-000000000021','Forbidden')$s$);
SELECT lab_denied('view cannot use privileged RPC',$s$SELECT * FROM set_editorial_plan_pillars('00000000-0000-0000-0000-000000000051','00000000-0000-0000-0000-000000000021',NULL)$s$);
UPDATE client_pillars SET name='Forbidden';
DELETE FROM client_pillars;
RESET ROLE;
SELECT lab_assert('view update and delete changed zero rows',(SELECT name='Pilar A' FROM client_pillars WHERE id='00000000-0000-0000-0000-000000000041'));
SELECT lab_assert('A update did not change B and vice versa',(SELECT count(*)=2 FROM campaigns WHERE notes='Owner update'));
UPDATE workspace_member_permissions SET access_level='operation';
SET ROLE authenticated;
SELECT lab_assert('operation permission works',can_access_planning_client('00000000-0000-0000-0000-000000000021','operation'));
SELECT lab_assert('operation cannot delete',NOT can_access_planning_client('00000000-0000-0000-0000-000000000021','management'));
SELECT lab_assert('invalid level fails closed',NOT coalesce(can_access_planning_client('00000000-0000-0000-0000-000000000021','invalid'),false));
RESET ROLE;
UPDATE workspace_members SET status='suspended' WHERE user_id='00000000-0000-0000-0000-000000000011';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',false);
SELECT lab_assert('suspended global admin denied',(SELECT count(*)=0 FROM client_strategies));
RESET ROLE;
UPDATE workspace_members SET status='active';
UPDATE workspaces SET status='suspended' WHERE id='00000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
SELECT lab_assert('inactive workspace denied',(SELECT count(*)=0 FROM client_pillars));
SELECT set_config('request.jwt.claim.sub','',false);
SELECT lab_assert('no identity denied',(SELECT count(*)=0 FROM editorial_plans));
RESET ROLE;
SET ROLE anon;
SELECT lab_denied('anon helper',$s$SELECT can_access_planning_client(NULL)$s$);
SELECT lab_denied('anon RPC',$s$SELECT * FROM set_editorial_plan_pillars(NULL,NULL,NULL)$s$);
SELECT lab_denied('anon table',$s$SELECT * FROM client_strategies$s$);
RESET ROLE;
