import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { useCalendarContents } from '../hooks/useCalendarContents';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import { projectGoogleEvents } from '../services/googleCalendarContracts';
import { GoogleEventEditor } from '../components/calendar/GoogleEventEditor';
import type { GoogleCalendarEvent } from '../types/googleCalendar';
import { GoogleCalendarPanel } from '../components/calendar/GoogleCalendarPanel';
import { useCalendarTasks } from '../hooks/useCalendarTasks';
import { projectCalendarTasks } from '../services/calendarTaskContracts';
import { TaskEditor } from '../components/tasks/TaskEditor';
import type { Task } from '../types/tasks';
import { CalendarAgenda } from '../components/calendar/CalendarAgenda';
import { calendarWeek, calendarDateLabel, shiftCalendarPeriod, type CalendarView } from '../services/calendarPeriod';
import { getSystemTodayCivilDate, formatCivilDateObject as formatCivilDate } from '../utils/civilDate';
import { CalendarFiltersBar } from '../components/calendar/CalendarFiltersBar';
import { MonthGrid } from '../components/calendar/MonthGrid';
import { CalendarContentCardVisual } from '../components/calendar/CalendarContentCardVisual';
import { CalendarBacklogDrawer } from '../components/calendar/CalendarBacklogDrawer';
import { ContentDetailDrawer } from '../components/contents/ContentDetailDrawer';
import { CreateContentModal } from '../components/contents/CreateContentModal';
import { PlanningDateWarningModal } from '../components/calendar/PlanningDateWarningModal';
import { Content } from '../types/contents';
import { parseCivilDate, PlanningDateWarning } from '../utils/civilDate';

export const CalendarPage: React.FC = () => {
  const {
    visibleYear,
    visibleMonth,
    setMonthAndYear,
    gridDays,
    contentsByDate,
    monthContents,
    undatedContents,
    allContents,
    metrics,
    clients,
    teamProfiles,
    selectedContent,
    loading,
    error,
    clientIdFilter,
    setClientIdFilter,
    formatFilter,
    setFormatFilter,
    statusFilter,
    setStatusFilter,
    channelFilter,
    setChannelFilter,
    searchTerm,
    setSearchTerm,
    isFilterActive,
    resetFilters,
    isMoving,
    movingContentIds,
    moveError,
    setMoveError,
    isCreating,
    createError,
    isUpdating,
    updateError,
    loadContents,
    checkWarnings,
    handleMoveContentDate,
    handleCreateContent,
    handleUpdateContent,
    handleUpdateStatus,
    handleSelectContent,
  } = useCalendarContents();
  const [view, setView] = useState<CalendarView>('day');
  const [focusDate, setFocusDate] = useState(() => formatCivilDate(getSystemTodayCivilDate()));
  const selectDate = (date: string) => {
    const parsed = parseCivilDate(date);
    if (!parsed || parsed.year < 1000 || parsed.year > 9999) return;
    setFocusDate(date);
    setMonthAndYear(Number(date.slice(0, 4)), Number(date.slice(5, 7)));
  };
  const periodDates = view === 'month' ? gridDays.map(day => day.date) : view === 'week' ? calendarWeek(focusDate) : [focusDate];
  const calendarTasks = useCalendarTasks();
  const google = useGoogleCalendar(periodDates[0],periodDates[periodDates.length-1]);
  const [googleEditor,setGoogleEditor]=useState<{event:GoogleCalendarEvent|null;date:string}|null>(null);
  const googleZone=Intl.DateTimeFormat().resolvedOptions().timeZone;
  const googleByDate=projectGoogleEvents(google.events,periodDates,googleZone,searchTerm);
  const googleInMonth=new Set(gridDays.filter(day=>day.isCurrentMonth).flatMap(day=>(googleByDate[day.date]||[]).map(event=>event.id))).size;
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [includeDoneTasks, setIncludeDoneTasks] = useState(false);
  const taskClientNames = Object.fromEntries(calendarTasks.clients.map(client => [client.id, client.commercial_name || client.name]));
  const taskProjection = projectCalendarTasks(calendarTasks.tasks, { year: visibleYear, month: visibleMonth, clientId: clientIdFilter, search: searchTerm, includeDone: includeDoneTasks, clientNames: taskClientNames });

  // Estado para o card em arrasto (DragOverlay)
  const [activeDragContent, setActiveDragContent] = useState<Content | null>(null);

  // Estado para o drawer do Backlog de conteúdos sem data
  const [isBacklogOpen, setIsBacklogOpen] = useState(false);

  // Estado para data de criação contextual a partir de uma célula do calendário
  const [createModalDate, setCreateModalDate] = useState<string | null>(null);

  // Estado para modal de validação/inconsistência temporal
  const [pendingMoveWithWarning, setPendingMoveWithWarning] = useState<{
    content: Content;
    targetDate: string;
    warnings: PlanningDateWarning[];
  } | null>(null);

  // Configuração dos sensores do DndKit
  // activationConstraint: { distance: 8 } previne disparos em cliques simples (para abrir Drawer)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const content = allContents.find((c) => c.id === active.id);
    if (content) {
      setActiveDragContent(content);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragContent(null);

    // Se soltou fora de uma célula droppable do calendário
    if (!over) return;

    const contentId = String(active.id);
    const targetDate = String(over.id); // Data civil no formato YYYY-MM-DD

    const content = allContents.find((c) => c.id === contentId);
    if (!content) return;

    // Se a data de destino for a mesma da data atual do card: NO-OP imediato
    if (content.planned_date === targetDate) {
      return;
    }

    // Validação temporal de Ciclo (EditorialPlan) e Campanha (Campaign)
    const warnings = checkWarnings(content, targetDate);

    if (warnings.length > 0) {
      // Abre modal unificado de aviso sem executar mutação ainda
      setPendingMoveWithWarning({
        content,
        targetDate,
        warnings,
      });
      return;
    }

    // Sem inconsistências temporais: executa mutação otimista diretamente
    try {
      await handleMoveContentDate(contentId, targetDate);
    } catch {
      // Erro e rollback já são manipulados dentro do useCalendarContents
    }
  };

  const handleConfirmWarningMove = async () => {
    if (!pendingMoveWithWarning) return;
    const { content, targetDate } = pendingMoveWithWarning;
    setPendingMoveWithWarning(null);

    try {
      await handleMoveContentDate(content.id, targetDate);
    } catch {
      // Erro e rollback já são manipulados dentro do useCalendarContents
    }
  };

  const handleCancelWarningMove = () => {
    setPendingMoveWithWarning(null);
    // Card permanece no local de origem sem mutação
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div id="calendar-page" className="p-6 md:p-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 id="calendar-page-title" className="text-xl font-bold text-zinc-900">Calendário</h1>
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Visualização do calendário" className="inline-flex rounded-lg border border-zinc-200 bg-white p-1">
              {([{key:'day',label:'Dia'},{key:'week',label:'Semana'},{key:'month',label:'Mês'}] as const).map(option => <button key={option.key} type="button" aria-pressed={view===option.key} onClick={()=>setView(option.key)} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${view===option.key?'bg-zinc-900 text-white':'text-zinc-600 hover:bg-zinc-100'}`}>{option.label}</button>)}
            </div>
            <button type="button" aria-label="Período anterior" onClick={()=>selectDate(shiftCalendarPeriod(focusDate,view,-1))} className="rounded-lg border bg-white px-3 py-2">‹</button>
            <button type="button" onClick={()=>selectDate(formatCivilDate(getSystemTodayCivilDate()))} className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold">Hoje</button>
            <button type="button" aria-label="Próximo período" onClick={()=>selectDate(shiftCalendarPeriod(focusDate,view,1))} className="rounded-lg border bg-white px-3 py-2">›</button>
            <input type="date" aria-label="Data da agenda" value={focusDate} onInput={event=>selectDate(event.currentTarget.value)} className="rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm" />
            <button type="button" aria-label="Atualizar dados do calendário" disabled={loading||google.loading} onClick={()=>{loadContents();calendarTasks.reload();google.reload();}} className="rounded-lg border bg-white p-2"><RefreshCw className="h-4 w-4" /></button>
          </div>
        </header>
        <details id="calendar-options" className="rounded-xl border border-zinc-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Filtros e conexão Google {isFilterActive ? '· filtros ativos' : ''}</summary>
          <div className="space-y-4 border-t border-zinc-100 p-4">
        <GoogleCalendarPanel canWrite={google.canWrite} onCreate={()=>setGoogleEditor({event:null,date:focusDate})} status={google.status} loading={google.loading} busy={google.busy} error={google.error} onConnect={google.connect} onDisconnect={google.disconnect} onRefresh={google.reload} />
        <button type="button" onClick={()=>setIsBacklogOpen(true)} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm">Conteúdos sem data: {metrics.totalUndated}</button>
        {/* 4. Visual Filters Bar */}
        <CalendarFiltersBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          clients={clients}
          selectedClientId={clientIdFilter}
          onClientChange={setClientIdFilter}
          formatFilter={formatFilter}
          onFormatChange={setFormatFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          channelFilter={channelFilter}
          onChannelChange={setChannelFilter}
          isFilterActive={isFilterActive}
          onResetFilters={resetFilters}
          totalFiltered={monthContents.length}
        />

        {/* 5. Month Calendar Grid */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E8E9EA] bg-white p-4 text-xs text-[#666668]">
          <div className="space-y-1"><p className="font-semibold text-violet-800">Tarefas: {calendarTasks.loading ? 'Carregando…' : calendarTasks.error ? 'Indisponíveis' : `${taskProjection.monthCount} com prazo neste mês · ${taskProjection.undatedCount} sem prazo`}</p><p>Os filtros de formato, status editorial e canal se aplicam aos conteúdos. Cliente e busca também filtram tarefas.</p></div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={includeDoneTasks} onChange={event => setIncludeDoneTasks(event.target.checked)} />Mostrar tarefas concluídas</label>
        </div>
          </div>
        </details>
        {/* 2. Loading Error Banner */}
        {error && (
          <div
            id="calendar-error-banner"
            className="p-4 bg-red-50 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
          >
            <div className="flex items-center gap-3 text-red-800">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-medium">
                  Não foi possível carregar o calendário editorial
                </p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadContents}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Tentar novamente</span>
            </button>
          </div>
        )}

        {/* 3. Drag/Mutation Error Banner */}
        {moveError && (
          <div
            id="calendar-move-error-banner"
            className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs animate-in fade-in"
          >
            <div className="flex items-center gap-3 text-red-800">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-medium">Não foi possível mover o conteúdo</p>
                <p className="text-xs text-red-600 mt-0.5">{moveError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMoveError(null)}
              className="p-1 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
              aria-label="Fechar aviso de erro"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}


        {google.error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Google Agenda: {google.error} Abra Filtros e conexão Google para conferir a conexão.</p>}
        {view !== 'day' && <p className="text-sm font-semibold capitalize text-zinc-700">{view==='month'?new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(focusDate+'T12:00:00Z')):view==='week'?`${calendarDateLabel(periodDates[0])} — ${calendarDateLabel(periodDates[6])}`:calendarDateLabel(focusDate,true)}</p>}
        {calendarTasks.error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{calendarTasks.error} <button type="button" onClick={calendarTasks.reload} className="underline">Tentar carregar tarefas novamente</button></div>}
        {view === 'month' ? <MonthGrid
          gridDays={gridDays}
          contentsByDate={contentsByDate}
          monthContents={monthContents}
          totalUndated={metrics.totalUndated}
          loading={loading}
          isFilterActive={isFilterActive}
          onResetFilters={resetFilters}
          onSelectContent={handleSelectContent}
          onCreateContent={(dateKey) => setCreateModalDate(dateKey)}
          showClientName={clientIdFilter === 'all'}
          movingContentIds={movingContentIds}
          tasksByDate={taskProjection.byDate}
          tasksInMonth={taskProjection.monthCount}
          googleByDate={googleByDate}
          googleInMonth={googleInMonth}
          googleZone={googleZone}
          onSelectGoogle={event=>setGoogleEditor({event,date:event.start.slice(0,10)})}
          onCreateGoogle={google.canWrite ? date=>setGoogleEditor({event:null,date}) : undefined}
          taskClientNames={taskClientNames}
          onSelectTask={setSelectedTask}
        />
        : <CalendarAgenda dates={periodDates} contents={contentsByDate} tasks={taskProjection.byDate} events={googleByDate} zone={googleZone} loading={loading||calendarTasks.loading||google.loading} clientNames={taskClientNames} onContent={handleSelectContent} onTask={setSelectedTask} onEvent={event=>setGoogleEditor({event,date:focusDate})} onCreateContent={setCreateModalDate} onCreateEvent={google.canWrite ? date=>setGoogleEditor({event:null,date}) : undefined} />}
        {googleEditor && <GoogleEventEditor key={googleEditor.event?.id || googleEditor.date} event={googleEditor.event} date={googleEditor.date} canWrite={google.canWrite} onClose={()=>setGoogleEditor(null)} onSaved={()=>{setGoogleEditor(null);void google.reload();}} />}
        {selectedTask && <TaskEditor key={selectedTask.id} task={selectedTask} clients={calendarTasks.clients} onClose={() => setSelectedTask(null)} onSave={async input => { await calendarTasks.save(selectedTask.id, input); setSelectedTask(null); }} />}

        {/* 6. Drag Overlay for smooth preview during drag (portal to document.body) */}
        {createPortal(
          <DragOverlay dropAnimation={null}>
            {activeDragContent ? (
              <CalendarContentCardVisual
                content={activeDragContent}
                showClientName={clientIdFilter === 'all'}
                isOverlay={true}
              />
            ) : null}
          </DragOverlay>,
          document.body
        )}

        {/* 7. Temporal Inconsistency / Warning Modal */}
        <PlanningDateWarningModal
          isOpen={Boolean(pendingMoveWithWarning)}
          content={pendingMoveWithWarning?.content || null}
          targetDate={pendingMoveWithWarning?.targetDate || null}
          warnings={pendingMoveWithWarning?.warnings || []}
          onConfirm={handleConfirmWarningMove}
          onCancel={handleCancelWarningMove}
          isMoving={isMoving}
        />

        {/* 8. Backlog Drawer ("Conteúdos sem data") */}
        <CalendarBacklogDrawer
          isOpen={isBacklogOpen}
          onClose={() => setIsBacklogOpen(false)}
          undatedContents={undatedContents}
          onSelectContent={handleSelectContent}
          showClientName={clientIdFilter === 'all'}
          isFilterActive={isFilterActive}
          onResetFilters={resetFilters}
          movingContentIds={movingContentIds}
        />

        {/* 9. Contextual Create Content Modal (opened from a day cell) */}
        <CreateContentModal
          isOpen={Boolean(createModalDate)}
          onClose={() => setCreateModalDate(null)}
          onSave={async (input) => {
            const created = await handleCreateContent(input);
            setCreateModalDate(null);
            return created;
          }}
          clients={clients}
          teamProfiles={teamProfiles}
          initialClientId={clientIdFilter !== 'all' ? clientIdFilter : undefined}
          initialPlannedDate={createModalDate || undefined}
          isSaving={isCreating}
          error={createError}
        />

        {/* 10. Existing Content Detail Drawer */}
        <ContentDetailDrawer
          content={selectedContent}
          isOpen={Boolean(selectedContent)}
          onClose={() => handleSelectContent(null)}
          onSave={handleUpdateContent}
          onUpdateStatus={handleUpdateStatus}
          teamProfiles={teamProfiles}
          clients={clients}
          isSaving={isUpdating}
          error={updateError}
        />
      </div>
    </DndContext>
  );
};


