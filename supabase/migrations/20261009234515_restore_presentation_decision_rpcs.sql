-- Local proposal: restore decision RPCs against the observed schema.
-- No table/constraint/RLS changes. Storage is a separate checkpoint.
-- DB statuses remain adjustments_requested / approved_with_adjustments;
-- responses use the existing UI contract changes_requested / in_review.
-- Lock order: access link (public only), content, presentation, client, item.
-- NO KEY UPDATE on parents remains compatible with FK KEY SHARE locks.

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
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_ref record;
  v_item record;
  v_content record;
  v_presentation record;
  v_status text := trim(COALESCE(p_status, 'pending'));
  v_db_status text;
  v_now timestamptz;
  v_reviewed_at timestamptz;
  v_pending integer;
  v_approved integer;
  v_rejected integer;
  v_adjustments integer;
  v_new_status text;
BEGIN
  IF p_item_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ITEM';
  END IF;
  IF v_status NOT IN ('pending', 'approved', 'changes_requested', 'adjustments_requested', 'rejected') THEN
    RAISE EXCEPTION 'INVALID_DECISION_STATUS';
  END IF;
  v_db_status := CASE v_status WHEN 'changes_requested' THEN 'adjustments_requested' ELSE v_status END;

  SELECT presentation_id, content_id INTO v_ref
  FROM public.presentation_items WHERE id = p_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;

  SELECT id, client_id, editorial_status, approved_at, published_at INTO v_content
  FROM public.contents WHERE id = v_ref.content_id FOR NO KEY UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ITEM'; END IF;
  SELECT id, client_id, status, created_at INTO v_presentation
  FROM public.presentations WHERE id = v_ref.presentation_id FOR NO KEY UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ITEM'; END IF;
  SELECT id, presentation_id, content_id, client_approval_status, reviewed_at INTO v_item
  FROM public.presentation_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND OR v_item.presentation_id IS DISTINCT FROM v_ref.presentation_id
     OR v_item.content_id IS DISTINCT FROM v_ref.content_id
     OR v_content.client_id IS DISTINCT FROM v_presentation.client_id THEN
    RAISE EXCEPTION 'INVALID_ITEM';
  END IF;

  v_now := clock_timestamp();
  v_reviewed_at := CASE WHEN v_db_status = 'pending' THEN NULL ELSE COALESCE(v_item.reviewed_at, v_now) END;
  UPDATE public.presentation_items
  SET client_approval_status = v_db_status,
      client_feedback = CASE WHEN p_feedback IS NOT NULL THEN nullif(trim(p_feedback), '') ELSE client_feedback END,
      presentation_notes = CASE WHEN p_update_notes THEN p_presentation_notes ELSE presentation_notes END,
      reviewed_at = v_reviewed_at
  WHERE id = p_item_id;

  -- Preserve cancelled/published contents and approvals from subsequent rounds.
  IF v_content.editorial_status <> 'cancelled' THEN
    IF v_db_status = 'approved' THEN
      UPDATE public.contents SET editorial_status = 'approved',
        approved_at = COALESCE(approved_at, v_now), updated_at = v_now
      WHERE id = v_item.content_id;
    ELSIF v_db_status IN ('adjustments_requested', 'rejected') AND v_content.published_at IS NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.presentation_items other_pi
        JOIN public.presentations other_p ON other_p.id = other_pi.presentation_id
        WHERE other_pi.content_id = v_item.content_id AND other_pi.id <> v_item.id
          AND other_pi.client_approval_status = 'approved'
          AND (other_pi.reviewed_at > v_reviewed_at OR other_p.created_at > v_presentation.created_at)
      ) THEN
        UPDATE public.contents SET editorial_status = 'in_production', approved_at = NULL, updated_at = v_now
        WHERE id = v_item.content_id;
      END IF;
    ELSIF v_db_status = 'pending' AND v_item.client_approval_status = 'approved'
       AND v_content.editorial_status = 'approved' AND v_content.published_at IS NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.presentation_items other_pi
        WHERE other_pi.content_id = v_item.content_id AND other_pi.id <> v_item.id
          AND other_pi.client_approval_status = 'approved'
      ) THEN
        UPDATE public.contents SET editorial_status = 'in_production', approved_at = NULL, updated_at = v_now
        WHERE id = v_item.content_id;
      END IF;
    END IF;
  END IF;

  SELECT count(*) FILTER (WHERE client_approval_status = 'pending'),
         count(*) FILTER (WHERE client_approval_status = 'approved'),
         count(*) FILTER (WHERE client_approval_status = 'rejected'),
         count(*) FILTER (WHERE client_approval_status = 'adjustments_requested')
  INTO v_pending, v_approved, v_rejected, v_adjustments
  FROM public.presentation_items WHERE presentation_id = v_item.presentation_id;

  v_new_status := v_presentation.status;
  IF v_presentation.status <> 'archived' THEN
    IF v_pending = 0 THEN
      v_new_status := CASE
        WHEN v_adjustments > 0 OR (v_approved > 0 AND v_rejected > 0) THEN 'approved_with_adjustments'
        WHEN v_rejected > 0 THEN 'rejected'
        ELSE 'approved' END;
    ELSIF v_presentation.status IN ('approved', 'approved_with_adjustments', 'rejected') THEN
      -- Administrative reopening must not leave a terminal status with pending items.
      v_new_status := 'under_review';
    END IF;
  END IF;
  IF v_new_status IS DISTINCT FROM v_presentation.status THEN
    UPDATE public.presentations SET status = v_new_status, updated_at = v_now
    WHERE id = v_item.presentation_id;
  END IF;

  RETURN jsonb_build_object(
    'item_id', p_item_id,
    'presentation_id', v_item.presentation_id,
    'content_id', v_item.content_id,
    'client_approval_status', CASE v_db_status WHEN 'adjustments_requested' THEN 'changes_requested' ELSE v_db_status END,
    'client_feedback', (SELECT client_feedback FROM public.presentation_items WHERE id = p_item_id),
    'presentation_notes', (SELECT presentation_notes FROM public.presentation_items WHERE id = p_item_id),
    'reviewed_at', v_reviewed_at,
    'presentation_status', CASE v_new_status
      WHEN 'under_review' THEN 'in_review'
      WHEN 'approved_with_adjustments' THEN 'changes_requested'
      ELSE v_new_status END
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_public_presentation_decision(
  p_token text,
  p_item_id uuid,
  p_status text,
  p_feedback text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_token text := trim(COALESCE(p_token, ''));
  v_status text := trim(COALESCE(p_status, ''));
  v_feedback text := nullif(trim(p_feedback), '');
  v_link record;
  v_ref record;
  v_item record;
  v_presentation_client uuid;
  v_content_client uuid;
BEGIN
  IF length(v_token) < 32 THEN RAISE EXCEPTION 'INVALID_ACCESS_TOKEN'; END IF;
  IF p_item_id IS NULL THEN RAISE EXCEPTION 'INVALID_ITEM'; END IF;
  IF v_status NOT IN ('approved', 'changes_requested', 'rejected') THEN
    RAISE EXCEPTION 'INVALID_DECISION_STATUS';
  END IF;
  IF v_status IN ('changes_requested', 'rejected') AND v_feedback IS NULL THEN
    RAISE EXCEPTION 'FEEDBACK_REQUIRED';
  END IF;

  SELECT id, presentation_id, revoked_at, expires_at INTO v_link
  FROM public.presentation_access_links
  WHERE token_hash = encode(extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'), 'hex')
  FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ACCESS_TOKEN'; END IF;
  IF v_link.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'ACCESS_TOKEN_REVOKED'; END IF;
  IF v_link.expires_at IS NULL OR v_link.expires_at <= clock_timestamp() THEN
    RAISE EXCEPTION 'ACCESS_TOKEN_EXPIRED';
  END IF;

  SELECT presentation_id, content_id INTO v_ref
  FROM public.presentation_items WHERE id = p_item_id;
  IF NOT FOUND OR v_ref.presentation_id IS DISTINCT FROM v_link.presentation_id THEN
    RAISE EXCEPTION 'INVALID_ITEM';
  END IF;
  SELECT client_id INTO v_content_client FROM public.contents
  WHERE id = v_ref.content_id FOR NO KEY UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ITEM'; END IF;
  SELECT client_id INTO v_presentation_client FROM public.presentations
  WHERE id = v_ref.presentation_id FOR NO KEY UPDATE;
  IF NOT FOUND OR v_content_client IS DISTINCT FROM v_presentation_client THEN
    RAISE EXCEPTION 'INVALID_ITEM';
  END IF;
  PERFORM 1 FROM public.clients WHERE id = v_presentation_client FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ITEM'; END IF;
  SELECT presentation_id, content_id, client_approval_status INTO v_item
  FROM public.presentation_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND OR v_item.presentation_id IS DISTINCT FROM v_link.presentation_id
     OR v_item.content_id IS DISTINCT FROM v_ref.content_id THEN
    RAISE EXCEPTION 'INVALID_ITEM';
  END IF;
  -- Recheck expiry after waiting for concurrent decisions. Revocation cannot pass the link lock.
  IF v_link.expires_at <= clock_timestamp() THEN RAISE EXCEPTION 'ACCESS_TOKEN_EXPIRED'; END IF;
  IF v_item.client_approval_status <> 'pending' THEN RAISE EXCEPTION 'ITEM_ALREADY_REVIEWED'; END IF;

  RETURN public.reconcile_presentation_item_decision(
    p_item_id, v_status, v_feedback, NULL, false
  );
END;
$function$;

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
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_ref record;
  v_content_client uuid;
  v_presentation_client uuid;
  v_workspace_id uuid;
  v_service boolean := COALESCE(auth.role(), '') = 'service_role';
BEGIN
  IF NOT v_service AND (COALESCE(auth.role(), '') <> 'authenticated' OR auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  IF p_item_id IS NULL THEN RAISE EXCEPTION 'INVALID_ITEM'; END IF;
  SELECT presentation_id, content_id INTO v_ref FROM public.presentation_items WHERE id = p_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
  SELECT client_id INTO v_content_client FROM public.contents
  WHERE id = v_ref.content_id FOR NO KEY UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ITEM'; END IF;
  SELECT client_id INTO v_presentation_client FROM public.presentations
  WHERE id = v_ref.presentation_id FOR NO KEY UPDATE;
  IF NOT FOUND OR v_presentation_client IS DISTINCT FROM v_content_client THEN
    RAISE EXCEPTION 'INVALID_ITEM';
  END IF;
  SELECT workspace_id INTO v_workspace_id FROM public.clients
  WHERE id = v_presentation_client FOR SHARE;
  IF NOT FOUND OR v_workspace_id IS NULL THEN RAISE EXCEPTION 'INVALID_ITEM'; END IF;
  IF NOT v_service AND (
    NOT public.has_workspace_permission(v_workspace_id, 'presentations', 'operation')
    OR NOT public.has_workspace_client_access(v_workspace_id, v_presentation_client)
  ) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  -- Revalidate after locks, so a concurrently moved item cannot use stale authorization.
  PERFORM 1 FROM public.presentation_items
  WHERE id = p_item_id AND presentation_id = v_ref.presentation_id AND content_id = v_ref.content_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ITEM'; END IF;

  RETURN public.reconcile_presentation_item_decision(
    p_item_id, p_status, p_feedback, p_presentation_notes, p_update_notes
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.reconcile_presentation_item_decision(uuid, text, text, text, boolean)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_presentation_item_decision(uuid, text, text, text, boolean)
TO service_role;
REVOKE ALL ON FUNCTION public.submit_public_presentation_decision(text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_presentation_decision(text, uuid, text, text)
TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_presentation_item_admin_decision(uuid, text, text, text, boolean)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_presentation_item_admin_decision(uuid, text, text, text, boolean)
TO authenticated, service_role;
