-- ==============================================================================
-- Migration: 20260920100000_commercial_funnel_foundation.sql
-- Description: Fundação de Banco e Ingestão Segura do Funil Comercial (Sessões + Eventos + RPCs)
-- Phase: INT.2A-H3 (Correção e Hardening Final da Fundação de Funil)
-- Status: PREPARADA PARA REVISÃO E EXECUÇÃO NO SUPABASE
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. TABELA: public.funnel_sessions
-- Representa a jornada pseudônima única do visitante (First-Touch Attribution)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.funnel_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_activity_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz NULL,
  lead_id uuid NULL REFERENCES public.leads(id) ON DELETE SET NULL,

  -- Atribuição First-Touch (Imutável)
  utm_source text NULL,
  utm_medium text NULL,
  utm_campaign text NULL,
  utm_content text NULL,
  utm_term text NULL,
  landing_url text NOT NULL,
  landing_path text NOT NULL,
  referrer text NULL,

  -- Contexto de Dispositivo / Viewport
  device_category text NOT NULL,
  viewport_width integer NULL,
  viewport_height integer NULL,

  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),

  -- Constraints de Integridade
  CONSTRAINT funnel_sessions_session_token_key UNIQUE (session_token),
  CONSTRAINT funnel_sessions_session_token_format CHECK (
    session_token ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  CONSTRAINT funnel_sessions_device_category_check CHECK (device_category IN ('mobile', 'tablet', 'desktop')),
  CONSTRAINT funnel_sessions_viewport_width_check CHECK (viewport_width IS NULL OR (viewport_width > 0 AND viewport_width <= 10000)),
  CONSTRAINT funnel_sessions_viewport_height_check CHECK (viewport_height IS NULL OR (viewport_height > 0 AND viewport_height <= 10000)),
  CONSTRAINT funnel_sessions_utm_source_len CHECK (utm_source IS NULL OR char_length(utm_source) <= 200),
  CONSTRAINT funnel_sessions_utm_medium_len CHECK (utm_medium IS NULL OR char_length(utm_medium) <= 200),
  CONSTRAINT funnel_sessions_utm_campaign_len CHECK (utm_campaign IS NULL OR char_length(utm_campaign) <= 200),
  CONSTRAINT funnel_sessions_utm_content_len CHECK (utm_content IS NULL OR char_length(utm_content) <= 200),
  CONSTRAINT funnel_sessions_utm_term_len CHECK (utm_term IS NULL OR char_length(utm_term) <= 200),
  CONSTRAINT funnel_sessions_landing_url_len CHECK (char_length(landing_url) <= 2000),
  CONSTRAINT funnel_sessions_landing_path_len CHECK (char_length(landing_path) <= 500),
  CONSTRAINT funnel_sessions_referrer_len CHECK (referrer IS NULL OR char_length(referrer) <= 2000)
);

-- ------------------------------------------------------------------------------
-- 2. TABELA: public.funnel_events
-- Ocorrências comportamentais atômicas vinculadas à sessão
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.funnel_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  step_number smallint NULL,
  path text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),

  -- Constraints de Integridade
  CONSTRAINT funnel_events_event_type_check CHECK (
    event_type IN (
      'landing_view',
      'briefing_cta_click',
      'briefing_view',
      'form_start',
      'form_step_completed',
      'form_submit',
      'lead_created',
      'whatsapp_click',
      'form_back',
      'form_error'
    )
  ),
  CONSTRAINT funnel_events_step_number_check CHECK (
    step_number IS NULL OR (step_number >= 1 AND step_number <= 5)
  ),
  CONSTRAINT funnel_events_path_len CHECK (char_length(path) <= 500),
  CONSTRAINT funnel_events_idempotency_key_len CHECK (idempotency_key IS NULL OR char_length(idempotency_key) <= 100),
  CONSTRAINT funnel_events_session_idempotency_key UNIQUE (session_id, idempotency_key)
);

-- ------------------------------------------------------------------------------
-- 3. ÍNDICES DE ALTA PERFORMANCE
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_funnel_sessions_started_at ON public.funnel_sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_sessions_last_activity ON public.funnel_sessions (last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_sessions_lead_id ON public.funnel_sessions (lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_funnel_sessions_utm_campaign ON public.funnel_sessions (utm_campaign) WHERE utm_campaign IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_funnel_sessions_utm_source ON public.funnel_sessions (utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_funnel_sessions_device ON public.funnel_sessions (device_category);

CREATE INDEX IF NOT EXISTS idx_funnel_events_session_id_created ON public.funnel_events (session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_funnel_events_event_type_created ON public.funnel_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_events_step_number ON public.funnel_events (step_number) WHERE step_number IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) & GRANTS
-- Isolamento rigoroso: anon sem acesso direto a tabelas; acesso via RPCs.
-- ------------------------------------------------------------------------------

ALTER TABLE public.funnel_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

-- Revogar qualquer acesso residual público/anon às tabelas
REVOKE ALL ON TABLE public.funnel_sessions FROM PUBLIC;
REVOKE ALL ON TABLE public.funnel_sessions FROM anon;
REVOKE ALL ON TABLE public.funnel_events FROM PUBLIC;
REVOKE ALL ON TABLE public.funnel_events FROM anon;

-- Conceder privilégios controlados
GRANT SELECT ON TABLE public.funnel_sessions TO authenticated;
GRANT SELECT ON TABLE public.funnel_events TO authenticated;
GRANT ALL ON TABLE public.funnel_sessions TO service_role;
GRANT ALL ON TABLE public.funnel_events TO service_role;

-- Políticas para usuários autenticados da equipe (Admin e Team)
DROP POLICY IF EXISTS "Authenticated team members can read funnel_sessions" ON public.funnel_sessions;
CREATE POLICY "Authenticated team members can read funnel_sessions"
ON public.funnel_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'team')
  )
);

DROP POLICY IF EXISTS "Authenticated team members can read funnel_events" ON public.funnel_events;
CREATE POLICY "Authenticated team members can read funnel_events"
ON public.funnel_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'team')
  )
);

-- ------------------------------------------------------------------------------
-- 5. RPC: public.ingest_funnel_session
-- Ingestão idempotente da sessão First-Touch com validação estrita sem truncamento
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ingest_funnel_session(
  p_session_token text,
  p_landing_url text,
  p_landing_path text,
  p_referrer text DEFAULT NULL,
  p_utm_source text DEFAULT NULL,
  p_utm_medium text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL,
  p_utm_content text DEFAULT NULL,
  p_utm_term text DEFAULT NULL,
  p_device_category text DEFAULT 'desktop',
  p_viewport_width integer DEFAULT NULL,
  p_viewport_height integer DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token text;
  v_url text;
  v_path text;
  v_ref text;
  v_source text;
  v_medium text;
  v_campaign text;
  v_content text;
  v_term text;
  v_device text;
  v_now timestamptz := clock_timestamp();
BEGIN
  -- 1. Normalização e Validação do Token UUID
  v_token := trim(COALESCE(p_session_token, ''));
  IF v_token = '' OR v_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'INVALID_SESSION_TOKEN_FORMAT';
  END IF;

  -- 2. Validação Estrita de URLs e Paths (Sem truncamento silencioso)
  v_url := trim(COALESCE(p_landing_url, ''));
  IF v_url = '' THEN
    RAISE EXCEPTION 'INVALID_LANDING_URL';
  END IF;
  IF char_length(v_url) > 2000 THEN
    RAISE EXCEPTION 'LANDING_URL_EXCEEDS_MAX_LENGTH';
  END IF;

  v_path := trim(COALESCE(p_landing_path, ''));
  IF v_path = '' THEN
    RAISE EXCEPTION 'INVALID_LANDING_PATH';
  END IF;
  IF char_length(v_path) > 500 THEN
    RAISE EXCEPTION 'LANDING_PATH_EXCEEDS_MAX_LENGTH';
  END IF;

  v_ref := NULLIF(trim(COALESCE(p_referrer, '')), '');
  IF v_ref IS NOT NULL AND char_length(v_ref) > 2000 THEN
    RAISE EXCEPTION 'REFERRER_EXCEEDS_MAX_LENGTH';
  END IF;

  -- 3. Validação Estrita de Parâmetros UTM (Sem truncamento silencioso)
  v_source := NULLIF(trim(COALESCE(p_utm_source, '')), '');
  IF v_source IS NOT NULL AND char_length(v_source) > 200 THEN
    RAISE EXCEPTION 'UTM_SOURCE_EXCEEDS_MAX_LENGTH';
  END IF;

  v_medium := NULLIF(trim(COALESCE(p_utm_medium, '')), '');
  IF v_medium IS NOT NULL AND char_length(v_medium) > 200 THEN
    RAISE EXCEPTION 'UTM_MEDIUM_EXCEEDS_MAX_LENGTH';
  END IF;

  v_campaign := NULLIF(trim(COALESCE(p_utm_campaign, '')), '');
  IF v_campaign IS NOT NULL AND char_length(v_campaign) > 200 THEN
    RAISE EXCEPTION 'UTM_CAMPAIGN_EXCEEDS_MAX_LENGTH';
  END IF;

  v_content := NULLIF(trim(COALESCE(p_utm_content, '')), '');
  IF v_content IS NOT NULL AND char_length(v_content) > 200 THEN
    RAISE EXCEPTION 'UTM_CONTENT_EXCEEDS_MAX_LENGTH';
  END IF;

  v_term := NULLIF(trim(COALESCE(p_utm_term, '')), '');
  IF v_term IS NOT NULL AND char_length(v_term) > 200 THEN
    RAISE EXCEPTION 'UTM_TERM_EXCEEDS_MAX_LENGTH';
  END IF;

  -- 4. Validação Estrita de Device e Viewport
  v_device := trim(lower(COALESCE(p_device_category, '')));
  IF v_device NOT IN ('mobile', 'tablet', 'desktop') THEN
    RAISE EXCEPTION 'INVALID_DEVICE_CATEGORY';
  END IF;

  IF p_viewport_width IS NOT NULL AND (p_viewport_width <= 0 OR p_viewport_width > 10000) THEN
    RAISE EXCEPTION 'INVALID_VIEWPORT_WIDTH';
  END IF;

  IF p_viewport_height IS NOT NULL AND (p_viewport_height <= 0 OR p_viewport_height > 10000) THEN
    RAISE EXCEPTION 'INVALID_VIEWPORT_HEIGHT';
  END IF;

  -- 5. Inserção Idempotente (Preservação First-Touch: em conflito, não altera aquisição nem last_activity)
  INSERT INTO public.funnel_sessions (
    session_token,
    started_at,
    last_activity_at,
    landing_url,
    landing_path,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    device_category,
    viewport_width,
    viewport_height,
    created_at,
    updated_at
  ) VALUES (
    v_token,
    v_now,
    v_now,
    v_url,
    v_path,
    v_ref,
    v_source,
    v_medium,
    v_campaign,
    v_content,
    v_term,
    v_device,
    p_viewport_width,
    p_viewport_height,
    v_now,
    v_now
  )
  ON CONFLICT (session_token) DO NOTHING;

  RETURN true;
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. RPC: public.ingest_funnel_event
-- Ingestão de evento com validação estrita de allowlist, tipos/valores e bloqueio público de lead_created
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ingest_funnel_event(
  p_session_token text,
  p_event_type text,
  p_path text,
  p_step_number smallint DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token text;
  v_event_type text;
  v_path text;
  v_session_id uuid;
  v_idempotency_key text := NULL;
  v_now timestamptz := clock_timestamp();
  v_key text;
  v_val jsonb;
  v_str_val text;
  v_event_inserted_id uuid;
  v_clean_metadata jsonb := '{}'::jsonb;
BEGIN
  -- 1. Validação e Localização da Sessão via Token UUID
  v_token := trim(COALESCE(p_session_token, ''));
  IF v_token = '' OR v_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'INVALID_SESSION_TOKEN_FORMAT';
  END IF;

  SELECT id INTO v_session_id
  FROM public.funnel_sessions
  WHERE session_token = v_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND';
  END IF;

  -- 2. Validação do Tipo de Evento (Bloqueio estrito de lead_created vindo do cliente público)
  v_event_type := trim(COALESCE(p_event_type, ''));
  IF v_event_type = 'lead_created' THEN
    RAISE EXCEPTION 'EVENT_NOT_PUBLICLY_INGESTIBLE';
  END IF;

  IF v_event_type NOT IN (
    'landing_view',
    'briefing_cta_click',
    'briefing_view',
    'form_start',
    'form_step_completed',
    'form_submit',
    'whatsapp_click',
    'form_back',
    'form_error'
  ) THEN
    RAISE EXCEPTION 'INVALID_EVENT_TYPE';
  END IF;

  -- 3. Validação do Caminho (Path)
  v_path := trim(COALESCE(p_path, ''));
  IF v_path = '' THEN
    RAISE EXCEPTION 'INVALID_PATH';
  END IF;
  IF char_length(v_path) > 500 THEN
    RAISE EXCEPTION 'PATH_EXCEEDS_MAX_LENGTH';
  END IF;

  -- 4. Coerência entre Event Type e Step Number
  IF v_event_type IN ('landing_view', 'briefing_cta_click', 'briefing_view', 'whatsapp_click') THEN
    IF p_step_number IS NOT NULL THEN
      RAISE EXCEPTION 'STEP_NUMBER_MUST_BE_NULL_FOR_EVENT: %', v_event_type;
    END IF;
  ELSIF v_event_type = 'form_start' THEN
    IF p_step_number IS NOT NULL AND p_step_number <> 1 THEN
      RAISE EXCEPTION 'FORM_START_MUST_BE_STEP_1';
    END IF;
    p_step_number := 1;
  ELSIF v_event_type = 'form_step_completed' THEN
    IF p_step_number IS NULL OR p_step_number < 1 OR p_step_number > 4 THEN
      RAISE EXCEPTION 'FORM_STEP_COMPLETED_STEP_MUST_BE_BETWEEN_1_AND_4';
    END IF;
  ELSIF v_event_type = 'form_submit' THEN
    IF p_step_number IS NOT NULL AND p_step_number <> 5 THEN
      RAISE EXCEPTION 'STEP_NUMBER_MUST_BE_5_FOR_SUBMIT';
    END IF;
    p_step_number := 5;
  ELSIF v_event_type IN ('form_back', 'form_error') THEN
    IF p_step_number IS NOT NULL AND (p_step_number < 1 OR p_step_number > 5) THEN
      RAISE EXCEPTION 'INVALID_STEP_NUMBER_FOR_FORM_ACTION';
    END IF;
  END IF;

  -- 5. Validação Estrita de Metadata (Estrutura, Allowlist de Chaves e Tipos/Valores)
  IF p_metadata IS NOT NULL AND p_metadata <> '{}'::jsonb THEN
    IF jsonb_typeof(p_metadata) <> 'object' THEN
      RAISE EXCEPTION 'METADATA_MUST_BE_JSON_OBJECT';
    END IF;

    FOR v_key, v_val IN SELECT * FROM jsonb_each(p_metadata)
    LOOP
      -- Bloquear categoricamente chaves com dados pessoais (PII)
      IF v_key IN ('name', 'email', 'whatsapp', 'phone', 'business_name', 'notes', 'message', 'text', 'cpf', 'cnpj', 'password') THEN
        RAISE EXCEPTION 'PII_KEYS_FORBIDDEN_IN_METADATA: %', v_key;
      END IF;

      -- Bloquear estruturas aninhadas (objetos ou arrays como valor)
      IF jsonb_typeof(v_val) IN ('object', 'array') THEN
        RAISE EXCEPTION 'NESTED_STRUCTURES_FORBIDDEN_IN_METADATA: %', v_key;
      END IF;

      -- Validação por tipo de evento
      IF v_event_type = 'landing_view' THEN
        IF v_key NOT IN ('section') THEN
          RAISE EXCEPTION 'INVALID_METADATA_KEY_FOR_LANDING_VIEW: %', v_key;
        END IF;
        IF jsonb_typeof(v_val) <> 'string' OR char_length(v_val#>>'{}') > 100 THEN
          RAISE EXCEPTION 'INVALID_METADATA_VALUE_FOR_SECTION';
        END IF;

      ELSIF v_event_type = 'briefing_cta_click' THEN
        IF v_key NOT IN ('cta_location', 'service_context') THEN
          RAISE EXCEPTION 'INVALID_METADATA_KEY_FOR_CTA_CLICK: %', v_key;
        END IF;
        IF jsonb_typeof(v_val) <> 'string' OR char_length(v_val#>>'{}') > 100 THEN
          RAISE EXCEPTION 'INVALID_METADATA_VALUE_FOR_CTA_CLICK';
        END IF;

      ELSIF v_event_type = 'briefing_view' THEN
        IF v_key NOT IN ('entry_mode') THEN
          RAISE EXCEPTION 'INVALID_METADATA_KEY_FOR_BRIEFING_VIEW: %', v_key;
        END IF;
        v_str_val := v_val#>>'{}';
        IF jsonb_typeof(v_val) <> 'string' OR v_str_val NOT IN ('direct', 'cta') THEN
          RAISE EXCEPTION 'INVALID_ENTRY_MODE_VALUE';
        END IF;

      ELSIF v_event_type = 'form_start' THEN
        IF v_key NOT IN ('initial_field') THEN
          RAISE EXCEPTION 'INVALID_METADATA_KEY_FOR_FORM_START: %', v_key;
        END IF;
        IF jsonb_typeof(v_val) <> 'string' OR char_length(v_val#>>'{}') > 100 THEN
          RAISE EXCEPTION 'INVALID_METADATA_VALUE_FOR_FORM_START';
        END IF;

      ELSIF v_event_type = 'form_step_completed' THEN
        IF v_key NOT IN ('step_title') THEN
          RAISE EXCEPTION 'INVALID_METADATA_KEY_FOR_STEP_COMPLETED: %', v_key;
        END IF;
        IF jsonb_typeof(v_val) <> 'string' OR char_length(v_val#>>'{}') > 100 THEN
          RAISE EXCEPTION 'INVALID_METADATA_VALUE_FOR_STEP_COMPLETED';
        END IF;

      ELSIF v_event_type = 'form_submit' THEN
        IF v_key NOT IN ('validation_passed') THEN
          RAISE EXCEPTION 'INVALID_METADATA_KEY_FOR_FORM_SUBMIT: %', v_key;
        END IF;
        IF jsonb_typeof(v_val) <> 'boolean' THEN
          RAISE EXCEPTION 'VALIDATION_PASSED_MUST_BE_BOOLEAN';
        END IF;

      ELSIF v_event_type = 'whatsapp_click' THEN
        IF v_key NOT IN ('cta_location') THEN
          RAISE EXCEPTION 'INVALID_METADATA_KEY_FOR_WHATSAPP_CLICK: %', v_key;
        END IF;
        IF jsonb_typeof(v_val) <> 'string' OR char_length(v_val#>>'{}') > 100 THEN
          RAISE EXCEPTION 'INVALID_METADATA_VALUE_FOR_WHATSAPP_CLICK';
        END IF;

      ELSIF v_event_type = 'form_back' THEN
        IF v_key NOT IN ('from_step', 'to_step') THEN
          RAISE EXCEPTION 'INVALID_METADATA_KEY_FOR_FORM_BACK: %', v_key;
        END IF;
        IF jsonb_typeof(v_val) <> 'number' THEN
          RAISE EXCEPTION 'STEP_IN_FORM_BACK_MUST_BE_INTEGER';
        END IF;
        IF (v_val#>>'{}') NOT IN ('1', '2', '3', '4', '5') THEN
          RAISE EXCEPTION 'STEP_IN_FORM_BACK_MUST_BE_INTEGER_BETWEEN_1_AND_5';
        END IF;

      ELSIF v_event_type = 'form_error' THEN
        IF v_key NOT IN ('error_category', 'field_name_context') THEN
          RAISE EXCEPTION 'INVALID_METADATA_KEY_FOR_FORM_ERROR: %', v_key;
        END IF;
        IF v_key = 'error_category' THEN
          v_str_val := v_val#>>'{}';
          IF jsonb_typeof(v_val) <> 'string' OR v_str_val NOT IN ('validation', 'network', 'server') THEN
            RAISE EXCEPTION 'INVALID_ERROR_CATEGORY_VALUE';
          END IF;
        ELSIF v_key = 'field_name_context' THEN
          IF jsonb_typeof(v_val) <> 'string' OR char_length(v_val#>>'{}') > 100 THEN
            RAISE EXCEPTION 'INVALID_FIELD_NAME_CONTEXT_VALUE';
          END IF;
        END IF;
      END IF;
    END LOOP;

    v_clean_metadata := p_metadata;
  END IF;

  -- 6. Derivação Server-Side da Idempotency Key para Eventos Únicos
  IF v_event_type = 'landing_view' THEN
    v_idempotency_key := 'landing_view';
  ELSIF v_event_type = 'briefing_view' THEN
    v_idempotency_key := 'briefing_view';
  ELSIF v_event_type = 'form_start' THEN
    v_idempotency_key := 'form_start';
  ELSIF v_event_type = 'form_step_completed' THEN
    v_idempotency_key := 'step_' || p_step_number::text;
  ELSE
    -- Eventos repetíveis legítimos: briefing_cta_click, form_submit, whatsapp_click, form_back, form_error
    v_idempotency_key := NULL;
  END IF;

  -- 7. Inserção do Evento e Atualização de Atividade
  IF v_idempotency_key IS NOT NULL THEN
    INSERT INTO public.funnel_events (
      session_id,
      event_type,
      step_number,
      path,
      metadata,
      idempotency_key,
      created_at
    ) VALUES (
      v_session_id,
      v_event_type,
      p_step_number,
      v_path,
      v_clean_metadata,
      v_idempotency_key,
      v_now
    )
    ON CONFLICT (session_id, idempotency_key) DO NOTHING
    RETURNING id INTO v_event_inserted_id;

    -- Apenas atualiza last_activity_at se o evento foi de fato novo/inserido
    IF v_event_inserted_id IS NOT NULL THEN
      UPDATE public.funnel_sessions
      SET
        last_activity_at = v_now,
        updated_at = v_now
      WHERE id = v_session_id;

      RETURN true;
    ELSE
      -- Duplicata ignorada de forma idempotente (não renova atividade)
      RETURN false;
    END IF;
  ELSE
    -- Evento repetível
    INSERT INTO public.funnel_events (
      session_id,
      event_type,
      step_number,
      path,
      metadata,
      idempotency_key,
      created_at
    ) VALUES (
      v_session_id,
      v_event_type,
      p_step_number,
      v_path,
      v_clean_metadata,
      NULL,
      v_now
    );

    UPDATE public.funnel_sessions
    SET
      last_activity_at = v_now,
      updated_at = v_now
    WHERE id = v_session_id;

    RETURN true;
  END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. RPC: public.submit_funnel_lead
-- Criação atômica e transacional do Lead com validação estrita sem truncamento e injeção interna de lead_created
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_funnel_lead(
  p_session_token text,
  p_lead_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token text;
  v_session record;
  v_name text;
  v_business_name text;
  v_whatsapp text;
  v_email text;
  v_lead_type text;
  v_segment text;
  v_website_insta text;
  v_notes text;
  v_pref_contact text;
  v_pref_period text;
  v_services text[];
  v_situation text[];
  v_objectives text[];
  v_key text;
  v_arr_elem jsonb;
  v_new_lead_id uuid;
  v_now timestamptz := clock_timestamp();
BEGIN
  -- 1. Normalização e Validação do Token UUID
  v_token := trim(COALESCE(p_session_token, ''));
  IF v_token = '' OR v_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'INVALID_SESSION_TOKEN_FORMAT';
  END IF;

  -- 2. Localização e Bloqueio Concorrente da Sessão
  SELECT
    id,
    lead_id,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    referrer,
    landing_url
  INTO v_session
  FROM public.funnel_sessions
  WHERE session_token = v_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND';
  END IF;

  -- 3. Proteção Contra Duplo Submit (Idempotência Segura)
  IF v_session.lead_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'lead_id', v_session.lead_id,
      'already_converted', true
    );
  END IF;

  -- 4. Validação de Chaves do Payload por ALLOWLIST
  IF p_lead_payload IS NULL OR jsonb_typeof(p_lead_payload) <> 'object' THEN
    RAISE EXCEPTION 'INVALID_LEAD_PAYLOAD';
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_lead_payload)
  LOOP
    IF v_key NOT IN (
      'name',
      'business_name',
      'whatsapp',
      'email',
      'lead_type',
      'segment_or_profession',
      'website_or_instagram',
      'notes',
      'services_interest',
      'current_situation',
      'objectives',
      'preferred_contact',
      'preferred_call_period'
    ) THEN
      RAISE EXCEPTION 'UNAUTHORIZED_LEAD_FIELD: %', v_key;
    END IF;
  END LOOP;

  -- 5. Extração e Validação dos Campos Obrigatórios (Validação de Tipos JSON e Sem Truncamento)
  -- 5.1 name (Obrigatório: chave deve existir, tipo string, não vazia após trim, <= 200 chars)
  IF NOT (p_lead_payload ? 'name') OR jsonb_typeof(p_lead_payload->'name') <> 'string' THEN
    RAISE EXCEPTION 'NAME_REQUIRED';
  END IF;
  v_name := trim(p_lead_payload->>'name');
  IF v_name = '' THEN
    RAISE EXCEPTION 'NAME_REQUIRED';
  END IF;
  IF char_length(v_name) > 200 THEN
    RAISE EXCEPTION 'NAME_EXCEEDS_MAX_LENGTH';
  END IF;

  -- 5.2 whatsapp (Opcional se houver email: se presente deve ser string ou JSON null)
  IF p_lead_payload ? 'whatsapp' THEN
    IF jsonb_typeof(p_lead_payload->'whatsapp') = 'null' THEN
      v_whatsapp := NULL;
    ELSIF jsonb_typeof(p_lead_payload->'whatsapp') = 'string' THEN
      v_whatsapp := NULLIF(trim(p_lead_payload->>'whatsapp'), '');
      IF v_whatsapp IS NOT NULL AND char_length(v_whatsapp) > 50 THEN
        RAISE EXCEPTION 'WHATSAPP_EXCEEDS_MAX_LENGTH';
      END IF;
    ELSE
      RAISE EXCEPTION 'WHATSAPP_MUST_BE_STRING';
    END IF;
  ELSE
    v_whatsapp := NULL;
  END IF;

  -- 5.3 email (Opcional se houver whatsapp: se presente deve ser string ou JSON null)
  IF p_lead_payload ? 'email' THEN
    IF jsonb_typeof(p_lead_payload->'email') = 'null' THEN
      v_email := NULL;
    ELSIF jsonb_typeof(p_lead_payload->'email') = 'string' THEN
      v_email := NULLIF(trim(p_lead_payload->>'email'), '');
      IF v_email IS NOT NULL THEN
        IF char_length(v_email) > 255 THEN
          RAISE EXCEPTION 'EMAIL_EXCEEDS_MAX_LENGTH';
        END IF;
        IF v_email !~* '^.+@.+\..+$' THEN
          RAISE EXCEPTION 'INVALID_EMAIL_FORMAT';
        END IF;
      END IF;
    ELSE
      RAISE EXCEPTION 'EMAIL_MUST_BE_STRING';
    END IF;
  ELSE
    v_email := NULL;
  END IF;

  IF v_whatsapp IS NULL AND v_email IS NULL THEN
    RAISE EXCEPTION 'CONTACT_REQUIRED_WHATSAPP_OR_EMAIL';
  END IF;

  -- 6. Extração e Validação dos Campos Opcionais do Briefing (Validação de Tipos JSON e Sem Truncamento)
  -- 6.1 business_name
  IF p_lead_payload ? 'business_name' THEN
    IF jsonb_typeof(p_lead_payload->'business_name') = 'null' THEN
      v_business_name := NULL;
    ELSIF jsonb_typeof(p_lead_payload->'business_name') = 'string' THEN
      v_business_name := NULLIF(trim(p_lead_payload->>'business_name'), '');
      IF v_business_name IS NOT NULL AND char_length(v_business_name) > 200 THEN
        RAISE EXCEPTION 'BUSINESS_NAME_EXCEEDS_MAX_LENGTH';
      END IF;
    ELSE
      RAISE EXCEPTION 'BUSINESS_NAME_MUST_BE_STRING';
    END IF;
  ELSE
    v_business_name := NULL;
  END IF;

  -- 6.2 lead_type
  IF p_lead_payload ? 'lead_type' THEN
    IF jsonb_typeof(p_lead_payload->'lead_type') = 'null' THEN
      v_lead_type := NULL;
    ELSIF jsonb_typeof(p_lead_payload->'lead_type') = 'string' THEN
      v_lead_type := NULLIF(trim(p_lead_payload->>'lead_type'), '');
      IF v_lead_type IS NOT NULL AND v_lead_type NOT IN ('business', 'self_employed') THEN
        RAISE EXCEPTION 'INVALID_LEAD_TYPE';
      END IF;
    ELSE
      RAISE EXCEPTION 'LEAD_TYPE_MUST_BE_STRING';
    END IF;
  ELSE
    v_lead_type := NULL;
  END IF;

  -- 6.3 segment_or_profession
  IF p_lead_payload ? 'segment_or_profession' THEN
    IF jsonb_typeof(p_lead_payload->'segment_or_profession') = 'null' THEN
      v_segment := NULL;
    ELSIF jsonb_typeof(p_lead_payload->'segment_or_profession') = 'string' THEN
      v_segment := NULLIF(trim(p_lead_payload->>'segment_or_profession'), '');
      IF v_segment IS NOT NULL AND char_length(v_segment) > 200 THEN
        RAISE EXCEPTION 'SEGMENT_EXCEEDS_MAX_LENGTH';
      END IF;
    ELSE
      RAISE EXCEPTION 'SEGMENT_MUST_BE_STRING';
    END IF;
  ELSE
    v_segment := NULL;
  END IF;

  -- 6.4 website_or_instagram
  IF p_lead_payload ? 'website_or_instagram' THEN
    IF jsonb_typeof(p_lead_payload->'website_or_instagram') = 'null' THEN
      v_website_insta := NULL;
    ELSIF jsonb_typeof(p_lead_payload->'website_or_instagram') = 'string' THEN
      v_website_insta := NULLIF(trim(p_lead_payload->>'website_or_instagram'), '');
      IF v_website_insta IS NOT NULL AND char_length(v_website_insta) > 500 THEN
        RAISE EXCEPTION 'WEBSITE_OR_INSTAGRAM_EXCEEDS_MAX_LENGTH';
      END IF;
    ELSE
      RAISE EXCEPTION 'WEBSITE_OR_INSTAGRAM_MUST_BE_STRING';
    END IF;
  ELSE
    v_website_insta := NULL;
  END IF;

  -- 6.5 notes
  IF p_lead_payload ? 'notes' THEN
    IF jsonb_typeof(p_lead_payload->'notes') = 'null' THEN
      v_notes := NULL;
    ELSIF jsonb_typeof(p_lead_payload->'notes') = 'string' THEN
      v_notes := NULLIF(trim(p_lead_payload->>'notes'), '');
      IF v_notes IS NOT NULL AND char_length(v_notes) > 4000 THEN
        RAISE EXCEPTION 'NOTES_EXCEEDS_MAX_LENGTH';
      END IF;
    ELSE
      RAISE EXCEPTION 'NOTES_MUST_BE_STRING';
    END IF;
  ELSE
    v_notes := NULL;
  END IF;

  -- 6.6 preferred_contact
  IF p_lead_payload ? 'preferred_contact' THEN
    IF jsonb_typeof(p_lead_payload->'preferred_contact') = 'null' THEN
      v_pref_contact := NULL;
    ELSIF jsonb_typeof(p_lead_payload->'preferred_contact') = 'string' THEN
      v_pref_contact := NULLIF(trim(p_lead_payload->>'preferred_contact'), '');
      IF v_pref_contact IS NOT NULL AND char_length(v_pref_contact) > 50 THEN
        RAISE EXCEPTION 'PREFERRED_CONTACT_EXCEEDS_MAX_LENGTH';
      END IF;
    ELSE
      RAISE EXCEPTION 'PREFERRED_CONTACT_MUST_BE_STRING';
    END IF;
  ELSE
    v_pref_contact := NULL;
  END IF;

  -- 6.7 preferred_call_period
  IF p_lead_payload ? 'preferred_call_period' THEN
    IF jsonb_typeof(p_lead_payload->'preferred_call_period') = 'null' THEN
      v_pref_period := NULL;
    ELSIF jsonb_typeof(p_lead_payload->'preferred_call_period') = 'string' THEN
      v_pref_period := NULLIF(trim(p_lead_payload->>'preferred_call_period'), '');
      IF v_pref_period IS NOT NULL AND v_pref_period NOT IN ('morning', 'afternoon') THEN
        RAISE EXCEPTION 'INVALID_PREFERRED_CALL_PERIOD';
      END IF;
    ELSE
      RAISE EXCEPTION 'PREFERRED_CALL_PERIOD_MUST_BE_STRING';
    END IF;
  ELSE
    v_pref_period := NULL;
  END IF;

  -- 7. Validação Estrita e Conversão de Arrays JSONB para text[]
  -- 7.1 services_interest
  IF p_lead_payload ? 'services_interest' THEN
    IF jsonb_typeof(p_lead_payload->'services_interest') <> 'array' THEN
      RAISE EXCEPTION 'SERVICES_INTEREST_MUST_BE_ARRAY';
    END IF;
    IF jsonb_array_length(p_lead_payload->'services_interest') > 20 THEN
      RAISE EXCEPTION 'SERVICES_INTEREST_EXCEEDS_MAX_ITEMS';
    END IF;
    FOR v_arr_elem IN SELECT * FROM jsonb_array_elements(p_lead_payload->'services_interest')
    LOOP
      IF jsonb_typeof(v_arr_elem) <> 'string' OR char_length(v_arr_elem#>>'{}') = 0 OR char_length(v_arr_elem#>>'{}') > 100 THEN
        RAISE EXCEPTION 'INVALID_SERVICES_INTEREST_ITEM';
      END IF;
    END LOOP;
    SELECT array_agg(elem::text) INTO v_services
    FROM jsonb_array_elements_text(p_lead_payload->'services_interest') AS elem;
  ELSE
    v_services := NULL;
  END IF;

  -- 7.2 current_situation
  IF p_lead_payload ? 'current_situation' THEN
    IF jsonb_typeof(p_lead_payload->'current_situation') <> 'array' THEN
      RAISE EXCEPTION 'CURRENT_SITUATION_MUST_BE_ARRAY';
    END IF;
    IF jsonb_array_length(p_lead_payload->'current_situation') > 20 THEN
      RAISE EXCEPTION 'CURRENT_SITUATION_EXCEEDS_MAX_ITEMS';
    END IF;
    FOR v_arr_elem IN SELECT * FROM jsonb_array_elements(p_lead_payload->'current_situation')
    LOOP
      IF jsonb_typeof(v_arr_elem) <> 'string' OR char_length(v_arr_elem#>>'{}') = 0 OR char_length(v_arr_elem#>>'{}') > 100 THEN
        RAISE EXCEPTION 'INVALID_CURRENT_SITUATION_ITEM';
      END IF;
    END LOOP;
    SELECT array_agg(elem::text) INTO v_situation
    FROM jsonb_array_elements_text(p_lead_payload->'current_situation') AS elem;
  ELSE
    v_situation := NULL;
  END IF;

  -- 7.3 objectives
  IF p_lead_payload ? 'objectives' THEN
    IF jsonb_typeof(p_lead_payload->'objectives') <> 'array' THEN
      RAISE EXCEPTION 'OBJECTIVES_MUST_BE_ARRAY';
    END IF;
    IF jsonb_array_length(p_lead_payload->'objectives') > 20 THEN
      RAISE EXCEPTION 'OBJECTIVES_EXCEEDS_MAX_ITEMS';
    END IF;
    FOR v_arr_elem IN SELECT * FROM jsonb_array_elements(p_lead_payload->'objectives')
    LOOP
      IF jsonb_typeof(v_arr_elem) <> 'string' OR char_length(v_arr_elem#>>'{}') = 0 OR char_length(v_arr_elem#>>'{}') > 100 THEN
        RAISE EXCEPTION 'INVALID_OBJECTIVES_ITEM';
      END IF;
    END LOOP;
    SELECT array_agg(elem::text) INTO v_objectives
    FROM jsonb_array_elements_text(p_lead_payload->'objectives') AS elem;
  ELSE
    v_objectives := NULL;
  END IF;

  -- 8. Criação do Lead em public.leads (Atribuição herdada estritamente da Sessão First-Touch)
  INSERT INTO public.leads (
    name,
    business_name,
    whatsapp,
    email,
    lead_type,
    segment_or_profession,
    website_or_instagram,
    notes,
    services_interest,
    current_situation,
    objectives,
    preferred_contact,
    preferred_call_period,
    status,
    source,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    referrer,
    landing_url,
    created_at,
    updated_at
  ) VALUES (
    v_name,
    v_business_name,
    v_whatsapp,
    v_email,
    v_lead_type,
    v_segment,
    v_website_insta,
    v_notes,
    v_services,
    v_situation,
    v_objectives,
    v_pref_contact,
    v_pref_period,
    'new',
    'website',
    v_session.utm_source,
    v_session.utm_medium,
    v_session.utm_campaign,
    v_session.utm_content,
    v_session.utm_term,
    v_session.referrer,
    v_session.landing_url,
    v_now,
    v_now
  )
  RETURNING id INTO v_new_lead_id;

  -- 9. Associação Atômica com a Sessão
  UPDATE public.funnel_sessions
  SET
    lead_id = v_new_lead_id,
    completed_at = v_now,
    last_activity_at = v_now,
    updated_at = v_now
  WHERE id = v_session.id;

  -- 10. Inserção Interna do Evento lead_created (Construído exclusivamente no banco)
  INSERT INTO public.funnel_events (
    session_id,
    event_type,
    step_number,
    path,
    metadata,
    idempotency_key,
    created_at
  ) VALUES (
    v_session.id,
    'lead_created',
    5,
    '/briefing',
    jsonb_build_object('source', 'submit_funnel_lead'),
    'lead_created',
    v_now
  )
  ON CONFLICT (session_id, idempotency_key) DO NOTHING;

  -- 11. Retorno Estruturado Sanitizado
  RETURN jsonb_build_object(
    'success', true,
    'lead_id', v_new_lead_id,
    'already_converted', false
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. PERMISSÕES MÍNIMAS DE EXECUÇÃO (GRANTs)
-- ------------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.ingest_funnel_session(text, text, text, text, text, text, text, text, text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ingest_funnel_session(text, text, text, text, text, text, text, text, text, text, integer, integer) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.ingest_funnel_event(text, text, text, smallint, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ingest_funnel_event(text, text, text, smallint, jsonb) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.submit_funnel_lead(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_funnel_lead(text, jsonb) TO anon, authenticated, service_role;

COMMENT ON TABLE public.funnel_sessions IS 'Registro de sessões pseudônimas do funil comercial com atribuição first-touch.';
COMMENT ON TABLE public.funnel_events IS 'Eventos comportamentais cronológicos do funil comercial com proteção contra PII.';
COMMENT ON FUNCTION public.ingest_funnel_session IS 'Registra a abertura de sessão anônima no funil com first-touch imutável.';
COMMENT ON FUNCTION public.ingest_funnel_event IS 'Registra evento comportamental com allowlist estrita e deduplicação.';
COMMENT ON FUNCTION public.submit_funnel_lead IS 'Cria o Lead e vincula a sessão de forma atômica, transacional e segura.';

COMMIT;
