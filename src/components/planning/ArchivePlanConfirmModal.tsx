import React from 'react';
import { Archive, Loader2, X } from 'lucide-react';

interface ArchivePlanConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  planTitle: string;
  onConfirm: () => Promise<void>;
  isArchiving: boolean;
}

export const ArchivePlanConfirmModal: React.FC<ArchivePlanConfirmModalProps> = ({
  isOpen,
  onClose,
  planTitle,
  onConfirm,
  isArchiving,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="archive-plan-confirm-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-white border border-[#E8E9EA] rounded-2xl p-5 shadow-xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
              <Archive className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[#1D1D1D]">Arquivar este ciclo?</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isArchiving}
            className="p-1.5 text-[#8C8D8F] hover:text-[#1D1D1D] rounded-lg hover:bg-[#F2F3F3] transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <div className="space-y-2 text-xs text-[#666668] leading-relaxed">
          <p>
            Você está prestes a arquivar o ciclo{' '}
            <strong className="text-[#1D1D1D]">"{planTitle}"</strong>.
          </p>
          <p className="text-[#8C8D8F]">
            O ciclo será removido da visualização principal, mas seu histórico de metas e distribuição por pilares será preservado.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#F2F3F3]">
          <button
            type="button"
            onClick={onClose}
            disabled={isArchiving}
            className="px-3.5 py-2 text-xs font-medium text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isArchiving}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            {isArchiving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Arquivar ciclo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
