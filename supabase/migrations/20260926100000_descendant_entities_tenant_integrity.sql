-- ==============================================================================
-- Migration: 20260926100000_descendant_entities_tenant_integrity.sql
-- Description: Blindagem de integridade relacional multi-tenant para entidades
--              descendentes (Contracts, Presentation Items e Presentations Lineage/Series).
-- ==============================================================================

BEGIN;

-- 1. CONTRACTS: Integridade Declarativa Composta (Proposal -> Opportunity)
-- Garante que o contrato referencie uma proposta pertencente à mesma oportunidade
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_proposals_id_opp'
      AND conrelid = 'public.proposals'::regclass
  ) THEN
    ALTER TABLE public.proposals
      ADD CONSTRAINT uq_proposals_id_opp UNIQUE (id, opportunity_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_contracts_proposal_opp'
      AND conrelid = 'public.contracts'::regclass
  ) THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT fk_contracts_proposal_opp
      FOREIGN KEY (proposal_id, opportunity_id)
      REFERENCES public.proposals (id, opportunity_id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- 2. PRESENTATION_ITEMS: Trigger Defensivo de Integridade de Client
-- Garante que o item da apresentação vincule um conteúdo pertencente ao mesmo cliente
CREATE OR REPLACE FUNCTION public.check_presentation_item_client_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_pres_client uuid;
  v_content_client uuid;
BEGIN
  -- Otimização: Apenas valida se for INSERT ou se as chaves relacionais mudaram
  IF TG_OP = 'INSERT' OR
     NEW.presentation_id IS DISTINCT FROM OLD.presentation_id OR
     NEW.content_id IS DISTINCT FROM OLD.content_id THEN

    SELECT client_id INTO v_pres_client
    FROM public.presentations
    WHERE id = NEW.presentation_id;

    SELECT client_id INTO v_content_client
    FROM public.contents
    WHERE id = NEW.content_id;

    -- Fail-closed explícito: Rejeita se qualquer registro estiver ausente/nulo ou se os clientes divergirem
    IF v_pres_client IS NULL OR
       v_content_client IS NULL OR
       v_pres_client IS DISTINCT FROM v_content_client THEN
      RAISE EXCEPTION 'PRESENTATION_ITEM_CLIENT_MISMATCH';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_presentation_item_client_integrity ON public.presentation_items;

CREATE TRIGGER trg_presentation_item_client_integrity
  BEFORE INSERT OR UPDATE ON public.presentation_items
  FOR EACH ROW
  EXECUTE FUNCTION public.check_presentation_item_client_integrity();

-- 3. PRESENTATIONS: Trigger Defensivo de Integridade de Linhagem e Série
-- Garante que rodadas anteriores e séries pertençam estritamente ao mesmo cliente
CREATE OR REPLACE FUNCTION public.check_presentation_lineage_client_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_prev_client uuid;
BEGIN
  -- 1. Validação de Linhagem Direta (previous_presentation_id)
  IF NEW.previous_presentation_id IS NOT NULL THEN
    IF TG_OP = 'INSERT' OR
       NEW.previous_presentation_id IS DISTINCT FROM OLD.previous_presentation_id OR
       NEW.client_id IS DISTINCT FROM OLD.client_id THEN

      SELECT client_id INTO v_prev_client
      FROM public.presentations
      WHERE id = NEW.previous_presentation_id;

      -- Fail-closed explícito: Rejeita se a apresentação anterior for ausente ou de outro cliente
      IF v_prev_client IS NULL OR
         v_prev_client IS DISTINCT FROM NEW.client_id THEN
        RAISE EXCEPTION 'PRESENTATION_LINEAGE_CLIENT_MISMATCH';
      END IF;
    END IF;
  END IF;

  -- 2. Validação de Série (presentation_series_id) com proteção de concorrência
  IF NEW.presentation_series_id IS NOT NULL THEN
    IF TG_OP = 'INSERT' OR
       NEW.presentation_series_id IS DISTINCT FROM OLD.presentation_series_id OR
       NEW.client_id IS DISTINCT FROM OLD.client_id THEN

      -- Serializa operações concorrentes na mesma série via advisory transaction lock de 2 chaves
      -- Namespace reservado 'presentation_series' + hash do UUID da série
      PERFORM pg_advisory_xact_lock(
        hashtext('presentation_series'),
        hashtext(NEW.presentation_series_id::text)
      );

      IF EXISTS (
        SELECT 1
        FROM public.presentations
        WHERE presentation_series_id = NEW.presentation_series_id
          AND client_id IS DISTINCT FROM NEW.client_id
          AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      ) THEN
        RAISE EXCEPTION 'PRESENTATION_SERIES_CLIENT_MISMATCH';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_presentation_lineage_client_integrity ON public.presentations;

CREATE TRIGGER trg_presentation_lineage_client_integrity
  BEFORE INSERT OR UPDATE ON public.presentations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_presentation_lineage_client_integrity();

COMMIT;
