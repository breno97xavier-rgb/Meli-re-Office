-- ==============================================================================
-- Migration: 20260912154500_universal_presentation_content_sync.sql
-- Description: Sincronização Universal PresentationItem -> Content + Presentation
-- Phase: F4.3D.2 / F4.3D.2-H1 Hardening
-- ==============================================================================

-- 1. Função Central de Reconciliação Transacional (Uso Interno)
CREATE OR REPLACE FUNCTION public.reconcile_presentation_item_decision(
  p_item_id uuid,
  p_status text,
  p_feedback text DEFAULT NULL,
  p_presentation_notes text DEFAULT NULL,
  p_update_notes boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_normalized_status text;
  v_normalized_feedback text;
  v_item record;
  v_content record;
  v_has_subsequent_approval boolean := false;
  v_has_any_approval boolean := false;
  v_pending_count integer;
  v_approved_count integer;
  v_rejected_count integer;
  v_changes_requested_count integer;
  v_total_count integer;
  v_new_presentation_status text;
  v_current_presentation_status text;
  v_now timestamptz := clock_timestamp();
  v_reviewed_at timestamptz;
BEGIN
  -- 1. Validação básica do ID
  IF p_item_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ITEM';
  END IF;

  -- 2. Normalização do status
  v_normalized_status := trim(COALESCE(p_status, 'pending'));
  IF v_normalized_status NOT IN ('pending', 'approved', 'changes_requested', 'rejected') THEN
    RAISE EXCEPTION 'INVALID_DECISION_STATUS';
  END IF;

  -- 3. Normalização do feedback
  IF p_feedback IS NOT NULL THEN
    v_normalized_feedback := nullif(trim(p_feedback), '');
  ELSE
    v_normalized_feedback := NULL;
  END IF;

  -- 4. Bloqueio Concorrente do PresentationItem
  SELECT id, presentation_id, content_id, client_approval_status, client_feedback, presentation_notes, reviewed_at
  INTO v_item
  FROM public.presentation_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ITEM_NOT_FOUND';
  END IF;

  -- Determinar o reviewed_at apropriado
  IF v_normalized_status = 'pending' THEN
    v_reviewed_at := NULL;
  ELSE
    v_reviewed_at := COALESCE(v_item.reviewed_at, v_now);
  END IF;

  -- 5. Atualização atômica do PresentationItem
  UPDATE public.presentation_items
  SET
    client_approval_status = v_normalized_status,
    client_feedback = CASE
      WHEN p_feedback IS NOT NULL THEN v_normalized_feedback
      ELSE client_feedback
    END,
    presentation_notes = CASE
      WHEN p_update_notes THEN p_presentation_notes
      ELSE presentation_notes
    END,
    reviewed_at = v_reviewed_at,
    updated_at = v_now
  WHERE id = p_item_id;

  -- 6. Sincronização e Repercussão no Content (se vinculado)
  IF v_item.content_id IS NOT NULL THEN
    SELECT id, editorial_status, approved_at, published_at
    INTO v_content
    FROM public.contents
    WHERE id = v_item.content_id
    FOR UPDATE;

    IF FOUND THEN
      -- Regra 1: Conteúdo cancelado nunca é reativado automaticamente por apresentação
      IF v_content.editorial_status = 'cancelled' THEN
        -- Preserva estado cancelado intacto
        NULL;

      -- Regra 2: Status 'approved' promove o Content para approved
      ELSIF v_normalized_status = 'approved' THEN
        UPDATE public.contents
        SET
          editorial_status = 'approved',
          approved_at = COALESCE(approved_at, v_now),
          updated_at = v_now
        WHERE id = v_item.content_id;

      -- Regra 3: Status 'changes_requested' ou 'rejected' move Content para 'in_production' com proteções
      ELSIF v_normalized_status IN ('changes_requested', 'rejected') THEN
        -- Proteção 3a: Não rebaixar conteúdo já publicado
        IF v_content.published_at IS NOT NULL THEN
          NULL;
        ELSE
          -- Proteção 3b: Verificar se existe aprovação posterior para o mesmo Content
          SELECT EXISTS (
            SELECT 1
            FROM public.presentation_items other_pi
            JOIN public.presentations other_p ON other_p.id = other_pi.presentation_id
            WHERE other_pi.content_id = v_item.content_id
              AND other_pi.id <> v_item.id
              AND other_pi.client_approval_status = 'approved'
              AND (
                (other_pi.reviewed_at IS NOT NULL AND other_pi.reviewed_at > v_reviewed_at)
                OR (other_p.created_at > (SELECT created_at FROM public.presentations WHERE id = v_item.presentation_id))
              )
          ) INTO v_has_subsequent_approval;

          IF NOT v_has_subsequent_approval THEN
            UPDATE public.contents
            SET
              editorial_status = 'in_production',
              approved_at = NULL,
              updated_at = v_now
            WHERE id = v_item.content_id;
          END IF;
        END IF;

      -- Regra 4: Status 'pending' (Apenas para reabertura de item que estava anteriormente approved)
      ELSIF v_normalized_status = 'pending' THEN
        -- Se o item estava previamente approved e está sendo reaberto para pending
        IF v_item.client_approval_status = 'approved' AND v_content.editorial_status = 'approved' AND v_content.published_at IS NULL THEN
          SELECT EXISTS (
            SELECT 1
            FROM public.presentation_items other_pi
            WHERE other_pi.content_id = v_item.content_id
              AND other_pi.id <> v_item.id
              AND other_pi.client_approval_status = 'approved'
          ) INTO v_has_any_approval;

          IF NOT v_has_any_approval THEN
            UPDATE public.contents
            SET
              editorial_status = 'in_production',
              approved_at = NULL,
              updated_at = v_now
            WHERE id = v_item.content_id;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  -- 7. Recálculo e Sincronização do Status Global da Presentation
  SELECT
    count(*) FILTER (WHERE client_approval_status = 'pending'),
    count(*) FILTER (WHERE client_approval_status = 'approved'),
    count(*) FILTER (WHERE client_approval_status = 'rejected'),
    count(*) FILTER (WHERE client_approval_status = 'changes_requested'),
    count(*)
  INTO
    v_pending_count,
    v_approved_count,
    v_rejected_count,
    v_changes_requested_count,
    v_total_count
  FROM public.presentation_items
  WHERE presentation_id = v_item.presentation_id;

  SELECT status INTO v_current_presentation_status
  FROM public.presentations
  WHERE id = v_item.presentation_id;

  -- Se todos os itens foram revisados (zero pending), computa o status terminal da Presentation
  IF v_total_count > 0 AND v_pending_count = 0 THEN
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
    WHERE id = v_item.presentation_id;
  ELSE
    -- Se existem itens pendentes: NÃO finaliza a apresentação. Preserva o status atual da Presentation.
    v_new_presentation_status := v_current_presentation_status;
  END IF;

  -- 8. Retorno Estruturado Sanitizado
  RETURN jsonb_build_object(
    'item_id', p_item_id,
    'presentation_id', v_item.presentation_id,
    'content_id', v_item.content_id,
    'client_approval_status', v_normalized_status,
    'client_feedback', (SELECT client_feedback FROM public.presentation_items WHERE id = p_item_id),
    'presentation_notes', (SELECT presentation_notes FROM public.presentation_items WHERE id = p_item_id),
    'reviewed_at', v_reviewed_at,
    'presentation_status', v_new_presentation_status
  );
END;
$$;


-- 2. Refatoração da RPC Pública: submit_public_presentation_decision
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
  v_now timestamptz := clock_timestamp();
  v_result jsonb;
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

  -- 4. Normalização e Validação do Feedback (obrigatório para changes_requested e rejected)
  v_normalized_feedback := trim(COALESCE(p_feedback, ''));
  IF v_normalized_status IN ('changes_requested', 'rejected') THEN
    IF v_normalized_feedback = '' THEN
      RAISE EXCEPTION 'FEEDBACK_REQUIRED';
    END IF;
  ELSE
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

  -- 6. Bloqueio e Validação de Pertencimento do Item à Apresentação do Token
  SELECT id, presentation_id, client_approval_status
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

  -- 8. Execução da Reconciliação Unificada
  v_result := public.reconcile_presentation_item_decision(
    p_item_id := p_item_id,
    p_status := v_normalized_status,
    p_feedback := v_normalized_feedback,
    p_presentation_notes := NULL,
    p_update_notes := false
  );

  RETURN v_result;
END;
$$;


-- 3. Criação da RPC Administrativa: update_presentation_item_admin_decision
CREATE OR REPLACE FUNCTION public.update_presentation_item_admin_decision(
  p_item_id uuid,
  p_status text,
  p_feedback text DEFAULT NULL,
  p_presentation_notes text DEFAULT NULL,
  p_update_notes boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_normalized_status text;
  v_result jsonb;
BEGIN
  -- 1. Validação estrita de autenticação/autorização
  IF (auth.uid() IS NULL AND auth.role() <> 'service_role') OR (auth.role() NOT IN ('authenticated', 'service_role')) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  -- 2. Validação e normalização do status
  v_normalized_status := trim(COALESCE(p_status, 'pending'));
  IF v_normalized_status NOT IN ('pending', 'approved', 'changes_requested', 'rejected') THEN
    RAISE EXCEPTION 'INVALID_DECISION_STATUS';
  END IF;

  -- 3. Execução da Reconciliação Unificada
  v_result := public.reconcile_presentation_item_decision(
    p_item_id := p_item_id,
    p_status := v_normalized_status,
    p_feedback := p_feedback,
    p_presentation_notes := p_presentation_notes,
    p_update_notes := p_update_notes
  );

  RETURN v_result;
END;
$$;


-- 4. Permissões Mínimas e Segurança de Acesso (Hardened)

-- A função central NÃO deve ser chamada diretamente por clientes anon ou authenticated
REVOKE ALL ON FUNCTION public.reconcile_presentation_item_decision(uuid, text, text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reconcile_presentation_item_decision(uuid, text, text, text, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.reconcile_presentation_item_decision(uuid, text, text, text, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_presentation_item_decision(uuid, text, text, text, boolean) TO service_role;

-- Endpoint RPC público seguro
REVOKE ALL ON FUNCTION public.submit_public_presentation_decision(text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_presentation_decision(text, uuid, text, text) TO anon, authenticated, service_role;

-- Endpoint RPC administrativo seguro
REVOKE ALL ON FUNCTION public.update_presentation_item_admin_decision(uuid, text, text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_presentation_item_admin_decision(uuid, text, text, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_presentation_item_admin_decision(uuid, text, text, text, boolean) TO authenticated, service_role;

COMMENT ON FUNCTION public.reconcile_presentation_item_decision(uuid, text, text, text, boolean) IS
'Função central interna de reconciliação atômica de decisões em PresentationItem, sincronizando Content editorial_status/approved_at e status global da Presentation.';

COMMENT ON FUNCTION public.submit_public_presentation_decision(text, uuid, text, text) IS
'Endpoint RPC público seguro para cliente final registrar decisão imutável via token com feedback obrigatório.';

COMMENT ON FUNCTION public.update_presentation_item_admin_decision(uuid, text, text, text, boolean) IS
'Endpoint RPC administrativo seguro para operadores atualizarem status e feedback de itens de apresentação com sincronização universal.';
