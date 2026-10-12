import { supabase } from '../lib/supabase';
import { parseCivilDate } from '../utils/civilDate';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '../types/tasks';
import type { Task, TaskInput, TaskClient } from '../types/tasks';

export function validateTaskInput(input: Partial<TaskInput>): Partial<TaskInput> {
  const payload: Partial<TaskInput> = {};
  if (input.title !== undefined) {
    if (typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 200) throw new Error('Informe um título de até 200 caracteres.');
    payload.title = input.title.trim();
  }
  if (input.status !== undefined) {
    if (!Object.hasOwn(TASK_STATUS_LABELS, input.status)) throw new Error('Status de tarefa inválido.');
    payload.status = input.status;
  }
  if (input.priority !== undefined) {
    if (!Object.hasOwn(TASK_PRIORITY_LABELS, input.priority)) throw new Error('Prioridade inválida.');
    payload.priority = input.priority;
  }
  if (input.due_date !== undefined) {
    if (input.due_date !== null && (typeof input.due_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.due_date) || !parseCivilDate(input.due_date))) throw new Error('Informe uma data válida.');
    payload.due_date = input.due_date;
  }
  if (input.client_id !== undefined) {
    if (input.client_id !== null && (typeof input.client_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.client_id))) throw new Error('Cliente inválido.');
    payload.client_id = input.client_id;
  }
  if (input.description !== undefined) {
    if (input.description !== null && typeof input.description !== 'string') throw new Error('Descrição inválida.');
    payload.description = input.description?.trim() || null;
  }
  return payload;
}

async function taskContext() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Entre na sua conta para acessar Tarefas.');
  const memberships = await supabase.from('workspace_members').select('workspace_id, workspace:workspaces!inner(id,status)')
    .eq('user_id', data.user.id).eq('status', 'active').in('role', ['owner', 'admin']).eq('workspace.status', 'active');
  if (memberships.error) throw new Error('Não foi possível confirmar sua agência.');
  const ids = [...new Set<string>((memberships.data || []).map(row => row.workspace_id))];
  if (ids.length !== 1) throw new Error('Tarefas exige uma única agência ativa vinculada à sua conta como administrador.');
  return { workspaceId: ids[0], userId: data.user.id };
}

export async function fetchTasksData(clientId?: string): Promise<{ tasks: Task[]; clients: TaskClient[] }> {
  const { workspaceId } = await taskContext();
  let tasksQuery = supabase.from('tasks').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false });
  if (clientId) tasksQuery = tasksQuery.eq('client_id', clientId);
  const [tasks, clients] = await Promise.all([
    tasksQuery,
    supabase.from('clients').select('id,name,commercial_name').eq('workspace_id', workspaceId).order('name'),
  ]);
  if (tasks.error || clients.error) throw new Error('Não foi possível carregar as tarefas e seus clientes.');
  return { tasks: (tasks.data || []) as Task[], clients: (clients.data || []) as TaskClient[] };
}

export async function createTask(input: TaskInput): Promise<Task> {
  const payload = validateTaskInput(input);
  if (!payload.title || !payload.status || !payload.priority) throw new Error('Preencha título, status e prioridade.');
  const { workspaceId, userId } = await taskContext();
  const { data, error } = await supabase.from('tasks').insert({ ...payload, workspace_id: workspaceId, created_by: userId, assigned_to: userId }).select('*').single();
  if (error || !data) throw new Error('Não foi possível confirmar o cadastro. Atualize a lista antes de tentar novamente.');
  return data as Task;
}

export async function updateTask(id: string, input: Partial<TaskInput>): Promise<Task> {
  if (!id) throw new Error('Tarefa não informada.');
  const payload = validateTaskInput(input);
  if (!Object.keys(payload).length) throw new Error('Nenhuma alteração informada.');
  const { workspaceId } = await taskContext();
  const { data, error } = await supabase.from('tasks').update(payload).eq('id', id).eq('workspace_id', workspaceId).select('*').single();
  if (error || !data) throw new Error('Não foi possível salvar a tarefa. Ela pode ter sido alterada ou seu acesso pode ter mudado.');
  return data as Task;
}
