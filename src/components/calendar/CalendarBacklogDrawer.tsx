import React, { useEffect } from 'react';
import {
  X,
  Clock,
  Inbox,
  FilterX,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Content } from '../../types/contents';
import { CalendarContentCard } from './CalendarContentCard';

interface CalendarBacklogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  undatedContents: Content[];
  onSelectContent: (content: Content) => void;
  showClientName?: boolean;
  isFilterActive?: boolean;
  onResetFilters?: () => void;
  movingContentIds?: string[];
}

export const CalendarBacklogDrawer: React.FC<CalendarBacklogDrawerProps> = ({
  isOpen,
  onClose,
  undatedContents,
  onSelectContent,
  showClientName = true,
  isFilterActive = false,
  onResetFilters,
  movingContentIds = [],
}) => {
  // Fechar com a tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="calendar-backlog-drawer-overlay"
      className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-2xs animate-in fade-in duration-200"
    >
      {/* Backdrop clicável */}
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Painel Lateral (Drawer) */}
      <div
        id="calendar-backlog-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-backlog-title"
        className="relative z-10 w-full max-w-md bg-white h-full shadow-2xl border-l border-[#E8E9EA] flex flex-col animate-in slide-in-from-right duration-250 ease-out"
      >
        {/* 1. Header do Backlog */}
        <div className="p-5 border-b border-[#E8E9EA] bg-[#FAFAFA] flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 text-[#1D1D1D] flex items-center justify-center">
                <Clock className="w-4 h-4 text-[#1D1D1D]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    id="calendar-backlog-title"
                    className="text-base font-bold text-[#1D1D1D]"
                  >
                    Conteúdos sem data
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#F2F3F3] text-[#444446] border border-[#E8E9EA]">
                    {undatedContents.length}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-[#666668] leading-relaxed pt-1">
              Itens de pauta sem data planejada. Arraste para uma célula do calendário ou clique para abrir os detalhes.
            </p>
          </div>

          <button
            type="button"
            id="calendar-backlog-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8C8D8F] hover:text-[#1D1D1D] hover:bg-[#EAEBEB] transition-colors cursor-pointer"
            aria-label="Fechar backlog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Banner de Filtros Ativos (se aplicável) */}
        {isFilterActive && (
          <div className="px-5 py-2.5 bg-zinc-50 border-b border-[#E8E9EA] flex items-center justify-between gap-2 text-xs text-[#666668] shrink-0">
            <span className="truncate">
              Exibindo apenas conteúdos que atendem aos filtros ativos.
            </span>
            {onResetFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="text-[#F15A3C] hover:underline font-semibold shrink-0 cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        )}

        {/* 3. Lista de Conteúdos Sem Data / Estado Vazio */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {undatedContents.length > 0 ? (
            undatedContents.map((content) => (
              <CalendarContentCard
                key={content.id}
                content={content}
                onClick={onSelectContent}
                showClientName={showClientName}
                isDraggable={true}
                isMoving={movingContentIds.includes(content.id)}
              />
            ))
          ) : (
            <div
              id="calendar-backlog-empty"
              className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-[#F7F7F8] border border-[#E8E9EA] flex items-center justify-center text-[#8C8D8F]">
                <Inbox className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#1D1D1D]">
                  Nenhum conteúdo sem data
                </p>
                <p className="text-xs text-[#666668] max-w-xs leading-relaxed">
                  {isFilterActive
                    ? 'Todos os conteúdos filtrados possuem uma data planejada no calendário.'
                    : 'Todos os conteúdos cadastrados possuem uma data planejada no calendário.'}
                </p>
              </div>
              {isFilterActive && onResetFilters && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1D1D1D] bg-[#F2F3F3] hover:bg-[#EAEBEB] border border-[#E8E9EA] rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  <FilterX className="w-3.5 h-3.5" />
                  <span>Limpar filtros</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 4. Rodapé Informativo */}
        <div className="p-4 border-t border-[#E8E9EA] bg-[#FAFAFA] text-center shrink-0">
          <p className="text-[11px] text-[#8C8D8F] flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#8C8D8F]" />
            <span>Dica: solte um card sobre um dia do calendário para agendá-lo.</span>
          </p>
        </div>
      </div>
    </div>
  );
};
