-- ==============================================================================
-- Migration: 20260924100000_commercial_roots_workspace_ownership.sql
-- Module: Core Architecture - Commercial Roots Workspace Ownership (S3.2B)
-- Reconciled: 2026-09-27 against the live Supabase schema
--
-- Purpose:
--   1) Add direct Workspace ownership to clients, leads, opportunities and
--      funnel_sessions.
--   2) Backfill every legacy row into the initial Melière Workspace.
--   3) Preserve the CURRENT live commercial RPCs without replacing them.
--   4) Provide a temporary, fail-closed compatibility bridge while the frontend
--      and public funnel are not yet workspace-aware:
--        - if ownership can be derived from a parent, inherit it;
--        - otherwise, resolve a workspace only when exactly ONE active workspace
--          exists;
--        - as soon as more than one active workspace exists, NULL ownership is
--          rejected instead of guessing a tenant.
--
-- IMPORTANT:
--   This migration intentionally does NOT redefine ingest_funnel_session,
--   submit_funnel_lead, convert_lead_to_opportunity or
--   convert_signed_contract_to_client. Their live behavior is preserved.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. ROOT OWNERSHIP COLUMNS
-- ------------------------------------------------------------------------------

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS workspace_id uuid;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS workspace_id uuid;

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS workspace_id uuid;

ALTER TABLE public.funnel_sessions
  ADD COLUMN IF NOT EXISTS workspace_id uuid;

-- ------------------------------------------------------------------------------
-- 2. DETERMINISTIC LEGACY BACKFILL
-- ------------------------------------------------------------------------------

DO $$
DECLARE
  v_workspace_id uuid;
  v_workspace_count integer;
  v_null_count bigint;
BEGIN
  SELECT count(*), min(id)
    INTO v_workspace_count, v_workspace_id
  FROM public.workspaces
  WHERE slug = 'meliere'
    AND status = 'active';

  IF v_workspace_count <> 1 OR v_workspace_id IS NULL THEN
    RAISE EXCEPTION
      'MELIERE_WORKSPACE_RESOLUTION_FAILED: expected exactly one active workspace with slug meliere, found %',
      v_workspace_count;
  END IF;

  UPDATE public.clients
     SET workspace_id = v_workspace_id
   WHERE workspace_id IS NULL;

  UPDATE public.leads
     SET workspace_id = v_workspace_id
   WHERE workspace_id IS NULL;

  UPDATE public.opportunities
     SET workspace_id = v_workspace_id
   WHERE workspace_id IS NULL;

  UPDATE public.funnel_sessions
     SET workspace_id = v_workspace_id
   WHERE workspace_id IS NULL;

  SELECT
      (SELECT count(*) FROM public.clients WHERE workspace_id IS NULL)
    + (SELECT count(*) FROM public.leads WHERE workspace_id IS NULL)
    + (SELECT count(*) FROM public.opportunities WHERE workspace_id IS NULL)
    + (SELECT count(*) FROM public.funnel_sessions WHERE workspace_id IS NULL)
  INTO v_null_count;

  IF v_null_count <> 0 THEN
    RAISE EXCEPTION 'WORKSPACE_BACKFILL_INCOMPLETE: % root rows remain without workspace_id', v_null_count;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. WORKSPACE FOREIGN KEYS + INDEXES
-- ------------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_clients_workspace'
      AND conrelid = 'public.clients'::regclass
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT fk_clients_workspace
      FOREIGN KEY (workspace_id)
      REFERENCES public.workspaces(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_leads_workspace'
      AND conrelid = 'public.leads'::regclass
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT fk_leads_workspace
      FOREIGN KEY (workspace_id)
      REFERENCES public.workspaces(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_opportunities_workspace'
      AND conrelid = 'public.opportunities'::regclass
  ) THEN
    ALTER TABLE public.opportunities
      ADD CONSTRAINT fk_opportunities_workspace
      FOREIGN KEY (workspace_id)
      REFERENCES public.workspaces(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_funnel_sessions_workspace'
      AND conrelid = 'public.funnel_sessions'::regclass
  ) THEN
    ALTER TABLE public.funnel_sessions
      ADD CONSTRAINT fk_funnel_sessions_workspace
      FOREIGN KEY (workspace_id)
      REFERENCES public.workspaces(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clients_workspace_id
  ON public.clients (workspace_id);

CREATE INDEX IF NOT EXISTS idx_leads_workspace_id
  ON public.leads (workspace_id);

CREATE INDEX IF NOT EXISTS idx_opportunities_workspace_id
  ON public.opportunities (workspace_id);

CREATE INDEX IF NOT EXISTS idx_funnel_sessions_workspace_id
  ON public.funnel_sessions (workspace_id);

-- ------------------------------------------------------------------------------
-- 4. TEMPORARY FAIL-CLOSED COMPATIBILITY RESOLVER
--    Used only when an existing write path does not yet send workspace_id.
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.resolve_single_active_workspace_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_workspace_id uuid;
  v_count integer;
BEGIN
  SELECT count(*), min(id)
    INTO v_count, v_workspace_id
  FROM public.workspaces
  WHERE status = 'active';

  IF v_count <> 1 OR v_workspace_id IS NULL THEN
    RAISE EXCEPTION
      'WORKSPACE_REQUIRED: ownership cannot be inferred because active workspace count is %',
      v_count;
  END IF;

  RETURN v_workspace_id;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. LEADS
--    Existing public submit flow currently inserts Lead without workspace_id.
--    Compatibility is safe only while exactly one active Workspace exists.
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_lead_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.workspace_id IS NULL THEN
    NEW.workspace_id := public.resolve_single_active_workspace_id();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_lead_workspace ON public.leads;

CREATE TRIGGER trg_ensure_lead_workspace
  BEFORE INSERT OR UPDATE OF workspace_id
  ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_lead_workspace();

-- ------------------------------------------------------------------------------
-- 6. FUNNEL SESSIONS
--    Existing public ingest flow currently inserts Session without workspace_id.
--    If a Lead is already attached, ownership must agree with that Lead.
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_funnel_session_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lead_workspace_id uuid;
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    SELECT workspace_id
      INTO v_lead_workspace_id
    FROM public.leads
    WHERE id = NEW.lead_id;

    IF v_lead_workspace_id IS NULL THEN
      RAISE EXCEPTION 'FUNNEL_SESSION_LEAD_WORKSPACE_NOT_FOUND';
    END IF;

    IF NEW.workspace_id IS NULL THEN
      NEW.workspace_id := v_lead_workspace_id;
    ELSIF NEW.workspace_id IS DISTINCT FROM v_lead_workspace_id THEN
      RAISE EXCEPTION 'FUNNEL_SESSION_LEAD_WORKSPACE_MISMATCH';
    END IF;
  ELSIF NEW.workspace_id IS NULL THEN
    NEW.workspace_id := public.resolve_single_active_workspace_id();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_funnel_session_workspace ON public.funnel_sessions;

CREATE TRIGGER trg_ensure_funnel_session_workspace
  BEFORE INSERT OR UPDATE OF workspace_id, lead_id
  ON public.funnel_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_funnel_session_workspace();

-- ------------------------------------------------------------------------------
-- 7. OPPORTUNITIES
--    Prefer ownership inherited from Lead/Client. If neither parent exists,
--    temporary single-workspace compatibility supports the current standalone UI.
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_opportunity_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lead_workspace_id uuid;
  v_client_workspace_id uuid;
  v_derived_workspace_id uuid;
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    SELECT workspace_id
      INTO v_lead_workspace_id
    FROM public.leads
    WHERE id = NEW.lead_id;

    IF v_lead_workspace_id IS NULL THEN
      RAISE EXCEPTION 'OPPORTUNITY_LEAD_WORKSPACE_NOT_FOUND';
    END IF;

    v_derived_workspace_id := v_lead_workspace_id;
  END IF;

  IF NEW.client_id IS NOT NULL THEN
    SELECT workspace_id
      INTO v_client_workspace_id
    FROM public.clients
    WHERE id = NEW.client_id;

    IF v_client_workspace_id IS NULL THEN
      RAISE EXCEPTION 'OPPORTUNITY_CLIENT_WORKSPACE_NOT_FOUND';
    END IF;

    IF v_derived_workspace_id IS NOT NULL
       AND v_derived_workspace_id IS DISTINCT FROM v_client_workspace_id THEN
      RAISE EXCEPTION 'OPPORTUNITY_PARENT_WORKSPACE_MISMATCH';
    END IF;

    v_derived_workspace_id := v_client_workspace_id;
  END IF;

  IF NEW.workspace_id IS NULL THEN
    NEW.workspace_id := COALESCE(
      v_derived_workspace_id,
      public.resolve_single_active_workspace_id()
    );
  ELSIF v_derived_workspace_id IS NOT NULL
        AND NEW.workspace_id IS DISTINCT FROM v_derived_workspace_id THEN
    RAISE EXCEPTION 'OPPORTUNITY_WORKSPACE_MISMATCH';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_opportunity_workspace ON public.opportunities;

CREATE TRIGGER trg_ensure_opportunity_workspace
  BEFORE INSERT OR UPDATE OF workspace_id, lead_id, client_id
  ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_opportunity_workspace();

-- ------------------------------------------------------------------------------
-- 8. CLIENTS
--    Prefer ownership inherited from origin_opportunity_id. Legacy/manual paths
--    remain compatible only while exactly one active Workspace exists.
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_client_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_opportunity_workspace_id uuid;
BEGIN
  IF NEW.origin_opportunity_id IS NOT NULL THEN
    SELECT workspace_id
      INTO v_opportunity_workspace_id
    FROM public.opportunities
    WHERE id = NEW.origin_opportunity_id;

    IF v_opportunity_workspace_id IS NULL THEN
      RAISE EXCEPTION 'CLIENT_ORIGIN_OPPORTUNITY_WORKSPACE_NOT_FOUND';
    END IF;

    IF NEW.workspace_id IS NULL THEN
      NEW.workspace_id := v_opportunity_workspace_id;
    ELSIF NEW.workspace_id IS DISTINCT FROM v_opportunity_workspace_id THEN
      RAISE EXCEPTION 'CLIENT_ORIGIN_OPPORTUNITY_WORKSPACE_MISMATCH';
    END IF;
  ELSIF NEW.workspace_id IS NULL THEN
    NEW.workspace_id := public.resolve_single_active_workspace_id();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_client_workspace ON public.clients;

CREATE TRIGGER trg_ensure_client_workspace
  BEFORE INSERT OR UPDATE OF workspace_id, origin_opportunity_id
  ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_client_workspace();

-- ------------------------------------------------------------------------------
-- 9. STRICT ROOT OWNERSHIP
--    Applied only after backfill and compatibility triggers exist.
-- ------------------------------------------------------------------------------

ALTER TABLE public.clients
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE public.leads
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE public.opportunities
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE public.funnel_sessions
  ALTER COLUMN workspace_id SET NOT NULL;

COMMIT;
