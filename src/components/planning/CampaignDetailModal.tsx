import React from 'react';
import {
  X,
  Calendar,
  Target,
  FileText,
  Edit3,
  Archive,
  Trash2,
  Play,
  CheckCircle2,
  Loader2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Campaign, CampaignStatus } from '../../types/planning';
import {
  formatCampaignPeriod,
  formatDateBR,
  getCampaignStatusLabel,
  getCampaignStatusBadgeClass,
} from '../../utils/planningFormatters';

interface CampaignDetailModalProps {
  isOpen: boolean;
  campaign: Campaign | null;
  onClose: () => void;
  onEdit: (campaign: Campaign) => void;
  onSetStatus: (campaignId: string, status: CampaignStatus) => Promise<boolean>;
  onRequestArchive: (campaign: Campaign) => void;
  onRequestDelete: (campaign: Campaign) => void;
  mutating?: boolean;
}

export const CampaignDetailModal: React.FC<CampaignDetailModalProps> = ({
  isOpen,
  campaign,
  onClose,
  onEdit,
  onSetStatus,
  onRequestArchive,
  onRequestDelete,
  mutating = false,
}) => {
  if (!isOpen || !campaign) return null;

  const isArchived = campaign.status === 'archived';
  const hasDates = Boolean(campaign.start_date || campaign.end_date);

  const handleStatusTransition = async (newStatus: CampaignStatus) => {
    if (mutating) return;
    await onSetStatus(campaign.id, newStatus);
  };

  return (
    <div
      id="campaign-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="campaign-detail-title"
    >
      <div
        className="bg-white border border-[#E8E9EA] rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#E8E9EA] gap-4 bg-[#FAFAFA]">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 text-xs font-medium rounded-md border ${getCampaignStatusBadgeClass(
                  campaign.status
                )}`}
              >
                {getCampaignStatusLabel(campaign.status)}
              </span>
              <span className="text-xs text-[#8C8D8F]">• Iniciativa Estratégica</span>
            </div>
            <h2
              id="campaign-detail-title"
              className="text-lg font-bold text-[#1D1D1D] leading-snug break-words"
            >
              {campaign.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#8C8D8F] hover:text-[#1D1D1D] rounded-lg hover:bg-[#E8E9EA] transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Action Bar / Contextual Operations */}
        <div className="px-6 py-3 bg-white border-b border-[#E8E9EA] flex flex-wrap items-center justify-between gap-3">
          {/* Status Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {campaign.status === 'draft' && (
              <button
                type="button"
                onClick={() => handleStatusTransition('active')}
                disabled={mutating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {mutating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-emerald-700 text-emerald-700" />
                )}
                <span>Ativar campanha</span>
              </button>
            )}

            {campaign.status === 'active' && (
              <button
                type="button"
                onClick={() => handleStatusTransition('completed')}
                disabled={mutating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {mutating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                )}
                <span>Concluir campanha</span>
              </button>
            )}

            {!isArchived && (
              <button
                type="button"
                onClick={() => onRequestArchive(campaign)}
                disabled={mutating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#666668] hover:text-amber-800 hover:bg-amber-50 border border-[#E8E9EA] hover:border-amber-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Arquivar</span>
              </button>
            )}
          </div>

          {/* Secondary / Edit Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onRequestDelete(campaign)}
              disabled={mutating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#8C8D8F] hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="Excluir campanha definitivamente"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>
            <button
              type="button"
              onClick={() => onEdit(campaign)}
              disabled={mutating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#E8E9EA] border border-[#E8E9EA] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#8C8D8F]" />
              <span>Editar dados</span>
            </button>
          </div>
        </div>

        {/* 3. Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Period Card */}
          <div className="p-4 bg-[#F7F7F8] border border-[#E8E9EA] rounded-xl flex items-start gap-3.5">
            <div className="p-2 bg-white border border-[#E8E9EA] rounded-lg text-[#1D1D1D] shrink-0">
              <Calendar className="w-4 h-4 text-[#1D1D1D]" />
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-[#1D1D1D] block">Período de Execução</span>
              <p
                className={`text-xs ${
                  hasDates ? 'text-[#4D4D4F] font-medium' : 'text-[#8C8D8F] italic'
                }`}
              >
                {formatCampaignPeriod(campaign.start_date, campaign.end_date)}
              </p>
            </div>
          </div>

          {/* Objective Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1D1D1D]">
              <Target className="w-4 h-4 text-[#F3705A]" />
              <span>Objetivo da Campanha</span>
            </div>
            <div className="p-4 bg-white border border-[#E8E9EA] rounded-xl">
              {campaign.objective ? (
                <p className="text-xs text-[#1D1D1D] leading-relaxed whitespace-pre-wrap">
                  {campaign.objective}
                </p>
              ) : (
                <p className="text-xs text-[#A0A0A3] italic">
                  Nenhum objetivo cadastrado para esta campanha.
                </p>
              )}
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1D1D1D]">
              <FileText className="w-4 h-4 text-[#8C8D8F]" />
              <span>Observações e Alinhamentos</span>
            </div>
            <div className="p-4 bg-white border border-[#E8E9EA] rounded-xl">
              {campaign.notes ? (
                <p className="text-xs text-[#1D1D1D] leading-relaxed whitespace-pre-wrap">
                  {campaign.notes}
                </p>
              ) : (
                <p className="text-xs text-[#A0A0A3] italic">
                  Nenhuma observação registrada.
                </p>
              )}
            </div>
          </div>

          {/* Metadata Footer */}
          <div className="pt-4 border-t border-[#F2F3F3] flex flex-wrap items-center justify-between text-[11px] text-[#8C8D8F] gap-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Criada em {formatDateBR(campaign.created_at?.split('T')[0])}
              </span>
            </div>
            {campaign.updated_at && (
              <span>
                Última atualização: {formatDateBR(campaign.updated_at?.split('T')[0])}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
