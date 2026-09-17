import React from 'react';
import { Trash2, AlertCircle, Loader2, X } from 'lucide-react';
import { Campaign } from '../../types/planning';

interface DeleteCampaignConfirmModalProps {
  isOpen: boolean;
  campaign: Campaign | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
  errorMessage?: string | null;
}

export const DeleteCampaignConfirmModal: React.FC<DeleteCampaignConfirmModalProps> = ({
  isOpen,
  campaign,
  onClose,
  onConfirm,
  isDeleting,
  errorMessage,
}) => {
  if (!isOpen || !campaign) return null;

  return (
    <div
      id="delete-campaign-confirm-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-campaign-title"
    >
      <div
        className="bg-white border border-[#E8E9EA] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700">
            <Trash2 className="w-5 h-5" />
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 text-[#8C8D8F] hover:text-[#1D1D1D] rounded-lg hover:bg-[#F2F3F3] transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 id="delete-campaign-title" className="text-base font-semibold text-[#1D1D1D]">
            Excluir esta campanha?
          </h3>
          <p className="text-xs text-[#666668] leading-relaxed">
            Esta ação remove definitivamente a campanha <strong className="text-[#1D1D1D]">"{campaign.name}"</strong> e não poderá ser desfeita.
          </p>
          <div className="p-3 bg-[#F7F7F8] border border-[#E8E9EA] rounded-xl flex items-start gap-2.5 text-xs text-[#666668]">
            <AlertCircle className="w-4 h-4 text-[#8C8D8F] shrink-0 mt-0.5" />
            <span>
              Campanhas com conteúdos vinculados não podem ser excluídas. Nesse caso, arquive a campanha para preservar o histórico.
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-medium text-[#666668] hover:text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#E8E9EA] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Excluir definitivamente</span>
          </button>
        </div>
      </div>
    </div>
  );
};
