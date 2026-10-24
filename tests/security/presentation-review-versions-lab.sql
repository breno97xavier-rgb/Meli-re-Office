\set ON_ERROR_STOP on
\ir presentation-decisions-fixture.sql
\ir presentation-workspace-fixture.sql
ALTER TABLE public.clients ADD COLUMN name text DEFAULT 'Fictional';
ALTER TABLE public.clients ADD COLUMN commercial_name text;
ALTER TABLE public.clients ADD COLUMN logo_url text;
ALTER TABLE public.contents ADD COLUMN internal_title text DEFAULT 'Draft';
ALTER TABLE public.contents ADD COLUMN format text DEFAULT 'static_post';
ALTER TABLE public.contents ADD COLUMN primary_channel text;
ALTER TABLE public.contents ADD COLUMN caption text;
ALTER TABLE public.contents ADD COLUMN copy text;
ALTER TABLE public.contents ADD COLUMN script text;
ALTER TABLE public.contents ADD COLUMN visual_copy text;
ALTER TABLE public.contents ADD COLUMN goal text;
ALTER TABLE public.contents ADD COLUMN pillar text;
ALTER TABLE public.contents ADD COLUMN funnel_stage text;
CREATE TABLE public.content_assets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), content_id uuid REFERENCES contents(id),
 asset_type text, file_url text, file_name text, mime_type text, file_size_bytes bigint,
 version integer DEFAULT 1,display_order integer DEFAULT 0,is_current boolean DEFAULT true,created_at timestamptz DEFAULT now());
CREATE SCHEMA storage;
CREATE TABLE storage.objects(bucket_id text,name text);
CREATE FUNCTION office_private.contents_client_permission(cid uuid,level text) RETURNS boolean LANGUAGE sql AS $$
 SELECT office_private.presentation_client_permission(cid,level)
$$;
GRANT SELECT,INSERT,UPDATE,DELETE ON content_assets TO authenticated;
\ir ../../supabase/migrations/20261024141424_presentation_review_versions.sql
SELECT set_config('request.jwt.claim.role','authenticated',false);
SELECT set_config('request.jwt.claim.sub',lab_uuid(201)::text,false);
SET ROLE authenticated;
SELECT prepare_presentation_review(lab_uuid(41));
SELECT lab_assert('both round items have immutable review', (SELECT count(*)=2 FROM presentation_items WHERE presentation_id=lab_uuid(41) AND review_id IS NOT NULL));
SELECT lab_expect_error('foreign workspace denied','SELECT prepare_presentation_review(lab_uuid(42))','UNAUTHORIZED');
SELECT lab_expect_error('snapshot cannot be overwritten','UPDATE presentation_items SET review_content=''{}'' WHERE id=lab_uuid(61)','REVIEW_IMMUTABLE');
RESET ROLE;
SELECT lab_assert('preparation is idempotent', (SELECT review_id IS NOT NULL FROM presentation_items WHERE id=lab_uuid(61)));
SELECT set_config('request.jwt.claim.sub',lab_uuid(201)::text,false);
SELECT prepare_presentation_review(lab_uuid(41));
SELECT lab_expect_error('cannot add to prepared round','INSERT INTO presentation_items(presentation_id,content_id) VALUES(lab_uuid(41),lab_uuid(39))','ROUND_FROZEN_CREATE_NEXT');
SELECT lab_expect_error('stale/wrong review denied',format('SELECT submit_presentation_review_decision(%L,%L,''approved'',NULL,%L)',lab_uuid(61),lab_uuid(999),repeat('a',64)),'REVIEW_VERSION_REQUIRED');
SELECT submit_presentation_review_decision(lab_uuid(61),(SELECT review_id FROM presentation_items WHERE id=lab_uuid(61)),'changes_requested','Adjust caption',repeat('a',64));
SELECT lab_assert('adjustments persisted', (SELECT client_approval_status='adjustments_requested' FROM presentation_items WHERE id=lab_uuid(61)));
SELECT lab_expect_error('decision cannot be overwritten',format('SELECT submit_presentation_review_decision(%L,%L,''approved'',NULL,%L)',lab_uuid(61),(SELECT review_id FROM presentation_items WHERE id=lab_uuid(61)),repeat('a',64)),'ITEM_ALREADY_REVIEWED');
UPDATE contents SET caption='New version' WHERE id=lab_uuid(31);
SELECT lab_assert('snapshot caption remains original', (SELECT review_content->>'caption' IS NULL FROM presentation_items WHERE id=lab_uuid(61)));
SELECT lab_assert('public payload uses frozen caption', (SELECT get_public_presentation(repeat('a',64))->'items'->0->'content'->>'caption' IS NULL));
SELECT lab_expect_error('old RPC cannot approve current files',format('SELECT submit_public_presentation_decision(%L,%L,''approved'',NULL)',repeat('a',64),lab_uuid(61)),'REVIEW_VERSION_REQUIRED');
SELECT lab_expect_error('revoked link denied',format('SELECT get_public_presentation(%L)',repeat('c',64)),'ACCESS_TOKEN_REVOKED');
SELECT lab_expect_error('expired link denied',format('SELECT get_public_presentation(%L)',repeat('b',64)),'ACCESS_TOKEN_EXPIRED');
SELECT lab_assert('current unprepared round not exposed as snapshot', (SELECT get_public_presentation(repeat('f',64))->'items'->0->>'review_id' IS NULL));

-- A real new round reuses the content identity, but starts without a review/decision.
SELECT create_next_presentation_round(lab_uuid(51),ARRAY[lab_uuid(35)],'Version test next round');
SELECT lab_assert('new round starts pending without inherited snapshot', (SELECT pi.client_approval_status='pending' AND pi.review_id IS NULL FROM presentation_items pi JOIN presentations p ON p.id=pi.presentation_id WHERE p.previous_presentation_id=lab_uuid(51)));
INSERT INTO content_assets(id,content_id,asset_type,file_url,file_name,mime_type,file_size_bytes) VALUES
 (lab_uuid(301),lab_uuid(35),'image','workspace/'||lab_uuid(1)||'/clients/'||lab_uuid(11)||'/contents/'||lab_uuid(35)||'/'||lab_uuid(301)||'.png','v1.png','image/png',100);
INSERT INTO storage.objects VALUES('content-assets','workspace/'||lab_uuid(1)||'/clients/'||lab_uuid(11)||'/contents/'||lab_uuid(35)||'/'||lab_uuid(302)||'.png');
SELECT prepare_presentation_review((SELECT id FROM presentations WHERE previous_presentation_id=lab_uuid(51)));
SELECT lab_assert('version 1 reference captured', (SELECT pi.review_assets->0->>'version'='1' FROM presentation_items pi JOIN presentations p ON p.id=pi.presentation_id WHERE p.previous_presentation_id=lab_uuid(51)));
SELECT mutate_content_asset_version(lab_uuid(35),lab_uuid(301),jsonb_build_object('file_url','workspace/'||lab_uuid(1)||'/clients/'||lab_uuid(11)||'/contents/'||lab_uuid(35)||'/'||lab_uuid(302)||'.png','file_name','v2.png','mime_type','image/png','file_size_bytes',120));
SELECT lab_assert('replacement is a single current v2', (SELECT count(*)=1 AND max(version)=2 FROM content_assets WHERE content_id=lab_uuid(35) AND is_current));
SELECT lab_assert('previous snapshot still points at v1', (SELECT pi.review_assets->0->>'file_name'='v1.png' FROM presentation_items pi JOIN presentations p ON p.id=pi.presentation_id WHERE p.previous_presentation_id=lab_uuid(51)));
SELECT lab_expect_error('stale replacement target rejected',format('SELECT mutate_content_asset_version(%L,%L,''{}'')',lab_uuid(35),lab_uuid(301)),'CURRENT_ASSET_NOT_FOUND');
SELECT lab_expect_error('failed replacement preserves current file',format('SELECT mutate_content_asset_version(%L,(SELECT id FROM content_assets WHERE content_id=%L AND is_current),''{}'')',lab_uuid(35),lab_uuid(35)),'INVALID_ASSET_FILE');
SELECT lab_assert('failed replacement did not deactivate v2', (SELECT count(*)=1 AND max(version)=2 FROM content_assets WHERE content_id=lab_uuid(35) AND is_current));
SELECT submit_presentation_review_decision(pi.id,pi.review_id,'approved') FROM presentation_items pi JOIN presentations p ON p.id=pi.presentation_id WHERE p.previous_presentation_id=lab_uuid(51);
SELECT lab_assert('approving old frozen material does not approve current v2', (SELECT editorial_status<>'approved' FROM contents WHERE id=lab_uuid(35)));
SELECT create_next_presentation_round((SELECT id FROM presentations WHERE previous_presentation_id=lab_uuid(51)),ARRAY[lab_uuid(35)],'Version 2');
SELECT prepare_presentation_review((SELECT id FROM presentations WHERE title='Version 2'));
SELECT submit_presentation_review_decision(pi.id,pi.review_id,'approved') FROM presentation_items pi JOIN presentations p ON p.id=pi.presentation_id WHERE p.title='Version 2';
SELECT lab_assert('approval of v2 applies to matching current material', (SELECT editorial_status='approved' FROM contents WHERE id=lab_uuid(35)));
UPDATE contents SET caption='Version 3 caption' WHERE id=lab_uuid(35);
SELECT lab_assert('changing text after approval reopens content production', (SELECT editorial_status='in_production' AND approved_at IS NULL FROM contents WHERE id=lab_uuid(35)));
SELECT lab_expect_error('referenced historical asset cannot be deleted',format('DELETE FROM content_assets WHERE id=%L',lab_uuid(301)),'REVIEW_ASSET_PRESERVED');
UPDATE presentation_items SET client_approval_status='approved' WHERE id=lab_uuid(75);
SELECT lab_expect_error('legacy approval is not retroactively assigned current files',format('SELECT prepare_presentation_review(%L)',lab_uuid(53)),'LEGACY_REVIEW_CREATE_NEXT');
UPDATE workspaces SET status='suspended' WHERE id=lab_uuid(1);
SELECT lab_expect_error('inactive workspace public token denied',format('SELECT get_public_presentation(%L)',repeat('a',64)),'INVALID_ACCESS_TOKEN');
UPDATE workspaces SET status='active' WHERE id=lab_uuid(1);
SET ROLE anon;
SELECT set_config('request.jwt.claim.role','anon',false);
SELECT set_config('request.jwt.claim.sub','',false);
SELECT lab_expect_error('anon cannot prepare a version',format('SELECT prepare_presentation_review(%L)',lab_uuid(41)),'permission denied for function prepare_presentation_review');
SELECT lab_expect_error('no-token anonymous decision denied',format('SELECT submit_presentation_review_decision(%L,%L,''approved'')',lab_uuid(62),lab_uuid(999)),'UNAUTHORIZED');
RESET ROLE;

SELECT set_config('request.jwt.claim.role','authenticated',false);
SELECT set_config('request.jwt.claim.sub',lab_uuid(201)::text,false);
SELECT prepare_presentation_review(lab_uuid(51));
INSERT INTO presentations(id,client_id,title) VALUES(lab_uuid(601),lab_uuid(11),'Latest review');
INSERT INTO presentation_items(id,presentation_id,content_id) VALUES(lab_uuid(602),lab_uuid(601),lab_uuid(36));
SELECT prepare_presentation_review(lab_uuid(601));
SELECT submit_presentation_review_decision(lab_uuid(602),(SELECT review_id FROM presentation_items WHERE id=lab_uuid(602)),'changes_requested','Latest round needs changes');
SELECT submit_presentation_review_decision(lab_uuid(72),(SELECT review_id FROM presentation_items WHERE id=lab_uuid(72)),'approved');
SELECT lab_assert('late approval of old round preserves newer requested changes', (SELECT editorial_status='in_production' FROM contents WHERE id=lab_uuid(36)));


SELECT lab_expect_error('reviewed content deletion is rejected before cascades',format('DELETE FROM contents WHERE id=%L',lab_uuid(35)),'REVIEW_CONTENT_PRESERVED');
SELECT lab_expect_error('reviewed content cannot change client',format('UPDATE contents SET client_id=%L WHERE id=%L',lab_uuid(12),lab_uuid(35)),'REVIEW_CONTENT_CLIENT_IMMUTABLE');
SELECT lab_assert('new functions do not grant anonymous direct snapshot writes',NOT has_function_privilege('anon','public.prepare_presentation_review(uuid)','EXECUTE') AND NOT has_function_privilege('anon','public.mutate_content_asset_version(uuid,uuid,jsonb,uuid[],boolean)','EXECUTE'));

SELECT lab_expect_error('legacy global asset access cannot mutate foreign workspace content',format('INSERT INTO content_assets(content_id,asset_type,file_url) VALUES(%L,''image'',''foreign.png'')',lab_uuid(33)),'UNAUTHORIZED');
SELECT lab_assert('denied foreign asset leaves its material revision untouched', (SELECT material_revision=1 FROM contents WHERE id=lab_uuid(33)));

SELECT lab_expect_error('legacy decision cannot be erased by item removal',format('DELETE FROM presentation_items WHERE id=%L',lab_uuid(75)),'ROUND_FROZEN_CREATE_NEXT');
SELECT lab_expect_error('legacy decision protects content identity and deletion',format('DELETE FROM contents WHERE id=%L',lab_uuid(39)),'REVIEW_CONTENT_PRESERVED');
