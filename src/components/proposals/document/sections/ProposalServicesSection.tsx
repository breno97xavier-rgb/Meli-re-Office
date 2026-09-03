import React from 'react';
import { ProposalItem, ProposalDocumentItem } from '../../../../types/proposals';

interface ProposalServicesSectionProps {
  sectionNumber?: string;
  items?: ProposalItem[];
  documentItems?: ProposalDocumentItem[];
}

export const ProposalServicesSection: React.FC<ProposalServicesSectionProps> = ({
  sectionNumber = '03',
  items = [],
  documentItems = [],
}) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-8 pt-12 pb-10 border-b border-[#E8E9EA]">
      <div className="space-y-1">
        <span className="text-xs font-mono font-bold text-[#F15A3C] tracking-wider">
          {sectionNumber}
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-[#1D1D1D] tracking-tight uppercase">
          Serviços e Entregáveis
        </h2>
      </div>

      <div className="space-y-8">
        {items.map((item, index) => {
          const docItem = documentItems.find(
            (di) => di.proposal_item_id === item.id
          );

          const title = docItem?.display_title?.trim() || item.description;
          const presentationText = docItem?.presentation_text?.trim();
          const deliverables = docItem?.deliverables || [];

          return (
            <div
              key={item.id}
              className="space-y-4 rounded-xl bg-[#FAFAFA] border border-[#E8E9EA] p-6 sm:p-7"
            >
              {/* Item Header */}
              <div className="flex items-start gap-3">
                <span className="text-xs font-mono font-bold text-[#1D1D1D] bg-white border border-[#E8E9EA] w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#1D1D1D] leading-snug">
                  {title}
                </h3>
              </div>

              {/* Presentation Text */}
              {presentationText && (
                <div className="text-xs sm:text-sm text-[#666668] leading-relaxed whitespace-pre-line pl-9">
                  {presentationText}
                </div>
              )}

              {/* Deliverables List */}
              {deliverables.length > 0 && (
                <div className="space-y-2.5 pt-2 pl-9">
                  <span className="text-[11px] font-bold text-[#1D1D1D] uppercase tracking-wider block">
                    Entregáveis inclusos:
                  </span>
                  <ul className="space-y-1.5">
                    {deliverables.map((deliv, delivIdx) => (
                      <li
                        key={delivIdx}
                        className="flex items-start gap-2.5 text-xs sm:text-sm text-[#1D1D1D]"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F15A3C] shrink-0 mt-1.5" />
                        <span>{deliv}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
