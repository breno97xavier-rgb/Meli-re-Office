-- PROPOSTA LOCAL. Não aplicada. Migração incremental após revisão/autorização.
-- Uma versão imutável por item/rodada; nunca reconstruir pareceres antigos.
ALTER TABLE public.contents ADD COLUMN material_revision bigint NOT NULL DEFAULT 1;
ALTER TABLE public.presentation_items
 ADD COLUMN review_id uuid,
 ADD COLUMN review_content jsonb,
 ADD COLUMN review_assets jsonb,
 ADD COLUMN review_material_revision bigint,
 ADD COLUMN review_prepared_at timestamptz,
 ADD CONSTRAINT presentation_review_complete CHECK (
  (review_id IS NULL AND review_content IS NULL AND review_assets IS NULL AND review_material_revision IS NULL AND review_prepared_at IS NULL)
  OR (review_id IS NOT NULL AND review_content IS NOT NULL AND review_assets IS NOT NULL
      AND jsonb_typeof(review_content)='object' AND jsonb_typeof(review_assets)='array'
      AND review_material_revision IS NOT NULL AND review_prepared_at IS NOT NULL));

CREATE FUNCTION office_private.bump_content_material_revision()
RETURNS trigger LANGUAGE plpgsql SET search_path TO public,pg_temp AS $$
BEGIN
 IF current_user IN ('anon','authenticated') AND NEW.material_revision IS DISTINCT FROM OLD.material_revision THEN
  RAISE EXCEPTION 'MATERIAL_REVISION_MANAGED';
 END IF;
 IF (to_jsonb(NEW)-ARRAY['editorial_status','approved_at','updated_at','planned_date','scheduled_date','published_at','assigned_to','material_revision'])
    IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['editorial_status','approved_at','updated_at','planned_date','scheduled_date','published_at','assigned_to','material_revision']) THEN
  NEW.material_revision := OLD.material_revision+1;
  IF OLD.editorial_status='approved' AND OLD.published_at IS NULL THEN
   NEW.editorial_status := 'in_production'; NEW.approved_at := NULL;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER review_content_revision BEFORE UPDATE ON public.contents
FOR EACH ROW EXECUTE FUNCTION office_private.bump_content_material_revision();

CREATE FUNCTION office_private.guard_review_content_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,pg_temp AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.presentation_items WHERE content_id=OLD.id AND (review_id IS NOT NULL OR client_approval_status<>'pending')) THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'REVIEW_CONTENT_PRESERVED'; END IF;
  IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN RAISE EXCEPTION 'REVIEW_CONTENT_CLIENT_IMMUTABLE'; END IF;
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER guard_review_content_delete BEFORE DELETE OR UPDATE OF client_id ON public.contents
FOR EACH ROW EXECUTE FUNCTION office_private.guard_review_content_delete();

CREATE FUNCTION office_private.bump_asset_material_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,pg_temp AS $$
DECLARE cid uuid; client_ref uuid;
BEGIN
 cid := CASE WHEN TG_OP='DELETE' THEN OLD.content_id ELSE NEW.content_id END;
 -- Legacy asset policies include global administrators. Do not turn that into
 -- a cross-workspace status mutation through this definer trigger.
 SELECT client_id INTO client_ref FROM public.contents WHERE id=cid;
 IF COALESCE(auth.role(),'')='anon' OR (auth.role()='authenticated'
  AND NOT office_private.contents_client_permission(client_ref,'operation')) THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
 IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.content_id IS DISTINCT FROM OLD.content_id
   OR NEW.file_url IS DISTINCT FROM OLD.file_url OR NEW.version IS DISTINCT FROM OLD.version
   OR NEW.asset_type IS DISTINCT FROM OLD.asset_type) THEN RAISE EXCEPTION 'ASSET_IDENTITY_IMMUTABLE'; END IF;
 IF TG_OP='DELETE' AND EXISTS (SELECT 1 FROM public.presentation_items pi,
   jsonb_array_elements(COALESCE(pi.review_assets,'[]')) a WHERE a->>'id'=OLD.id::text) THEN
  RAISE EXCEPTION 'REVIEW_ASSET_PRESERVED';
 END IF;
 IF TG_OP<>'UPDATE' OR NEW.is_current IS DISTINCT FROM OLD.is_current OR NEW.display_order IS DISTINCT FROM OLD.display_order THEN
  UPDATE public.contents SET material_revision=material_revision+1,
   editorial_status=CASE WHEN editorial_status='approved' AND published_at IS NULL THEN 'in_production' ELSE editorial_status END,
   approved_at=CASE WHEN editorial_status='approved' AND published_at IS NULL THEN NULL ELSE approved_at END,
   updated_at=clock_timestamp() WHERE id=cid;
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER review_asset_revision BEFORE INSERT OR UPDATE OR DELETE ON public.content_assets
FOR EACH ROW EXECUTE FUNCTION office_private.bump_asset_material_revision();

CREATE FUNCTION office_private.guard_review_snapshot()
RETURNS trigger LANGUAGE plpgsql SET search_path TO public,pg_temp AS $$
DECLARE pid uuid;
BEGIN
 pid := CASE WHEN TG_OP='DELETE' THEN OLD.presentation_id ELSE NEW.presentation_id END;
 -- Membership of the frozen round is immutable; serialize with preparation.
 PERFORM 1 FROM public.presentations WHERE id=pid FOR NO KEY UPDATE;
 IF TG_OP='INSERT' AND EXISTS(SELECT 1 FROM public.presentation_items WHERE presentation_id=pid AND review_id IS NOT NULL) THEN
  RAISE EXCEPTION 'ROUND_FROZEN_CREATE_NEXT';
 END IF;
 IF TG_OP='DELETE' THEN
  IF OLD.review_id IS NOT NULL OR OLD.client_approval_status<>'pending' THEN RAISE EXCEPTION 'ROUND_FROZEN_CREATE_NEXT'; END IF;
  RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' AND (OLD.review_id IS NOT NULL OR OLD.client_approval_status<>'pending') AND
   (NEW.presentation_id IS DISTINCT FROM OLD.presentation_id OR NEW.content_id IS DISTINCT FROM OLD.content_id
    OR NEW.display_order IS DISTINCT FROM OLD.display_order OR NEW.presentation_notes IS DISTINCT FROM OLD.presentation_notes) THEN
  RAISE EXCEPTION 'ROUND_FROZEN_CREATE_NEXT';
 END IF;
 IF TG_OP='UPDATE' AND OLD.review_id IS NOT NULL AND
   ROW(NEW.review_id,NEW.review_content,NEW.review_assets,NEW.review_material_revision,NEW.review_prepared_at)
   IS DISTINCT FROM ROW(OLD.review_id,OLD.review_content,OLD.review_assets,OLD.review_material_revision,OLD.review_prepared_at) THEN
  RAISE EXCEPTION 'REVIEW_IMMUTABLE';
 END IF;
 IF current_user IN ('anon','authenticated') AND
  (TG_OP='INSERT' AND NEW.review_id IS NOT NULL OR TG_OP='UPDATE' AND
   ROW(NEW.review_id,NEW.review_content,NEW.review_assets,NEW.review_material_revision,NEW.review_prepared_at)
   IS DISTINCT FROM ROW(OLD.review_id,OLD.review_content,OLD.review_assets,OLD.review_material_revision,OLD.review_prepared_at)) THEN
  RAISE EXCEPTION 'REVIEW_RPC_REQUIRED';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_review_snapshot BEFORE INSERT OR UPDATE OR DELETE ON public.presentation_items
FOR EACH ROW EXECUTE FUNCTION office_private.guard_review_snapshot();

CREATE FUNCTION public.prepare_presentation_review(p_presentation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,pg_temp AS $$
DECLARE pi record; co record; wid uuid;
BEGIN
 IF COALESCE(auth.role(),'')<>'authenticated' OR auth.uid() IS NULL
  OR NOT office_private.presentation_permission(p_presentation_id,'operation') THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
 -- Same order as decisions: content, presentation, client, item.
 PERFORM 1 FROM public.contents WHERE id IN (SELECT content_id FROM public.presentation_items WHERE presentation_id=p_presentation_id) ORDER BY id FOR NO KEY UPDATE;
 PERFORM 1 FROM public.presentations WHERE id=p_presentation_id FOR NO KEY UPDATE;
 IF NOT office_private.presentation_permission(p_presentation_id,'operation') THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.presentation_items WHERE presentation_id=p_presentation_id) THEN RAISE EXCEPTION 'EMPTY_PRESENTATION'; END IF;
 IF (SELECT count(*) FROM public.presentation_items WHERE presentation_id=p_presentation_id)>200
  OR (SELECT count(*) FROM public.content_assets a JOIN public.presentation_items linked_item ON linked_item.content_id=a.content_id
   WHERE linked_item.presentation_id=p_presentation_id AND a.is_current AND a.asset_type IN ('image','video','thumbnail'))>100 THEN RAISE EXCEPTION 'REVIEW_TOO_LARGE'; END IF;
 FOR pi IN SELECT * FROM public.presentation_items WHERE presentation_id=p_presentation_id ORDER BY id FOR UPDATE LOOP
  IF pi.review_id IS NOT NULL THEN CONTINUE; END IF;
  IF pi.client_approval_status<>'pending' THEN RAISE EXCEPTION 'LEGACY_REVIEW_CREATE_NEXT'; END IF;
  SELECT c.* INTO co FROM public.contents c JOIN public.presentations p ON p.client_id=c.client_id
   WHERE c.id=pi.content_id AND p.id=p_presentation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ITEM'; END IF;
  SELECT workspace_id INTO wid FROM public.clients WHERE id=co.client_id;
  IF EXISTS(SELECT 1 FROM public.content_assets a WHERE a.content_id=co.id AND a.is_current AND a.asset_type IN ('image','video','thumbnail')
   AND a.file_url !~* ('^workspace/'||wid::text||'/clients/'||co.client_id::text||'/contents/'||co.id::text||'/[0-9a-f-]{36}[.][a-z0-9]{1,32}$')) THEN
   RAISE EXCEPTION 'ASSET_PATH_REQUIRES_REVIEW';
  END IF;
  UPDATE public.presentation_items SET review_id=gen_random_uuid(), review_material_revision=co.material_revision,
   review_prepared_at=clock_timestamp(),
   review_content=jsonb_build_object('id',co.id,'client_id',co.client_id,'internal_title',co.internal_title,
    'format',co.format,'primary_channel',co.primary_channel,'caption',co.caption,'copy',co.copy,
    'script',co.script,'visual_copy',co.visual_copy,'goal',co.goal,'pillar',co.pillar,'funnel_stage',co.funnel_stage),
   review_assets=COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'content_id',a.content_id,
    'asset_type',a.asset_type,'file_url',a.file_url,'file_name',a.file_name,'mime_type',a.mime_type,
    'file_size_bytes',a.file_size_bytes,'version',a.version,'display_order',a.display_order,'is_current',true)
    ORDER BY a.display_order,a.asset_type,a.id) FROM public.content_assets a WHERE a.content_id=co.id AND a.is_current AND a.asset_type IN ('image','video','thumbnail')),'[]')
   WHERE id=pi.id;
 END LOOP;
END $$;

CREATE FUNCTION office_private.review_token_presentation(p_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,pg_temp AS $$
DECLARE link record;
BEGIN
 IF length(trim(COALESCE(p_token,''))) NOT BETWEEN 32 AND 256 THEN RAISE EXCEPTION 'INVALID_ACCESS_TOKEN'; END IF;
 SELECT l.* INTO link FROM public.presentation_access_links l
 WHERE token_hash=encode(extensions.digest(convert_to(trim(p_token),'UTF8'),'sha256'),'hex') FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ACCESS_TOKEN'; END IF;
 IF link.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'ACCESS_TOKEN_REVOKED'; END IF;
 IF link.expires_at IS NULL OR link.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'ACCESS_TOKEN_EXPIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.presentations p JOIN public.clients c ON c.id=p.client_id
  JOIN public.workspaces w ON w.id=c.workspace_id WHERE p.id=link.presentation_id AND w.status='active') THEN RAISE EXCEPTION 'INVALID_ACCESS_TOKEN'; END IF;
 RETURN link.presentation_id;
END $$;

CREATE OR REPLACE FUNCTION public.get_public_presentation(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,pg_temp AS $$
DECLARE pid uuid; result jsonb;
BEGIN
 pid:=office_private.review_token_presentation(p_token);
 SELECT jsonb_build_object('presentation',jsonb_build_object('id',p.id,'title',p.title,'description',p.description,
  'status',p.status,'round_number',p.round_number,'sent_at',p.sent_at,
  'client',jsonb_build_object('id',c.id,'name',c.name,'commercial_name',c.commercial_name,'logo_url',c.logo_url)),
  'items',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',pi.id,'presentation_id',pid,'content_id',pi.content_id,
   'display_order',pi.display_order,'presentation_notes',pi.presentation_notes,
   'client_approval_status',pi.client_approval_status,'client_feedback',pi.client_feedback,'reviewed_at',pi.reviewed_at,
   'review_id',pi.review_id,'review_prepared_at',pi.review_prepared_at,
   'content',COALESCE(pi.review_content,jsonb_build_object('id',co.id,'internal_title',co.internal_title,'format',co.format)),
   'assets',COALESCE(pi.review_assets,'[]')) ORDER BY pi.display_order,pi.id)
   FROM public.presentation_items pi JOIN public.contents co ON co.id=pi.content_id AND co.client_id=p.client_id
   WHERE pi.presentation_id=pid),'[]')) INTO result FROM public.presentations p JOIN public.clients c ON c.id=p.client_id WHERE p.id=pid;
 RETURN result || jsonb_build_object('access',jsonb_build_object('expires_at',
  (SELECT expires_at FROM public.presentation_access_links WHERE token_hash=encode(extensions.digest(convert_to(trim(p_token),'UTF8'),'sha256'),'hex'))));
END $$;

CREATE FUNCTION public.submit_presentation_review_decision(p_item_id uuid,p_review_id uuid,p_status text,
 p_feedback text DEFAULT NULL,p_token text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,pg_temp AS $$
DECLARE ref record; pi record; co record; pid uuid; answer jsonb;
BEGIN
 IF p_token IS NOT NULL THEN pid:=office_private.review_token_presentation(p_token); END IF;
 SELECT * INTO ref FROM public.presentation_items WHERE id=p_item_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ITEM'; END IF;
 IF p_token IS NOT NULL AND pid IS DISTINCT FROM ref.presentation_id THEN RAISE EXCEPTION 'INVALID_ITEM'; END IF;
 IF p_token IS NULL AND (COALESCE(auth.role(),'')<>'authenticated' OR auth.uid() IS NULL
  OR NOT office_private.presentation_permission(ref.presentation_id,'operation')) THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
 SELECT * INTO co FROM public.contents WHERE id=ref.content_id FOR NO KEY UPDATE;
 PERFORM 1 FROM public.presentations WHERE id=ref.presentation_id AND client_id=co.client_id FOR NO KEY UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ITEM'; END IF;
 PERFORM 1 FROM public.clients WHERE id=co.client_id FOR SHARE;
 SELECT * INTO pi FROM public.presentation_items WHERE id=p_item_id FOR UPDATE;
 IF pi.presentation_id IS DISTINCT FROM ref.presentation_id OR pi.content_id IS DISTINCT FROM ref.content_id THEN RAISE EXCEPTION 'INVALID_ITEM'; END IF;
 IF p_token IS NOT NULL THEN PERFORM office_private.review_token_presentation(p_token);
 ELSIF NOT office_private.presentation_permission(ref.presentation_id,'operation') THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
 IF p_review_id IS NULL OR pi.review_id IS DISTINCT FROM p_review_id THEN RAISE EXCEPTION 'REVIEW_VERSION_REQUIRED'; END IF;
 IF pi.client_approval_status<>'pending' THEN RAISE EXCEPTION 'ITEM_ALREADY_REVIEWED'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('approved','changes_requested','rejected') THEN RAISE EXCEPTION 'INVALID_DECISION_STATUS'; END IF;
 IF length(COALESCE(p_feedback,''))>10000 THEN RAISE EXCEPTION 'FEEDBACK_TOO_LONG'; END IF;
 IF p_status IN ('changes_requested','rejected') AND nullif(trim(p_feedback),'') IS NULL THEN RAISE EXCEPTION 'FEEDBACK_REQUIRED'; END IF;
 answer:=public.reconcile_presentation_item_decision(p_item_id,p_status,p_feedback,NULL,false);
 -- An old frozen round may be approved, but must never approve newer current material.
 IF co.material_revision<>pi.review_material_revision OR EXISTS(
  SELECT 1 FROM public.presentation_items newer WHERE newer.content_id=pi.content_id
   AND newer.review_prepared_at>pi.review_prepared_at) THEN
  UPDATE public.contents SET editorial_status=co.editorial_status,approved_at=co.approved_at WHERE id=co.id;
 END IF;
 RETURN answer || jsonb_build_object('review_id',pi.review_id);
END $$;

-- Old callers must reload; they do not identify the revision actually displayed.
CREATE OR REPLACE FUNCTION public.submit_public_presentation_decision(p_token text,p_item_id uuid,p_status text,p_feedback text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO public,pg_temp AS $$ BEGIN RAISE EXCEPTION 'REVIEW_VERSION_REQUIRED'; END $$;
CREATE OR REPLACE FUNCTION public.update_presentation_item_admin_decision(p_item_id uuid,p_status text,p_feedback text DEFAULT NULL,
 p_presentation_notes text DEFAULT NULL,p_update_notes boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO public,pg_temp AS $$ BEGIN RAISE EXCEPTION 'REVIEW_VERSION_REQUIRED'; END $$;

REVOKE ALL ON FUNCTION office_private.bump_content_material_revision(),office_private.bump_asset_material_revision(),
 office_private.guard_review_snapshot(),office_private.review_token_presentation(text),office_private.guard_review_content_delete() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.prepare_presentation_review(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.prepare_presentation_review(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_presentation_review_decision(uuid,uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_presentation_review_decision(uuid,uuid,text,text,text) TO anon,authenticated;
REVOKE ALL ON FUNCTION public.get_public_presentation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_presentation(text) TO anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.reconcile_presentation_item_decision(uuid,text,text,text,boolean) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION office_private.guard_asset_version_write()
RETURNS trigger LANGUAGE plpgsql SET search_path TO public,pg_temp AS $$
BEGIN
 IF current_user IN ('anon','authenticated') AND
  (TG_OP='DELETE' OR NEW.is_current IS DISTINCT FROM OLD.is_current OR NEW.display_order IS DISTINCT FROM OLD.display_order) THEN
  RAISE EXCEPTION 'ASSET_VERSION_RPC_REQUIRED';
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER guard_asset_version_write BEFORE UPDATE OR DELETE ON public.content_assets
FOR EACH ROW EXECUTE FUNCTION office_private.guard_asset_version_write();

CREATE FUNCTION public.mutate_content_asset_version(p_content_id uuid,p_target_id uuid DEFAULT NULL,
 p_file jsonb DEFAULT NULL,p_order uuid[] DEFAULT NULL,p_remove boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,pg_temp AS $$
DECLARE co record; old_asset record; new_asset record; wid uuid; path text; n integer;
BEGIN
 SELECT * INTO co FROM public.contents WHERE id=p_content_id FOR NO KEY UPDATE;
 IF NOT FOUND OR NOT office_private.contents_client_permission(co.client_id,'operation') THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
 SELECT workspace_id INTO wid FROM public.clients WHERE id=co.client_id FOR SHARE;
 IF NOT office_private.contents_client_permission(co.client_id,'operation') THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
 IF p_order IS NOT NULL THEN
  IF p_target_id IS NOT NULL OR p_file IS NOT NULL OR p_remove THEN RAISE EXCEPTION 'INVALID_ASSET_ACTION'; END IF;
  IF cardinality(p_order)<>(SELECT count(DISTINCT x) FROM unnest(p_order) x)
   OR EXISTS(SELECT 1 FROM unnest(p_order) x WHERE x IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.content_assets a WHERE a.id=x AND a.content_id=p_content_id AND a.is_current AND a.asset_type='image'))
   OR cardinality(p_order)<>(SELECT count(*) FROM public.content_assets WHERE content_id=p_content_id AND is_current AND asset_type='image') THEN
    RAISE EXCEPTION 'INVALID_ASSET_ORDER';
  END IF;
  UPDATE public.content_assets a SET display_order=o.pos-1 FROM unnest(p_order) WITH ORDINALITY o(id,pos) WHERE a.id=o.id;
  RETURN '{}'::jsonb;
 END IF;
 SELECT * INTO old_asset FROM public.content_assets WHERE id=p_target_id AND content_id=p_content_id AND is_current FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'CURRENT_ASSET_NOT_FOUND'; END IF;
 IF p_remove THEN
  IF p_file IS NOT NULL THEN RAISE EXCEPTION 'INVALID_ASSET_ACTION'; END IF;
  UPDATE public.content_assets SET is_current=false WHERE id=p_target_id;
  WITH ordered AS (SELECT id,row_number() OVER(ORDER BY display_order,id)-1 pos FROM public.content_assets
   WHERE content_id=p_content_id AND is_current AND asset_type=old_asset.asset_type)
  UPDATE public.content_assets a SET display_order=o.pos FROM ordered o WHERE a.id=o.id;
  RETURN '{}'::jsonb;
 END IF;
 path:=p_file->>'file_url';
 IF p_file IS NULL OR p_file->>'file_size_bytes' IS NULL OR p_file->>'mime_type' IS NULL
  OR path IS NULL OR path NOT LIKE 'workspace/'||wid::text||'/clients/'||co.client_id::text||'/contents/'||p_content_id::text||'/%'
  OR path LIKE '%..%' OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='content-assets' AND name=path)
  OR (p_file->>'file_size_bytes')::bigint NOT BETWEEN 1 AND 52428800
  OR (old_asset.asset_type IN ('image','thumbnail') AND p_file->>'mime_type' NOT IN ('image/jpeg','image/png','image/webp'))
  OR (old_asset.asset_type='video' AND p_file->>'mime_type'<>'video/mp4') THEN RAISE EXCEPTION 'INVALID_ASSET_FILE'; END IF;
 UPDATE public.content_assets SET is_current=false WHERE id=p_target_id;
 INSERT INTO public.content_assets(content_id,asset_type,file_url,file_name,file_size_bytes,mime_type,version,display_order,is_current)
 VALUES(p_content_id,old_asset.asset_type,path,p_file->>'file_name',(p_file->>'file_size_bytes')::bigint,p_file->>'mime_type',
  old_asset.version+1,old_asset.display_order,true) RETURNING * INTO new_asset;
 RETURN to_jsonb(new_asset);
END $$;
REVOKE ALL ON FUNCTION office_private.guard_asset_version_write() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.mutate_content_asset_version(uuid,uuid,jsonb,uuid[],boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mutate_content_asset_version(uuid,uuid,jsonb,uuid[],boolean) TO authenticated;

CREATE FUNCTION office_private.require_prepared_review_link()
RETURNS trigger LANGUAGE plpgsql SET search_path TO public,pg_temp AS $$
BEGIN
 PERFORM 1 FROM public.presentations WHERE id=NEW.presentation_id FOR NO KEY UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.presentation_items WHERE presentation_id=NEW.presentation_id)
  OR EXISTS(SELECT 1 FROM public.presentation_items WHERE presentation_id=NEW.presentation_id AND review_id IS NULL) THEN
  RAISE EXCEPTION 'PREPARE_REVIEW_BEFORE_SHARING';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER require_prepared_review_link BEFORE INSERT ON public.presentation_access_links
FOR EACH ROW EXECUTE FUNCTION office_private.require_prepared_review_link();
REVOKE ALL ON FUNCTION office_private.require_prepared_review_link() FROM PUBLIC,anon,authenticated;
