import type { Content } from '../../types/contents';
import type { Task } from '../../types/tasks';
import type { GoogleCalendarEvent } from '../../types/googleCalendar';
import { calendarDateLabel } from '../../services/calendarPeriod';
import { GoogleEventCard } from './GoogleCalendarPanel';
import { CalendarTaskCard } from './CalendarTaskCard';
import { CalendarContentCardVisual } from './CalendarContentCardVisual';

interface Props {
  dates: string[];
  contents: Record<string, Content[]>;
  tasks: Record<string, Task[]>;
  events: Record<string, GoogleCalendarEvent[]>;
  zone: string;
  loading: boolean;
  clientNames: Record<string, string>;
  onContent: (content: Content) => void;
  onTask: (task: Task) => void;
  onEvent: (event: GoogleCalendarEvent) => void;
  onCreateContent: (date: string) => void;
  onCreateEvent?: (date: string) => void;
}
export function CalendarAgenda({ dates, contents, tasks, events, zone, loading, clientNames, onContent, onTask, onEvent, onCreateContent, onCreateEvent }: Props) {
  return <section aria-label={dates.length === 1 ? 'Agenda do dia' : 'Agenda da semana'} aria-busy={loading}>
    {loading && <p role="status" className="mb-3 text-sm text-zinc-500">Atualizando atividades…</p>}
    <div className={dates.length === 1 ? '' : 'grid gap-3 md:grid-cols-2 xl:grid-cols-4'}>
      {dates.map(date => {
        const google = events[date] || [], dailyTasks = tasks[date] || [], dailyContents = contents[date] || [];
        const count = google.length + dailyTasks.length + dailyContents.length;
        return <article key={date} aria-label={calendarDateLabel(date, true)} className="min-w-0 rounded-xl border border-[#E8E9EA] bg-white p-4">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
            <div><h2 className="text-sm font-bold capitalize text-zinc-900">{calendarDateLabel(date, dates.length === 1)}</h2><p className="mt-1 text-xs text-zinc-500">{count} {count === 1 ? 'atividade' : 'atividades'}</p></div>
            <div className="flex flex-wrap gap-2">
              {onCreateEvent && <button type="button" onClick={() => onCreateEvent(date)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">Novo compromisso</button>}
              <button type="button" onClick={() => onCreateContent(date)} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold">Novo conteúdo</button>
            </div>
          </header>
          <div className="space-y-3">
            {!!google.length && <><h3 className="text-xs font-semibold text-blue-700">Compromissos · Google Agenda</h3>{google.map(event => <div key={event.id}><GoogleEventCard event={event} zone={zone} onSelect={onEvent} /></div>)}</>}
            {!!dailyTasks.length && <><h3 className="pt-2 text-xs font-semibold text-violet-700">Tarefas do Office</h3>{dailyTasks.map(task => <div key={task.id}><CalendarTaskCard task={task} clientName={clientNames[task.client_id || '']} onSelect={onTask} /></div>)}</>}
            {!!dailyContents.length && <><h3 className="pt-2 text-xs font-semibold text-zinc-600">Conteúdos planejados</h3>{dailyContents.map(content => <CalendarContentCardVisual key={content.id} content={content} onClick={() => onContent(content)} />)}</>}
            {!count && !loading && <p className="py-6 text-sm text-zinc-500">Nenhuma atividade neste dia com os filtros atuais.</p>}
          </div>
        </article>;
      })}
    </div>
  </section>;
}
