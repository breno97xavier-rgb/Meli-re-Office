import React from 'react';
import { Calendar, ChevronRight, Target, FileText } from 'lucide-react';
import { Campaign } from '../../types/planning';
import {
  formatCampaignPeriod,
  getCampaignStatusLabel,
  getCampaignStatusBadgeClass,
} from '../../utils/planningFormatters';

interface CampaignCardProps {
  campaign: Campaign;
  onClick: () => void;
}

export const CampaignCard: React.FC<CampaignCardProps> = ({ campaign, onClick }) => {
  const isArchived = campaign.status === 'archived';
  const hasDates = Boolean(campaign.start_date || campaign.end_date);

  return (
    <div
      id={`campaign-card-${campaign.id}`}
      onClick={onClick}
      className={`group relative bg-white border rounded-xl p-4 md:p-5 transition-all duration-150 cursor-pointer flex flex-col justify-between gap-4 ${
        isArchived
          ? 'border-[#E8E9EA] bg-[#FAFAFA]/80 opacity-80 hover:border-[#D0D1D2] hover:opacity-100'
          : 'border-[#E8E9EA] hover:border-[#1D1D1D] hover:shadow-xs'
      }`}
    >
      {/* 1. Header: Period, Name & Status */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2.5">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-[#8C8D8F]">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span
                className={`font-medium truncate ${
                  hasDates ? 'text-[#666668]' : 'text-[#A0A0A3] italic'
                }`}
              >
                {formatCampaignPeriod(campaign.start_date, campaign.end_date)}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-[#1D1D1D] group-hover:text-[#F3705A] transition-colors leading-snug line-clamp-2">
              {campaign.name}
            </h3>
          </div>

          <div className="shrink-0 flex items-center gap-1.5">
            <span
              className={`px-2 py-0.5 text-[10px] font-medium rounded-md border ${getCampaignStatusBadgeClass(
                campaign.status
              )}`}
            >
              {getCampaignStatusLabel(campaign.status)}
            </span>
            <div className="text-[#8C8D8F] group-hover:text-[#1D1D1D] transition-transform group-hover:translate-x-0.5">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Objective */}
        {campaign.objective ? (
          <div className="space-y-0.5 pt-0.5">
            <p className="text-xs text-[#666668] line-clamp-2 leading-relaxed">
              <strong className="font-medium text-[#4D4D4F]">Objetivo: </strong>
              {campaign.objective}
            </p>
          </div>
        ) : (
          <p className="text-xs text-[#A0A0A3] italic pt-0.5">Sem objetivo definido</p>
        )}
      </div>

      {/* 2. Footer: Notes indicator or Metadata */}
      <div className="pt-3 border-t border-[#F2F3F3] flex items-center justify-between text-[11px] text-[#8C8D8F]">
        <div className="flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-[#8C8D8F]" />
          <span>Iniciativa de marca</span>
        </div>

        {campaign.notes && (
          <div className="flex items-center gap-1 text-[#666668]" title={campaign.notes}>
            <FileText className="w-3 h-3 text-[#8C8D8F]" />
            <span className="truncate max-w-[140px]">Com observações</span>
          </div>
        )}
      </div>
    </div>
  );
};
