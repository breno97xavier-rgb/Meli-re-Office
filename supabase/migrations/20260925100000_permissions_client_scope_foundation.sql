-- ==============================================================================
-- Migration: 20260925100000_permissions_client_scope_foundation.sql
-- Description: Implementação da fundação de Permissions, Client Scope e
--              Client Responsibilities com integridade relacional multi-tenant.
-- ==============================================================================

BEGIN;

-- 1. Adicionar client_scope em public.workspace_members (Fail-Closed Default = 'assigned')
ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS client_scope text NOT NULL DEFAULT 'assigned';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_workspace_members_client_scope'
      AND conrelid = 'public.workspace_members'::regclass
  ) THEN
    ALTER TABLE public.workspace_members
      ADD CONSTRAINT chk_workspace_members_client_scope
      CHECK (client_scope IN ('all', 'assigned'));
  END IF;
END $$;

-- 2. Constraints Compostas de Unicidade nas Tabelas Pai para suporte a FKs Compostas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_wm_ws_id'
      AND conrelid = 'public.workspace_members'::regclass
  ) THEN
    ALTER TABLE public.workspace_members
      ADD CONSTRAINT uq_wm_ws_id UNIQUE (workspace_id, id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_clients_ws_id'
      AND conrelid = 'public.clients'::regclass
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT uq_clients_ws_id UNIQUE (workspace_id, id);
  END IF;
END $$;

-- 3. Tabela public.workspace_member_permissions
CREATE TABLE IF NOT EXISTS public.workspace_member_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid NOT NULL REFERENCES public.workspace_members(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  access_level text NOT NULL DEFAULT 'view',
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),

  CONSTRAINT uq_wmp_member_key UNIQUE (membership_id, permission_key),
  CONSTRAINT chk_wmp_permission_key CHECK (
    permission_key IN ('commercial', 'contracts', 'clients', 'planning', 'contents', 'presentations')
  ),
  CONSTRAINT chk_wmp_access_level CHECK (
    access_level IN ('view', 'operation', 'management')
  )
);

-- 4. Tabela public.workspace_member_client_assignments
CREATE TABLE IF NOT EXISTS public.workspace_member_client_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  client_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),

  CONSTRAINT uq_wmca_member_client UNIQUE (membership_id, client_id),
  CONSTRAINT fk_wmca_workspace_member FOREIGN KEY (workspace_id, membership_id)
    REFERENCES public.workspace_members (workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_wmca_workspace_client FOREIGN KEY (workspace_id, client_id)
    REFERENCES public.clients (workspace_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wmca_ws_membership
  ON public.workspace_member_client_assignments (workspace_id, membership_id);

CREATE INDEX IF NOT EXISTS idx_wmca_ws_client
  ON public.workspace_member_client_assignments (workspace_id, client_id);

-- 5. Tabela public.workspace_member_client_responsibilities
CREATE TABLE IF NOT EXISTS public.workspace_member_client_responsibilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  client_id uuid NOT NULL,
  area_key text NOT NULL,
  responsibility_role text NOT NULL DEFAULT 'primary',
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),

  CONSTRAINT uq_wmcr_member_client_area UNIQUE (membership_id, client_id, area_key),
  CONSTRAINT chk_wmcr_role CHECK (
    responsibility_role IN ('primary', 'collaborator')
  ),
  CONSTRAINT fk_wmcr_workspace_member FOREIGN KEY (workspace_id, membership_id)
    REFERENCES public.workspace_members (workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_wmcr_workspace_client FOREIGN KEY (workspace_id, client_id)
    REFERENCES public.clients (workspace_id, id) ON DELETE CASCADE
);

-- Partial Unique Index: No máximo 1 primary por (workspace_id, client_id, area_key)
CREATE UNIQUE INDEX IF NOT EXISTS uq_wmcr_single_primary_per_area
  ON public.workspace_member_client_responsibilities (workspace_id, client_id, area_key)
  WHERE (responsibility_role = 'primary');

CREATE INDEX IF NOT EXISTS idx_wmcr_ws_membership
  ON public.workspace_member_client_responsibilities (workspace_id, membership_id);

CREATE INDEX IF NOT EXISTS idx_wmcr_ws_client_area
  ON public.workspace_member_client_responsibilities (workspace_id, client_id, area_key);

-- 6. Habilitação de RLS e Políticas Fail-Closed Absolutas
ALTER TABLE public.workspace_member_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_member_client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_member_client_responsibilities ENABLE ROW LEVEL SECURITY;

-- Revogar integralmente acessos para PUBLIC, anon e authenticated (Zero superfície até S4)
REVOKE ALL ON public.workspace_member_permissions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.workspace_member_client_assignments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.workspace_member_client_responsibilities FROM PUBLIC, anon, authenticated;

-- Preservar acesso administrativo exclusivo para service_role
GRANT ALL ON public.workspace_member_permissions TO service_role;
GRANT ALL ON public.workspace_member_client_assignments TO service_role;
GRANT ALL ON public.workspace_member_client_responsibilities TO service_role;

COMMIT;
