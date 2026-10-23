-- PROPOSTA LOCAL — não aplicada. Modelos relativos, sem alterar ciclos ou Contents.
BEGIN;
CREATE TABLE public.client_editorial_templates (
 id uuid PRIMARY KEY, client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 200),
 position_count integer NOT NULL CHECK(position_count BETWEEN 1 AND 366),
 notes text NOT NULL DEFAULT '', slots jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(slots)='array'),
 is_active boolean NOT NULL DEFAULT true, revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(id,client_id)
);
CREATE INDEX ON public.client_editorial_templates(client_id);
CREATE TABLE public.client_editorial_template_revisions (
 template_id uuid NOT NULL, client_id uuid NOT NULL,
 revision integer NOT NULL CHECK(revision>0), snapshot jsonb NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT clock_timestamp(), changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 PRIMARY KEY(template_id,revision),
 FOREIGN KEY(template_id,client_id) REFERENCES public.client_editorial_templates(id,client_id) ON DELETE CASCADE
);
CREATE INDEX ON public.client_editorial_template_revisions(client_id);

DO $body$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['client_editorial_templates','client_editorial_template_revisions'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated',t);
  EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role',t);
  EXECUTE format('CREATE POLICY planning_templates_read ON public.%I FOR SELECT TO authenticated USING(public.can_access_planning_client(client_id,''view''))',t);
 END LOOP;
END;
$body$;

CREATE FUNCTION public.save_client_editorial_template(p_client_id uuid,p_template_id uuid,p_expected_revision integer,p_input jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE model public.client_editorial_templates; slot jsonb; destination jsonb; normalized jsonb:='[]';
 slots jsonb; position_count integer; reference_id uuid; k text; reference_table text; destinations jsonb;
BEGIN
 IF NOT coalesce(public.can_access_planning_client(p_client_id,'operation'),false) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
 IF p_template_id IS NULL OR jsonb_typeof(p_input) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'invalid_template'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('editorial-template:'||p_template_id::text,0));
 IF NOT coalesce(public.can_access_planning_client(p_client_id,'operation'),false) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO model FROM public.client_editorial_templates WHERE id=p_template_id FOR UPDATE;
 IF model.id IS NOT NULL AND model.client_id<>p_client_id THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
 IF p_expected_revision IS NULL OR p_expected_revision<>coalesce(model.revision,0) THEN RAISE EXCEPTION 'revision_conflict'; END IF;
 IF jsonb_typeof(p_input->'name') IS DISTINCT FROM 'string' OR length(trim(p_input->>'name')) NOT BETWEEN 1 AND 200
  OR jsonb_typeof(p_input->'notes') IS DISTINCT FROM 'string' OR length(p_input->>'notes')>20000
  OR jsonb_typeof(p_input->'is_active') IS DISTINCT FROM 'boolean'
  OR jsonb_typeof(p_input->'position_count') IS DISTINCT FROM 'number'
  OR (p_input->>'position_count') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'invalid_template'; END IF;
 position_count:=(p_input->>'position_count')::integer;
 IF position_count NOT BETWEEN 1 AND 366 THEN RAISE EXCEPTION 'invalid_position_count'; END IF;
 slots:=p_input->'slots';
 IF jsonb_typeof(slots) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'invalid_slots'; END IF;
 IF jsonb_array_length(slots)>1000 THEN RAISE EXCEPTION 'too_many_slots'; END IF;
 IF (SELECT count(*)<>count(DISTINCT lower(value->>'id')) FROM jsonb_array_elements(slots)) THEN RAISE EXCEPTION 'duplicate_slot'; END IF;
 FOR slot IN SELECT value FROM jsonb_array_elements(slots) WITH ORDINALITY AS s(value,ord) ORDER BY ord LOOP
  IF jsonb_typeof(slot) IS DISTINCT FROM 'object' OR jsonb_typeof(slot->'id') IS DISTINCT FROM 'string'
    OR (slot->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    OR jsonb_typeof(slot->'position') IS DISTINCT FROM 'number' OR (slot->>'position') !~ '^[0-9]+$'
    OR jsonb_typeof(slot->'quantity') IS DISTINCT FROM 'number' OR (slot->>'quantity') !~ '^[0-9]+$'
    OR jsonb_typeof(slot->'is_active') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'invalid_slot'; END IF;
  IF (slot->>'position')::integer NOT BETWEEN 1 AND position_count OR (slot->>'quantity')::integer NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'invalid_slot_position_quantity'; END IF;
  FOREACH k IN ARRAY ARRAY['title','guidance','objective','funnel'] LOOP
   IF jsonb_typeof(slot->k) IS DISTINCT FROM 'string' OR length(slot->>k)>10000 THEN RAISE EXCEPTION 'invalid_slot_text'; END IF;
  END LOOP;
  IF NOT(slot ? 'format') OR (jsonb_typeof(slot->'format')<>'null' AND (jsonb_typeof(slot->'format')<>'string' OR slot->>'format' NOT IN ('feed_single','carousel','reels','story')))
    OR coalesce(slot->>'priority','') NOT IN ('main','additional','optional')
    OR coalesce(slot->>'recurrence','') NOT IN ('every_cycle','alternate','monthly','manual') THEN RAISE EXCEPTION 'invalid_slot_options'; END IF;
  FOREACH k IN ARRAY ARRAY['pillar_id','series_id','campaign_id'] LOOP
   IF NOT(slot ? k) THEN RAISE EXCEPTION 'invalid_reference'; END IF;
   IF jsonb_typeof(slot->k)<>'null' THEN
    IF jsonb_typeof(slot->k)<>'string' THEN RAISE EXCEPTION 'invalid_reference'; END IF;
    reference_id:=(slot->>k)::uuid;
    reference_table:=CASE k WHEN 'pillar_id' THEN 'client_pillars' WHEN 'series_id' THEN 'client_editorial_series' ELSE 'campaigns' END;
    -- Arquivamento mantém referência histórica. Nunca aceitar referência de outro cliente.
    EXECUTE format('SELECT id FROM public.%I WHERE id=$1 AND client_id=$2 FOR SHARE',reference_table) INTO reference_id USING reference_id,p_client_id;
    IF reference_id IS NULL THEN RAISE EXCEPTION 'invalid_template_reference'; END IF;
   END IF;
  END LOOP;
  destinations:=slot->'destinations';
  IF jsonb_typeof(destinations) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'invalid_destinations'; END IF;
  IF jsonb_array_length(destinations)>50 THEN RAISE EXCEPTION 'too_many_destinations'; END IF;
  FOR destination IN SELECT value FROM jsonb_array_elements(destinations) LOOP
   IF jsonb_typeof(destination) IS DISTINCT FROM 'object' OR jsonb_typeof(destination->'channel') IS DISTINCT FROM 'string'
    OR destination->>'channel' NOT IN ('instagram','facebook','linkedin','tiktok','youtube','blog','whatsapp','other')
    OR jsonb_typeof(destination->'profile') IS DISTINCT FROM 'string' OR length(destination->>'profile')>200 THEN RAISE EXCEPTION 'invalid_destination'; END IF;
  END LOOP;
  IF (SELECT count(*)<>count(DISTINCT (value->>'channel',lower(trim(value->>'profile')))) FROM jsonb_array_elements(destinations)) THEN RAISE EXCEPTION 'duplicate_destination'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('channel',value->>'channel','profile',trim(value->>'profile')) ORDER BY ord),'[]') INTO destinations FROM jsonb_array_elements(destinations) WITH ORDINALITY AS d(value,ord);
  normalized:=normalized||jsonb_build_array(jsonb_build_object(
    'id',(slot->>'id')::uuid::text,'position',(slot->>'position')::integer,'title',slot->>'title','guidance',slot->>'guidance',
    'pillar_id',slot->'pillar_id','series_id',slot->'series_id','campaign_id',slot->'campaign_id',
    'objective',slot->>'objective','funnel',slot->>'funnel','format',slot->'format',
    'priority',slot->>'priority','recurrence',slot->>'recurrence','quantity',(slot->>'quantity')::integer,
    'destinations',destinations,'is_active',(slot->>'is_active')::boolean));
 END LOOP;
 INSERT INTO public.client_editorial_templates(id,client_id,name,position_count,notes,slots,is_active)
 VALUES(p_template_id,p_client_id,trim(p_input->>'name'),position_count,p_input->>'notes',normalized,(p_input->>'is_active')::boolean)
 ON CONFLICT(id) DO UPDATE SET name=excluded.name,position_count=excluded.position_count,notes=excluded.notes,slots=excluded.slots,
  is_active=excluded.is_active,revision=client_editorial_templates.revision+1,updated_at=clock_timestamp() RETURNING * INTO model;
 INSERT INTO public.client_editorial_template_revisions(template_id,client_id,revision,snapshot,changed_by)
 VALUES(model.id,p_client_id,model.revision,to_jsonb(model),auth.uid());
 RETURN to_jsonb(model);
END;
$fn$;
REVOKE ALL ON FUNCTION public.save_client_editorial_template(uuid,uuid,integer,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_client_editorial_template(uuid,uuid,integer,jsonb) TO authenticated;
COMMIT;
