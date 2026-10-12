import { CheckSquare } from 'lucide-react';
import type { Task } from '../../types/tasks';
import { TASK_STATUS_LABELS } from '../../types/tasks';

export function CalendarTaskCard({ task, clientName, onSelect }: { task: Task; clientName?: string; onSelect: (task: Task) => void }) {
  return <button type="button" onClick={() => onSelect(task)} aria-label={`Editar tarefa no calendário: ${task.title}`} className={`w-full rounded-lg border border-violet-200 bg-violet-50 p-2 text-left text-xs text-violet-900 focus-visible:outline-2 focus-visible:outline-violet-600 ${task.status === 'done' ? 'opacity-65' : ''}`}>
    <span className="flex items-center gap-1 text-[10px] font-semibold"><CheckSquare className="h-3 w-3" />Tarefa · {TASK_STATUS_LABELS[task.status]}</span>
    <span className="mt-1 block break-words font-semibold">{task.title}</span>
    <span className="mt-1 block truncate text-[10px]">{task.client_id ? clientName || 'Cliente' : 'Interna da agência'}</span>
  </button>;
}
