import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '../../types/tasks';
import type { Task, TaskClient, TaskInput, TaskStatus, TaskPriority } from '../../types/tasks';
const fieldClass = 'w-full rounded-lg border border-[#E8E9EA] bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-[#F15A3C]';
const message = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
export function TaskEditor({ task, clients, initialClientId, onClose, onSave }: { task: Task | null; clients: TaskClient[]; initialClientId?: string; onClose: () => void; onSave: (input: TaskInput) => Promise<void> }) {
  const initial: TaskInput = { title: task?.title || '', description: task?.description || '', client_id: task ? task.client_id : initialClientId || null, due_date: task?.due_date || null, status: task?.status || 'todo', priority: task?.priority || 'medium' };
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; node?.showModal();
    return () => { node?.close(); document.body.style.overflow = overflow; };
  }, []);
  const close = () => {
    if (saving) return;
    if (JSON.stringify(form) !== JSON.stringify(initial) && !window.confirm('Descartar as alterações não salvas desta tarefa?')) return;
    onClose();
  };
  const set = <K extends keyof TaskInput>(key: K, value: TaskInput[K]) => setForm(previous => ({ ...previous, [key]: value }));
  return <dialog ref={dialog} aria-label={task ? 'Editar tarefa' : 'Nova tarefa'} onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border-0 bg-white p-0 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm">
    <form onSubmit={async event => { event.preventDefault(); if (saving) return; setSaving(true); setError(null); try { await onSave(form); } catch (failure) { setError(message(failure)); } finally { setSaving(false); } }}>
      <div className="flex items-center justify-between border-b border-[#E8E9EA] p-6"><h2 className="text-lg font-semibold">{task ? 'Editar tarefa' : 'Nova tarefa'}</h2><button type="button" onClick={close} disabled={saving} aria-label="Fechar formulário" className="p-2"><X className="h-5 w-5" /></button></div>
      <fieldset disabled={saving} className="space-y-4 p-6">
        <label className="block space-y-1 text-sm font-semibold">Título<input required maxLength={200} value={form.title} onChange={event => set('title', event.target.value)} className={fieldClass} autoFocus /></label>
        <label className="block space-y-1 text-sm font-semibold">Descrição<textarea rows={4} value={form.description || ''} onChange={event => set('description', event.target.value)} className={fieldClass} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm font-semibold">Cliente<select disabled={Boolean(initialClientId)} value={form.client_id || ''} onChange={event => set('client_id', event.target.value || null)} className={fieldClass}><option value="">Tarefa interna da agência</option>{clients.map(client => <option key={client.id} value={client.id}>{client.commercial_name || client.name}</option>)}</select></label>
          <label className="block space-y-1 text-sm font-semibold">Prazo<input type="date" value={form.due_date || ''} onChange={event => set('due_date', event.target.value || null)} className={fieldClass} /></label>
          <label className="block space-y-1 text-sm font-semibold">Prioridade<select value={form.priority} onChange={event => set('priority', event.target.value as TaskPriority)} className={fieldClass}>{Object.entries(TASK_PRIORITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label className="block space-y-1 text-sm font-semibold">Status<select value={form.status} onChange={event => set('status', event.target.value as TaskStatus)} className={fieldClass}>{Object.entries(TASK_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        </div>
        <p className="text-xs font-normal text-[#9E9EA0]">Responsável: sua conta. A tarefa pode ser interna ou vinculada a um cliente.</p>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </fieldset>
      <div className="flex justify-end gap-3 border-t border-[#E8E9EA] p-6"><button type="button" onClick={close} disabled={saving} className="rounded-lg bg-[#F2F3F3] px-4 py-2 text-sm">Cancelar</button><button type="submit" disabled={saving} className="rounded-lg bg-[#1D1D1D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar tarefa'}</button></div>
    </form>
  </dialog>;
}

