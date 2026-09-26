import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { CalendarGridDay, parseCivilDate, getMonthName } from '../../utils/civilDate';
import { Content } from '../../types/contents';
import { CalendarContentCard } from './CalendarContentCard';

interface CalendarDayCellProps {
  day: CalendarGridDay;
  contents: Content[];
  onSelectContent: (content: Content) => void;
  onOpenOverflow: (dateKey: string, contents: Content[]) => void;
  onCreateContent?: (dateKey: string) => void;
  showClientName?: boolean;
  movingContentIds?: string[];
  isDraggable?: boolean;
}

const MAX_VISIBLE_CARDS = 3;

export const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  day,
  contents,
  onSelectContent,
  onOpenOverflow,
  onCreateContent,
  showClientName = true,
  movingContentIds = [],
  isDraggable = true,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: day.date,
    data: { date: day.date },
  });

  const visibleCards = contents.slice(0, MAX_VISIBLE_CARDS);
  const overflowCount = Math.max(0, contents.length - MAX_VISIBLE_CARDS);
  const isWeekend = day.dayOfWeek === 5 || day.dayOfWeek === 6; // Sábado ou Domingo

  // Determinação da classe de fundo e borda da célula
  let cellBgClasses = 'bg-white text-[#1D1D1D]';
  if (isOver) {
    cellBgClasses = 'bg-zinc-100/90 text-[#1D1D1D] ring-2 ring-inset ring-[#1D1D1D]/30 border-[#1D1D1D]/40';
  } else if (!day.isCurrentMonth) {
    cellBgClasses = 'bg-[#F9F9FA]/70 text-[#A0A1A3]';
  } else if (isWeekend) {
    cellBgClasses = 'bg-[#FCFCFD] text-[#1D1D1D]';
  }

  // Label acessível para o botão de criação
  const parsedDate = parseCivilDate(day.date);
  const formattedDayMonth = parsedDate
    ? `${parsedDate.day} de ${getMonthName(parsedDate.month, 'long')} de ${parsedDate.year}`
    : day.date;

  return (
    <div
      ref={setNodeRef}
      id={`calendar-day-cell-${day.date}`}
      className={`min-h-[125px] sm:min-h-[140px] p-2 flex flex-col justify-between border-b border-r border-[#E8E9EA] transition-all duration-100 group ${cellBgClasses}`}
    >
      {/* 1. Cell Header: Day number, Create (+) Button & Today/Count Badges */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5">
          {day.isToday ? (
            <span
              className="w-6 h-6 rounded-full bg-[#1D1D1D] text-white text-xs font-bold flex items-center justify-center shadow-xs"
              title="Hoje"
            >
              {day.day}
            </span>
          ) : (
            <span
              className={`text-xs font-semibold px-1 py-0.5 rounded ${
                day.isCurrentMonth
                  ? 'text-[#2D2D2E]'
                  : 'text-[#A0A1A3]'
              }`}
            >
              {day.day}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Botão discreto de criação contextual (+) visível no hover/focus */}
          {onCreateContent && (
            <button
              type="button"
              id={`calendar-create-btn-${day.date}`}
              onClick={(e) => {
                e.stopPropagation();
                onCreateContent(day.date);
              }}
              className="w-5 h-5 rounded hover:bg-[#EAEBEB] text-[#8C8D8F] hover:text-[#1D1D1D] flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
              title={`Criar conteúdo em ${formattedDayMonth}`}
              aria-label={`Criar conteúdo em ${formattedDayMonth}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Count pill if there are contents on this day */}
          {contents.length > 0 && (
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full border ${
                day.isCurrentMonth
                  ? 'bg-[#F2F3F3] text-[#555557] border-[#E8E9EA]'
                  : 'bg-zinc-100 text-zinc-400 border-zinc-200'
              }`}
            >
              {contents.length}
            </span>
          )}
        </div>
      </div>

      {/* 2. Cards Area */}
      <div className="flex-1 space-y-1.5 min-h-0">
        {visibleCards.map((content) => (
          <CalendarContentCard
            key={content.id}
            content={content}
            onClick={onSelectContent}
            showClientName={showClientName}
            isDraggable={isDraggable}
            isMoving={movingContentIds.includes(content.id)}
          />
        ))}
      </div>

      {/* 3. Overflow indicator button */}
      {overflowCount > 0 && (
        <button
          type="button"
          onClick={() => onOpenOverflow(day.date, contents)}
          className="mt-1.5 w-full py-1 px-2 text-[10px] font-bold text-[#444446] hover:text-[#1D1D1D] bg-[#F2F3F3] hover:bg-[#EAEBEB] border border-[#E8E9EA] rounded-md text-center transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1D1D1D]"
          aria-label={`Ver mais ${overflowCount} conteúdos para o dia ${day.day}`}
        >
          +{overflowCount} {overflowCount === 1 ? 'conteúdo' : 'conteúdos'}
        </button>
      )}
    </div>
  );
};

