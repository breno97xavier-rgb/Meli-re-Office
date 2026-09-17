-- ==============================================================================
-- Migration: 20260912140000_fix_presentation_items_client_approval_status_check.sql
-- Description: Hotfix F4.3C-H1 — Alinhamento da check constraint presentation_items_client_approval_status_check
-- ==============================================================================

-- 1. Remove a constraint antiga se existir
ALTER TABLE public.presentation_items
  DROP CONSTRAINT IF EXISTS presentation_items_client_approval_status_check;

-- 2. Recria a constraint aceitando exatamente a enumeração oficial do sistema:
--    'pending', 'approved', 'changes_requested', 'rejected'
ALTER TABLE public.presentation_items
  ADD CONSTRAINT presentation_items_client_approval_status_check
  CHECK (client_approval_status IN ('pending', 'approved', 'changes_requested', 'rejected'));
