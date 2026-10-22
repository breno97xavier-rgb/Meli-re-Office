-- PROPOSTA LOCAL. Não aplicada. Promover a migração incremental somente após revisão.
-- Escopo: cinco tabelas de Planejamento e a RPC de distribuição existente.
BEGIN;

CREATE OR REPLACE FUNCTION public.can_access_planning_client(p_client_id uuid, p_level text DEFAULT 'view')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $fn$
  SELECT auth.uid() IS NOT NULL AND p_client_id IS NOT NULL
    AND p_level IN ('view','operation','management')
    AND EXISTS (
      SELECT 1 FROM public.clients c JOIN public.workspaces w ON w.id=c.workspace_id
      WHERE c.id=p_client_id AND w.status='active'
        AND public.has_workspace_client_access(c.workspace_id,c.id)
        AND public.has_workspace_permission(c.workspace_id,'planning',p_level)
    );
$fn$;
REVOKE ALL ON FUNCTION public.can_access_planning_client(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_planning_client(uuid,text) TO authenticated;

-- Interrompe em caso de policies desconhecidas: não somar regras permissivas a legado.
DO $block$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['client_strategies','client_pillars','editorial_plans','editorial_plan_pillars','campaigns'] LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      IF p.policyname <> 'Admin and team can manage '||t
         AND p.policyname NOT IN ('planning_select','planning_insert','planning_update','planning_delete') THEN
        RAISE EXCEPTION 'Unexpected policy on %: %. Review before migration.',t,p.policyname;
      END IF;
    END LOOP;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I','Admin and team can manage '||t,t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('DROP POLICY IF EXISTS planning_select ON public.%I',t);
    EXECUTE format('DROP POLICY IF EXISTS planning_insert ON public.%I',t);
    EXECUTE format('DROP POLICY IF EXISTS planning_update ON public.%I',t);
    EXECUTE format('DROP POLICY IF EXISTS planning_delete ON public.%I',t);
    EXECUTE format('CREATE POLICY planning_select ON public.%I FOR SELECT TO authenticated USING (public.can_access_planning_client(client_id,''view''))',t);
    EXECUTE format('CREATE POLICY planning_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_access_planning_client(client_id,''operation''))',t);
    EXECUTE format('CREATE POLICY planning_update ON public.%I FOR UPDATE TO authenticated USING (public.can_access_planning_client(client_id,''operation'')) WITH CHECK (public.can_access_planning_client(client_id,''operation''))',t);
    EXECUTE format('CREATE POLICY planning_delete ON public.%I FOR DELETE TO authenticated USING (public.can_access_planning_client(client_id,''management''))',t);
  END LOOP;
END;
$block$;

-- Mesmo contrato público e retorno. Autorização tenant-aware, bloqueio por plano,
-- validação completa antes de remover associações e nenhuma escrita fora do plano.
CREATE OR REPLACE FUNCTION public.set_editorial_plan_pillars(
  p_editorial_plan_id uuid,p_client_id uuid,p_allocations jsonb
) RETURNS SETOF public.editorial_plan_pillars
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE v_alloc jsonb; v_allocations jsonb:=coalesce(p_allocations,'[]'::jsonb);
BEGIN
  IF NOT coalesce(public.can_access_planning_client(p_client_id,'operation'),false) THEN
    RAISE EXCEPTION 'permission_denied: Planejamento sem autorização para este cliente.' USING ERRCODE='42501';
  END IF;
  PERFORM 1 FROM public.editorial_plans WHERE id=p_editorial_plan_id AND client_id=p_client_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'editorial_plan_client_mismatch'; END IF;
  IF NOT coalesce(public.can_access_planning_client(p_client_id,'operation'),false) THEN
    RAISE EXCEPTION 'permission_denied: Autorização alterada durante a operação.' USING ERRCODE='42501';
  END IF;
  IF jsonb_typeof(v_allocations)<>'array' THEN RAISE EXCEPTION 'invalid_payload'; END IF;
  FOR v_alloc IN SELECT value FROM jsonb_array_elements(v_allocations) LOOP
    IF jsonb_typeof(v_alloc)<>'object'
      OR jsonb_typeof(v_alloc->'pillar_id') IS DISTINCT FROM 'string'
      OR jsonb_typeof(v_alloc->'target_count') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'invalid_payload';
    END IF;
    IF (v_alloc->>'target_count')::numeric<0
      OR (v_alloc->>'target_count')::numeric>2147483647
      OR trunc((v_alloc->>'target_count')::numeric)<>(v_alloc->>'target_count')::numeric THEN
      RAISE EXCEPTION 'check_editorial_plan_pillars_target';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.client_pillars WHERE id=(v_alloc->>'pillar_id')::uuid AND client_id=p_client_id) THEN
      RAISE EXCEPTION 'pillar_client_mismatch';
    END IF;
    IF EXISTS (SELECT 1 FROM public.client_pillars cp WHERE cp.id=(v_alloc->>'pillar_id')::uuid AND NOT cp.is_active
      AND NOT EXISTS (SELECT 1 FROM public.editorial_plan_pillars e WHERE e.editorial_plan_id=p_editorial_plan_id AND e.pillar_id=cp.id)) THEN
      RAISE EXCEPTION 'inactive_pillar_not_allowed';
    END IF;
  END LOOP;
  IF (SELECT count(*)<>count(DISTINCT (value->>'pillar_id')::uuid) FROM jsonb_array_elements(v_allocations)) THEN
    RAISE EXCEPTION 'duplicate_pillar_allocation';
  END IF;
  DELETE FROM public.editorial_plan_pillars WHERE editorial_plan_id=p_editorial_plan_id AND client_id=p_client_id
    AND pillar_id NOT IN (SELECT (value->>'pillar_id')::uuid FROM jsonb_array_elements(v_allocations));
  INSERT INTO public.editorial_plan_pillars(client_id,editorial_plan_id,pillar_id,target_count)
    SELECT p_client_id,p_editorial_plan_id,(value->>'pillar_id')::uuid,((value->>'target_count')::numeric)::integer
    FROM jsonb_array_elements(v_allocations)
    ON CONFLICT(editorial_plan_id,pillar_id) DO UPDATE SET target_count=excluded.target_count,updated_at=clock_timestamp();
  RETURN QUERY SELECT * FROM public.editorial_plan_pillars WHERE editorial_plan_id=p_editorial_plan_id AND client_id=p_client_id ORDER BY created_at,id;
END;
$fn$;
REVOKE ALL ON FUNCTION public.set_editorial_plan_pillars(uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_editorial_plan_pillars(uuid,uuid,jsonb) TO authenticated;
COMMIT;
