import type { Task } from '../types/tasks';
import { parseCivilDate } from '../utils/civilDate';

export function projectCalendarTasks(tasks: Task[], options: { year: number; month: number; clientId: string; search: string; includeDone: boolean; clientNames: Record<string, string> }) {
  const query = options.search.trim().toLocaleLowerCase('pt-BR');
  const matches = tasks.filter(task => task.status !== 'archived' && (options.includeDone || task.status !== 'done')
    && (options.clientId === 'all' || task.client_id === options.clientId)
    && `${task.title} ${task.description || ''} ${options.clientNames[task.client_id || ''] || ''}`.toLocaleLowerCase('pt-BR').includes(query));
  const byDate: Record<string, Task[]> = {};
  let monthCount = 0;
  let undatedCount = 0;
  const priorities = { urgent: 0, high: 1, medium: 2, low: 3 };
  for (const task of matches) {
    if (!task.due_date) { undatedCount++; continue; }
    const date = parseCivilDate(task.due_date);
    if (!date) continue;
    (byDate[task.due_date] ||= []).push(task);
    if (date.year === options.year && date.month === options.month) monthCount++;
  }
  for (const list of Object.values(byDate)) list.sort((a,b) => priorities[a.priority] - priorities[b.priority] || a.title.localeCompare(b.title, 'pt-BR') || a.id.localeCompare(b.id));
  return { byDate, monthCount, undatedCount };
}
