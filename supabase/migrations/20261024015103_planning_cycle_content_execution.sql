-- PROPOSTA LOCAL de 23/10/2026. Não aplicada ao Supabase.
BEGIN;
CREATE SCHEMA IF NOT EXISTS office_private;
GRANT USAGE ON SCHEMA office_private TO authenticated;
CREATE OR REPLACE FUNCTION office_private.contents_client_permission(p_client_id uuid,p_level text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT auth.uid() IS NOT NULL AND p_level IN ('view','operation','management') AND EXISTS (
  SELECT 1 FROM public.clients c JOIN public.workspaces w ON w.id=c.workspace_id
  WHERE c.id=p_client_id AND w.status='active'
   AND public.has_workspace_client_access(c.workspace_id,c.id)
   AND public.has_workspace_permission(c.workspace_id,'contents',p_level));
$$;
REVOKE ALL ON FUNCTION office_private.contents_client_permission(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION office_private.contents_client_permission(uuid,text) TO authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='contents'
  AND policyname NOT IN ('Admins have full access to contents','contents_select','contents_insert','contents_update','contents_delete')) THEN
  RAISE EXCEPTION 'unexpected_contents_policy';
 END IF;
END $$;
DROP POLICY IF EXISTS "Admins have full access to contents" ON public.contents;
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY contents_select ON public.contents FOR SELECT TO authenticated USING (office_private.contents_client_permission(client_id,'view'));
CREATE POLICY contents_insert ON public.contents FOR INSERT TO authenticated WITH CHECK (office_private.contents_client_permission(client_id,'operation'));
CREATE POLICY contents_update ON public.contents FOR UPDATE TO authenticated USING (office_private.contents_client_permission(client_id,'operation')) WITH CHECK (office_private.contents_client_permission(client_id,'operation'));
CREATE POLICY contents_delete ON public.contents FOR DELETE TO authenticated USING (office_private.contents_client_permission(client_id,'management'));

-- A classificação editorial é livre, como no modelo; formatos e estados não mudam.
ALTER TABLE public.contents DROP CONSTRAINT contents_funnel_stage_check;
ALTER TABLE public.contents ADD CONSTRAINT contents_funnel_stage_check CHECK (funnel_stage IS NULL OR length(funnel_stage)<=10000);
ALTER TABLE public.contents DROP CONSTRAINT contents_primary_channel_check;
ALTER TABLE public.contents ALTER COLUMN primary_channel DROP NOT NULL;
ALTER TABLE public.contents ADD CONSTRAINT contents_primary_channel_check CHECK (primary_channel IN ('instagram','facebook','linkedin','tiktok','youtube','blog','newsletter','whatsapp','other'));
ALTER TABLE public.editorial_plans ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE public.editorial_plans ALTER COLUMN end_date DROP NOT NULL;
ALTER TABLE public.editorial_plans DROP CONSTRAINT check_editorial_plans_dates;
ALTER TABLE public.editorial_plans ADD CONSTRAINT check_editorial_plans_dates CHECK (
 (start_date IS NULL AND end_date IS NULL) OR (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date>=start_date));

CREATE TABLE public.editorial_cycle_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
 editorial_plan_id uuid NOT NULL UNIQUE, template_id uuid NOT NULL, template_revision integer NOT NULL,
 snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'), created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(editorial_plan_id,client_id) REFERENCES public.editorial_plans(id,client_id) ON DELETE RESTRICT,
 FOREIGN KEY(template_id,client_id) REFERENCES public.client_editorial_templates(id,client_id) ON DELETE RESTRICT,
 UNIQUE(id,client_id));
CREATE TABLE public.editorial_cycle_content_links (
 application_id uuid NOT NULL, client_id uuid NOT NULL, slot_id uuid NOT NULL, unit_index integer NOT NULL CHECK(unit_index BETWEEN 1 AND 1000),
 content_id uuid NOT NULL UNIQUE REFERENCES public.contents(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(application_id,slot_id,unit_index),
 FOREIGN KEY(application_id,client_id) REFERENCES public.editorial_cycle_applications(id,client_id) ON DELETE RESTRICT);
ALTER TABLE public.editorial_cycle_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_cycle_content_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.editorial_cycle_applications,public.editorial_cycle_content_links FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.editorial_cycle_applications,public.editorial_cycle_content_links TO authenticated;
CREATE POLICY cycle_application_select ON public.editorial_cycle_applications FOR SELECT TO authenticated USING(public.can_access_planning_client(client_id,'view'));
CREATE POLICY cycle_link_select ON public.editorial_cycle_content_links FOR SELECT TO authenticated USING(public.can_access_planning_client(client_id,'view') AND office_private.contents_client_permission(client_id,'view'));

CREATE FUNCTION public.apply_editorial_template(p_client_id uuid,p_plan_id uuid,p_template_id uuid,p_revision integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE model public.client_editorial_templates; application public.editorial_cycle_applications;
BEGIN
 IF NOT coalesce(public.can_access_planning_client(p_client_id,'operation'),false) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.editorial_plans WHERE id=p_plan_id AND client_id=p_client_id AND status IN ('draft','active') FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'cycle_unavailable'; END IF;
 IF NOT coalesce(public.can_access_planning_client(p_client_id,'operation'),false) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO application FROM public.editorial_cycle_applications WHERE editorial_plan_id=p_plan_id;
 IF FOUND THEN
  IF application.template_id=p_template_id AND application.template_revision=p_revision THEN RETURN to_jsonb(application); END IF;
  RAISE EXCEPTION 'cycle_already_applied';
 END IF;
 SELECT * INTO model FROM public.client_editorial_templates WHERE id=p_template_id AND client_id=p_client_id AND is_active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'template_unavailable'; END IF;
 IF model.revision IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'revision_conflict'; END IF;
 INSERT INTO public.editorial_cycle_applications(client_id,editorial_plan_id,template_id,template_revision,snapshot)
 VALUES(p_client_id,p_plan_id,model.id,model.revision,to_jsonb(model)) RETURNING * INTO application;
 RETURN to_jsonb(application);
END $$;
REVOKE ALL ON FUNCTION public.apply_editorial_template(uuid,uuid,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.apply_editorial_template(uuid,uuid,uuid,integer) TO authenticated;

CREATE FUNCTION public.resolve_editorial_slot_content(p_client_id uuid,p_application_id uuid,p_slot_id uuid,p_unit_index integer,p_content_id uuid DEFAULT NULL,p_input jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE application public.editorial_cycle_applications; slot jsonb; piece public.contents; existing uuid; k text;
BEGIN
 IF NOT coalesce(public.can_access_planning_client(p_client_id,'operation'),false) OR NOT coalesce(office_private.contents_client_permission(p_client_id,'operation'),false) THEN
  RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
 -- Serialização por aplicação: todos os retries da mesma unidade observam o vínculo salvo.
 SELECT * INTO application FROM public.editorial_cycle_applications WHERE id=p_application_id AND client_id=p_client_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'application_unavailable'; END IF;
 PERFORM 1 FROM public.editorial_plans WHERE id=application.editorial_plan_id AND client_id=p_client_id AND status IN ('draft','active') FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'cycle_unavailable'; END IF;
 IF NOT coalesce(public.can_access_planning_client(p_client_id,'operation'),false) OR NOT coalesce(office_private.contents_client_permission(p_client_id,'operation'),false) THEN
  RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
 SELECT value INTO slot FROM jsonb_array_elements(application.snapshot->'slots') WHERE (value->>'id')::uuid=p_slot_id;
 IF slot IS NULL OR NOT (slot->>'is_active')::boolean OR p_unit_index IS NULL OR p_unit_index<1 OR p_unit_index>(slot->>'quantity')::integer THEN RAISE EXCEPTION 'slot_unavailable'; END IF;
 SELECT content_id INTO existing FROM public.editorial_cycle_content_links WHERE application_id=p_application_id AND slot_id=p_slot_id AND unit_index=p_unit_index;
 IF FOUND THEN
  IF p_content_id IS NOT NULL AND p_content_id<>existing THEN RAISE EXCEPTION 'slot_already_linked'; END IF;
  SELECT * INTO piece FROM public.contents WHERE id=existing;
  RETURN to_jsonb(piece);
 END IF;
 IF p_content_id IS NOT NULL THEN
  IF p_input IS NOT NULL THEN RAISE EXCEPTION 'ambiguous_content_request'; END IF;
  SELECT * INTO piece FROM public.contents WHERE id=p_content_id AND client_id=p_client_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'content_unavailable'; END IF;
  IF piece.editorial_plan_id IS NOT NULL AND piece.editorial_plan_id<>application.editorial_plan_id THEN RAISE EXCEPTION 'content_other_cycle'; END IF;
  IF piece.editorial_plan_id IS NULL THEN UPDATE public.contents SET editorial_plan_id=application.editorial_plan_id WHERE id=piece.id RETURNING * INTO piece; END IF;
 ELSE
  IF p_input IS NULL OR jsonb_typeof(p_input)<>'object' THEN RAISE EXCEPTION 'invalid_content_input'; END IF;
  FOR k IN SELECT jsonb_object_keys(p_input) LOOP
   IF k NOT IN ('internal_title','format','primary_channel','goal','funnel_stage','copy','caption','visual_copy','script','planned_date','notes','editorial_status','pillar_id','campaign_id','assigned_to') THEN RAISE EXCEPTION 'invalid_content_field'; END IF;
   IF jsonb_typeof(p_input->k) NOT IN ('string','null') THEN RAISE EXCEPTION 'invalid_content_input'; END IF;
  END LOOP;
  IF nullif(btrim(p_input->>'internal_title'),'') IS NULL THEN RAISE EXCEPTION 'content_title_required'; END IF;
  IF p_input->>'editorial_status' IS DISTINCT FROM 'draft' THEN RAISE EXCEPTION 'content_must_start_draft'; END IF;
  IF nullif(p_input->>'planned_date','') IS NOT NULL AND (p_input->>'planned_date') !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'invalid_civil_date'; END IF;
  IF nullif(p_input->>'pillar_id','') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.client_pillars WHERE id=(p_input->>'pillar_id')::uuid AND client_id=p_client_id) THEN RAISE EXCEPTION 'pillar_client_mismatch'; END IF;
  IF nullif(p_input->>'campaign_id','') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.campaigns WHERE id=(p_input->>'campaign_id')::uuid AND client_id=p_client_id) THEN RAISE EXCEPTION 'campaign_client_mismatch'; END IF;
  -- Atribuição exige membership ativo no mesmo workspace e escopo para o cliente.
  IF nullif(p_input->>'assigned_to','') IS NOT NULL AND NOT EXISTS(
   SELECT 1 FROM public.clients c JOIN public.workspace_members m ON m.workspace_id=c.workspace_id
   WHERE c.id=p_client_id AND m.user_id=(p_input->>'assigned_to')::uuid AND m.status='active'
    AND (m.role IN ('owner','admin') OR m.client_scope='all' OR EXISTS(SELECT 1 FROM public.workspace_member_client_assignments a WHERE a.membership_id=m.id AND a.workspace_id=c.workspace_id AND a.client_id=c.id))) THEN RAISE EXCEPTION 'assignee_unavailable'; END IF;
  INSERT INTO public.contents(client_id,internal_title,format,primary_channel,goal,funnel_stage,copy,caption,visual_copy,script,planned_date,notes,editorial_status,editorial_plan_id,pillar_id,campaign_id,assigned_to)
  VALUES(p_client_id,btrim(p_input->>'internal_title'),p_input->>'format',nullif(p_input->>'primary_channel',''),p_input->>'goal',nullif(p_input->>'funnel_stage',''),p_input->>'copy',p_input->>'caption',p_input->>'visual_copy',p_input->>'script',nullif(p_input->>'planned_date','')::date,p_input->>'notes','draft',application.editorial_plan_id,nullif(p_input->>'pillar_id','')::uuid,nullif(p_input->>'campaign_id','')::uuid,nullif(p_input->>'assigned_to','')::uuid)
  RETURNING * INTO piece;
 END IF;
 INSERT INTO public.editorial_cycle_content_links(application_id,client_id,slot_id,unit_index,content_id) VALUES(application.id,p_client_id,p_slot_id,p_unit_index,piece.id);
 RETURN to_jsonb(piece);
END $$;
REVOKE ALL ON FUNCTION public.resolve_editorial_slot_content(uuid,uuid,uuid,integer,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.resolve_editorial_slot_content(uuid,uuid,uuid,integer,uuid,jsonb) TO authenticated;

-- Edição normal continua liberada; mover uma peça vinculada para outro cliente/ciclo quebraria o histórico.
CREATE FUNCTION office_private.protect_editorial_content_link() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF (NEW.client_id IS DISTINCT FROM OLD.client_id OR NEW.editorial_plan_id IS DISTINCT FROM OLD.editorial_plan_id OR NEW.id IS DISTINCT FROM OLD.id)
  AND EXISTS(SELECT 1 FROM public.editorial_cycle_content_links WHERE content_id=OLD.id) THEN RAISE EXCEPTION 'linked_content_scope_immutable'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION office_private.protect_editorial_content_link() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER protect_editorial_content_link BEFORE UPDATE OF id,client_id,editorial_plan_id ON public.contents FOR EACH ROW EXECUTE FUNCTION office_private.protect_editorial_content_link();
COMMIT;
