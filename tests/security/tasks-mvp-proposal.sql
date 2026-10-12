-- PROPOSTA LOCAL: não aplicada ao Supabase remoto; versionar como migração após aprovação.
-- Precondição observada em 11/10/2026: public.tasks existe e está vazia.
BEGIN;
LOCK TABLE public.tasks IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.tasks) THEN
    RAISE EXCEPTION 'TASKS_REQUIRE_DATA_RECONCILIATION';
  END IF;
END $$;

ALTER TABLE public.tasks ADD COLUMN workspace_id uuid NOT NULL
  REFERENCES public.workspaces(id) ON DELETE RESTRICT;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_workspace_client_fkey
  FOREIGN KEY (workspace_id, client_id) REFERENCES public.clients(workspace_id, id)
  ON DELETE RESTRICT;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_title_not_blank
  CHECK (length(btrim(title)) BETWEEN 1 AND 200);
CREATE INDEX tasks_workspace_due_date_idx ON public.tasks(workspace_id, due_date);
CREATE INDEX tasks_workspace_client_idx ON public.tasks(workspace_id, client_id);

-- MVP interno: usar os helpers existentes, sem adicionar papéis/chaves de permissão.
-- Substituir a policy global: policies permissivas adicionais somariam acesso.
DROP POLICY "Admins have full access to tasks" ON public.tasks;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tasks_admin_select ON public.tasks FOR SELECT TO authenticated
  USING (public.is_workspace_admin(workspace_id) AND EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id=workspace_id AND w.status='active'));
CREATE POLICY tasks_admin_insert ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_admin(workspace_id) AND created_by=(SELECT auth.uid())
    AND (assigned_to IS NULL OR assigned_to=(SELECT auth.uid())) AND EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id=workspace_id AND w.status='active'));
CREATE POLICY tasks_admin_update ON public.tasks FOR UPDATE TO authenticated
  USING (public.is_workspace_admin(workspace_id) AND EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id=workspace_id AND w.status='active'))
  WITH CHECK (public.is_workspace_admin(workspace_id) AND EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id=workspace_id AND w.status='active'));

-- Autor e workspace não podem ser reatribuídos pela API. Outros vínculos ficam
-- preservados na estrutura, mas não entram no formulário/escrita deste MVP.
REVOKE ALL ON public.tasks FROM anon, authenticated;
GRANT SELECT ON public.tasks TO authenticated;
GRANT INSERT (workspace_id,title,description,status,priority,due_date,client_id,created_by,assigned_to)
  ON public.tasks TO authenticated;
GRANT UPDATE (title,description,status,priority,due_date,client_id)
  ON public.tasks TO authenticated;
COMMIT;
