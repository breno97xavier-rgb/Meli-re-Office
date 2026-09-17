-- ==============================================================================
-- Migration: 20260912134000_submit_public_presentation_decision.sql
-- Description: RPC Segura para registro de decisões públicas do cliente via token
-- Phase: F4.3B
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.submit_public_presentation_decision(
  p_token text,
  p_item_id uuid,
  p_status text,
  p_feedback text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_normalized_token text;
  v_normalized_status text;
  v_normalized_feedback text;
  v_link record;
  v_item record;
  v_pending_count integer;
  v_approved_count integer;
  v_rejected_count integer;
  v_changes_requested_count integer;
  v_new_presentation_status text;
  v_now timestamptz := clock_timestamp();
BEGIN
  -- 1. Normalização e Validação do Token
  v_normalized_token := trim(COALESCE(p_token, ''));
  IF v_normalized_token = '' THEN
    RAISE EXCEPTION 'INVALID_ACCESS_TOKEN';
  END IF;

  -- 2. Validação do ID do Item
  IF p_item_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ITEM';
  END IF;

  -- 3. Normalização e Validação do Status
  v_normalized_status := trim(COALESCE(p_status, ''));
  IF v_normalized_status NOT IN ('approved', 'changes_requested', 'rejected') THEN
    RAISE EXCEPTION 'INVALID_DECISION_STATUS';
  END IF;

  -- 4. Normalização e Validação do Feedback
  v_normalized_feedback := trim(COALESCE(p_feedback, ''));
  IF v_normalized_status IN ('changes_requested', 'rejected') THEN
    IF v_normalized_feedback = '' THEN
      RAISE EXCEPTION 'FEEDBACK_REQUIRED';
    END IF;
  ELSE
    -- Se for approved, não persistir string vazia
    IF v_normalized_feedback = '' THEN
      v_normalized_feedback := NULL;
    END IF;
  END IF;

  -- 5. Validação do Link de Acesso Público
  SELECT id, presentation_id, is_active, revoked_at, expires_at
  INTO v_link
  FROM public.presentation_access_links
  WHERE token = v_normalized_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_ACCESS_TOKEN';
  END IF;

  IF v_link.revoked_at IS NOT NULL OR v_link.is_active = false THEN
    RAISE EXCEPTION 'ACCESS_TOKEN_REVOKED';
  END IF;

  IF v_link.expires_at IS NOT NULL AND v_link.expires_at <= v_now THEN
    RAISE EXCEPTION 'ACCESS_TOKEN_EXPIRED';
  END IF;

  -- 6. Bloqueio Concorrente e Validação de Pertença do Item
  SELECT id, presentation_id, client_approval_status, client_feedback, reviewed_at
  INTO v_item
  FROM public.presentation_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND OR v_item.presentation_id <> v_link.presentation_id THEN
    RAISE EXCEPTION 'INVALID_ITEM';
  END IF;

  -- 7. Imutabilidade da Decisão Pública (Apenas itens 'pending' podem ser decididos)
  IF v_item.client_approval_status <> 'pending' THEN
    RAISE EXCEPTION 'ITEM_ALREADY_REVIEWED';
  END IF;

  -- 8. Atualização Atômica do Item
  UPDATE public.presentation_items
  SET
    client_approval_status = v_normalized_status,
    client_feedback = v_normalized_feedback,
    reviewed_at = v_now,
    updated_at = v_now
  WHERE id = p_item_id;

  -- 9. Apuração e Atualização do Status Global da Presentation
  SELECT
    count(*) FILTER (WHERE client_approval_status = 'pending'),
    count(*) FILTER (WHERE client_approval_status = 'approved'),
    count(*) FILTER (WHERE client_approval_status = 'rejected'),
    count(*) FILTER (WHERE client_approval_status = 'changes_requested')
  INTO
    v_pending_count,
    v_approved_count,
    v_rejected_count,
    v_changes_requested_count
  FROM public.presentation_items
  WHERE presentation_id = v_link.presentation_id;

  -- Se todos os itens foram revisados (v_pending_count = 0), computa o status global
  IF v_pending_count = 0 THEN
    IF v_changes_requested_count > 0 THEN
      v_new_presentation_status := 'changes_requested';
    ELSIF v_rejected_count > 0 AND v_approved_count = 0 THEN
      v_new_presentation_status := 'rejected';
    ELSIF v_approved_count > 0 AND v_rejected_count = 0 THEN
      v_new_presentation_status := 'approved';
    ELSE
      -- Mistura approved + rejected sem changes_requested
      v_new_presentation_status := 'changes_requested';
    END IF;

    UPDATE public.presentations
    SET
      status = v_new_presentation_status,
      updated_at = v_now
    WHERE id = v_link.presentation_id;
  ELSE
    -- Ainda existem itens pendentes: mantém o status atual da apresentação
    SELECT status INTO v_new_presentation_status
    FROM public.presentations
    WHERE id = v_link.presentation_id;
  END IF;

  -- 10. Retorno Estruturado Sanitizado
  RETURN jsonb_build_object(
    'item_id', p_item_id,
    'client_approval_status', v_normalized_status,
    'client_feedback', v_normalized_feedback,
    'reviewed_at', v_now,
    'presentation_id', v_link.presentation_id,
    'presentation_status', v_new_presentation_status
  );
END;
$$;

-- Permissões Mínimas de Execução
REVOKE ALL ON FUNCTION public.submit_public_presentation_decision(text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_presentation_decision(text, uuid, text, text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.submit_public_presentation_decision(text, uuid, text, text) IS 
'Registra de forma segura, atômica e imutável a decisão (aprovação/rejeição/ajustes) do cliente sobre um item de apresentação via token público.';
