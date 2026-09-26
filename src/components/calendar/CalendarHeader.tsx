import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Calendar as CalendarIcon,
  Clock,
} from 'lucide-react';
import { getMonthName, getSystemTodayCivilDate } from '../../utils/civilDate';

interface CalendarHeaderProps {
  visibleYear: number;
  visibleMonth: number; // 1-12
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onGoToToday: () => void;
  onRefresh: () => void;
  onOpenBacklog?: () => void;
  loading: boolean;
  totalPlannedInMonth: number;
  totalUndated: number;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  visibleYear,
  visibleMonth,
  onPreviousMonth,
  onNextMonth,
  onGoToToday,
  onRefresh,
  onOpenBacklog,
  loading,
  totalPlannedInMonth,
  totalUndated,
}) => {
  const monthName = getMonthName(visibleMonth, 'long');
  const systemToday = getSystemTodayCivilDate();
  const isCurrentSystemMonth =
    systemToday.year === visibleYear && systemToday.month === visibleMonth;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* 1. Page Title & Subtitle */}
      <div>
        <h1
          id="calendar-page-title"
          className="text-xl md:text-2xl font-bold text-[#1D1D1D] tracking-tight flex items-center gap-2.5"
        >
          <CalendarIcon className="w-6 h-6 text-[#1D1D1D]" />
          <span>Calendário Editorial</span>
        </h1>
        <p className="text-xs md:text-sm text-[#666668] mt-0.5">
          Visualize a distribuição temporal dos conteúdos planejados.
        </p>
      </div>

      {/* 2. Temporal Navigation & Action Controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Contextual badges / Backlog Trigger */}
        <div className="flex items-center gap-2 mr-1">
          <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              <strong>{totalPlannedInMonth}</strong> no mês
            </span>
          </span>

          <button
            type="button"
            id="calendar-open-backlog-btn"
            onClick={onOpenBacklog}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1D1D1D] ${
              totalUndated > 0
                ? 'text-[#1D1D1D] bg-white border-[#D0D1D3] hover:bg-[#F2F3F3] hover:border-[#1D1D1D]'
                : 'text-[#8C8D8F] bg-[#F7F7F8] border-[#E8E9EA] hover:bg-[#EAEBEB]'
            }`}
            title="Abrir painel de conteúdos sem data planejada (Backlog)"
            aria-label={`Abrir backlog: ${totalUndated} conteúdos sem data`}
          >
            <Clock className="w-3.5 h-3.5 text-[#666668]" />
            <span>
              <strong>{totalUndated}</strong> sem data
            </span>
          </button>
        </div>

        {/* Month Selector Group */}
        <div className="inline-flex items-center bg-white border border-[#E8E9EA] rounded-xl shadow-2xs p-1">
          {/* Previous Month */}
          <button
            type="button"
            id="calendar-prev-month-btn"
            onClick={onPreviousMonth}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1D1D1D]"
            aria-label="Mês anterior"
            title="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Month & Year Label */}
          <div
            id="calendar-current-month-display"
            className="px-3 min-w-[140px] sm:min-w-[160px] text-center select-none"
          >
            <span className="text-xs sm:text-sm font-bold text-[#1D1D1D] capitalize">
              {monthName} {visibleYear}
            </span>
          </div>

          {/* Next Month */}
          <button
            type="button"
            id="calendar-next-month-btn"
            onClick={onNextMonth}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1D1D1D]"
            aria-label="Próximo mês"
            title="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Go to Today Button */}
        <button
          type="button"
          id="calendar-go-to-today-btn"
          onClick={onGoToToday}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs ${
            isCurrentSystemMonth
              ? 'bg-[#F2F3F3] text-[#666668] border-[#E8E9EA] hover:bg-[#EAEBEB]'
              : 'bg-white text-[#1D1D1D] border-[#E8E9EA] hover:border-[#1D1D1D] hover:bg-[#F9F9FA]'
          }`}
          title="Ir para o mês atual"
        >
          Hoje
        </button>

        {/* Refresh Button */}
        <button
          type="button"
          id="calendar-refresh-btn"
          onClick={onRefresh}
          disabled={loading}
          className="w-8 h-8 rounded-lg bg-white border border-[#E8E9EA] text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] flex items-center justify-center transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          aria-label="Atualizar dados do calendário"
          title="Atualizar dados"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};
