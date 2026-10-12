import { TaskEditor } from '../components/tasks/TaskEditor';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, RefreshCw, Check, Archive, Pencil, CheckSquare } from 'lucide-react';
import { createTask, fetchTasksData, updateTask } from '../services/tasksService';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '../types/tasks';
import type { Task, TaskClient, TaskInput, TaskStatus, TaskPriority } from '../types/tasks';
import { formatCivilDateBR, getSystemTodayString } from '../utils/civilDate';

const fieldClass = 'w-full rounded-lg border border-[#E8E9EA] bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-[#F15A3C]';
const message = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível concluir a operação.';

export function TasksPage({ isCreating = false, onCloseCreate, initialClientId }: { isCreating?: boolean; onCloseCreate: () => void; initialClientId?: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<TaskClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<Task | null | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('open');
  const [clientId, setClientId] = useState(initialClientId || 'all');
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const request = ++sequence.current; setLoading(true); setError(null);
    try { const data = await fetchTasksData(initialClientId); if (request === sequence.current) { setTasks(data.tasks); setClients(data.clients); } }
    catch (failure) { if (request === sequence.current) setError(message(failure)); }
    finally { if (request === sequence.current) setLoading(false); }
  }, [initialClientId]);
  useEffect(() => { load(); return () => { sequence.current += 1; }; }, [load]);
  const clientNames = new Map(clients.map(client => [client.id, client.commercial_name || client.name]));
  const today = getSystemTodayString();
  const overdue = (task: Task) => Boolean(task.due_date && task.due_date < today && !['done', 'archived'].includes(task.status));
  const filtered = tasks.filter(task => (status === 'all' || (status === 'open' ? !['done', 'archived'].includes(task.status) : task.status === status)) && (clientId === 'all' || (clientId === 'internal' ? !task.client_id : task.client_id === clientId)) && `${task.title} ${task.description || ''} ${clientNames.get(task.client_id || '') || ''}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR').trim()));
  const close = () => { setEditing(undefined); onCloseCreate(); };
  const changeStatus = async (task: Task, next: TaskStatus) => {
    if (busy) return; setBusy(task.id); setError(null);
    try { const updated = await updateTask(task.id, { status: next }); setTasks(previous => previous.map(item => item.id === updated.id ? updated : item)); }
    catch (failure) { setError(message(failure)); } finally { setBusy(null); }
  };
  return <div className="space-y-6 p-6 md:p-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">Tarefas</h1><p className="mt-2 text-sm text-[#666668]">Organize atividades da agência, prazos e entregas por cliente.</p></div><div className="flex gap-3"><button onClick={load} disabled={loading || Boolean(busy)} className="flex items-center gap-2 rounded-lg border border-[#E8E9EA] bg-white px-4 py-2 text-sm disabled:opacity-50"><RefreshCw className="h-4 w-4" />Atualizar</button><button onClick={() => setEditing(null)} disabled={loading || Boolean(error)} className="flex items-center gap-2 rounded-lg bg-[#F15A3C] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" />Nova tarefa</button></div></div>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[['Em aberto',tasks.filter(task => !['done','archived'].includes(task.status)).length],['Atrasadas',tasks.filter(overdue).length],['Concluídas',tasks.filter(task => task.status==='done').length],['Arquivadas',tasks.filter(task => task.status==='archived').length]].map(([label,count]) => <div key={label} className="rounded-xl border border-[#E8E9EA] bg-white p-5"><p className="text-xs font-semibold text-[#666668]">{label}</p><p className="mt-2 text-2xl font-bold">{loading ? '—' : count}</p></div>)}</div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <div className="grid gap-3 rounded-xl border border-[#E8E9EA] bg-white p-4 md:grid-cols-[2fr_1fr_1fr]"><input aria-label="Buscar tarefas" placeholder="Buscar título, descrição ou cliente…" value={search} onChange={event => setSearch(event.target.value)} className={fieldClass} /><select aria-label="Filtrar status" value={status} onChange={event => setStatus(event.target.value)} className={fieldClass}><option value="open">Em aberto</option><option value="all">Todos os status</option>{Object.entries(TASK_STATUS_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><select aria-label="Filtrar cliente" disabled={Boolean(initialClientId)} value={clientId} onChange={event=>setClientId(event.target.value)} className={fieldClass}><option value="all">Todos os clientes</option><option value="internal">Internas da agência</option>{clients.map(client=><option key={client.id} value={client.id}>{client.commercial_name || client.name}</option>)}</select></div>
    <section aria-label="Lista de tarefas" className="space-y-3">{loading ? <p role="status" className="p-8 text-center text-sm">Carregando tarefas…</p> : !filtered.length ? <div className="rounded-xl border border-[#E8E9EA] bg-white p-12 text-center"><CheckSquare className="mx-auto h-8 w-8 text-[#F15A3C]" /><p className="mt-3 font-semibold">{tasks.length ? 'Nenhuma tarefa neste filtro' : 'Sua primeira tarefa começa aqui'}</p><p className="mt-2 text-sm text-[#666668]">Crie atividades e acompanhe seus prazos sem perder o vínculo com o cliente.</p></div> : filtered.map(task => <article key={task.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E8E9EA] bg-white p-5"><div className="min-w-0 flex-1"><h2 className="break-words font-semibold">{task.title}</h2>{task.description && <p className="mt-1 line-clamp-2 text-sm text-[#666668]">{task.description}</p>}<div className="mt-3 flex flex-wrap gap-3 text-xs text-[#666668]"><span>{task.client_id ? clientNames.get(task.client_id) || 'Cliente indisponível' : 'Interna da agência'}</span><span>{TASK_STATUS_LABELS[task.status]}</span><span>Prioridade {TASK_PRIORITY_LABELS[task.priority]?.toLowerCase()}</span><span className={overdue(task) ? 'font-semibold text-red-600' : ''}>{task.due_date ? `Prazo: ${formatCivilDateBR(task.due_date)}${overdue(task) ? ' · Atrasada' : ''}` : 'Sem prazo'}</span></div></div><div className="flex flex-wrap gap-2"><button disabled={Boolean(busy)} onClick={() => setEditing(task)} aria-label={`Editar tarefa: ${task.title}`} className="rounded-lg border border-[#E8E9EA] p-2"><Pencil className="h-4 w-4" /></button>{task.status !== 'archived' && <button disabled={Boolean(busy)} onClick={() => changeStatus(task,task.status==='done'?'todo':'done')} className="flex items-center gap-1 rounded-lg bg-[#F2F3F3] px-3 py-2 text-xs"><Check className="h-4 w-4" />{task.status==='done'?'Reabrir':'Concluir'}</button>}<button disabled={Boolean(busy)} onClick={() => changeStatus(task,task.status==='archived'?'todo':'archived')} className="flex items-center gap-1 rounded-lg bg-[#F2F3F3] px-3 py-2 text-xs"><Archive className="h-4 w-4" />{task.status==='archived'?'Reativar':'Arquivar'}</button></div></article>)}</section>
    {(isCreating || editing !== undefined) && !loading && !error && <TaskEditor key={isCreating ? 'new' : editing?.id || 'new'} task={isCreating ? null : editing || null} clients={clients} initialClientId={initialClientId} onClose={close} onSave={async input => { const target = isCreating ? null : editing; const updated = target ? await updateTask(target.id,input) : await createTask(input); setTasks(previous => target ? previous.map(item=>item.id===updated.id?updated:item) : [updated,...previous]); close(); }} />}
  </div>;
}
