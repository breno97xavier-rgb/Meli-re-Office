-- ==============================================================================
-- Migration: 20260912160000_presentation_rounds_lineage.sql
-- Description: Geração de Próxima Rodada com Linhagem Explícita e Imutabilidade
-- Phase: F4.3D.3
-- ==============================================================================

-- 1. Novas Colunas de Linhagem em public.presentations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'presentations' AND column_name = 'presentation_series_id'
  ) THEN
    ALTER TABLE public.presentations ADD COLUMN presentation_series_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'presentations' AND column_name = 'previous_presentation_id'
  ) THEN
    ALTER TABLE public.presentations ADD COLUMN previous_presentation_id uuid REFERENCES public.presentations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Constraints e Índices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_presentations_no_self_previous'
  ) THEN
    ALTER TABLE public.presentations
      ADD CONSTRAINT check_presentations_no_self_previous
      CHECK (previous_presentation_id IS NULL OR previous_presentation_id <> id);
  END IF;
END $$;

-- Índice único parcial garantindo fisicamente que uma apresentação só pode gerar no máximo uma próxima rodada direta
CREATE UNIQUE INDEX IF NOT EXISTS uq_presentations_previous_id ON public.presentations(previous_presentation_id) WHERE previous_presentation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_presentations_series_id ON public.presentations(presentation_series_id);
CREATE INDEX IF NOT EXISTS idx_presentations_previous_id ON public.presentations(previous_presentation_id);
CREATE INDEX IF NOT EXISTS idx_presentations_series_round ON public.presentations(presentation_series_id, round_number);

-- 3. Inicialização de Registros Legados
UPDATE public.presentations
SET presentation_series_id = id
WHERE presentation_series_id IS NULL;

-- 4. RPC Transacional: create_next_presentation_round
CREATE OR REPLACE FUNCTION public.create_next_presentation_round(
  p_source_presentation_id uuid,
  p_content_ids uuid[] DEFAULT '{}',
  p_custom_title text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
    -- Acesso administrativo direto via service_role permitido
    NULL;
  ELSIF auth.role() = 'authenticated' AND auth.uid() IS NOT NULL THEN
    -- Validar se o usuário autenticado possui perfil no Office com papel administrativo ('admin' ou 'team')
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
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

  -- 3. Bloquear e carregar a Presentation de origem
  SELECT id, client_id, title, description, status, round_number, presentation_series_id, view_mode
  INTO v_source
  FROM public.presentations
  WHERE id = p_source_presentation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOURCE_PRESENTATION_NOT_FOUND';
  END IF;

  -- 4. Prevenção de duplicação acidental: verificar se já existe próxima rodada direta
  IF EXISTS (
    SELECT 1 FROM public.presentations WHERE previous_presentation_id = p_source_presentation_id
  ) THEN
    RAISE EXCEPTION 'ALREADY_HAS_NEXT_ROUND';
  END IF;

  -- 5. Validação integral e rigorosa de p_content_ids (ANTES de criar qualquer registro)
  IF p_content_ids IS NOT NULL AND array_length(p_content_ids, 1) > 0 THEN
    -- Rejeitar se contiver elementos nulos
    IF EXISTS (
      SELECT 1
      FROM unnest(p_content_ids) AS t(elem)
      WHERE t.elem IS NULL
    ) THEN
      RAISE EXCEPTION 'INVALID_CONTENT_SELECTION';
    END IF;

    -- Validar se TODOS os IDs passados existem e pertencem estritamente ao mesmo client_id da Presentation origem
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

  -- 7. Calcular novo round_number
  v_new_round_number := COALESCE(v_source.round_number, 1) + 1;

  -- 8. Calcular título limpo
  IF p_custom_title IS NOT NULL AND trim(p_custom_title) <> '' THEN
    v_new_title := trim(p_custom_title);
  ELSE
    -- Limpa sufixos de rodadas anteriores para não concatenar infinitamente
    v_new_title := regexp_replace(v_source.title, '\s*[-–(]?\s*Rodada\s*\d+\s*\)?$', '', 'i');
    v_new_title := regexp_replace(v_new_title, '\s*[-–(]?\s*R\d+\s*\)?$', '', 'i');
    IF trim(v_new_title) = '' THEN
      v_new_title := v_source.title;
    END IF;
  END IF;

  -- 9. Inserir Nova Presentation (atômico)
  INSERT INTO public.presentations (
    client_id,
    title,
    description,
    status,
    round_number,
    presentation_series_id,
    previous_presentation_id,
    view_mode,
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
    COALESCE(v_source.view_mode, 'deck'),
    COALESCE(auth.uid(), v_source.created_by),
    v_now,
    v_now
  )
  RETURNING * INTO v_created_presentation;

  -- 10. Inserir PresentationItems selecionados (se houver)
  IF p_content_ids IS NOT NULL AND array_length(p_content_ids, 1) > 0 THEN
    -- Inserção de itens únicos validados
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

  -- 11. Retorno Estruturado Sanitizado
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
$$;

-- 5. Permissões Mínimas de Acesso
REVOKE ALL ON FUNCTION public.create_next_presentation_round(uuid, uuid[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_next_presentation_round(uuid, uuid[], text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_next_presentation_round(uuid, uuid[], text) TO authenticated, service_role;

COMMENT ON FUNCTION public.create_next_presentation_round(uuid, uuid[], text) IS
'RPC administrativa atômica para criação de nova rodada de apresentação editorial preservando histórico e linhagem.';
