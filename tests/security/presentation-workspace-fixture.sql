\set ON_ERROR_STOP on
BEGIN;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,role text);
INSERT INTO profiles SELECT user_id,CASE WHEN user_id IN (lab_uuid(201),lab_uuid(205)) THEN 'admin' ELSE 'team' END FROM workspace_members;
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$function$;

ALTER TABLE presentations ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE presentations ADD COLUMN title text NOT NULL DEFAULT 'Fictitious round';
ALTER TABLE presentations ADD COLUMN description text;
ALTER TABLE presentations ADD COLUMN created_by uuid;
ALTER TABLE presentations ADD COLUMN sent_at timestamptz;
ALTER TABLE presentation_items ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE presentation_items ADD COLUMN display_order integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX uq_presentation_items_pair ON presentation_items(presentation_id,content_id);
CREATE UNIQUE INDEX uq_presentations_previous_id ON presentations(previous_presentation_id) WHERE previous_presentation_id IS NOT NULL;
ALTER TABLE presentation_items DROP CONSTRAINT presentation_items_presentation_id_fkey;
ALTER TABLE presentation_items ADD CONSTRAINT presentation_items_presentation_id_fkey FOREIGN KEY(presentation_id) REFERENCES presentations(id) ON DELETE CASCADE;
ALTER TABLE presentations ADD CONSTRAINT presentations_previous_presentation_id_fkey FOREIGN KEY(previous_presentation_id) REFERENCES presentations(id) ON DELETE SET NULL;
ALTER TABLE presentation_access_links DROP CONSTRAINT presentation_access_links_presentation_id_fkey;
ALTER TABLE presentation_access_links ADD CONSTRAINT presentation_access_links_presentation_id_fkey FOREIGN KEY(presentation_id) REFERENCES presentations(id) ON DELETE CASCADE;
ALTER TABLE presentation_access_links ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE presentation_access_links ADD COLUMN created_by uuid;
ALTER TABLE presentation_access_links ADD COLUMN revoked_by uuid;
ALTER TABLE presentation_access_links ADD COLUMN created_at timestamptz NOT NULL DEFAULT now()-interval '2 days';
ALTER TABLE presentation_access_links ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
-- Exact legacy root-table policy model; deliberately not changed by this migration.
CREATE POLICY "Admins have full access to clients" ON clients TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
CREATE POLICY "Admins have full access to contents" ON contents TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
GRANT SELECT,INSERT,UPDATE,DELETE ON presentations,presentation_items,presentation_access_links TO authenticated;
\ir ../../supabase/migrations/20261010002848_scope_presentation_workflows_to_workspace.sql
COMMIT;
