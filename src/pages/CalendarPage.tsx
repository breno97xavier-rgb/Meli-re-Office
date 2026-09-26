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
import { CalendarHeader } from '../components/calendar/CalendarHeader';
import { CalendarFiltersBar } from '../components/calendar/CalendarFiltersBar';
import { MonthGrid } from '../components/calendar/MonthGrid';
import { CalendarContentCardVisual } from '../components/calendar/CalendarContentCardVisual';
import { CalendarBacklogDrawer } from '../components/calendar/CalendarBacklogDrawer';
import { ContentDetailDrawer } from '../components/contents/ContentDetailDrawer';
import { CreateContentModal } from '../components/contents/CreateContentModal';
import { PlanningDateWarningModal } from '../components/calendar/PlanningDateWarningModal';
import { Content } from '../types/contents';
import { PlanningDateWarning } from '../utils/civilDate';

export const CalendarPage: React.FC = () => {
  const {
    visibleYear,
    visibleMonth,
    previousMonth,
    nextMonth,
    goToToday,
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
        {/* 1. Page Header with Month Navigation and Actions */}
        <CalendarHeader
          visibleYear={visibleYear}
          visibleMonth={visibleMonth}
          onPreviousMonth={previousMonth}
          onNextMonth={nextMonth}
          onGoToToday={goToToday}
          onRefresh={loadContents}
          onOpenBacklog={() => setIsBacklogOpen(true)}
          loading={loading}
          totalPlannedInMonth={metrics.totalPlannedInMonth}
          totalUndated={metrics.totalUndated}
        />

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
        <MonthGrid
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
        />

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


