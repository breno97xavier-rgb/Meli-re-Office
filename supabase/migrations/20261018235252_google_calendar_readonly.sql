BEGIN;
CREATE SCHEMA office_google_private;
REVOKE ALL ON SCHEMA office_google_private FROM PUBLIC,anon,authenticated;
CREATE TABLE office_google_private.google_calendar_connections (
 workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 revision uuid NOT NULL DEFAULT gen_random_uuid(), secret_id uuid,
 connected_at timestamptz, PRIMARY KEY(workspace_id,user_id)
);
CREATE TABLE office_google_private.google_calendar_states (
 state_hash text PRIMARY KEY CHECK(state_hash ~ '^[a-f0-9]{64}$'),
 workspace_id uuid NOT NULL, user_id uuid NOT NULL, revision uuid NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT clock_timestamp()+interval '10 minutes',
 UNIQUE(workspace_id,user_id),
 FOREIGN KEY(workspace_id,user_id) REFERENCES office_google_private.google_calendar_connections(workspace_id,user_id) ON DELETE RESTRICT
);
ALTER TABLE office_google_private.google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_google_private.google_calendar_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA office_google_private FROM PUBLIC,anon,authenticated,service_role;
-- Only the server role may call this narrowly scoped storage API. No token or
-- OAuth state is readable through authenticated/anon or a public table/view.
CREATE FUNCTION public.office_google_calendar_store(p_action text,p_user_id uuid,p_workspace_id uuid,p_payload jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,office_google_private,pg_temp AS $$
DECLARE c office_google_private.google_calendar_connections%ROWTYPE;
 s office_google_private.google_calendar_states%ROWTYPE; secret_value text; secret_uuid uuid;
BEGIN
 IF p_action='consume_state' THEN
  DELETE FROM office_google_private.google_calendar_states WHERE state_hash=p_payload->>'hash' RETURNING * INTO s;
  IF NOT FOUND OR s.expires_at<clock_timestamp() THEN RETURN NULL; END IF;
  p_user_id:=s.user_id; p_workspace_id:=s.workspace_id;
 END IF;
 IF p_user_id IS NULL OR p_workspace_id IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.workspace_members wm JOIN public.workspaces w ON w.id=wm.workspace_id
  WHERE wm.workspace_id=p_workspace_id AND wm.user_id=p_user_id AND wm.status='active'
  AND wm.role IN ('owner','admin') AND w.status='active'
 ) THEN RAISE EXCEPTION 'Agency access denied' USING ERRCODE='42501'; END IF;
 IF p_action='start' THEN
  INSERT INTO office_google_private.google_calendar_connections(workspace_id,user_id) VALUES(p_workspace_id,p_user_id)
  ON CONFLICT(workspace_id,user_id) DO UPDATE SET revision=gen_random_uuid() RETURNING * INTO c;
  DELETE FROM office_google_private.google_calendar_states WHERE workspace_id=p_workspace_id AND user_id=p_user_id;
  INSERT INTO office_google_private.google_calendar_states(state_hash,workspace_id,user_id,revision)
  VALUES(p_payload->>'hash',p_workspace_id,p_user_id,c.revision);
  RETURN jsonb_build_object('ok',true);
 END IF;
 SELECT * INTO c FROM office_google_private.google_calendar_connections WHERE workspace_id=p_workspace_id AND user_id=p_user_id FOR UPDATE;
 IF p_action='status' THEN RETURN jsonb_build_object('connected',c.secret_id IS NOT NULL,'revision',c.revision); END IF;
 IF p_action='consume_state' THEN
  IF c.revision IS DISTINCT FROM s.revision THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('user_id',s.user_id,'workspace_id',s.workspace_id,'revision',s.revision);
 END IF;
 IF p_action='save' THEN
  IF c.revision IS DISTINCT FROM (p_payload->>'revision')::uuid OR c.user_id IS NULL THEN RAISE EXCEPTION 'Connection changed' USING ERRCODE='40001'; END IF;
  IF length(coalesce(p_payload->>'refresh_token','')) NOT BETWEEN 1 AND 8192 THEN RAISE EXCEPTION 'Invalid token'; END IF;
  IF c.secret_id IS NULL THEN
   SELECT vault.create_secret(p_payload->>'refresh_token') INTO secret_uuid;
  ELSE
   PERFORM vault.update_secret(c.secret_id,p_payload->>'refresh_token'); secret_uuid:=c.secret_id;
  END IF;
  UPDATE office_google_private.google_calendar_connections SET secret_id=secret_uuid,connected_at=clock_timestamp() WHERE workspace_id=p_workspace_id AND user_id=p_user_id;
  RETURN jsonb_build_object('ok',true);
 END IF;
 IF p_action='token' THEN
  IF c.secret_id IS NULL THEN RETURN NULL; END IF;
  SELECT decrypted_secret INTO secret_value FROM vault.decrypted_secrets WHERE id=c.secret_id;
  RETURN jsonb_build_object('refresh_token',secret_value,'revision',c.revision);
 END IF;
 IF p_action='disconnect' THEN
  UPDATE office_google_private.google_calendar_connections SET secret_id=NULL,connected_at=NULL,revision=gen_random_uuid() WHERE workspace_id=p_workspace_id AND user_id=p_user_id;
  DELETE FROM office_google_private.google_calendar_states WHERE workspace_id=p_workspace_id AND user_id=p_user_id;
  IF c.secret_id IS NOT NULL THEN DELETE FROM vault.secrets WHERE id=c.secret_id; END IF;
  RETURN jsonb_build_object('ok',true);
 END IF;
 RAISE EXCEPTION 'Unsupported action' USING ERRCODE='22023';
END $$;
REVOKE ALL ON FUNCTION public.office_google_calendar_store(text,uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.office_google_calendar_store(text,uuid,uuid,jsonb) TO service_role;
COMMIT;
