-- PROPOSTA LOCAL: briefing opcional, histórico de estratégia e séries.
-- Não aplicada ao Supabase. Requer a autorização de Planejamento de 19/10.
BEGIN;
ALTER TABLE public.client_strategies
 ADD COLUMN valid_from date, ADD COLUMN valid_until date, ADD COLUMN review_on date,
 ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 ADD CONSTRAINT strategy_validity CHECK(valid_until IS NULL OR (valid_from IS NOT NULL AND valid_until>=valid_from));

CREATE TABLE public.client_strategy_revisions (
 client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
 revision integer NOT NULL CHECK(revision>0), snapshot jsonb NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT clock_timestamp(), changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 PRIMARY KEY(client_id,revision)
);
-- Preserva o ponto anterior à primeira edição. Não atribui uma aprovação fictícia.
INSERT INTO public.client_strategy_revisions(client_id,revision,snapshot,changed_at)
 SELECT client_id,revision,to_jsonb(s),updated_at FROM public.client_strategies s;

CREATE TABLE public.client_briefings (
 client_id uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
 questions jsonb NOT NULL DEFAULT '[]', status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','ready')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0), updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.client_briefing_revisions (
 client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
 revision integer NOT NULL CHECK(revision>0), snapshot jsonb NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT clock_timestamp(), changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 PRIMARY KEY(client_id,revision)
);
CREATE TABLE public.client_editorial_series (
 id uuid PRIMARY KEY, client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(length(trim(name))>0), description text, suggested_recurrence text,
 channels text[] NOT NULL DEFAULT '{}', is_active boolean NOT NULL DEFAULT true,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(id,client_id), CHECK(channels <@ ARRAY['instagram','facebook','linkedin','tiktok','youtube','blog','whatsapp','other']::text[])
);
CREATE TABLE public.client_editorial_series_pillars (
 series_id uuid NOT NULL, client_id uuid NOT NULL, pillar_id uuid NOT NULL,
 PRIMARY KEY(series_id,pillar_id),
 FOREIGN KEY(series_id,client_id) REFERENCES public.client_editorial_series(id,client_id) ON DELETE CASCADE,
 FOREIGN KEY(pillar_id,client_id) REFERENCES public.client_pillars(id,client_id) ON DELETE RESTRICT
);
CREATE INDEX ON public.client_editorial_series(client_id);
CREATE INDEX ON public.client_editorial_series_pillars(pillar_id,client_id);
CREATE INDEX ON public.client_editorial_series_pillars(client_id);

-- Leitura por autorização existente; somente RPCs gravam os novos domínios.
DO $body$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['client_strategy_revisions','client_briefings','client_briefing_revisions','client_editorial_series','client_editorial_series_pillars'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated',t);
  EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role',t);
  EXECUTE format('CREATE POLICY planning_foundation_read ON public.%I FOR SELECT TO authenticated USING(public.can_access_planning_client(client_id,''view''))',t);
 END LOOP;
END;
$body$;

CREATE FUNCTION public.record_client_strategy_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
BEGIN
 IF TG_WHEN='BEFORE' THEN
  IF TG_OP='UPDATE' THEN
   IF NEW.client_id<>OLD.client_id OR NEW.id<>OLD.id THEN RAISE EXCEPTION 'strategy_identity_immutable'; END IF;
   NEW.revision:=OLD.revision+1;
  ELSE NEW.revision:=1;
  END IF;
  RETURN NEW;
 END IF;
 INSERT INTO public.client_strategy_revisions(client_id,revision,snapshot,changed_by)
 VALUES(NEW.client_id,NEW.revision,to_jsonb(NEW),auth.uid());
 RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.record_client_strategy_revision() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER strategy_revision_before BEFORE INSERT OR UPDATE ON public.client_strategies
 FOR EACH ROW EXECUTE FUNCTION public.record_client_strategy_revision();
CREATE TRIGGER strategy_revision_after AFTER INSERT OR UPDATE ON public.client_strategies
 FOR EACH ROW EXECUTE FUNCTION public.record_client_strategy_revision();
-- Nenhuma tela atual exclui estratégia; preservar revisões e identidade.
REVOKE DELETE ON public.client_strategies FROM authenticated;

CREATE FUNCTION public.save_client_strategy_revision(p_client_id uuid,p_expected_revision integer,p_input jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE s public.client_strategies; channels text[];
BEGIN
 IF NOT coalesce(public.can_access_planning_client(p_client_id,'operation'),false) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('strategy:'||p_client_id::text,0));
 IF NOT coalesce(public.can_access_planning_client(p_client_id,'operation'),false) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO s FROM public.client_strategies WHERE client_id=p_client_id FOR UPDATE;
 IF p_expected_revision IS NULL OR p_expected_revision<>coalesce(s.revision,0) THEN RAISE EXCEPTION 'revision_conflict'; END IF;
 IF jsonb_typeof(p_input) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'invalid_strategy'; END IF;
 SELECT coalesce(array_agg(DISTINCT value),'{}'::text[]) INTO channels FROM jsonb_array_elements_text(coalesce(p_input->'priority_channels','[]'));
 IF s.id IS NULL THEN
  INSERT INTO public.client_strategies(client_id,created_by,positioning,value_proposition,target_audience,brand_voice_tone,communication_guidelines,do_donts,business_goals,priority_channels,valid_from,valid_until,review_on)
  VALUES(p_client_id,auth.uid(),nullif(trim(p_input->>'positioning'),''),nullif(trim(p_input->>'value_proposition'),''),nullif(trim(p_input->>'target_audience'),''),nullif(trim(p_input->>'brand_voice_tone'),''),nullif(trim(p_input->>'communication_guidelines'),''),nullif(trim(p_input->>'do_donts'),''),nullif(trim(p_input->>'business_goals'),''),channels,nullif(p_input->>'valid_from','')::date,nullif(p_input->>'valid_until','')::date,nullif(p_input->>'review_on','')::date) RETURNING * INTO s;
  RETURN to_jsonb(s);
 END IF;
 UPDATE public.client_strategies SET
  positioning=nullif(trim(p_input->>'positioning'),''),value_proposition=nullif(trim(p_input->>'value_proposition'),''),
  target_audience=nullif(trim(p_input->>'target_audience'),''),brand_voice_tone=nullif(trim(p_input->>'brand_voice_tone'),''),
  communication_guidelines=nullif(trim(p_input->>'communication_guidelines'),''),do_donts=nullif(trim(p_input->>'do_donts'),''),
  business_goals=nullif(trim(p_input->>'business_goals'),''),priority_channels=channels,
  valid_from=nullif(p_input->>'valid_from','')::date,valid_until=nullif(p_input->>'valid_until','')::date,review_on=nullif(p_input->>'review_on','')::date
 WHERE id=s.id RETURNING * INTO s;
 RETURN to_jsonb(s);
END;
$fn$;

CREATE FUNCTION public.save_client_briefing(p_client_id uuid,p_expected_revision integer,p_questions jsonb,p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE b public.client_briefings; q jsonb; answer jsonb;
BEGIN
 IF NOT coalesce(public.can_access_planning_client(p_client_id,'operation'),false) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('briefing:'||p_client_id::text,0));
 IF NOT coalesce(public.can_access_planning_client(p_client_id,'operation'),false) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO b FROM public.client_briefings WHERE client_id=p_client_id FOR UPDATE;
 IF p_expected_revision IS NULL OR p_expected_revision<>coalesce(b.revision,0) THEN RAISE EXCEPTION 'revision_conflict'; END IF;
 IF jsonb_typeof(p_questions) IS DISTINCT FROM 'array' OR p_status IS NULL OR p_status NOT IN ('draft','ready') THEN RAISE EXCEPTION 'invalid_briefing'; END IF;
 IF (SELECT count(*)<>count(DISTINCT value->>'id') FROM jsonb_array_elements(p_questions)) THEN RAISE EXCEPTION 'duplicate_question'; END IF;
 FOR q IN SELECT value FROM jsonb_array_elements(p_questions) LOOP
  IF jsonb_typeof(q) IS DISTINCT FROM 'object' OR jsonb_typeof(q->'id') IS DISTINCT FROM 'string' OR jsonb_typeof(q->'label') IS DISTINCT FROM 'string' OR jsonb_typeof(q->'block') IS DISTINCT FROM 'string' OR nullif(trim(q->>'id'),'') IS NULL OR nullif(trim(q->>'label'),'') IS NULL OR nullif(trim(q->>'block'),'') IS NULL
   OR (q->>'type') IS NULL OR q->>'type' NOT IN ('text','select','multiple') OR jsonb_typeof(q->'options') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'invalid_question'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(q->'options') o WHERE jsonb_typeof(o) IS DISTINCT FROM 'string' OR nullif(trim(o#>>'{}'),'') IS NULL)
    OR (SELECT count(*)<>count(DISTINCT o) FROM jsonb_array_elements(q->'options') o) THEN RAISE EXCEPTION 'invalid_options'; END IF;
  IF q->>'type'<>'text' AND jsonb_array_length(q->'options')=0 THEN RAISE EXCEPTION 'empty_options'; END IF;
  IF q->>'type'='multiple' THEN
   IF jsonb_typeof(q->'answer') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'invalid_answer'; END IF;
   IF (SELECT count(*)<>count(DISTINCT a) FROM jsonb_array_elements(q->'answer') a) THEN RAISE EXCEPTION 'invalid_answer'; END IF;
   FOR answer IN SELECT value FROM jsonb_array_elements(q->'answer') LOOP
    IF jsonb_typeof(answer) IS DISTINCT FROM 'string' OR NOT (q->'options' @> jsonb_build_array(answer)) THEN RAISE EXCEPTION 'invalid_answer'; END IF;
   END LOOP;
  ELSE
   IF jsonb_typeof(q->'answer') IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'invalid_answer'; END IF;
   IF q->>'type'='select' AND q->>'answer'<>'' AND NOT(q->'options' @> jsonb_build_array(q->'answer')) THEN RAISE EXCEPTION 'invalid_answer'; END IF;
  END IF;
 END LOOP;
 INSERT INTO public.client_briefings(client_id,questions,status,revision) VALUES(p_client_id,p_questions,p_status,1)
 ON CONFLICT(client_id) DO UPDATE SET questions=excluded.questions,status=excluded.status,revision=client_briefings.revision+1,updated_at=clock_timestamp() RETURNING * INTO b;
 INSERT INTO public.client_briefing_revisions(client_id,revision,snapshot,changed_by) VALUES(p_client_id,b.revision,to_jsonb(b),auth.uid());
 RETURN to_jsonb(b);
END;
$fn$;

CREATE FUNCTION public.save_client_editorial_series(p_client_id uuid,p_series_id uuid,p_expected_revision integer,p_input jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE s public.client_editorial_series; pillars uuid[]; channels text[]; pid uuid;
BEGIN
 IF NOT coalesce(public.can_access_planning_client(p_client_id,'operation'),false) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
 IF p_series_id IS NULL OR jsonb_typeof(p_input) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'invalid_series'; END IF;
 IF jsonb_typeof(p_input->'pillar_ids') IS DISTINCT FROM 'array' OR jsonb_typeof(p_input->'channels') IS DISTINCT FROM 'array' OR jsonb_typeof(p_input->'is_active') IS DISTINCT FROM 'boolean' OR jsonb_typeof(p_input->'name') IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'invalid_series'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('series:'||p_series_id::text,0));
 IF NOT coalesce(public.can_access_planning_client(p_client_id,'operation'),false) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO s FROM public.client_editorial_series WHERE id=p_series_id FOR UPDATE;
 IF (s.id IS NOT NULL AND s.client_id<>p_client_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
 IF p_expected_revision IS NULL OR p_expected_revision<>coalesce(s.revision,0) THEN RAISE EXCEPTION 'revision_conflict'; END IF;
 SELECT coalesce(array_agg(value::uuid),'{}'::uuid[]) INTO pillars FROM jsonb_array_elements_text(p_input->'pillar_ids');
 SELECT coalesce(array_agg(DISTINCT value),'{}'::text[]) INTO channels FROM jsonb_array_elements_text(p_input->'channels');
 IF cardinality(pillars)<>(SELECT count(DISTINCT x) FROM unnest(pillars) x) THEN RAISE EXCEPTION 'duplicate_pillars'; END IF;
 FOREACH pid IN ARRAY pillars LOOP
  IF NOT EXISTS(SELECT 1 FROM public.client_pillars p WHERE p.id=pid AND p.client_id=p_client_id
    AND (p.is_active OR EXISTS(SELECT 1 FROM public.client_editorial_series_pillars old WHERE old.series_id=p_series_id AND old.pillar_id=pid))) THEN RAISE EXCEPTION 'invalid_pillar'; END IF;
 END LOOP;
 INSERT INTO public.client_editorial_series(id,client_id,name,description,suggested_recurrence,channels,is_active)
 VALUES(p_series_id,p_client_id,trim(p_input->>'name'),nullif(trim(p_input->>'description'),''),nullif(trim(p_input->>'suggested_recurrence'),''),channels,(p_input->>'is_active')::boolean)
 ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,suggested_recurrence=excluded.suggested_recurrence,channels=excluded.channels,is_active=excluded.is_active,revision=client_editorial_series.revision+1,updated_at=clock_timestamp() RETURNING * INTO s;
 DELETE FROM public.client_editorial_series_pillars WHERE series_id=s.id AND NOT(pillar_id=ANY(pillars));
 INSERT INTO public.client_editorial_series_pillars(series_id,client_id,pillar_id) SELECT s.id,p_client_id,unnest(pillars) ON CONFLICT DO NOTHING;
 RETURN to_jsonb(s)||jsonb_build_object('pillar_ids',pillars);
END;
$fn$;
REVOKE ALL ON FUNCTION public.save_client_strategy_revision(uuid,integer,jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.save_client_briefing(uuid,integer,jsonb,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.save_client_editorial_series(uuid,uuid,integer,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_client_strategy_revision(uuid,integer,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_client_briefing(uuid,integer,jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_client_editorial_series(uuid,uuid,integer,jsonb) TO authenticated;
COMMIT;
