export const TASK_STATUS_LABELS = { todo: 'A fazer', in_progress: 'Em andamento', review: 'Em revisão', done: 'Concluída', archived: 'Arquivada' };
export const TASK_PRIORITY_LABELS = { low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente' };
export type TaskStatus = keyof typeof TASK_STATUS_LABELS;
export type TaskPriority = keyof typeof TASK_PRIORITY_LABELS;
export interface Task {
  id: string; workspace_id: string; title: string; description: string | null;
  status: TaskStatus; priority: TaskPriority; due_date: string | null; client_id: string | null;
  created_by: string; created_at: string; updated_at: string;
}
export interface TaskInput { title: string; description?: string | null; status: TaskStatus; priority: TaskPriority; due_date?: string | null; client_id?: string | null }
export interface TaskClient { id: string; name: string; commercial_name: string | null }
