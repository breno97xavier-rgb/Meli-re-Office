import React, { useEffect } from 'react';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import { Content } from '../../types/contents';
import { CalendarContentCardVisual } from './CalendarContentCardVisual';
import { parseCivilDate, getMonthName, getWeekdayNames, getDayOfWeek } from '../../utils/civilDate';

interface CalendarDayOverflowModalProps {
  isOpen: boolean;
  dateKey: string | null; // "YYYY-MM-DD"
  contents: Content[];
  onClose: () => void;
  onSelectContent: (content: Content) => void;
  showClientName?: boolean;
}

export const CalendarDayOverflowModal: React.FC<CalendarDayOverflowModalProps> = ({
  isOpen,
  dateKey,
  contents,
  onClose,
  onSelectContent,
  showClientName = true,
}) => {
  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !dateKey) return null;

  const parsed = parseCivilDate(dateKey);
  const day = parsed?.day || '';
  const monthName = parsed ? getMonthName(parsed.month, 'long') : '';
  const year = parsed?.year || '';

  // Get weekday name from civil date
  let weekdayName = '';
  if (parsed) {
    const civilIdx = getDayOfWeek(parsed.year, parsed.month, parsed.day);
    const weekdaysLong = getWeekdayNames('long');
    weekdayName = weekdaysLong[civilIdx] || '';
  }

  return (
    <div
      id="calendar-overflow-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-overflow-title"
    >
      <div
        id="calendar-overflow-modal-content"
        className="bg-white border border-[#E8E9EA] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E9EA] bg-[#F7F7F8]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-[#E8E9EA] flex items-center justify-center text-[#1D1D1D] shadow-2xs">
              <CalendarIcon className="w-4 h-4 text-[#F15A3C]" />
            </div>
            <div>
              <h3
                id="calendar-overflow-title"
                className="text-sm font-bold text-[#1D1D1D]"
              >
                {day} de {monthName} de {year}
              </h3>
              <p className="text-xs text-[#666668] font-medium">
                {weekdayName} • {contents.length}{' '}
                {contents.length === 1 ? 'conteúdo planejado' : 'conteúdos planejados'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#E8E9EA] bg-white text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contents List */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
          {contents.map((content) => (
            <CalendarContentCardVisual
              key={content.id}
              content={content}
              onClick={() => {
                onClose();
                onSelectContent(content);
              }}
              showClientName={showClientName}
            />
          ))}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#E8E9EA] bg-[#FAFAFA] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#1D1D1D] bg-white border border-[#E8E9EA] hover:bg-[#F2F3F3] rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
