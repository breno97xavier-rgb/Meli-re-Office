\set ON_ERROR_STOP on
\ir finance-mvp-lab.sql
UPDATE workspaces SET status='active';
CREATE ROLE service_role NOLOGIN;
-- Local contract double only: does not claim Vault encryption validation.
CREATE SCHEMA vault;
CREATE TABLE vault.secrets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),secret text);
CREATE VIEW vault.decrypted_secrets AS SELECT id,secret AS decrypted_secret FROM vault.secrets;
CREATE FUNCTION vault.create_secret(value text) RETURNS uuid LANGUAGE plpgsql AS $$ DECLARE result uuid; BEGIN INSERT INTO vault.secrets(secret)VALUES(value)RETURNING id INTO result; RETURN result; END $$;
CREATE FUNCTION vault.update_secret(target uuid,value text) RETURNS void LANGUAGE sql AS $$ UPDATE vault.secrets SET secret=value WHERE id=target $$;
\ir ../../supabase/migrations/20261018235252_google_calendar_readonly.sql
SET ROLE authenticated;
SELECT lab_denied('authenticated cannot call credential RPC',$s$SELECT office_google_calendar_store('status',gen_random_uuid(),gen_random_uuid())$s$);
SELECT lab_denied('authenticated cannot read connections',$s$SELECT * FROM office_google_private.google_calendar_connections$s$);
RESET ROLE;
SET ROLE anon;
SELECT lab_denied('anon cannot consume OAuth state',$s$SELECT office_google_calendar_store('consume_state',NULL,NULL,'{}')$s$);
SELECT lab_denied('anon cannot read states',$s$SELECT * FROM office_google_private.google_calendar_states$s$);
RESET ROLE;
SET ROLE service_role;
SELECT office_google_calendar_store('start','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001',jsonb_build_object('hash',repeat('a',64)));
SELECT lab_assert('initial connection has no secret',NOT(office_google_calendar_store('status','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001')->>'connected')::boolean);
DO $$ DECLARE state jsonb; BEGIN state:=office_google_calendar_store('consume_state',NULL,NULL,jsonb_build_object('hash',repeat('a',64)));
 PERFORM lab_assert('state bound to expected workspace',state->>'workspace_id'='00000000-0000-0000-0000-000000000001');
 PERFORM lab_assert('state cannot replay',office_google_calendar_store('consume_state',NULL,NULL,jsonb_build_object('hash',repeat('a',64))) IS NULL);
 PERFORM office_google_calendar_store('save','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001',jsonb_build_object('revision',state->>'revision','refresh_token','FAKE-LOCAL-ONLY'));
 PERFORM lab_assert('connection saved',(office_google_calendar_store('status','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001')->>'connected')::boolean);
END $$;
SELECT lab_denied('foreign membership cannot access credentials',$s$SELECT office_google_calendar_store('token','00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001')$s$);
DO $$ DECLARE old_revision text; BEGIN old_revision:=office_google_calendar_store('token','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001')->>'revision';
 PERFORM office_google_calendar_store('disconnect','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001');
 PERFORM lab_assert('disconnect removes token',office_google_calendar_store('token','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001') IS NULL);
 BEGIN PERFORM office_google_calendar_store('save','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001',jsonb_build_object('revision',old_revision,'refresh_token','FAKE')); RAISE EXCEPTION 'stale save allowed'; EXCEPTION WHEN serialization_failure THEN RAISE NOTICE 'PASS: disconnected callback cannot reconnect'; END;
END $$;
SELECT office_google_calendar_store('start','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001',jsonb_build_object('hash',repeat('b',64)));
RESET ROLE;
UPDATE office_google_private.google_calendar_states SET expires_at=clock_timestamp()-interval '1 minute';
SET ROLE service_role;
SELECT lab_assert('expired state rejected',office_google_calendar_store('consume_state',NULL,NULL,jsonb_build_object('hash',repeat('b',64))) IS NULL);
RESET ROLE;
UPDATE workspace_members SET status='suspended' WHERE user_id='00000000-0000-0000-0000-000000000011';
SET ROLE service_role;
SELECT lab_denied('suspended user denied',$s$SELECT office_google_calendar_store('token','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001')$s$);
RESET ROLE;
SELECT lab_assert('disconnect removed fake Vault secret',(SELECT count(*)=0 FROM vault.secrets));
REVOKE EXECUTE ON FUNCTION office_google_calendar_store(text,uuid,uuid,jsonb) FROM service_role;
DROP ROLE service_role;
