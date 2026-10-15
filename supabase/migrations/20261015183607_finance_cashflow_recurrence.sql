BEGIN;
CREATE TABLE public.finance_cash_settings (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  opening_cents bigint NOT NULL CHECK (opening_cents BETWEEN -9999999999 AND 9999999999),
  start_date date NOT NULL CHECK (start_date <= CURRENT_DATE),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.finance_recurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  client_id uuid,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  description text,
  category text NOT NULL CHECK (length(btrim(category)) BETWEEN 1 AND 80),
  entry_type text NOT NULL CHECK (entry_type IN ('income','expense')),
  amount_cents bigint NOT NULL CHECK (amount_cents BETWEEN 1 AND 9999999999),
  start_date date NOT NULL,
  end_date date,
  due_day integer NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(workspace_id,id),
  FOREIGN KEY(workspace_id,client_id) REFERENCES public.clients(workspace_id,id) ON DELETE RESTRICT,
  CHECK(end_date IS NULL OR end_date>=start_date),
  CHECK(entry_type<>'income' OR end_date IS NOT NULL)
);
-- One active monthly income agreement per client. No fake commercial origin.
CREATE UNIQUE INDEX finance_recurrences_client_income_idx ON public.finance_recurrences(workspace_id,client_id)
WHERE active AND entry_type='income' AND client_id IS NOT NULL;
CREATE INDEX finance_recurrences_client_idx ON public.finance_recurrences(workspace_id,client_id);
ALTER TABLE public.finance_entries ADD COLUMN recurrence_id uuid, ADD COLUMN competence_month date;
ALTER TABLE public.finance_entries ADD CONSTRAINT finance_entries_recurrence_fk
FOREIGN KEY(workspace_id,recurrence_id) REFERENCES public.finance_recurrences(workspace_id,id) ON DELETE RESTRICT;
ALTER TABLE public.finance_entries ADD CONSTRAINT finance_entries_recurrence_month_check
CHECK ((recurrence_id IS NULL AND competence_month IS NULL) OR
(recurrence_id IS NOT NULL AND competence_month IS NOT NULL AND extract(day FROM competence_month)=1));
CREATE UNIQUE INDEX finance_entries_recurrence_month_idx ON public.finance_entries(workspace_id,recurrence_id,competence_month);
-- Monthly client fees stay unique even after a rule is stopped and replaced.
CREATE UNIQUE INDEX finance_entries_client_month_idx ON public.finance_entries(workspace_id,client_id,competence_month)
WHERE recurrence_id IS NOT NULL AND entry_type='income' AND client_id IS NOT NULL;
CREATE FUNCTION public.check_finance_occurrence_owner() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,public,pg_temp AS $$ BEGIN
  IF NEW.recurrence_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.finance_recurrences r WHERE r.workspace_id=NEW.workspace_id AND r.id=NEW.recurrence_id AND r.client_id IS NOT DISTINCT FROM NEW.client_id AND r.entry_type=NEW.entry_type) THEN
    RAISE EXCEPTION 'The occurrence must retain its agreement client and type' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.check_finance_occurrence_owner() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER finance_occurrence_owner BEFORE INSERT OR UPDATE ON public.finance_entries FOR EACH ROW EXECUTE FUNCTION public.check_finance_occurrence_owner();

CREATE TABLE public.finance_plan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  entity text NOT NULL, actor_id uuid, event_type text NOT NULL, old_values jsonb, new_values jsonb NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX finance_plan_events_workspace_idx ON public.finance_plan_events(workspace_id,occurred_at);
CREATE FUNCTION public.record_finance_plan_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp AS $$ BEGIN
  INSERT INTO public.finance_plan_events(workspace_id,entity,actor_id,event_type,old_values,new_values)
  VALUES(NEW.workspace_id,TG_TABLE_NAME,auth.uid(),TG_OP,CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,to_jsonb(NEW));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_finance_plan_event() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER finance_cash_settings_updated_at BEFORE UPDATE ON public.finance_cash_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER finance_cash_settings_audit AFTER INSERT OR UPDATE ON public.finance_cash_settings FOR EACH ROW EXECUTE FUNCTION public.record_finance_plan_event();
CREATE TRIGGER finance_recurrences_updated_at BEFORE UPDATE ON public.finance_recurrences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER finance_recurrences_audit AFTER INSERT OR UPDATE ON public.finance_recurrences FOR EACH ROW EXECUTE FUNCTION public.record_finance_plan_event();
ALTER TABLE public.finance_cash_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_recurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_plan_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_cash_select ON public.finance_cash_settings FOR SELECT TO authenticated USING(public.is_workspace_admin(workspace_id) AND EXISTS(SELECT 1 FROM public.workspaces w WHERE w.id=workspace_id AND w.status='active'));
CREATE POLICY finance_cash_insert ON public.finance_cash_settings FOR INSERT TO authenticated WITH CHECK(created_by=(SELECT auth.uid()) AND public.is_workspace_admin(workspace_id) AND EXISTS(SELECT 1 FROM public.workspaces w WHERE w.id=workspace_id AND w.status='active'));
CREATE POLICY finance_cash_update ON public.finance_cash_settings FOR UPDATE TO authenticated USING(public.is_workspace_admin(workspace_id) AND EXISTS(SELECT 1 FROM public.workspaces w WHERE w.id=workspace_id AND w.status='active')) WITH CHECK(public.is_workspace_admin(workspace_id) AND EXISTS(SELECT 1 FROM public.workspaces w WHERE w.id=workspace_id AND w.status='active'));
CREATE POLICY finance_recurrences_select ON public.finance_recurrences FOR SELECT TO authenticated USING(public.is_workspace_admin(workspace_id) AND EXISTS(SELECT 1 FROM public.workspaces w WHERE w.id=workspace_id AND w.status='active'));
CREATE POLICY finance_recurrences_insert ON public.finance_recurrences FOR INSERT TO authenticated WITH CHECK(created_by=(SELECT auth.uid()) AND public.is_workspace_admin(workspace_id) AND EXISTS(SELECT 1 FROM public.workspaces w WHERE w.id=workspace_id AND w.status='active'));
CREATE POLICY finance_recurrences_update ON public.finance_recurrences FOR UPDATE TO authenticated USING(public.is_workspace_admin(workspace_id) AND EXISTS(SELECT 1 FROM public.workspaces w WHERE w.id=workspace_id AND w.status='active')) WITH CHECK(public.is_workspace_admin(workspace_id) AND EXISTS(SELECT 1 FROM public.workspaces w WHERE w.id=workspace_id AND w.status='active'));
CREATE POLICY finance_plan_events_select ON public.finance_plan_events FOR SELECT TO authenticated USING(public.is_workspace_admin(workspace_id) AND EXISTS(SELECT 1 FROM public.workspaces w WHERE w.id=workspace_id AND w.status='active'));
REVOKE ALL ON public.finance_cash_settings,public.finance_recurrences,public.finance_plan_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.finance_cash_settings,public.finance_recurrences,public.finance_plan_events TO authenticated;
GRANT INSERT(workspace_id,opening_cents,start_date,created_by) ON public.finance_cash_settings TO authenticated;
GRANT UPDATE(opening_cents,start_date) ON public.finance_cash_settings TO authenticated;
GRANT INSERT(workspace_id,client_id,title,description,category,entry_type,amount_cents,start_date,end_date,due_day,created_by) ON public.finance_recurrences TO authenticated;
-- Terms are immutable. Stop and create a new agreement for future changes.
GRANT UPDATE(active) ON public.finance_recurrences TO authenticated;
GRANT INSERT(recurrence_id,competence_month) ON public.finance_entries TO authenticated;

CREATE FUNCTION public.generate_finance_occurrences(p_workspace_id uuid,p_rule_id uuid,p_from date,p_until date)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE r public.finance_recurrences%ROWTYPE; m date; d date; inserted integer; total integer:=0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_workspace_admin(p_workspace_id) OR NOT EXISTS(SELECT 1 FROM public.workspaces WHERE id=p_workspace_id AND status='active') THEN RAISE EXCEPTION 'Agency access denied' USING ERRCODE='42501'; END IF;
  IF p_from IS NULL OR p_until IS NULL OR p_until<p_from OR p_until >= (date_trunc('month',p_from)+interval '24 months')::date THEN RAISE EXCEPTION 'Choose a range of at most 24 calendar months' USING ERRCODE='22023'; END IF;
  -- A row lock serializes generation and stopping; RLS remains effective.
  SELECT * INTO r FROM public.finance_recurrences WHERE id=p_rule_id AND workspace_id=p_workspace_id AND active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active recurrence not found' USING ERRCODE='22023'; END IF;
  FOR m IN SELECT gs::date FROM generate_series(date_trunc('month',p_from),date_trunc('month',p_until),interval '1 month') gs LOOP
    d:=m+(least(r.due_day,extract(day FROM (m+interval '1 month - 1 day'))::integer)-1);
    IF d<p_from OR d<r.start_date OR d>p_until OR (r.end_date IS NOT NULL AND d>r.end_date) THEN CONTINUE; END IF;
    INSERT INTO public.finance_entries(workspace_id,client_id,title,description,category,entry_type,amount_cents,due_date,created_by,recurrence_id,competence_month)
    VALUES(r.workspace_id,r.client_id,r.title,r.description,r.category,r.entry_type,r.amount_cents,d,auth.uid(),r.id,m)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS inserted=ROW_COUNT; total:=total+inserted;
  END LOOP;
  RETURN total;
END $$;
REVOKE ALL ON FUNCTION public.generate_finance_occurrences(uuid,uuid,date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.generate_finance_occurrences(uuid,uuid,date,date) TO authenticated;
COMMIT;
