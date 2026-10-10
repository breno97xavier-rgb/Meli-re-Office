\set ON_ERROR_STOP on
-- Disposable local database only. No real users, clients or access tokens.
BEGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.role', true), '')
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
CREATE FUNCTION public.lab_uuid(n integer) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid
$$;
CREATE TABLE public.workspaces(id uuid PRIMARY KEY, status text DEFAULT 'active');
CREATE TABLE public.clients(id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id));
CREATE TABLE public.workspace_members(id uuid PRIMARY KEY, workspace_id uuid REFERENCES workspaces(id),
  user_id uuid, status text, role text, client_scope text);
CREATE TABLE public.workspace_member_permissions(membership_id uuid, permission_key text, access_level text);
CREATE TABLE public.workspace_member_client_assignments(workspace_id uuid, membership_id uuid, client_id uuid);
CREATE TABLE public.workspace_member_client_responsibilities(workspace_id uuid, membership_id uuid,
  client_id uuid, area_key text, responsibility_role text);
CREATE TABLE public.contents(id uuid PRIMARY KEY, client_id uuid NOT NULL REFERENCES clients(id),
  editorial_status text NOT NULL DEFAULT 'client_review' CHECK(editorial_status IN ('draft','in_production','review','client_review','approved','cancelled')),
  approved_at timestamptz, published_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.presentations(id uuid PRIMARY KEY, client_id uuid NOT NULL REFERENCES clients(id),
  status text NOT NULL DEFAULT 'sent' CHECK(status IN ('draft','sent','under_review','approved','approved_with_adjustments','rejected','archived')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  round_number integer NOT NULL DEFAULT 1, presentation_series_id uuid, previous_presentation_id uuid);
CREATE TABLE public.presentation_items(id uuid PRIMARY KEY, presentation_id uuid NOT NULL REFERENCES presentations(id),
  content_id uuid NOT NULL REFERENCES contents(id),
  client_approval_status text NOT NULL DEFAULT 'pending' CHECK(client_approval_status IN ('pending','approved','adjustments_requested','rejected')),
  client_feedback text, presentation_notes text, reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now());
-- Deliberately no updated_at column on presentation_items.
CREATE TABLE public.presentation_access_links(id uuid PRIMARY KEY,
  presentation_id uuid NOT NULL REFERENCES presentations(id), token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL, revoked_at timestamptz);
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentation_access_links ENABLE ROW LEVEL SECURITY;
-- No policies: direct callers cannot bypass the tested RPC boundaries.
GRANT SELECT ON clients,contents,presentations,presentation_items,presentation_access_links TO authenticated,anon;
INSERT INTO workspaces(id) VALUES(lab_uuid(1)),(lab_uuid(2));
INSERT INTO clients VALUES(lab_uuid(11),lab_uuid(1)),(lab_uuid(12),lab_uuid(2)),(lab_uuid(13),lab_uuid(1));
INSERT INTO workspace_members VALUES
 (lab_uuid(101),lab_uuid(1),lab_uuid(201),'active','owner','all'),
 (lab_uuid(102),lab_uuid(1),lab_uuid(202),'active','admin','all'),
 (lab_uuid(103),lab_uuid(1),lab_uuid(203),'active','member','assigned'),
 (lab_uuid(104),lab_uuid(1),lab_uuid(204),'suspended','owner','all'),
 (lab_uuid(105),lab_uuid(2),lab_uuid(205),'active','owner','all'),
 (lab_uuid(106),lab_uuid(1),lab_uuid(206),'active','member','all'),
 (lab_uuid(107),lab_uuid(1),lab_uuid(207),'active','member','all');
INSERT INTO workspace_member_permissions VALUES
 (lab_uuid(103),'presentations','operation'),(lab_uuid(107),'presentations','view');
INSERT INTO workspace_member_client_assignments VALUES(lab_uuid(1),lab_uuid(103),lab_uuid(11));
INSERT INTO contents(id,client_id) VALUES(lab_uuid(31),lab_uuid(11)),(lab_uuid(32),lab_uuid(11)),
 (lab_uuid(33),lab_uuid(12)),(lab_uuid(34),lab_uuid(13)),(lab_uuid(35),lab_uuid(11)),
 (lab_uuid(36),lab_uuid(11)),(lab_uuid(37),lab_uuid(11)),(lab_uuid(38),lab_uuid(11)),(lab_uuid(39),lab_uuid(11));
INSERT INTO presentations(id,client_id,created_at,round_number,presentation_series_id,previous_presentation_id) VALUES
 (lab_uuid(41),lab_uuid(11),now()-interval '2 days',1,lab_uuid(41),NULL),
 (lab_uuid(42),lab_uuid(12),now(),1,NULL,NULL),
 (lab_uuid(43),lab_uuid(13),now(),1,NULL,NULL),
 (lab_uuid(44),lab_uuid(11),now()-interval '1 day',2,lab_uuid(41),lab_uuid(41)),
 (lab_uuid(51),lab_uuid(11),now(),1,NULL,NULL),
 (lab_uuid(52),lab_uuid(11),now(),1,NULL,NULL),
 (lab_uuid(53),lab_uuid(11),now(),1,NULL,NULL);
INSERT INTO presentation_items(id,presentation_id,content_id) VALUES
 (lab_uuid(61),lab_uuid(41),lab_uuid(31)),(lab_uuid(62),lab_uuid(41),lab_uuid(32)),
 (lab_uuid(63),lab_uuid(42),lab_uuid(33)),(lab_uuid(64),lab_uuid(43),lab_uuid(34)),
 (lab_uuid(65),lab_uuid(44),lab_uuid(31)),(lab_uuid(71),lab_uuid(51),lab_uuid(35)),
 (lab_uuid(72),lab_uuid(51),lab_uuid(36)),(lab_uuid(73),lab_uuid(52),lab_uuid(37)),
 (lab_uuid(74),lab_uuid(52),lab_uuid(38)),(lab_uuid(75),lab_uuid(53),lab_uuid(39));
INSERT INTO presentation_access_links VALUES
 (lab_uuid(81),lab_uuid(41),encode(extensions.digest(repeat('a',64),'sha256'),'hex'),now()+interval '1 day',NULL),
 (lab_uuid(82),lab_uuid(41),encode(extensions.digest(repeat('b',64),'sha256'),'hex'),now()-interval '1 day',NULL),
 (lab_uuid(83),lab_uuid(41),encode(extensions.digest(repeat('c',64),'sha256'),'hex'),now()+interval '1 day',now()),
 (lab_uuid(84),lab_uuid(42),encode(extensions.digest(repeat('d',64),'sha256'),'hex'),now()+interval '1 day',NULL),
 (lab_uuid(85),lab_uuid(43),encode(extensions.digest(repeat('e',64),'sha256'),'hex'),now()+interval '1 day',NULL),
 (lab_uuid(86),lab_uuid(44),encode(extensions.digest(repeat('f',64),'sha256'),'hex'),now()+interval '1 day',NULL),
 (lab_uuid(87),lab_uuid(51),encode(extensions.digest(repeat('g',64),'sha256'),'hex'),now()+interval '1 day',NULL),
 (lab_uuid(88),lab_uuid(52),encode(extensions.digest(repeat('h',64),'sha256'),'hex'),now()+interval '1 day',NULL),
 (lab_uuid(89),lab_uuid(53),encode(extensions.digest(repeat('i',64),'sha256'),'hex'),now()+interval '1 day',NULL);
\ir ../../supabase/migrations/20260928221857_s4_1_membership_auth_foundation.sql
\ir ../../supabase/migrations/20261009232133_harden_workspace_authorization_helpers.sql
\ir ../../supabase/migrations/20261009234515_restore_presentation_decision_rpcs.sql
-- Install the actual remote triggers after the deliberately synthetic seed.
\ir presentation-decisions-remote-triggers.sql
CREATE FUNCTION public.lab_assert(label text, actual boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF actual IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF;
  RAISE NOTICE 'PASS: %',label;
END $$;
CREATE FUNCTION public.lab_expect_error(label text, query text, expected text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE message text;
BEGIN
  BEGIN EXECUTE query; EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS message=MESSAGE_TEXT; END;
  IF message IS DISTINCT FROM expected THEN RAISE EXCEPTION 'FAIL: % expected %, got %',label,expected,message; END IF;
  RAISE NOTICE 'PASS: %',label;
END $$;
COMMIT;
