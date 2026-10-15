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

CREATE TABLE profiles(id uuid PRIMARY KEY);
CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=clock_timestamp(); RETURN NEW; END $$;
GRANT SELECT ON workspaces TO authenticated;
CREATE FUNCTION is_workspace_admin(p_workspace_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path=public,pg_temp AS $$ SELECT auth.uid() IS NOT NULL AND EXISTS (
 SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=p_workspace_id AND wm.user_id=auth.uid()
 AND wm.status='active' AND wm.role IN ('owner','admin')) $$;
REVOKE ALL ON FUNCTION is_workspace_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_workspace_admin(uuid) TO authenticated;

\ir ../../supabase/migrations/20261015164153_finance_internal_mvp.sql
INSERT INTO workspaces VALUES ('00000000-0000-0000-0000-000000000001','active'),('00000000-0000-0000-0000-000000000002','active');
INSERT INTO workspace_members VALUES
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','owner','active'),
 ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000012','admin','active');
INSERT INTO clients VALUES ('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000022','00000000-0000-0000-0000-000000000002');
CREATE FUNCTION lab_assert(label text,ok boolean) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF; RAISE NOTICE 'PASS: %',label; END $$;
CREATE FUNCTION lab_denied(label text,statement text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$ BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN insufficient_privilege OR foreign_key_violation OR check_violation THEN RAISE NOTICE 'PASS: %',label; RETURN; END;
 RAISE EXCEPTION 'FAIL (allowed): %',label; END $$;

INSERT INTO profiles VALUES ('00000000-0000-0000-0000-000000000011'),('00000000-0000-0000-0000-000000000012');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',false);
INSERT INTO finance_entries(workspace_id,client_id,title,entry_type,amount_cents,due_date,created_by)
VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000021','Receita fictícia','income',12345,'2026-10-20',auth.uid());
SELECT lab_assert('income persisted in cents',(SELECT amount_cents=12345 AND status='pending' FROM finance_entries));
SELECT lab_assert('creation audited',(SELECT count(*)=1 FROM finance_entry_events));
UPDATE finance_entries SET status='settled',settlement_date='2026-10-15';
SELECT lab_assert('settlement persisted',(SELECT status='settled' AND settlement_date='2026-10-15' FROM finance_entries));
SELECT lab_assert('old and new financial states preserved',(SELECT count(*)=1 FROM finance_entry_events WHERE event_type='UPDATE' AND old_values->>'status'='pending' AND new_values->>'status'='settled' AND actor_id=auth.uid()));
SELECT lab_denied('zero amount',$s$UPDATE finance_entries SET amount_cents=0$s$);
SELECT lab_denied('negative amount',$s$UPDATE finance_entries SET amount_cents=-1$s$);
SELECT lab_denied('oversized amount',$s$UPDATE finance_entries SET amount_cents=10000000000$s$);
SELECT lab_denied('settled without settlement date',$s$UPDATE finance_entries SET settlement_date=NULL$s$);
SELECT lab_denied('pending with settlement date',$s$UPDATE finance_entries SET status='pending'$s$);
SELECT lab_denied('blank title',$s$UPDATE finance_entries SET title=' '$s$);
SELECT lab_denied('foreign client',$s$UPDATE finance_entries SET client_id='00000000-0000-0000-0000-000000000022'$s$);
SELECT lab_denied('immutable workspace',$s$UPDATE finance_entries SET workspace_id='00000000-0000-0000-0000-000000000002'$s$);
SELECT lab_denied('immutable author',$s$UPDATE finance_entries SET created_by='00000000-0000-0000-0000-000000000012'$s$);
SELECT lab_denied('hard deletion',$s$DELETE FROM finance_entries$s$);
SELECT lab_denied('history cannot be forged',$s$INSERT INTO finance_entry_events(workspace_id,entry_id,event_type,new_values) SELECT workspace_id,id,'INSERT','{}'::jsonb FROM finance_entries$s$);
SELECT lab_denied('history cannot be edited',$s$UPDATE finance_entry_events SET event_type='INSERT'$s$);
SELECT lab_denied('history cannot be deleted',$s$DELETE FROM finance_entry_events$s$);
SELECT lab_denied('audit function not executable',$s$SELECT record_finance_entry_event()$s$);
UPDATE finance_entries SET status='cancelled',settlement_date=NULL;
SELECT lab_assert('cancellation retains entry',(SELECT count(*)=1 AND bool_and(status='cancelled') FROM finance_entries));
SELECT lab_assert('cancellation retains original settlement history',(SELECT count(*)=1 FROM finance_entry_events WHERE old_values->>'status'='settled' AND new_values->>'status'='cancelled'));
SELECT lab_denied('foreign workspace insert',$s$INSERT INTO finance_entries(workspace_id,title,entry_type,amount_cents,due_date,created_by) VALUES ('00000000-0000-0000-0000-000000000002','Forbidden','income',100,'2026-10-20',auth.uid())$s$);
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000012',false);
SELECT lab_assert('other admin cannot read entries',(SELECT count(*)=0 FROM finance_entries));
SELECT lab_assert('other admin cannot read history',(SELECT count(*)=0 FROM finance_entry_events));
UPDATE finance_entries SET title='foreign overwrite';
RESET ROLE;
SELECT lab_assert('other admin cannot update',(SELECT title='Receita fictícia' FROM finance_entries));
UPDATE workspace_members SET status='suspended' WHERE user_id='00000000-0000-0000-0000-000000000011';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',false);
SELECT lab_assert('suspended administrator denied',(SELECT count(*)=0 FROM finance_entries));
SELECT lab_denied('suspended administrator cannot create',$s$INSERT INTO finance_entries(workspace_id,title,entry_type,amount_cents,due_date,created_by) VALUES ('00000000-0000-0000-0000-000000000001','Forbidden','income',100,'2026-10-20',auth.uid())$s$);
RESET ROLE;
UPDATE workspace_members SET status='active';
UPDATE workspaces SET status='suspended' WHERE id='00000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
SELECT lab_assert('inactive agency denied',(SELECT count(*)=0 FROM finance_entries));
RESET ROLE;
SET ROLE anon;
SELECT lab_denied('anonymous read denied',$s$SELECT * FROM finance_entries$s$);
SELECT lab_denied('anonymous history denied',$s$SELECT * FROM finance_entry_events$s$);
SELECT lab_denied('anonymous insert denied',$s$INSERT INTO finance_entries(title) VALUES ('Forbidden')$s$);
RESET ROLE;
