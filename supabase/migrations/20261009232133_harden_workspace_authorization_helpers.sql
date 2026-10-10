-- S4.1: harden workspace authorization helpers.
-- Local proposal; not applied to any database.
-- Reject clients outside the supplied workspace and NULL permission keys.
-- Preserve signatures, SECURITY DEFINER, search_path and existing privileges.
-- CREATE OR REPLACE retains ownership and ACLs; no GRANT/REVOKE is issued.
-- This does not replace legacy RLS or establish complete tenant isolation.
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
      FROM public.clients c
      WHERE c.id = p_client_id
        AND c.workspace_id = p_workspace_id
    )
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
    AND EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = p_client_id
        AND c.workspace_id = p_workspace_id
    )
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

  IF p_permission_key IS NULL OR p_permission_key NOT IN (
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
