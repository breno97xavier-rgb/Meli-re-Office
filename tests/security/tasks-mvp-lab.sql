\set ON_ERROR_STOP on
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated,anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;
CREATE TABLE workspaces(id uuid PRIMARY KEY,status text NOT NULL);
CREATE TABLE workspace_members(workspace_id uuid,user_id uuid,role text,status text);
CREATE TABLE clients(id uuid PRIMARY KEY,workspace_id uuid NOT NULL, UNIQUE(workspace_id,id));
CREATE TABLE tasks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title text NOT NULL,
 description text,status text DEFAULT 'todo' CHECK(status IN ('todo','in_progress','review','done','archived')),
 priority text DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
 due_date date,client_id uuid REFERENCES clients(id),assigned_to uuid,created_by uuid,
 content_id uuid,opportunity_id uuid,presentation_id uuid,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access to tasks" ON tasks TO authenticated USING(true) WITH CHECK(true);
GRANT ALL ON tasks TO authenticated;
GRANT SELECT ON workspaces TO authenticated;
CREATE FUNCTION is_workspace_admin(p_workspace_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path=public,pg_temp AS $$ SELECT auth.uid() IS NOT NULL AND EXISTS (
 SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=p_workspace_id AND wm.user_id=auth.uid()
 AND wm.status='active' AND wm.role IN ('owner','admin')) $$;
REVOKE ALL ON FUNCTION is_workspace_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_workspace_admin(uuid) TO authenticated;
\ir tasks-mvp-proposal.sql
INSERT INTO workspaces VALUES ('00000000-0000-0000-0000-000000000001','active'),('00000000-0000-0000-0000-000000000002','active');
INSERT INTO workspace_members VALUES
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','owner','active'),
 ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000012','admin','active');
INSERT INTO clients VALUES ('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000022','00000000-0000-0000-0000-000000000002');
CREATE FUNCTION lab_assert(label text,ok boolean) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF; RAISE NOTICE 'PASS: %',label; END $$;
CREATE FUNCTION lab_denied(label text,statement text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$ BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN insufficient_privilege OR foreign_key_violation OR check_violation THEN RAISE NOTICE 'PASS: %',label; RETURN; END;
 RAISE EXCEPTION 'FAIL (allowed): %',label; END $$;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',false);
INSERT INTO tasks(workspace_id,title,client_id,created_by,due_date) VALUES ('00000000-0000-0000-0000-000000000001','Tarefa fictícia','00000000-0000-0000-0000-000000000021',auth.uid(),'2026-10-20');
SELECT lab_assert('own task persisted',(SELECT count(*)=1 FROM tasks));
UPDATE tasks SET status='done',description='Concluída';
SELECT lab_assert('completion persisted',(SELECT bool_and(status='done') FROM tasks));
SELECT lab_denied('foreign workspace insert',$s$INSERT INTO tasks(workspace_id,title,created_by) VALUES ('00000000-0000-0000-0000-000000000002','Foreign',auth.uid())$s$);
SELECT lab_denied('foreign client link',$s$UPDATE tasks SET client_id='00000000-0000-0000-0000-000000000022'$s$);
SELECT lab_denied('workspace reassignment',$s$UPDATE tasks SET workspace_id='00000000-0000-0000-0000-000000000002'$s$);
SELECT lab_denied('author reassignment',$s$UPDATE tasks SET created_by='00000000-0000-0000-0000-000000000012'$s$);
SELECT lab_denied('unsupported content link',$s$UPDATE tasks SET content_id='00000000-0000-0000-0000-000000000099'$s$);
SELECT lab_denied('blank title',$s$UPDATE tasks SET title=' '$s$);
SELECT lab_denied('invalid status',$s$UPDATE tasks SET status='invalid'$s$);
SELECT lab_denied('hard deletion',$s$DELETE FROM tasks$s$);
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000012',false);
SELECT lab_assert('other admin cannot read',(SELECT count(*)=0 FROM tasks));
UPDATE tasks SET status='todo';
RESET ROLE;
SELECT lab_assert('other admin cannot update',(SELECT bool_and(status='done') FROM tasks));
UPDATE workspace_members SET status='suspended' WHERE user_id='00000000-0000-0000-0000-000000000011';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',false);
SELECT lab_assert('suspended member cannot read',(SELECT count(*)=0 FROM tasks));
SELECT lab_denied('suspended member cannot create',$s$INSERT INTO tasks(workspace_id,title,created_by) VALUES ('00000000-0000-0000-0000-000000000001','Suspended',auth.uid())$s$);
RESET ROLE;
UPDATE workspace_members SET status='active';
UPDATE workspaces SET status='suspended' WHERE id='00000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
SELECT lab_assert('inactive agency cannot read',(SELECT count(*)=0 FROM tasks));
SELECT lab_denied('inactive agency cannot create',$s$INSERT INTO tasks(workspace_id,title,created_by) VALUES ('00000000-0000-0000-0000-000000000001','Inactive',auth.uid())$s$);
RESET ROLE;
SET ROLE anon;
SELECT lab_denied('anonymous read',$s$SELECT * FROM tasks$s$);
SELECT lab_denied('anonymous write',$s$INSERT INTO tasks(title) VALUES ('Anon')$s$);
RESET ROLE;
