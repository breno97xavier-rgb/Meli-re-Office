-- Baseline remoto SOMENTE LEITURA, 23/10/2026. Não executar automaticamente.
-- Não contém tokens ou registros operacionais. Não é rollback de dados.

CREATE OR REPLACE FUNCTION public.get_public_presentation(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_token_hash text;
    v_link public.presentation_access_links%rowtype;
    v_result jsonb;
begin
    -- --------------------------------------------------------
    -- VALIDAR TOKEN
    -- --------------------------------------------------------

    if p_token is null or length(trim(p_token)) < 32 then
        raise exception 'INVALID_ACCESS_TOKEN';
    end if;

    v_token_hash :=
        encode(
            extensions.digest(
                convert_to(trim(p_token), 'UTF8'),
                'sha256'
            ),
            'hex'
        );


    -- --------------------------------------------------------
    -- LOCALIZAR LINK ATIVO
    -- --------------------------------------------------------

    select *
      into v_link
      from public.presentation_access_links
     where token_hash = v_token_hash
     limit 1;

    if not found then
        raise exception 'INVALID_ACCESS_TOKEN';
    end if;

    if v_link.revoked_at is not null then
        raise exception 'ACCESS_LINK_REVOKED';
    end if;

    if v_link.expires_at <= now() then
        raise exception 'ACCESS_LINK_EXPIRED';
    end if;


    -- --------------------------------------------------------
    -- MONTAR PAYLOAD EXTERNO
    -- --------------------------------------------------------

    select jsonb_build_object(

        'presentation',
        jsonb_build_object(
            'id', p.id,
            'title', p.title,
            'description', p.description,
            'status', p.status,
            'round_number', p.round_number,
            'sent_at', p.sent_at,

            'client',
            jsonb_build_object(
                'id', c.id,
                'commercial_name', c.commercial_name,
                'name', c.name,
                'logo_url', c.logo_url
            )
        ),

        'items',
        coalesce(
            (
                select jsonb_agg(
                    jsonb_build_object(
                        'id', pi.id,
                        'display_order', pi.display_order,
                        'presentation_notes', pi.presentation_notes,
                        'client_approval_status', pi.client_approval_status,
                        'client_feedback', pi.client_feedback,
                        'reviewed_at', pi.reviewed_at,

                        'content',
                        jsonb_build_object(
                            'id', co.id,
                            'internal_title', co.internal_title,
                            'format', co.format,
                            'caption', co.caption,
                            'goal', co.goal,
                            'pillar', co.pillar,
                            'planned_date', co.planned_date,
                            'editorial_status', co.editorial_status
                        ),

                        'assets',
                        coalesce(
                            (
                                select jsonb_agg(
                                    jsonb_build_object(
                                        'id', ca.id,
                                        'asset_type', ca.asset_type,
                                        'storage_path', ca.file_url,
                                        'file_name', ca.file_name,
                                        'mime_type', ca.mime_type,
                                        'file_size_bytes', ca.file_size_bytes,
                                        'version', ca.version,
                                        'display_order', ca.display_order
                                    )
                                    order by
                                        ca.display_order asc,
                                        ca.asset_type asc
                                )
                                from public.content_assets ca
                                where ca.content_id = co.id
                                  and ca.is_current = true
                            ),
                            '[]'::jsonb
                        )
                    )
                    order by pi.display_order asc
                )
                from public.presentation_items pi
                join public.contents co
                  on co.id = pi.content_id
                where pi.presentation_id = p.id
            ),
            '[]'::jsonb
        ),

        'access',
        jsonb_build_object(
            'expires_at', v_link.expires_at
        )

    )
    into v_result
    from public.presentations p
    join public.clients c
      on c.id = p.client_id
    where p.id = v_link.presentation_id;


    if v_result is null then
        raise exception 'PRESENTATION_NOT_FOUND';
    end if;

    return v_result;
end;
$function$


CREATE OR REPLACE FUNCTION public.submit_public_presentation_decision(p_token text, p_item_id uuid, p_status text, p_feedback text DEFAULT NULL::text)
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
$function$


CREATE OR REPLACE FUNCTION public.update_presentation_item_admin_decision(p_item_id uuid, p_status text, p_feedback text DEFAULT NULL::text, p_presentation_notes text DEFAULT NULL::text, p_update_notes boolean DEFAULT false)
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
$function$
