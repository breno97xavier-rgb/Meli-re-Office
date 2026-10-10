-- ==============================================================================
-- Migration: fix_create_next_presentation_round_view_mode
-- Description:
-- Corrige public.create_next_presentation_round removendo referências à coluna
-- inexistente public.presentations.view_mode.
--
-- Mantém o comportamento funcional da RPC original da F4.3D.3.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.create_next_presentation_round(
  p_source_presentation_id uuid,
  p_content_ids uuid[] DEFAULT '{}',
  p_custom_title text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_source record;
  v_series_id uuid;
  v_new_round_number integer;
  v_new_title text;
  v_content_id uuid;
  v_order integer := 0;
  v_now timestamptz := clock_timestamp();
  v_created_presentation record;
BEGIN
  -- 1. Validar autenticação e autorização administrativa
  IF auth.role() = 'service_role' THEN
    NULL;

  ELSIF auth.role() = 'authenticated' AND auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'team')
    ) THEN
      RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;

  ELSE
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
        created_at,
        updated_at
      )
      VALUES (
        v_created_presentation.id,
        v_content_id,
        v_order,
        'pending',
        NULL,
        NULL,
        NULL,
        v_now,
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

REVOKE ALL
ON FUNCTION public.create_next_presentation_round(uuid, uuid[], text)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.create_next_presentation_round(uuid, uuid[], text)
FROM anon;

GRANT EXECUTE
ON FUNCTION public.create_next_presentation_round(uuid, uuid[], text)
TO authenticated, service_role;

COMMENT ON FUNCTION public.create_next_presentation_round(uuid, uuid[], text) IS
'RPC administrativa atômica para criação de nova rodada de apresentação editorial preservando histórico e linhagem.';
