-- ==============================================================================
-- Migration: 20260923100000_multi_tenant_workspace_foundation.sql
-- Module: Core Architecture - Multi-Tenant Workspace Foundation (S3.1B-R3)
-- Description:
--   Creates foundational multi-tenant organizational tables (workspaces,
--   workspace_members, workspace_settings) with strict integrity constraints,
--   automatic updated_at triggers, recursion-free non-leaking RLS policies,
--   least-privilege grants (read-only workspaces/members for authenticated),
--   and bootstraps 'Melière Marketing' workspace with strict Owner verification.
-- ==============================================================================

-- 1. Table: public.workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspaces_slug_unique UNIQUE (slug),
  CONSTRAINT workspaces_status_check CHECK (status IN ('active', 'suspended', 'archived'))
);

-- 2. Table: public.workspace_members
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_workspace_members_workspace_user UNIQUE (workspace_id, user_id),
  CONSTRAINT workspace_members_role_check CHECK (role IN ('owner', 'admin', 'member')),
  CONSTRAINT workspace_members_status_check CHECK (status IN ('active', 'invited', 'suspended'))
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);

-- 3. Table: public.workspace_settings
CREATE TABLE IF NOT EXISTS public.workspace_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  currency text NOT NULL DEFAULT 'BRL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_workspace_settings_workspace UNIQUE (workspace_id)
);

-- 4. Triggers: updated_at (reusing public.handle_updated_at)
DROP TRIGGER IF EXISTS trg_update_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER trg_update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_update_workspace_members_updated_at ON public.workspace_members;
CREATE TRIGGER trg_update_workspace_members_updated_at
  BEFORE UPDATE ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_update_workspace_settings_updated_at ON public.workspace_settings;
CREATE TRIGGER trg_update_workspace_settings_updated_at
  BEFORE UPDATE ON public.workspace_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 5. Row Level Security (RLS) & Access Control
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

-- 5.1 Revoke Public / Anonymous Access
REVOKE ALL ON TABLE public.workspaces FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.workspace_members FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.workspace_settings FROM PUBLIC, anon;

-- 5.2 Strict Least-Privilege Grants for Authenticated Users
-- Workspaces: Read-Only (SELECT) for authenticated
-- Workspace Members: Read-Only (SELECT) for authenticated
-- Workspace Settings: Read (SELECT) and Update (UPDATE) for authenticated
GRANT SELECT ON TABLE public.workspaces TO authenticated;
GRANT SELECT ON TABLE public.workspace_members TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.workspace_settings TO authenticated;

-- 5.3 Full Access for Service Role
GRANT ALL ON TABLE public.workspaces TO service_role;
GRANT ALL ON TABLE public.workspace_members TO service_role;
GRANT ALL ON TABLE public.workspace_settings TO service_role;

-- 5.4 RLS Policy: public.workspace_members (Recursion-Free Self-Read Only)
DROP POLICY IF EXISTS workspace_members_self_read ON public.workspace_members;
CREATE POLICY workspace_members_self_read ON public.workspace_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 5.5 RLS Policy: public.workspaces (Read-Only for Active Members)
DROP POLICY IF EXISTS workspaces_admin_update ON public.workspaces;
DROP POLICY IF EXISTS workspaces_member_read ON public.workspaces;
CREATE POLICY workspaces_member_read ON public.workspaces
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.workspaces.id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- 5.6 RLS Policies: public.workspace_settings
DROP POLICY IF EXISTS workspace_settings_member_read ON public.workspace_settings;
CREATE POLICY workspace_settings_member_read ON public.workspace_settings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.workspace_settings.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

DROP POLICY IF EXISTS workspace_settings_admin_update ON public.workspace_settings;
CREATE POLICY workspace_settings_admin_update ON public.workspace_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.workspace_settings.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
        AND wm.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.workspace_settings.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
        AND wm.status = 'active'
    )
  );

-- 6. Initial Bootstrap: Melière Marketing & Strict Initial Owner Binding
DO $$
DECLARE
  v_owner_id uuid;
  v_workspace_id uuid;
BEGIN
  -- 6.1 Identify exactly the owner user by primary operational email
  SELECT id INTO v_owner_id
  FROM auth.users
  WHERE lower(email) = 'agenciameliere@gmail.com'
  LIMIT 1;

  -- Fallback check in profiles if auth.users is shadowed in migration execution context
  IF v_owner_id IS NULL THEN
    SELECT id INTO v_owner_id
    FROM public.profiles
    WHERE lower(email) = 'agenciameliere@gmail.com'
    LIMIT 1;
  END IF;

  -- Enforce explicit failure if owner user cannot be resolved
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'INITIAL_WORKSPACE_OWNER_NOT_FOUND: User with email agenciameliere@gmail.com does not exist.';
  END IF;

  -- 6.2 Upsert initial workspace 'Melière Marketing'
  INSERT INTO public.workspaces (name, slug, status, created_by)
  VALUES ('Melière Marketing', 'meliere', 'active', v_owner_id)
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        status = 'active',
        created_by = COALESCE(public.workspaces.created_by, EXCLUDED.created_by)
  RETURNING id INTO v_workspace_id;

  IF v_workspace_id IS NULL THEN
    SELECT id INTO v_workspace_id FROM public.workspaces WHERE slug = 'meliere';
  END IF;

  -- 6.3 Upsert workspace settings (1:1 relation)
  INSERT INTO public.workspace_settings (workspace_id, timezone, currency)
  VALUES (v_workspace_id, 'America/Sao_Paulo', 'BRL')
  ON CONFLICT (workspace_id) DO NOTHING;

  -- 6.4 Bind exact initial Owner membership
  INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
  VALUES (v_workspace_id, v_owner_id, 'owner', 'active')
  ON CONFLICT (workspace_id, user_id) DO UPDATE
    SET role = 'owner',
        status = 'active';

END $$;
