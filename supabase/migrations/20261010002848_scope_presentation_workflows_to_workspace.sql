-- Scope only presentation workflows. Do not alter clients/contents RLS or existing tokens.
CREATE SCHEMA IF NOT EXISTS office_private;
REVOKE ALL ON SCHEMA office_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA office_private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION office_private.presentation_client_permission(p_client_id uuid, p_level text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public, pg_temp
AS $body$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id=p_client_id AND c.workspace_id IS NOT NULL
      AND public.has_workspace_permission(c.workspace_id, 'presentations', p_level)
      AND public.has_workspace_client_access(c.workspace_id, c.id)
  );
$body$;
CREATE OR REPLACE FUNCTION office_private.presentation_permission(p_presentation_id uuid, p_level text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public, pg_temp
AS $body$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.presentations p WHERE p.id=p_presentation_id
      AND office_private.presentation_client_permission(p.client_id,p_level)
  );
$body$;
REVOKE ALL ON FUNCTION office_private.presentation_client_permission(uuid,text), office_private.presentation_permission(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION office_private.presentation_client_permission(uuid,text), office_private.presentation_permission(uuid,text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.create_next_presentation_round(p_source_presentation_id uuid, p_content_ids uuid[] DEFAULT '{}'::uuid[], p_custom_title text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_source record;
  v_workspace_id uuid;
  v_series_id uuid;
  v_new_round_number integer;
  v_new_title text;
  v_content_id uuid;
  v_order integer := 0;
  v_now timestamptz := clock_timestamp();
  v_created_presentation record;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND (COALESCE(auth.role(), '') <> 'authenticated' OR auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  -- 2. Validar ID de origem
  IF p_source_presentation_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_SOURCE_PRESENTATION';
  END IF;

  -- 3. Bloquear e carregar a apresentação de origem.
  -- view_mode removido: a coluna não existe no schema atual.
  SELECT
    id,
    client_id,
    title,
    description,
    status,
    round_number,
    presentation_series_id,
    created_by
  INTO v_source
  FROM public.presentations
  WHERE id = p_source_presentation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOURCE_PRESENTATION_NOT_FOUND';
  END IF;

  SELECT workspace_id INTO v_workspace_id FROM public.clients
  WHERE id = v_source.client_id FOR SHARE;
  IF NOT FOUND OR v_workspace_id IS NULL THEN RAISE EXCEPTION 'INVALID_SOURCE_PRESENTATION'; END IF;
  IF COALESCE(auth.role(), '') <> 'service_role' AND (
    NOT public.has_workspace_permission(v_workspace_id, 'presentations', 'operation')
    OR NOT public.has_workspace_client_access(v_workspace_id, v_source.client_id)
  ) THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;

  -- 4. Impedir mais de uma próxima rodada direta
  IF EXISTS (
    SELECT 1
    FROM public.presentations
    WHERE previous_presentation_id = p_source_presentation_id
  ) THEN
    RAISE EXCEPTION 'ALREADY_HAS_NEXT_ROUND';
  END IF;

  -- 5. Validar integralmente p_content_ids
  IF p_content_ids IS NOT NULL
     AND array_length(p_content_ids, 1) > 0 THEN

    IF EXISTS (
      SELECT 1
      FROM unnest(p_content_ids) AS t(elem)
      WHERE t.elem IS NULL
    ) THEN
      RAISE EXCEPTION 'INVALID_CONTENT_SELECTION';
    END IF;

    IF (
      SELECT count(DISTINCT c.id)
      FROM public.contents c
      WHERE c.id = ANY(p_content_ids)
        AND c.client_id = v_source.client_id
    ) <> (
      SELECT count(DISTINCT t.elem)
      FROM unnest(p_content_ids) AS t(elem)
    ) THEN
      RAISE EXCEPTION 'INVALID_CONTENT_SELECTION';
    END IF;
  END IF;

  -- 6. Resolver presentation_series_id
  IF v_source.presentation_series_id IS NULL THEN
    v_series_id := v_source.id;

    UPDATE public.presentations
    SET presentation_series_id = v_series_id
    WHERE id = v_source.id;
  ELSE
    v_series_id := v_source.presentation_series_id;
  END IF;

  -- 7. Calcular número da nova rodada
  v_new_round_number := COALESCE(v_source.round_number, 1) + 1;

  -- 8. Calcular título
  IF p_custom_title IS NOT NULL
     AND trim(p_custom_title) <> '' THEN

    v_new_title := trim(p_custom_title);

  ELSE
    v_new_title := regexp_replace(
      v_source.title,
      '\s*[-–(]?\s*Rodada\s*\d+\s*\)?$',
      '',
      'i'
    );

    v_new_title := regexp_replace(
      v_new_title,
      '\s*[-–(]?\s*R\d+\s*\)?$',
      '',
      'i'
    );

    IF trim(v_new_title) = '' THEN
      v_new_title := v_source.title;
    END IF;
  END IF;

  -- 9. Criar nova apresentação.
  -- view_mode removido do INSERT porque não pertence ao schema atual.
  INSERT INTO public.presentations (
    client_id,
    title,
    description,
    status,
    round_number,
    presentation_series_id,
    previous_presentation_id,
    created_by,
    created_at,
    updated_at
  )
  VALUES (
    v_source.client_id,
    v_new_title,
    NULL,
    'draft',
    v_new_round_number,
    v_series_id,
    v_source.id,
    COALESCE(auth.uid(), v_source.created_by),
    v_now,
    v_now
  )
  RETURNING * INTO v_created_presentation;

  -- 10. Criar itens selecionados
  IF p_content_ids IS NOT NULL
     AND array_length(p_content_ids, 1) > 0 THEN

    FOR v_content_id IN
      SELECT DISTINCT t.elem
      FROM unnest(p_content_ids) AS t(elem)
    LOOP
      v_order := v_order + 1;

      INSERT INTO public.presentation_items (
        presentation_id,
        content_id,
        display_order,
        client_approval_status,
        client_feedback,
        presentation_notes,
        reviewed_at,
        created_at
      )
      VALUES (
        v_created_presentation.id,
        v_content_id,
        v_order,
        'pending',
        NULL,
        NULL,
        NULL,
        v_now
      );
    END LOOP;
  END IF;

  -- 11. Retorno estruturado
  RETURN jsonb_build_object(
    'success', true,
    'presentation', jsonb_build_object(
      'id', v_created_presentation.id,
      'client_id', v_created_presentation.client_id,
      'title', v_created_presentation.title,
      'round_number', v_created_presentation.round_number,
      'presentation_series_id', v_created_presentation.presentation_series_id,
      'previous_presentation_id', v_created_presentation.previous_presentation_id,
      'status', v_created_presentation.status,
      'created_at', v_created_presentation.created_at
    ),
    'items_count', v_order
  );
END;
$function$;
CREATE OR REPLACE FUNCTION public.create_presentation_access_link(p_presentation_id uuid, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
    v_token text;
    v_token_hash text;
    v_expires_at timestamptz;
    v_link public.presentation_access_links%rowtype;
begin

    -- --------------------------------------------------------
    -- AUTENTICAÇÃO / AUTORIZAÇÃO
    -- --------------------------------------------------------

    if auth.uid() is null then
        raise exception 'AUTH_REQUIRED';
    end if;

    if COALESCE(auth.role(), '') <> 'authenticated' then
        raise exception 'AUTH_REQUIRED';
    end if;


    -- --------------------------------------------------------
    -- VALIDAR PRESENTATION
    -- --------------------------------------------------------

    if p_presentation_id is null then
        raise exception 'PRESENTATION_ID_REQUIRED';
    end if;

    perform 1 from public.presentations where id = p_presentation_id for no key update;
    if not found then
        raise exception 'PRESENTATION_NOT_FOUND';
    end if;


    -- --------------------------------------------------------
    perform 1 from public.clients c join public.presentations p on p.client_id=c.id
      where p.id=p_presentation_id for share of c;
    if not office_private.presentation_permission(p_presentation_id, 'operation') then
      raise exception 'UNAUTHORIZED';
    end if;

    -- EXPIRAÇÃO
    -- Default: 14 dias
    -- --------------------------------------------------------

    v_expires_at :=
        coalesce(
            p_expires_at,
            now() + interval '14 days'
        );

    if v_expires_at <= now() then
        raise exception 'INVALID_EXPIRATION_DATE';
    end if;


    -- --------------------------------------------------------
    -- TOKEN BRUTO
    -- 32 bytes = 256 bits
    -- --------------------------------------------------------

    v_token :=
        encode(
            extensions.gen_random_bytes(32),
            'hex'
        );


    -- --------------------------------------------------------
    -- HASH SHA-256
    -- Token bruto NÃO será salvo
    -- --------------------------------------------------------

    v_token_hash :=
        encode(
            extensions.digest(
                convert_to(v_token, 'UTF8'),
                'sha256'
            ),
            'hex'
        );


    -- --------------------------------------------------------
    -- REGISTRAR LINK
    -- --------------------------------------------------------

    insert into public.presentation_access_links (
        presentation_id,
        token_hash,
        expires_at,
        created_by
    )
    values (
        p_presentation_id,
        v_token_hash,
        v_expires_at,
        auth.uid()
    )
    returning *
    into v_link;


    -- --------------------------------------------------------
    -- RETORNO
    --
    -- O token bruto aparece APENAS aqui.
    -- Ele não existe na tabela.
    -- --------------------------------------------------------

    return jsonb_build_object(
        'id', v_link.id,
        'presentation_id', v_link.presentation_id,
        'token', v_token,
        'expires_at', v_link.expires_at,
        'created_at', v_link.created_at
    );

end;
$function$;
CREATE OR REPLACE FUNCTION public.revoke_presentation_access_link(p_link_id uuid)
 RETURNS presentation_access_links
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
    v_link public.presentation_access_links%rowtype;
begin

    -- --------------------------------------------------------
    -- AUTENTICAÇÃO / AUTORIZAÇÃO
    -- --------------------------------------------------------

    if auth.uid() is null then
        raise exception 'AUTH_REQUIRED';
    end if;

    if COALESCE(auth.role(), '') <> 'authenticated' then
        raise exception 'AUTH_REQUIRED';
    end if;


    -- --------------------------------------------------------
    -- VALIDAR ID
    -- --------------------------------------------------------

    if p_link_id is null then
        raise exception 'ACCESS_LINK_ID_REQUIRED';
    end if;


    -- --------------------------------------------------------
    -- LOCK
    -- --------------------------------------------------------

    select *
    into v_link
    from public.presentation_access_links
    where id = p_link_id
    for update;

    if not found then
        raise exception 'ACCESS_LINK_NOT_FOUND';
    end if;


    -- --------------------------------------------------------
    perform 1 from public.clients c join public.presentations p on p.client_id=c.id
      where p.id=v_link.presentation_id for share of c;
    if not office_private.presentation_permission(v_link.presentation_id, 'operation') then
      raise exception 'UNAUTHORIZED';
    end if;

    -- IDEMPOTÊNCIA
    --
    -- Se já estiver revogado, retorna o registro atual.
    -- --------------------------------------------------------

    if v_link.revoked_at is not null then
        return v_link;
    end if;


    -- --------------------------------------------------------
    -- REVOGAR
    -- --------------------------------------------------------

    update public.presentation_access_links
    set
        revoked_at = now(),
        revoked_by = auth.uid()
    where id = p_link_id
    returning *
    into v_link;


    return v_link;

end;
$function$;
DROP POLICY IF EXISTS "Admins have full access to presentations" ON public.presentations;
DROP POLICY IF EXISTS "Admins have full access to presentation_items" ON public.presentation_items;
DROP POLICY IF EXISTS "Admins have full access to presentation_access_links" ON public.presentation_access_links;
DROP POLICY IF EXISTS presentations_select_workspace ON public.presentations;
CREATE POLICY presentations_select_workspace ON public.presentations FOR SELECT TO authenticated USING (office_private.presentation_client_permission(client_id,'view'));
DROP POLICY IF EXISTS presentations_insert_workspace ON public.presentations;
CREATE POLICY presentations_insert_workspace ON public.presentations FOR INSERT TO authenticated WITH CHECK (office_private.presentation_client_permission(client_id,'operation'));
DROP POLICY IF EXISTS presentations_update_workspace ON public.presentations;
CREATE POLICY presentations_update_workspace ON public.presentations FOR UPDATE TO authenticated USING (office_private.presentation_client_permission(client_id,'operation')) WITH CHECK (office_private.presentation_client_permission(client_id,'operation'));
DROP POLICY IF EXISTS presentations_delete_workspace ON public.presentations;
CREATE POLICY presentations_delete_workspace ON public.presentations FOR DELETE TO authenticated USING (office_private.presentation_client_permission(client_id,'management'));
DROP POLICY IF EXISTS presentation_items_select_workspace ON public.presentation_items;
CREATE POLICY presentation_items_select_workspace ON public.presentation_items FOR SELECT TO authenticated USING (office_private.presentation_permission(presentation_id,'view'));
DROP POLICY IF EXISTS presentation_items_insert_workspace ON public.presentation_items;
CREATE POLICY presentation_items_insert_workspace ON public.presentation_items FOR INSERT TO authenticated WITH CHECK (office_private.presentation_permission(presentation_id,'operation'));
DROP POLICY IF EXISTS presentation_items_update_workspace ON public.presentation_items;
CREATE POLICY presentation_items_update_workspace ON public.presentation_items FOR UPDATE TO authenticated USING (office_private.presentation_permission(presentation_id,'operation')) WITH CHECK (office_private.presentation_permission(presentation_id,'operation'));
DROP POLICY IF EXISTS presentation_items_delete_workspace ON public.presentation_items;
CREATE POLICY presentation_items_delete_workspace ON public.presentation_items FOR DELETE TO authenticated USING (office_private.presentation_permission(presentation_id,'management'));
DROP POLICY IF EXISTS presentation_access_links_select_workspace ON public.presentation_access_links;
CREATE POLICY presentation_access_links_select_workspace ON public.presentation_access_links
FOR SELECT TO authenticated USING (office_private.presentation_permission(presentation_id,'operation'));
-- Token creation/revocation belongs exclusively to the validating RPCs.
REVOKE INSERT, UPDATE, DELETE ON public.presentation_access_links FROM authenticated;
REVOKE ALL ON public.presentations,public.presentation_items,public.presentation_access_links FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.presentations,public.presentation_items TO authenticated;
GRANT SELECT ON public.presentation_access_links TO authenticated;

CREATE OR REPLACE FUNCTION office_private.guard_presentation_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path TO public,pg_temp AS $body$
BEGIN
  -- SECURITY DEFINER RPCs execute as their owner, not as authenticated.
  IF current_user IN ('anon','authenticated') THEN
    IF TG_TABLE_NAME='presentations' AND TG_OP='UPDATE' THEN
      IF NEW.status IS DISTINCT FROM OLD.status
         AND NEW.status IN ('approved','approved_with_adjustments','rejected') THEN
        RAISE EXCEPTION 'DECISION_RPC_REQUIRED';
      END IF;
      IF NEW.client_id IS DISTINCT FROM OLD.client_id
         OR NEW.previous_presentation_id IS DISTINCT FROM OLD.previous_presentation_id
         OR NEW.presentation_series_id IS DISTINCT FROM OLD.presentation_series_id THEN
        RAISE EXCEPTION 'PRESENTATION_RELATION_IMMUTABLE';
      END IF;
    ELSIF TG_TABLE_NAME='presentation_items' THEN
      IF TG_OP='INSERT' THEN
        IF NEW.client_approval_status IS DISTINCT FROM 'pending'
           OR NEW.reviewed_at IS NOT NULL OR NEW.client_feedback IS NOT NULL THEN
          RAISE EXCEPTION 'DECISION_RPC_REQUIRED';
        END IF;
      ELSE
        IF NEW.presentation_id IS DISTINCT FROM OLD.presentation_id
           OR NEW.content_id IS DISTINCT FROM OLD.content_id THEN
          RAISE EXCEPTION 'PRESENTATION_RELATION_IMMUTABLE';
        END IF;
        IF NEW.client_approval_status IS DISTINCT FROM OLD.client_approval_status
           OR NEW.client_feedback IS DISTINCT FROM OLD.client_feedback
           OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
          RAISE EXCEPTION 'DECISION_RPC_REQUIRED';
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$body$;
REVOKE ALL ON FUNCTION office_private.guard_presentation_mutation() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS guard_presentation_mutation ON public.presentations;
CREATE TRIGGER guard_presentation_mutation BEFORE UPDATE ON public.presentations
FOR EACH ROW EXECUTE FUNCTION office_private.guard_presentation_mutation();
DROP TRIGGER IF EXISTS guard_presentation_mutation ON public.presentation_items;
CREATE TRIGGER guard_presentation_mutation BEFORE INSERT OR UPDATE ON public.presentation_items
FOR EACH ROW EXECUTE FUNCTION office_private.guard_presentation_mutation();

REVOKE ALL ON FUNCTION public.create_next_presentation_round(uuid,uuid[],text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_next_presentation_round(uuid,uuid[],text) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.create_presentation_access_link(uuid,timestamptz),public.revoke_presentation_access_link(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_presentation_access_link(uuid,timestamptz),public.revoke_presentation_access_link(uuid) TO authenticated;
