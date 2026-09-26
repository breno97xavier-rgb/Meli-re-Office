import React from 'react';
import { CalendarGridDay, parseCivilDate, getMonthName, getWeekdayNames } from '../../utils/civilDate';
import { Content } from '../../types/contents';
import { CalendarDayCell } from './CalendarDayCell';
import { CalendarContentCardVisual } from './CalendarContentCardVisual';
import { CalendarDayOverflowModal } from './CalendarDayOverflowModal';
import { Calendar as CalendarIcon, FilterX, Sparkles, Plus } from 'lucide-react';

interface MonthGridProps {
  gridDays: CalendarGridDay[];
  contentsByDate: Record<string, Content[]>;
  monthContents: Content[];
  totalUndated: number;
  loading: boolean;
  isFilterActive: boolean;
  onResetFilters: () => void;
  onSelectContent: (content: Content) => void;
  onCreateContent?: (dateKey: string) => void;
  showClientName?: boolean;
  movingContentIds?: string[];
}

export const MonthGrid: React.FC<MonthGridProps> = ({
  gridDays,
  contentsByDate,
  monthContents,
  totalUndated,
  loading,
  isFilterActive,
  onResetFilters,
  onSelectContent,
  onCreateContent,
  showClientName = true,
  movingContentIds = [],
}) => {
  const weekdaysShort = getWeekdayNames('short');

  // Estado para o modal de overflow do dia
  const [overflowData, setOverflowData] = React.useState<{
    dateKey: string;
    contents: Content[];
  } | null>(null);

  const handleOpenOverflow = (dateKey: string, contents: Content[]) => {
    setOverflowData({ dateKey, contents });
  };

  const handleCloseOverflow = () => {
    setOverflowData(null);
  };

  // 1. Loading Skeleton State
  if (loading) {
    return (
      <div className="bg-white border border-[#E8E9EA] rounded-xl shadow-2xs overflow-hidden">
        {/* Header dos dias da semana */}
        <div className="grid grid-cols-7 border-b border-[#E8E9EA] bg-[#F7F7F8]">
          {weekdaysShort.map((dayName, idx) => (
            <div
              key={idx}
              className="py-2.5 text-center text-[11px] font-bold text-[#555557] uppercase tracking-wider border-r last:border-r-0 border-[#E8E9EA]"
            >
              {dayName}
            </div>
          ))}
        </div>
        {/* 35 Células Skeleton */}
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, idx) => (
            <div
              key={idx}
              className="min-h-[125px] sm:min-h-[140px] p-2 border-b border-r last:border-r-0 border-[#E8E9EA] animate-pulse bg-zinc-50/50"
            >
              <div className="w-5 h-5 bg-zinc-200 rounded mb-3" />
              <div className="space-y-2">
                <div className="h-10 bg-zinc-200/70 rounded-lg" />
                <div className="h-6 bg-zinc-100 rounded-lg hidden sm:block" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Identificação de dias com conteúdos para visualização mobile (Agenda)
  const mobileDaysWithContents = gridDays.filter(
    (day) => day.isCurrentMonth && (contentsByDate[day.date]?.length || 0) > 0
  );

  return (
    <div className="space-y-4">
      {/* Aviso contextual se mês estiver vazio ou filtros sem resultado */}
      {monthContents.length === 0 && (
        <div className="p-4 bg-[#F7F7F8] border border-[#E8E9EA] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#666668]">
          <div className="flex items-center gap-2.5">
            {isFilterActive ? (
              <FilterX className="w-4 h-4 text-[#F15A3C] shrink-0" />
            ) : (
              <CalendarIcon className="w-4 h-4 text-[#8C8D8F] shrink-0" />
            )}
            <span>
              {isFilterActive
                ? 'Nenhum conteúdo corresponde aos filtros selecionados para este mês.'
                : 'Nenhum conteúdo planejado para este mês.'}
            </span>
          </div>
          {isFilterActive && (
            <button
              type="button"
              onClick={onResetFilters}
              className="text-[#F15A3C] hover:underline font-semibold text-xs cursor-pointer self-start sm:self-auto"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. VISUALIZAÇÃO DESKTOP / TABLET (Grade 7 Colunas)        */}
      {/* ======================================================== */}
      <div className="hidden md:block bg-white border border-[#E8E9EA] rounded-xl shadow-2xs overflow-hidden">
        <div className="min-w-[720px] overflow-x-auto">
          {/* Header com os 7 dias da semana (Segunda a Domingo) */}
          <div className="grid grid-cols-7 border-b border-[#E8E9EA] bg-[#F7F7F8]">
            {weekdaysShort.map((dayName, idx) => {
              const isWeekend = idx === 5 || idx === 6;
              return (
                <div
                  key={idx}
                  className={`py-2.5 text-center text-xs font-bold uppercase tracking-wider border-r last:border-r-0 border-[#E8E9EA] ${
                    isWeekend ? 'text-[#8C8D8F] bg-[#F4F4F5]' : 'text-[#444446]'
                  }`}
                >
                  {dayName}
                </div>
              );
            })}
          </div>

          {/* Grade de dias (35 ou 42 células) */}
          <div className="grid grid-cols-7 border-l border-t border-[#E8E9EA]">
            {gridDays.map((day) => {
              const dayContents = contentsByDate[day.date] || [];
              return (
                <CalendarDayCell
                  key={day.date}
                  day={day}
                  contents={dayContents}
                  onSelectContent={onSelectContent}
                  onOpenOverflow={handleOpenOverflow}
                  onCreateContent={onCreateContent}
                  showClientName={showClientName}
                  movingContentIds={movingContentIds}
                  isDraggable={true}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. VISUALIZAÇÃO MOBILE (Agenda Linear do Mês)             */}
      {/* ======================================================== */}
      <div className="block md:hidden space-y-3">
        {mobileDaysWithContents.length > 0 ? (
          mobileDaysWithContents.map((day) => {
            const dayContents = contentsByDate[day.date] || [];
            const parsed = parseCivilDate(day.date);
            const monthName = parsed ? getMonthName(parsed.month, 'short') : '';
            const weekdayName = weekdaysShort[day.dayOfWeek] || '';

            return (
              <div
                key={day.date}
                className="bg-white border border-[#E8E9EA] rounded-xl p-3.5 shadow-2xs space-y-2.5"
              >
                {/* Cabeçalho do Dia na Agenda Mobile */}
                <div className="flex items-center justify-between pb-2 border-b border-[#F2F3F3]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                        day.isToday
                          ? 'bg-[#1D1D1D] text-white shadow-xs'
                          : 'bg-[#F2F3F3] text-[#1D1D1D]'
                      }`}
                    >
                      {day.day}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-[#1D1D1D]">
                        {weekdayName}, {day.day} de {monthName}
                      </span>
                      {day.isToday && (
                        <span className="ml-2 text-[10px] font-bold text-[#F15A3C] uppercase tracking-wider">
                          Hoje
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-[#666668]">
                      {dayContents.length} {dayContents.length === 1 ? 'conteúdo' : 'conteúdos'}
                    </span>
                    {onCreateContent && (
                      <button
                        type="button"
                        id={`calendar-mobile-create-btn-${day.date}`}
                        onClick={() => onCreateContent(day.date)}
                        className="w-6 h-6 rounded-md bg-[#F2F3F3] text-[#666668] hover:text-[#1D1D1D] hover:bg-[#EAEBEB] flex items-center justify-center transition-colors cursor-pointer"
                        title={`Criar conteúdo em ${day.date}`}
                        aria-label={`Criar conteúdo em ${day.date}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Cards de conteúdos do dia */}
                <div className="space-y-2">
                  {dayContents.map((content) => (
                    <CalendarContentCardVisual
                      key={content.id}
                      content={content}
                      onClick={() => onSelectContent(content)}
                      showClientName={showClientName}
                    />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 bg-white border border-[#E8E9EA] rounded-xl text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-[#F7F7F8] border border-[#E8E9EA] flex items-center justify-center mx-auto text-[#8C8D8F]">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1D1D1D]">
                Nenhum conteúdo planejado para os dias deste mês
              </p>
              <p className="text-xs text-[#666668] mt-1">
                {isFilterActive
                  ? 'Tente ajustar ou limpar os filtros para ver conteúdos.'
                  : 'Os conteúdos planejados com data neste mês aparecerão aqui.'}
              </p>
            </div>
            {isFilterActive && (
              <button
                type="button"
                onClick={onResetFilters}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#1D1D1D] bg-[#F2F3F3] hover:bg-[#EAEBEB] rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <FilterX className="w-3.5 h-3.5" />
                <span>Limpar filtros</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal de Overflow */}
      <CalendarDayOverflowModal
        isOpen={Boolean(overflowData)}
        dateKey={overflowData?.dateKey || null}
        contents={overflowData?.contents || []}
        onClose={handleCloseOverflow}
        onSelectContent={onSelectContent}
        showClientName={showClientName}
      />
    </div>
  );
};
