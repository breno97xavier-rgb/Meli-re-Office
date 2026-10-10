-- S4.1 — Membership / Auth Foundation
-- Tenant-aware authorization helpers.
--
-- This migration establishes the reusable authorization layer for the
-- workspace-based multi-tenant model. It does not yet replace the RLS
-- policies of business entities; that will be handled in subsequent S4 steps.

-- ============================================================
-- 1. Active workspace membership
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_active_workspace_member(
  p_workspace_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    auth.uid() IS NOT NULL
    AND p_workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.workspace_id = p_workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    );
$function$;


-- ============================================================
-- 2. Workspace owner / administrator
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_workspace_admin(
  p_workspace_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    auth.uid() IS NOT NULL
    AND p_workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.workspace_id = p_workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
        AND wm.role IN ('owner', 'admin')
    );
$function$;


-- ============================================================
-- 3. Current active membership id
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_workspace_membership_id(
  p_workspace_id uuid
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT wm.id
  FROM public.workspace_members wm
  WHERE wm.workspace_id = p_workspace_id
    AND wm.user_id = auth.uid()
    AND wm.status = 'active'
  LIMIT 1;
$function$;


-- ============================================================
-- 4. Client access
--
-- owner/admin:
--   access to every client in the workspace.
--
-- member + client_scope = all:
--   access to every client in the workspace.
--
-- member + client_scope = assigned:
--   requires an explicit row in
--   workspace_member_client_assignments.
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_workspace_client_access(
  p_workspace_id uuid,
  p_client_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    auth.uid() IS NOT NULL
    AND p_workspace_id IS NOT NULL
    AND p_client_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.workspace_id = p_workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
        AND (
          wm.role IN ('owner', 'admin')
          OR wm.client_scope = 'all'
          OR (
            wm.client_scope = 'assigned'
            AND EXISTS (
              SELECT 1
              FROM public.workspace_member_client_assignments wmca
              WHERE wmca.workspace_id = wm.workspace_id
                AND wmca.membership_id = wm.id
                AND wmca.client_id = p_client_id
            )
          )
        )
    );
$function$;


-- ============================================================
-- 5. Workspace permission
--
-- Existing hierarchy:
--   view < operation < management
--
-- owner/admin automatically satisfy every permission level.
-- Members use workspace_member_permissions.
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_workspace_permission(
  p_workspace_id uuid,
  p_permission_key text,
  p_required_level text DEFAULT 'view'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_required_rank integer;
BEGIN
  v_required_rank :=
    CASE p_required_level
      WHEN 'view' THEN 1
      WHEN 'operation' THEN 2
      WHEN 'management' THEN 3
      ELSE NULL
    END;

  IF v_required_rank IS NULL THEN
    RETURN false;
  END IF;

  IF p_permission_key NOT IN (
    'commercial',
    'contracts',
    'clients',
    'planning',
    'contents',
    'presentations'
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    LEFT JOIN public.workspace_member_permissions wmp
      ON wmp.membership_id = wm.id
     AND wmp.permission_key = p_permission_key
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = auth.uid()
      AND wm.status = 'active'
      AND (
        wm.role IN ('owner', 'admin')
        OR (
          wm.role = 'member'
          AND CASE wmp.access_level
                WHEN 'view' THEN 1
                WHEN 'operation' THEN 2
                WHEN 'management' THEN 3
                ELSE 0
              END >= v_required_rank
        )
      )
  );
END;
$function$;


-- ============================================================
-- 6. Client responsibility
--
-- Used for area-specific responsibility checks when a workflow
-- needs to distinguish primary ownership from collaboration.
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_client_responsibility(
  p_workspace_id uuid,
  p_client_id uuid,
  p_area_key text,
  p_required_role text DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    auth.uid() IS NOT NULL
    AND p_workspace_id IS NOT NULL
    AND p_client_id IS NOT NULL
    AND p_area_key IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.workspace_id = p_workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
        AND (
          wm.role IN ('owner', 'admin')
          OR EXISTS (
            SELECT 1
            FROM public.workspace_member_client_responsibilities wmcr
            WHERE wmcr.workspace_id = wm.workspace_id
              AND wmcr.membership_id = wm.id
              AND wmcr.client_id = p_client_id
              AND wmcr.area_key = p_area_key
              AND (
                p_required_role IS NULL
                OR wmcr.responsibility_role = p_required_role
              )
          )
        )
    );
$function$;


-- ============================================================
-- 7. Function execution privileges
--
-- SECURITY DEFINER is intentional: these helpers must be able to
-- inspect membership tables without causing recursive RLS checks.
-- They expose only scalar authorization decisions, not table data.
-- ============================================================

REVOKE ALL ON FUNCTION public.is_active_workspace_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_workspace_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_workspace_membership_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_workspace_client_access(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_workspace_permission(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_client_responsibility(uuid, uuid, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_active_workspace_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_workspace_membership_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_workspace_client_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_workspace_permission(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_client_responsibility(uuid, uuid, text, text) TO authenticated;
