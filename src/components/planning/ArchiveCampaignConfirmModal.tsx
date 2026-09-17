import React from 'react';
import { Archive, AlertCircle, Loader2, X } from 'lucide-react';
import { Campaign } from '../../types/planning';

interface ArchiveCampaignConfirmModalProps {
  isOpen: boolean;
  campaign: Campaign | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isArchiving: boolean;
}

export const ArchiveCampaignConfirmModal: React.FC<ArchiveCampaignConfirmModalProps> = ({
  isOpen,
  campaign,
  onClose,
  onConfirm,
  isArchiving,
}) => {
  if (!isOpen || !campaign) return null;

  return (
    <div
      id="archive-campaign-confirm-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-campaign-title"
    >
      <div
        className="bg-white border border-[#E8E9EA] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
            <Archive className="w-5 h-5" />
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isArchiving}
            className="p-1 text-[#8C8D8F] hover:text-[#1D1D1D] rounded-lg hover:bg-[#F2F3F3] transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 id="archive-campaign-title" className="text-base font-semibold text-[#1D1D1D]">
            Arquivar esta campanha?
          </h3>
          <p className="text-xs text-[#666668] leading-relaxed">
            A campanha <strong className="text-[#1D1D1D]">"{campaign.name}"</strong> será removida
            da visualização principal, mas seu histórico será preservado e poderá ser consultado
            habilitando "Mostrar arquivadas".
          </p>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isArchiving}
            className="px-4 py-2 text-xs font-medium text-[#666668] hover:text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#E8E9EA] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isArchiving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {isArchiving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Arquivar campanha</span>
          </button>
        </div>
      </div>
    </div>
  );
};
