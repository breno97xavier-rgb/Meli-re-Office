-- ==============================================================================
-- Migration: 20260914084000_set_editorial_plan_pillars_rpc.sql
-- Description: RPC Transacional Hardened para Sincronização de Pilares do Ciclo Editorial
-- Phase: F5.4A-H1 (NÃO APLICADA AO BANCO ATIVO - AGUARDANDO REVISÃO E EXECUÇÃO MANUAL)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.set_editorial_plan_pillars(
  p_editorial_plan_id uuid,
  p_client_id uuid,
  p_allocations jsonb
)
RETURNS SETOF public.editorial_plan_pillars
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role text;
  v_plan_exists boolean;
  v_total_allocations integer;
  v_unique_pillars_count integer;
  v_invalid_pillars_count integer;
  v_negative_targets_count integer;
  v_null_targets_count integer;
  v_inactive_new_pillars_count integer;
  v_alloc record;
BEGIN
  -- 1. Verificação de Autenticação e Autorização Interna (Hardening de SECURITY DEFINER)
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'auth_required: Operação não autorizada. Usuário não autenticado.';
  END IF;

  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = v_caller_id;

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'team') THEN
    RAISE EXCEPTION 'permission_denied: Permissão insuficiente para gerenciar pilares do plano editorial.';
  END IF;

  -- 2. Validação do Formato do Payload
  IF p_allocations IS NOT NULL AND jsonb_typeof(p_allocations) <> 'array' THEN
    RAISE EXCEPTION 'invalid_payload: O parâmetro de alocações deve ser um array JSON ou nulo.';
  END IF;

  -- 3. Validação de Isolamento de Tenant / Existência do Plano
  SELECT EXISTS (
    SELECT 1 FROM public.editorial_plans
    WHERE id = p_editorial_plan_id AND client_id = p_client_id
  ) INTO v_plan_exists;

  IF NOT v_plan_exists THEN
    RAISE EXCEPTION 'editorial_plan_client_mismatch: O plano editorial informado não pertence a este cliente ou não existe.';
  END IF;

  -- 4. Tratamento de Lista Vazia / Nula: Exclui todas as associações de pilares do plano
  IF p_allocations IS NULL OR jsonb_array_length(p_allocations) = 0 THEN
    DELETE FROM public.editorial_plan_pillars
    WHERE editorial_plan_id = p_editorial_plan_id AND client_id = p_client_id;
    RETURN;
  END IF;

  -- 5. Validação de Duplicatas no Payload
  v_total_allocations := jsonb_array_length(p_allocations);

  SELECT COUNT(DISTINCT (alloc->>'pillar_id')::uuid) INTO v_unique_pillars_count
  FROM jsonb_array_elements(p_allocations) AS alloc
  WHERE alloc->>'pillar_id' IS NOT NULL;

  IF v_unique_pillars_count <> v_total_allocations THEN
    RAISE EXCEPTION 'duplicate_pillar_allocation: O payload contém alocações duplicadas para o mesmo pilar.';
  END IF;

  -- 6. Validação Estrita de target_count (Rejeita negativos e nulos - sem normalização silenciosa)
  SELECT COUNT(*) INTO v_null_targets_count
  FROM jsonb_array_elements(p_allocations) AS alloc
  WHERE alloc->>'target_count' IS NULL;

  IF v_null_targets_count > 0 THEN
    RAISE EXCEPTION 'check_editorial_plan_pillars_target: O valor de meta (target_count) não pode ser nulo.';
  END IF;

  SELECT COUNT(*) INTO v_negative_targets_count
  FROM jsonb_array_elements(p_allocations) AS alloc
  WHERE (alloc->>'target_count')::integer < 0;

  IF v_negative_targets_count > 0 THEN
    RAISE EXCEPTION 'check_editorial_plan_pillars_target: A meta de conteúdos por pilar deve ser maior ou igual a zero.';
  END IF;

  -- 7. Validação de Tenant dos Pilares (Todos os pilares devem pertencer ao p_client_id)
  SELECT COUNT(*) INTO v_invalid_pillars_count
  FROM jsonb_array_elements(p_allocations) AS alloc
  LEFT JOIN public.client_pillars cp 
    ON cp.id = (alloc->>'pillar_id')::uuid AND cp.client_id = p_client_id
  WHERE cp.id IS NULL;

  IF v_invalid_pillars_count > 0 THEN
    RAISE EXCEPTION 'pillar_client_mismatch: Um ou mais pilares selecionados não pertencem ao cliente informado.';
  END IF;

  -- 8. Validação de Pilares Ativos vs. Históricos:
  -- Novos vínculos para este plano exigem client_pillars.is_active = true.
  -- Pilares que já faziam parte do plano podem ser mantidos mesmo que agora estejam inativos.
  SELECT COUNT(*) INTO v_inactive_new_pillars_count
  FROM jsonb_array_elements(p_allocations) AS alloc
  JOIN public.client_pillars cp ON cp.id = (alloc->>'pillar_id')::uuid AND cp.client_id = p_client_id
  WHERE cp.is_active = false
    AND NOT EXISTS (
      SELECT 1 FROM public.editorial_plan_pillars existing
      WHERE existing.editorial_plan_id = p_editorial_plan_id
        AND existing.pillar_id = cp.id
        AND existing.client_id = p_client_id
    );

  IF v_inactive_new_pillars_count > 0 THEN
    RAISE EXCEPTION 'inactive_pillar_not_allowed: Não é permitido associar pilares inativos a novos planos.';
  END IF;

  -- 9. Exclusão Atômica dos Pilares que não constam mais na nova distribuição
  DELETE FROM public.editorial_plan_pillars
  WHERE editorial_plan_id = p_editorial_plan_id
    AND client_id = p_client_id
    AND pillar_id NOT IN (
      SELECT (alloc->>'pillar_id')::uuid
      FROM jsonb_array_elements(p_allocations) AS alloc
    );

  -- 10. Upsert Atômico das Alocações
  FOR v_alloc IN (
    SELECT 
      (alloc->>'pillar_id')::uuid AS pillar_id,
      (alloc->>'target_count')::integer AS target_count
    FROM jsonb_array_elements(p_allocations) AS alloc
  ) LOOP
    INSERT INTO public.editorial_plan_pillars (
      client_id,
      editorial_plan_id,
      pillar_id,
      target_count
    ) VALUES (
      p_client_id,
      p_editorial_plan_id,
      v_alloc.pillar_id,
      v_alloc.target_count
    )
    ON CONFLICT (editorial_plan_id, pillar_id)
    DO UPDATE SET 
      target_count = EXCLUDED.target_count,
      updated_at = clock_timestamp();
  END LOOP;

  -- 11. Retorna as linhas atualizadas do plano
  RETURN QUERY
  SELECT * FROM public.editorial_plan_pillars
  WHERE editorial_plan_id = p_editorial_plan_id AND client_id = p_client_id
  ORDER BY created_at ASC;
END;
$$;

-- Revoke de segurança e concessão de privilégios mínimos
REVOKE ALL ON FUNCTION public.set_editorial_plan_pillars(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_editorial_plan_pillars(uuid, uuid, jsonb) FROM anon;

GRANT EXECUTE ON FUNCTION public.set_editorial_plan_pillars(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_editorial_plan_pillars(uuid, uuid, jsonb) TO service_role;
