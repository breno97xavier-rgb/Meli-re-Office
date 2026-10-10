\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated,anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;
CREATE TABLE public.clients(id uuid PRIMARY KEY,workspace_id uuid NOT NULL);
CREATE TABLE public.workspace_members(id uuid PRIMARY KEY,workspace_id uuid,user_id uuid,status text,role text,client_scope text);
CREATE TABLE public.workspace_member_client_assignments(workspace_id uuid,membership_id uuid,client_id uuid);
CREATE TABLE public.workspace_member_client_responsibilities(workspace_id uuid,membership_id uuid,client_id uuid,area_key text,responsibility_role text);
CREATE TABLE public.workspace_member_permissions(membership_id uuid,permission_key text,access_level text);
INSERT INTO clients VALUES ('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000002');
INSERT INTO clients VALUES ('00000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000001');
INSERT INTO workspace_members VALUES
('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000201','active','owner','all'),
('00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000202','active','admin','all'),
('00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000203','active','member','assigned'),
('00000000-0000-0000-0000-000000000104','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000204','suspended','owner','all'),
('00000000-0000-0000-0000-000000000105','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000205','active','member','all');
INSERT INTO workspace_member_client_assignments VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000011');
INSERT INTO workspace_member_client_responsibilities VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000011','contents','primary');
INSERT INTO workspace_member_permissions VALUES ('00000000-0000-0000-0000-000000000103','contents','operation');
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON clients TO authenticated;
-- No policy: direct client reads are denied. SECURITY DEFINER helpers still evaluate ownership.
\ir ../../supabase/migrations/20260928221857_s4_1_membership_auth_foundation.sql
CREATE TEMP TABLE helper_metadata AS SELECT oid,proowner,proacl,proconfig,prosecdef,provolatile,prorettype,proargtypes,proargnames FROM pg_proc WHERE oid IN ('public.has_workspace_client_access(uuid,uuid)'::regprocedure,'public.has_client_responsibility(uuid,uuid,text,text)'::regprocedure,'public.has_workspace_permission(uuid,text,text)'::regprocedure);
CREATE FUNCTION public.lab_assert(label text, actual boolean, expected boolean) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'FAIL: % expected %, got %',label,expected,actual; END IF; RAISE NOTICE 'PASS: %',label; END $$;
SET ROLE authenticated;
SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000201';
SELECT lab_assert('baseline exposes foreign client',has_workspace_client_access('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000012'),true);
SELECT lab_assert('baseline responsibility exposes foreign client',has_client_responsibility('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000012','contents'),true);
SELECT lab_assert('baseline accepts NULL permission',has_workspace_permission('00000000-0000-0000-0000-000000000001',NULL),true);
RESET ROLE;
\ir ../../supabase/migrations/20261009232133_harden_workspace_authorization_helpers.sql
SELECT lab_assert('function identities attributes and ACL unchanged',NOT EXISTS(SELECT 1 FROM helper_metadata m JOIN pg_proc p ON p.oid=m.oid WHERE ROW(p.proowner,p.proacl,p.proconfig,p.prosecdef,p.provolatile,p.prorettype,p.proargtypes,p.proargnames) IS DISTINCT FROM ROW(m.proowner,m.proacl,m.proconfig,m.prosecdef,m.provolatile,m.prorettype,m.proargtypes,m.proargnames)),true);
SELECT lab_assert('anon execute denied',NOT has_function_privilege('anon','public.has_workspace_client_access(uuid,uuid)','EXECUTE') AND NOT has_function_privilege('anon','public.has_client_responsibility(uuid,uuid,text,text)','EXECUTE') AND NOT has_function_privilege('anon','public.has_workspace_permission(uuid,text,text)','EXECUTE'),true);
SET ROLE authenticated;
SELECT lab_assert('direct RLS read denied',(SELECT count(*)=0 FROM clients),true);
DO $$
DECLARE ws uuid:='00000000-0000-0000-0000-000000000001'; own_client uuid:='00000000-0000-0000-0000-000000000011'; foreign_client uuid:='00000000-0000-0000-0000-000000000012'; usr text;
BEGIN
FOREACH usr IN ARRAY ARRAY['00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000202'] LOOP
PERFORM set_config('request.jwt.claim.sub',usr,true);
PERFORM lab_assert(usr||' own client',has_workspace_client_access(ws,own_client),true);
PERFORM lab_assert(usr||' foreign client',has_workspace_client_access(ws,foreign_client),false);
PERFORM lab_assert(usr||' missing client',has_workspace_client_access(ws,'00000000-0000-0000-0000-000000000099'),false);
PERFORM lab_assert(usr||' foreign responsibility',has_client_responsibility(ws,foreign_client,'contents'),false);
PERFORM lab_assert(usr||' own responsibility',has_client_responsibility(ws,own_client,'contents'),true);
PERFORM lab_assert(usr||' null permission',has_workspace_permission(ws,NULL),false);
PERFORM lab_assert(usr||' invalid permission',has_workspace_permission(ws,'invalid'),false);
PERFORM lab_assert(usr||' management permission',has_workspace_permission(ws,'contents','management'),true);
END LOOP;
PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000203',true);
PERFORM lab_assert('assigned member own client',has_workspace_client_access(ws,own_client),true);
PERFORM lab_assert('assigned member unassigned local client',has_workspace_client_access(ws,'00000000-0000-0000-0000-000000000013'),false);
PERFORM lab_assert('assigned member foreign client',has_workspace_client_access(ws,foreign_client),false);
PERFORM lab_assert('member primary responsibility',has_client_responsibility(ws,own_client,'contents','primary'),true);
PERFORM lab_assert('member wrong responsibility',has_client_responsibility(ws,own_client,'contents','collaborator'),false);
PERFORM lab_assert('member wrong area',has_client_responsibility(ws,own_client,'planning'),false);
PERFORM lab_assert('member view',has_workspace_permission(ws,'contents','view'),true);
PERFORM lab_assert('member operation',has_workspace_permission(ws,'contents','operation'),true);
PERFORM lab_assert('member management denied',has_workspace_permission(ws,'contents','management'),false);
PERFORM lab_assert('member absent permission',has_workspace_permission(ws,'planning'),false);
PERFORM lab_assert('null level',has_workspace_permission(ws,'contents',NULL),false);
PERFORM lab_assert('invalid level',has_workspace_permission(ws,'contents','invalid'),false);
PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000205',true);
PERFORM lab_assert('all member own client',has_workspace_client_access(ws,own_client),true);
PERFORM lab_assert('all member unassigned local client',has_workspace_client_access(ws,'00000000-0000-0000-0000-000000000013'),true);
PERFORM lab_assert('all member foreign client',has_workspace_client_access(ws,foreign_client),false);
PERFORM lab_assert('null workspace',has_workspace_client_access(NULL,own_client),false);
PERFORM lab_assert('null client',has_workspace_client_access(ws,NULL),false);
PERFORM lab_assert('null area',has_client_responsibility(ws,own_client,NULL),false);
FOREACH usr IN ARRAY ARRAY['00000000-0000-0000-0000-000000000204','00000000-0000-0000-0000-000000000299',''] LOOP
PERFORM set_config('request.jwt.claim.sub',usr,true);
PERFORM lab_assert(usr||' inactive or absent client access',has_workspace_client_access(ws,own_client),false);
PERFORM lab_assert(usr||' inactive or absent responsibility',has_client_responsibility(ws,own_client,'contents'),false);
PERFORM lab_assert(usr||' inactive or absent permission',has_workspace_permission(ws,'contents'),false);
END LOOP;
END $$;
RESET ROLE;
-- Apply twice to check repeatability of CREATE OR REPLACE and preservation of grants.
\ir ../../supabase/migrations/20261009232133_harden_workspace_authorization_helpers.sql
SELECT lab_assert('repeat application retains authenticated execute',has_function_privilege('authenticated','public.has_workspace_permission(uuid,text,text)','EXECUTE'),true);
ROLLBACK;