-- ==============================================================================
-- Migration: 20260924100000_commercial_roots_workspace_ownership.sql
-- Module: Core Architecture - Commercial Roots Workspace Ownership (S3.2B)
-- Description:
--   Establishes direct Workspace ownership (workspace_id) on the four commercial
--   root entities: public.clients, public.leads, public.opportunities, public.funnel_sessions.
--   Executes a deterministic legacy backfill targeting 'Melière Marketing' (slug = 'meliere'),
--   enforces NOT NULL with FOREIGN KEY constraints (ON DELETE RESTRICT), creates high-performance
--   indexes, and updates commercial ingestion/conversion RPCs to strictly preserve and propagate
--   workspace ownership across the entire commercial lifecycle without default fallbacks.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. ADIÇÃO DE COLUNA workspace_id INICIALMENTE NULL NAS 4 RAÍZES
-- ------------------------------------------------------------------------------

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS workspace_id uuid NULL;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS workspace_id uuid NULL;

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS workspace_id uuid NULL;

ALTER TABLE public.funnel_sessions
  ADD COLUMN IF NOT EXISTS workspace_id uuid NULL;

-- ------------------------------------------------------------------------------
-- 2. BACKFILL DETERMINÍSTICO PARA O TENANT INICIAL 'meliere'
-- ------------------------------------------------------------------------------

DO $$
DECLARE
  v_meliere_workspace_id uuid;
  v_null_remaining integer;
BEGIN
  -- 2.1 Resolução determinística do Workspace 'meliere'
  SELECT id INTO v_meliere_workspace_id
  FROM public.workspaces
  WHERE slug = 'meliere'
  LIMIT 1;

  -- 2.2 Falha explícita se o Workspace não for localizado
  IF v_meliere_workspace_id IS NULL THEN
    RAISE EXCEPTION 'WORKSPACE_NOT_FOUND: Workspace with slug "meliere" does not exist. Cannot perform legacy ownership backfill.';
  END IF;

  -- 2.3 Atribuição determinística dos registros legados
  UPDATE public.clients
  SET workspace_id = v_meliere_workspace_id
  WHERE workspace_id IS NULL;

  UPDATE public.leads
  SET workspace_id = v_meliere_workspace_id
  WHERE workspace_id IS NULL;

  UPDATE public.opportunities
  SET workspace_id = v_meliere_workspace_id
  WHERE workspace_id IS NULL;

  UPDATE public.funnel_sessions
  SET workspace_id = v_meliere_workspace_id
  WHERE workspace_id IS NULL;

  -- 2.4 Validação de Invariante de Completude: Zero NULLs
  SELECT
    (SELECT count(*) FROM public.clients WHERE workspace_id IS NULL) +
    (SELECT count(*) FROM public.leads WHERE workspace_id IS NULL) +
    (SELECT count(*) FROM public.opportunities WHERE workspace_id IS NULL) +
    (SELECT count(*) FROM public.funnel_sessions WHERE workspace_id IS NULL)
  INTO v_null_remaining;

  IF v_null_remaining > 0 THEN
    RAISE EXCEPTION 'BACKFILL_INCOMPLETE: % rows across commercial roots still have NULL workspace_id.', v_null_remaining;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. INTEGRIDADE REFERENCIAL (FOREIGN KEYS COM ON DELETE RESTRICT)
-- ------------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_clients_workspace') THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT fk_clients_workspace
      FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_leads_workspace') THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT fk_leads_workspace
      FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_opportunities_workspace') THEN
    ALTER TABLE public.opportunities
      ADD CONSTRAINT fk_opportunities_workspace
      FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_funnel_sessions_workspace') THEN
    ALTER TABLE public.funnel_sessions
      ADD CONSTRAINT fk_funnel_sessions_workspace
      FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. OBRIGATORIEDADE ESTRITA (NOT NULL SEM DEFAULT)
-- ------------------------------------------------------------------------------

ALTER TABLE public.clients
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE public.leads
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE public.opportunities
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE public.funnel_sessions
  ALTER COLUMN workspace_id SET NOT NULL;

-- ------------------------------------------------------------------------------
-- 5. ÍNDICES DE ALTA PERFORMANCE PARA WORKSPACE_ID
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_clients_workspace_id
  ON public.clients (workspace_id);

CREATE INDEX IF NOT EXISTS idx_leads_workspace_id
  ON public.leads (workspace_id);

CREATE INDEX IF NOT EXISTS idx_opportunities_workspace_id
  ON public.opportunities (workspace_id);

CREATE INDEX IF NOT EXISTS idx_funnel_sessions_workspace_id
  ON public.funnel_sessions (workspace_id);

-- ------------------------------------------------------------------------------
-- 6. RPC: public.ingest_funnel_session (Atualizada com Resolução Server-Side de Workspace)
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
  v_workspace_id uuid;
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

  -- 5. Resolução Server-Side Controlada do Workspace Institucional (Ponte Transitória Segura S3.2B)
  SELECT id INTO v_workspace_id
  FROM public.workspaces
  WHERE slug = 'meliere' AND status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'INSTITUTIONAL_WORKSPACE_NOT_FOUND: Workspace meliere not found or inactive.';
  END IF;

  -- 6. Inserção Idempotente com Workspace Explícito (Sem default de banco)
  INSERT INTO public.funnel_sessions (
    workspace_id,
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
    v_workspace_id,
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
-- 7. RPC: public.submit_funnel_lead (Atualizada com Propagação de workspace_id)
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
  v_now timestamptz := clock_timestamp();
  v_new_lead_id uuid;
  v_name text;
  v_whatsapp text;
  v_email text;
  v_business_name text;
  v_lead_type text;
  v_segment text;
  v_website_insta text;
  v_notes text;
  v_pref_contact text;
  v_pref_period text;
  v_services text[];
  v_situation text[];
  v_objectives text[];
  v_arr_elem jsonb;
BEGIN
  -- 1. Validação do Token da Sessão
  v_token := trim(COALESCE(p_session_token, ''));
  IF v_token = '' OR v_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'INVALID_SESSION_TOKEN_FORMAT';
  END IF;

  -- 2. Bloqueio Concorrente da Sessão e Leitura de Atribuição + Workspace
  SELECT id, workspace_id, lead_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer, landing_url
  INTO v_session
  FROM public.funnel_sessions
  WHERE session_token = v_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND';
  END IF;

  -- 3. Invariante de Ownership: Sessão DEVE possuir Workspace
  IF v_session.workspace_id IS NULL THEN
    RAISE EXCEPTION 'FUNNEL_SESSION_HAS_NO_WORKSPACE: A sessão de funil não possui workspace associado.';
  END IF;

  -- 4. Idempotência / Re-submissão
  IF v_session.lead_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'lead_id', v_session.lead_id,
      'already_converted', true
    );
  END IF;

  -- 5. Validação do Payload
  IF p_lead_payload IS NULL OR jsonb_typeof(p_lead_payload) <> 'object' THEN
    RAISE EXCEPTION 'INVALID_LEAD_PAYLOAD';
  END IF;

  -- 5.1 name (Obrigatório)
  IF NOT (p_lead_payload ? 'name') OR jsonb_typeof(p_lead_payload->'name') <> 'string' THEN
    RAISE EXCEPTION 'NAME_REQUIRED';
  END IF;
  v_name := trim(p_lead_payload->>'name');
  IF v_name = '' THEN
    RAISE EXCEPTION 'NAME_CANNOT_BE_EMPTY';
  END IF;
  IF char_length(v_name) > 200 THEN
    RAISE EXCEPTION 'NAME_EXCEEDS_MAX_LENGTH';
  END IF;

  -- 5.2 whatsapp (Opcional)
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

  -- 5.3 email (Opcional)
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

  -- 6. Campos Opcionais
  IF p_lead_payload ? 'business_name' AND jsonb_typeof(p_lead_payload->'business_name') = 'string' THEN
    v_business_name := NULLIF(trim(p_lead_payload->>'business_name'), '');
    IF v_business_name IS NOT NULL AND char_length(v_business_name) > 200 THEN
      RAISE EXCEPTION 'BUSINESS_NAME_EXCEEDS_MAX_LENGTH';
    END IF;
  END IF;

  IF p_lead_payload ? 'lead_type' AND jsonb_typeof(p_lead_payload->'lead_type') = 'string' THEN
    v_lead_type := NULLIF(trim(p_lead_payload->>'lead_type'), '');
    IF v_lead_type IS NOT NULL AND v_lead_type NOT IN ('business', 'self_employed') THEN
      RAISE EXCEPTION 'INVALID_LEAD_TYPE';
    END IF;
  END IF;

  IF p_lead_payload ? 'segment_or_profession' AND jsonb_typeof(p_lead_payload->'segment_or_profession') = 'string' THEN
    v_segment := NULLIF(trim(p_lead_payload->>'segment_or_profession'), '');
    IF v_segment IS NOT NULL AND char_length(v_segment) > 200 THEN
      RAISE EXCEPTION 'SEGMENT_EXCEEDS_MAX_LENGTH';
    END IF;
  END IF;

  IF p_lead_payload ? 'website_or_instagram' AND jsonb_typeof(p_lead_payload->'website_or_instagram') = 'string' THEN
    v_website_insta := NULLIF(trim(p_lead_payload->>'website_or_instagram'), '');
    IF v_website_insta IS NOT NULL AND char_length(v_website_insta) > 500 THEN
      RAISE EXCEPTION 'WEBSITE_OR_INSTAGRAM_EXCEEDS_MAX_LENGTH';
    END IF;
  END IF;

  IF p_lead_payload ? 'notes' AND jsonb_typeof(p_lead_payload->'notes') = 'string' THEN
    v_notes := NULLIF(trim(p_lead_payload->>'notes'), '');
    IF v_notes IS NOT NULL AND char_length(v_notes) > 4000 THEN
      RAISE EXCEPTION 'NOTES_EXCEEDS_MAX_LENGTH';
    END IF;
  END IF;

  IF p_lead_payload ? 'preferred_contact' AND jsonb_typeof(p_lead_payload->'preferred_contact') = 'string' THEN
    v_pref_contact := NULLIF(trim(p_lead_payload->>'preferred_contact'), '');
    IF v_pref_contact IS NOT NULL AND char_length(v_pref_contact) > 50 THEN
      RAISE EXCEPTION 'PREFERRED_CONTACT_EXCEEDS_MAX_LENGTH';
    END IF;
  END IF;

  IF p_lead_payload ? 'preferred_call_period' AND jsonb_typeof(p_lead_payload->'preferred_call_period') = 'string' THEN
    v_pref_period := NULLIF(trim(p_lead_payload->>'preferred_call_period'), '');
    IF v_pref_period IS NOT NULL AND v_pref_period NOT IN ('morning', 'afternoon') THEN
      RAISE EXCEPTION 'INVALID_PREFERRED_CALL_PERIOD';
    END IF;
  END IF;

  -- 7. Arrays
  IF p_lead_payload ? 'services_interest' AND jsonb_typeof(p_lead_payload->'services_interest') = 'array' THEN
    SELECT array_agg(elem::text) INTO v_services
    FROM jsonb_array_elements_text(p_lead_payload->'services_interest') AS elem;
  END IF;

  IF p_lead_payload ? 'current_situation' AND jsonb_typeof(p_lead_payload->'current_situation') = 'array' THEN
    SELECT array_agg(elem::text) INTO v_situation
    FROM jsonb_array_elements_text(p_lead_payload->'current_situation') AS elem;
  END IF;

  IF p_lead_payload ? 'objectives' AND jsonb_typeof(p_lead_payload->'objectives') = 'array' THEN
    SELECT array_agg(elem::text) INTO v_objectives
    FROM jsonb_array_elements_text(p_lead_payload->'objectives') AS elem;
  END IF;

  -- 8. Criação do Lead em public.leads com herança estrita de workspace_id da Sessão
  INSERT INTO public.leads (
    workspace_id,
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
    v_session.workspace_id,
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

  -- 10. Inserção Interna do Evento lead_created
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
-- 8. RPC: public.convert_lead_to_opportunity (Atualizada com Herança de workspace_id)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.convert_lead_to_opportunity(
  p_lead_id uuid,
  p_title text,
  p_stage text DEFAULT 'discovery',
  p_estimated_value numeric DEFAULT NULL,
  p_services_of_interest text[] DEFAULT '{}'::text[],
  p_probability integer DEFAULT NULL,
  p_next_action text DEFAULT NULL,
  p_next_action_date date DEFAULT NULL,
  p_expected_close_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lead record;
  v_new_opp_id uuid;
  v_opp record;
  v_now timestamptz := clock_timestamp();
  v_user_id uuid := auth.uid();
BEGIN
  -- 1. Validação de Autenticação
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: Autenticação necessária para converter lead em oportunidade.';
  END IF;

  -- 2. Localização e Bloqueio do Lead
  SELECT id, name, business_name, email, whatsapp, workspace_id, status
  INTO v_lead
  FROM public.leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAD_NOT_FOUND: Lead não encontrado.';
  END IF;

  -- 3. Invariante de Ownership: Lead DEVE possuir Workspace
  IF v_lead.workspace_id IS NULL THEN
    RAISE EXCEPTION 'LEAD_HAS_NO_WORKSPACE: O lead especificado não possui vínculo com nenhum workspace.';
  END IF;

  -- 4. Criação da Oportunidade com herança estrita de workspace_id do Lead
  INSERT INTO public.opportunities (
    workspace_id,
    lead_id,
    title,
    stage,
    estimated_value,
    services_of_interest,
    probability,
    next_action,
    next_action_date,
    expected_close_date,
    owner_id,
    created_at,
    updated_at
  ) VALUES (
    v_lead.workspace_id,
    v_lead.id,
    trim(p_title),
    COALESCE(p_stage, 'discovery'),
    p_estimated_value,
    COALESCE(p_services_of_interest, '{}'::text[]),
    p_probability,
    trim(p_next_action),
    p_next_action_date,
    p_expected_close_date,
    v_user_id,
    v_now,
    v_now
  )
  RETURNING id INTO v_new_opp_id;

  -- 5. Atualização do Status do Lead para Convertido
  UPDATE public.leads
  SET
    status = 'converted',
    updated_at = v_now
  WHERE id = v_lead.id;

  -- 6. Retorno estruturado
  SELECT
    id,
    workspace_id,
    title,
    lead_id,
    client_id,
    contact_id,
    stage,
    estimated_value,
    services_of_interest,
    probability,
    next_action,
    next_action_date,
    expected_close_date,
    closed_at,
    lost_reason,
    owner_id,
    created_at,
    updated_at
  INTO v_opp
  FROM public.opportunities
  WHERE id = v_new_opp_id;

  RETURN to_jsonb(v_opp);
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. RPC: public.convert_signed_contract_to_client (Atualizada com Herança de workspace_id)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.convert_signed_contract_to_client(
  p_contract_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_contract record;
  v_opportunity record;
  v_lead record;
  v_client_id uuid;
  v_client_name text;
  v_client_slug text;
  v_base_slug text;
  v_slug_suffix integer := 1;
  v_now timestamptz := clock_timestamp();
  v_client record;
  v_user_id uuid := auth.uid();
BEGIN
  -- 1. Validação de Autenticação
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: Autenticação necessária para converter contrato em cliente.';
  END IF;

  -- 2. Localização e Bloqueio do Contrato
  SELECT id, status, contract_number, title, monthly_amount, one_time_amount, start_date, end_date, opportunity_id
  INTO v_contract
  FROM public.contracts
  WHERE id = p_contract_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CONTRACT_NOT_FOUND: Contrato não encontrado.';
  END IF;

  IF v_contract.status <> 'signed' THEN
    RAISE EXCEPTION 'CONTRACT_MUST_BE_SIGNED: Somente contratos com status "signed" podem ser convertidos em cliente.';
  END IF;

  IF v_contract.opportunity_id IS NULL THEN
    RAISE EXCEPTION 'CONTRACT_HAS_NO_OPPORTUNITY: Contrato não está vinculado a uma oportunidade.';
  END IF;

  -- 3. Localização e Bloqueio da Oportunidade
  SELECT id, workspace_id, client_id, lead_id, title
  INTO v_opportunity
  FROM public.opportunities
  WHERE id = v_contract.opportunity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OPPORTUNITY_NOT_FOUND: Oportunidade de origem não encontrada.';
  END IF;

  IF v_opportunity.client_id IS NOT NULL THEN
    RAISE EXCEPTION 'OPPORTUNITY_ALREADY_LINKED_TO_CLIENT: Esta oportunidade já possui um cliente vinculado.';
  END IF;

  -- 4. Invariante de Ownership: Oportunidade DEVE possuir Workspace
  IF v_opportunity.workspace_id IS NULL THEN
    RAISE EXCEPTION 'OPPORTUNITY_HAS_NO_WORKSPACE: A oportunidade de origem não possui vínculo com nenhum workspace.';
  END IF;

  -- 5. Extração dos Dados do Lead de Origem (se houver)
  IF v_opportunity.lead_id IS NOT NULL THEN
    SELECT name, business_name, email, whatsapp, segment_or_profession, website_or_instagram
    INTO v_lead
    FROM public.leads
    WHERE id = v_opportunity.lead_id;
  END IF;

  -- 6. Definição do Nome e Geração do Slug Único
  v_client_name := COALESCE(NULLIF(trim(v_lead.business_name), ''), NULLIF(trim(v_lead.name), ''), NULLIF(trim(v_contract.title), ''), 'Novo Cliente');
  v_base_slug := lower(regexp_replace(v_client_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := trim(both '-' from v_base_slug);
  IF v_base_slug = '' THEN
    v_base_slug := 'cliente-' || substring(v_contract.id::text from 1 for 8);
  END IF;

  v_client_slug := v_base_slug;
  WHILE EXISTS (SELECT 1 FROM public.clients WHERE slug = v_client_slug) LOOP
    v_slug_suffix := v_slug_suffix + 1;
    v_client_slug := v_base_slug || '-' || v_slug_suffix;
  END LOOP;

  -- 7. Criação do Cliente com herança estrita de workspace_id da Oportunidade
  INSERT INTO public.clients (
    workspace_id,
    name,
    commercial_name,
    slug,
    status,
    segment,
    email,
    phone,
    website,
    instagram,
    monthly_amount,
    one_time_amount,
    contract_start_date,
    contract_end_date,
    origin_contract_id,
    origin_opportunity_id,
    created_at,
    updated_at
  ) VALUES (
    v_opportunity.workspace_id,
    v_client_name,
    COALESCE(NULLIF(trim(v_lead.business_name), ''), v_client_name),
    v_client_slug,
    'onboarding',
    v_lead.segment_or_profession,
    v_lead.email,
    v_lead.whatsapp,
    v_lead.website_or_instagram,
    NULL,
    v_contract.monthly_amount,
    v_contract.one_time_amount,
    v_contract.start_date,
    v_contract.end_date,
    v_contract.id,
    v_opportunity.id,
    v_now,
    v_now
  )
  RETURNING id INTO v_client_id;

  -- 8. Vinculação da Oportunidade ao novo Cliente e Fechamento Comercial ('won')
  UPDATE public.opportunities
  SET
    client_id = v_client_id,
    stage = 'won',
    closed_at = COALESCE(closed_at, v_now),
    updated_at = v_now
  WHERE id = v_opportunity.id;

  -- 9. Retorno do Cliente Criado
  SELECT * INTO v_client FROM public.clients WHERE id = v_client_id;
  RETURN to_jsonb(v_client);
END;
$$;

-- ------------------------------------------------------------------------------
-- 10. PERMISSÕES DE EXECUÇÃO DAS RPCS (GRANTS)
-- ------------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.convert_lead_to_opportunity(uuid, text, text, numeric, text[], integer, text, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_lead_to_opportunity(uuid, text, text, numeric, text[], integer, text, date, date) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.convert_signed_contract_to_client(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_signed_contract_to_client(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.ingest_funnel_session(text, text, text, text, text, text, text, text, text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ingest_funnel_session(text, text, text, text, text, text, text, text, text, text, integer, integer) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.submit_funnel_lead(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_funnel_lead(text, jsonb) TO anon, authenticated, service_role;

COMMIT;
