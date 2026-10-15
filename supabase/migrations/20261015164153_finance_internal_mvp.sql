-- Financeiro operacional interno. Não gera cobranças a partir de contratos/clientes.
BEGIN;
CREATE TABLE public.finance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  client_id uuid,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  description text,
  category text NOT NULL DEFAULT 'Geral' CHECK (length(btrim(category)) BETWEEN 1 AND 80),
  entry_type text NOT NULL CHECK (entry_type IN ('income','expense')),
  amount_cents bigint NOT NULL CHECK (amount_cents BETWEEN 1 AND 9999999999),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','settled','cancelled')),
  settlement_date date,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,id),
  FOREIGN KEY (workspace_id,client_id) REFERENCES public.clients(workspace_id,id) ON DELETE RESTRICT,
  CHECK ((status='settled' AND settlement_date IS NOT NULL) OR (status IN ('pending','cancelled') AND settlement_date IS NULL))
);
CREATE INDEX finance_entries_workspace_due_idx ON public.finance_entries(workspace_id,due_date);
CREATE INDEX finance_entries_workspace_settlement_idx ON public.finance_entries(workspace_id,settlement_date) WHERE status='settled';
CREATE INDEX finance_entries_workspace_client_idx ON public.finance_entries(workspace_id,client_id);

-- Histórico de alterações; a API não pode inserir/editar/apagar eventos.
CREATE TABLE public.finance_entry_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  entry_id uuid NOT NULL,
  actor_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('INSERT','UPDATE')),
  old_values jsonb,
  new_values jsonb NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (workspace_id,entry_id) REFERENCES public.finance_entries(workspace_id,id) ON DELETE RESTRICT
);
CREATE INDEX finance_entry_events_entry_idx ON public.finance_entry_events(workspace_id,entry_id,occurred_at);

CREATE FUNCTION public.record_finance_entry_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
  INSERT INTO public.finance_entry_events(workspace_id,entry_id,actor_id,event_type,old_values,new_values)
  VALUES (NEW.workspace_id,NEW.id,auth.uid(),TG_OP,CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,to_jsonb(NEW));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_finance_entry_event() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER finance_entries_updated_at BEFORE UPDATE ON public.finance_entries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER finance_entries_audit AFTER INSERT OR UPDATE ON public.finance_entries
FOR EACH ROW EXECUTE FUNCTION public.record_finance_entry_event();

ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_entry_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_entries_select ON public.finance_entries FOR SELECT TO authenticated
USING (public.is_workspace_admin(workspace_id) AND EXISTS(SELECT 1 FROM public.workspaces w WHERE w.id=workspace_id AND w.status='active'));
CREATE POLICY finance_entries_insert ON public.finance_entries FOR INSERT TO authenticated
WITH CHECK (created_by=(SELECT auth.uid()) AND public.is_workspace_admin(workspace_id) AND EXISTS(SELECT 1 FROM public.workspaces w WHERE w.id=workspace_id AND w.status='active'));
CREATE POLICY finance_entries_update ON public.finance_entries FOR UPDATE TO authenticated
USING (public.is_workspace_admin(workspace_id) AND EXISTS(SELECT 1 FROM public.workspaces w WHERE w.id=workspace_id AND w.status='active'))
WITH CHECK (public.is_workspace_admin(workspace_id) AND EXISTS(SELECT 1 FROM public.workspaces w WHERE w.id=workspace_id AND w.status='active'));
CREATE POLICY finance_events_select ON public.finance_entry_events FOR SELECT TO authenticated
USING (public.is_workspace_admin(workspace_id) AND EXISTS(SELECT 1 FROM public.workspaces w WHERE w.id=workspace_id AND w.status='active'));

REVOKE ALL ON public.finance_entries,public.finance_entry_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.finance_entries,public.finance_entry_events TO authenticated;
GRANT INSERT(workspace_id,client_id,title,description,category,entry_type,amount_cents,due_date,status,settlement_date,created_by)
ON public.finance_entries TO authenticated;
GRANT UPDATE(client_id,title,description,category,entry_type,amount_cents,due_date,status,settlement_date)
ON public.finance_entries TO authenticated;
COMMIT;
