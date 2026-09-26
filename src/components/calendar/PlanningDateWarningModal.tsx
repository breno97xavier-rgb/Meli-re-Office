import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Calendar, X } from 'lucide-react';
import { Content } from '../../types/contents';
import { PlanningDateWarning, parseCivilDate, getMonthName } from '../../utils/civilDate';

interface PlanningDateWarningModalProps {
  isOpen: boolean;
  content: Content | null;
  targetDate: string | null;
  warnings: PlanningDateWarning[];
  onConfirm: () => void;
  onCancel: () => void;
  isMoving?: boolean;
}

/**
 * Formata data civil YYYY-MM-DD para exibição amigável: "15 de Setembro de 2026"
 */
function formatDisplayDate(dateStr: string | null): string {
  if (!dateStr) return 'Sem data definida';
  const parsed = parseCivilDate(dateStr);
  if (!parsed) return dateStr;
  const monthName = getMonthName(parsed.month, 'long');
  return `${parsed.day} de ${monthName} de ${parsed.year}`;
}

/**
 * Formata intervalo de datas: "01/09/2026 — 30/09/2026"
 */
function formatPeriod(startDate?: string | null, endDate?: string | null): string {
  if (!startDate && !endDate) return 'Período não definido';
  const formatShort = (str: string) => {
    const p = parseCivilDate(str);
    if (!p) return str;
    const day = String(p.day).padStart(2, '0');
    const month = String(p.month).padStart(2, '0');
    return `${day}/${month}/${p.year}`;
  };

  const startFormatted = startDate ? formatShort(startDate) : 'Início aberto';
  const endFormatted = endDate ? formatShort(endDate) : 'Fim aberto';
  return `${startFormatted} — ${endFormatted}`;
}

export const PlanningDateWarningModal: React.FC<PlanningDateWarningModalProps> = ({
  isOpen,
  content,
  targetDate,
  warnings,
  onConfirm,
  onCancel,
  isMoving = false,
}) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap & Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Auto-focus on cancel button for safety
    setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen || !content) return null;

  const planWarnings = warnings.filter((w) => w.type === 'editorial_plan');
  const campaignWarnings = warnings.filter((w) => w.type === 'campaign');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="warning-modal-title"
      aria-describedby="warning-modal-description"
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full border border-[#E8E9EA] shadow-xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[#F2F3F3] flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="warning-modal-title"
                className="text-base font-bold text-[#1D1D1D] tracking-tight"
              >
                Inconsistência de Período Planejado
              </h3>
              <p className="text-xs text-[#666668] mt-0.5 line-clamp-1">
                Conteúdo: <span className="font-semibold text-[#1D1D1D]">{content.internal_title || 'Sem título'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isMoving}
            className="p-1 text-[#8C8D8F] hover:text-[#1D1D1D] rounded-lg hover:bg-[#F2F3F3] transition-colors cursor-pointer"
            aria-label="Fechar aviso"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-sm text-[#444446]">
          {/* Target Date Box */}
          <div className="p-3 bg-[#F7F7F8] border border-[#E8E9EA] rounded-xl flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-[#8C8D8F] shrink-0" />
            <div className="text-xs">
              <span className="text-[#666668]">Nova data de destino:</span>{' '}
              <span className="font-bold text-[#1D1D1D]">{formatDisplayDate(targetDate)}</span>
            </div>
          </div>

          <p id="warning-modal-description" className="text-xs text-[#666668]">
            A nova data selecionada está fora do período planejado para os seguintes vínculos:
          </p>

          {/* Grouped Warnings List */}
          <div className="space-y-2.5">
            {/* 1. Ciclo Editorial Warnings */}
            {planWarnings.map((warning, idx) => (
              <div
                key={`plan-${idx}`}
                className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-900">
                    • Ciclo: {warning.entityName}
                  </span>
                </div>
                <p className="text-xs text-amber-800/90 pl-3">
                  Período vigente: <span className="font-medium">{formatPeriod(warning.startDate, warning.endDate)}</span>
                </p>
              </div>
            ))}

            {/* 2. Campanha Warnings */}
            {campaignWarnings.map((warning, idx) => (
              <div
                key={`camp-${idx}`}
                className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-900">
                    • Campanha: {warning.entityName}
                  </span>
                </div>
                <p className="text-xs text-amber-800/90 pl-3">
                  Período vigente: <span className="font-medium">{formatPeriod(warning.startDate, warning.endDate)}</span>
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs text-[#666668] pt-1">
            Deseja mover o conteúdo para esta nova data mesmo assim?
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#F7F7F8] border-t border-[#E8E9EA] flex items-center justify-end gap-2.5">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isMoving}
            className="px-4 py-2 text-xs font-semibold text-[#444446] hover:text-[#1D1D1D] bg-white border border-[#D0D1D2] hover:bg-[#F2F3F3] rounded-lg transition-colors cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1D1D1D]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isMoving}
            className="px-4 py-2 text-xs font-bold text-white bg-[#1D1D1D] hover:bg-black rounded-lg transition-colors cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1D1D1D] focus:ring-offset-1 flex items-center gap-1.5 disabled:opacity-50"
          >
            {isMoving ? 'Movendo...' : 'Mover mesmo assim'}
          </button>
        </div>
      </div>
    </div>
  );
};
