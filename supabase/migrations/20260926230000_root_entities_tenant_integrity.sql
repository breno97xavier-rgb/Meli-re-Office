-- ==============================================================================
-- Migration: 20260926230000_root_entities_tenant_integrity.sql
-- Description: Hardening declarativo final da S3 para impedir vínculos
--              cross-workspace entre entidades comerciais raiz e preservar
--              a coerência Client -> Contract -> Opportunity e Contact -> Client.
-- PostgreSQL 17+: usa ON DELETE SET NULL (coluna) para nunca zerar workspace_id.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 0. PRECONDIÇÕES DE DADOS — fail closed antes de alterar constraints
-- ------------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.opportunities o
    JOIN public.leads l ON l.id = o.lead_id
    WHERE o.workspace_id IS DISTINCT FROM l.workspace_id
  ) THEN
    RAISE EXCEPTION 'S3_6_OPPORTUNITY_LEAD_WORKSPACE_MISMATCH';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.opportunities o
    JOIN public.clients c ON c.id = o.client_id
    WHERE o.workspace_id IS DISTINCT FROM c.workspace_id
  ) THEN
    RAISE EXCEPTION 'S3_6_OPPORTUNITY_CLIENT_WORKSPACE_MISMATCH';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.funnel_sessions fs
    JOIN public.leads l ON l.id = fs.lead_id
    WHERE fs.workspace_id IS DISTINCT FROM l.workspace_id
  ) THEN
    RAISE EXCEPTION 'S3_6_FUNNEL_LEAD_WORKSPACE_MISMATCH';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.clients c
    JOIN public.opportunities o ON o.id = c.origin_opportunity_id
    WHERE c.workspace_id IS DISTINCT FROM o.workspace_id
  ) THEN
    RAISE EXCEPTION 'S3_6_CLIENT_ORIGIN_WORKSPACE_MISMATCH';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.clients c
    JOIN public.contracts ct ON ct.id = c.origin_contract_id
    WHERE c.origin_opportunity_id IS NULL
       OR ct.opportunity_id IS DISTINCT FROM c.origin_opportunity_id
  ) THEN
    RAISE EXCEPTION 'S3_6_CLIENT_CONTRACT_OPPORTUNITY_MISMATCH';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.opportunities o
    JOIN public.contacts ct ON ct.id = o.contact_id
    WHERE o.client_id IS NULL
       OR ct.client_id IS DISTINCT FROM o.client_id
  ) THEN
    RAISE EXCEPTION 'S3_6_OPPORTUNITY_CONTACT_CLIENT_MISMATCH';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 1. CHAVES CANDIDATAS NECESSÁRIAS PARA FKs COMPOSTAS
-- ------------------------------------------------------------------------------

ALTER TABLE public.leads
  ADD CONSTRAINT uq_leads_ws_id UNIQUE (workspace_id, id);

ALTER TABLE public.opportunities
  ADD CONSTRAINT uq_opportunities_ws_id UNIQUE (workspace_id, id);

ALTER TABLE public.contacts
  ADD CONSTRAINT uq_contacts_client_id_id UNIQUE (client_id, id);

ALTER TABLE public.contracts
  ADD CONSTRAINT uq_contracts_id_opportunity UNIQUE (id, opportunity_id);

-- ------------------------------------------------------------------------------
-- 2. OPPORTUNITIES -> LEADS / CLIENTS
-- Mantém workspace_id e zera somente a referência opcional quando o pai é apagado.
-- ------------------------------------------------------------------------------

ALTER TABLE public.opportunities
  DROP CONSTRAINT opportunities_lead_id_fkey,
  ADD CONSTRAINT fk_opportunities_workspace_lead
    FOREIGN KEY (workspace_id, lead_id)
    REFERENCES public.leads (workspace_id, id)
    ON DELETE SET NULL (lead_id);

ALTER TABLE public.opportunities
  DROP CONSTRAINT opportunities_client_id_fkey,
  ADD CONSTRAINT fk_opportunities_workspace_client
    FOREIGN KEY (workspace_id, client_id)
    REFERENCES public.clients (workspace_id, id)
    ON DELETE SET NULL (client_id);

-- ------------------------------------------------------------------------------
-- 3. FUNNEL SESSIONS -> LEADS
-- ------------------------------------------------------------------------------

ALTER TABLE public.funnel_sessions
  DROP CONSTRAINT funnel_sessions_lead_id_fkey,
  ADD CONSTRAINT fk_funnel_sessions_workspace_lead
    FOREIGN KEY (workspace_id, lead_id)
    REFERENCES public.leads (workspace_id, id)
    ON DELETE SET NULL (lead_id);

-- ------------------------------------------------------------------------------
-- 4. CLIENTS -> ORIGIN OPPORTUNITY / CONTRACT
-- Contract de origem exige Opportunity de origem e ambos devem representar
-- exatamente a mesma cadeia comercial.
-- ------------------------------------------------------------------------------

ALTER TABLE public.clients
  ADD CONSTRAINT chk_clients_origin_contract_requires_opportunity
    CHECK (origin_contract_id IS NULL OR origin_opportunity_id IS NOT NULL);

ALTER TABLE public.clients
  DROP CONSTRAINT clients_origin_opportunity_id_fkey,
  ADD CONSTRAINT fk_clients_workspace_origin_opportunity
    FOREIGN KEY (workspace_id, origin_opportunity_id)
    REFERENCES public.opportunities (workspace_id, id)
    ON DELETE RESTRICT;

ALTER TABLE public.clients
  DROP CONSTRAINT clients_origin_contract_id_fkey,
  ADD CONSTRAINT fk_clients_origin_contract_opportunity
    FOREIGN KEY (origin_contract_id, origin_opportunity_id)
    REFERENCES public.contracts (id, opportunity_id)
    ON DELETE RESTRICT;

-- ------------------------------------------------------------------------------
-- 5. OPPORTUNITIES -> CONTACTS
-- Um Contact só pode ser usado pela Opportunity se pertencer ao mesmo Client.
-- ------------------------------------------------------------------------------

ALTER TABLE public.opportunities
  ADD CONSTRAINT chk_opportunities_contact_requires_client
    CHECK (contact_id IS NULL OR client_id IS NOT NULL);

ALTER TABLE public.opportunities
  DROP CONSTRAINT opportunities_contact_id_fkey,
  ADD CONSTRAINT fk_opportunities_client_contact
    FOREIGN KEY (client_id, contact_id)
    REFERENCES public.contacts (client_id, id)
    ON DELETE SET NULL (contact_id);

COMMIT;
