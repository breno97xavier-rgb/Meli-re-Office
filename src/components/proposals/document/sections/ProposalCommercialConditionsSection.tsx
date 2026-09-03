import React from 'react';
import { Proposal } from '../../../../types/proposals';
import { formatDate } from '../../ProposalStatusBadge';

interface ProposalCommercialConditionsSectionProps {
  sectionNumber?: string;
  proposal: Proposal;
}

export const ProposalCommercialConditionsSection: React.FC<ProposalCommercialConditionsSectionProps> = ({
  sectionNumber = '05',
  proposal,
}) => {
  const hasValidity = Boolean(proposal.valid_until);
  const hasTerms = Boolean(proposal.terms && proposal.terms.trim());

  if (!hasValidity && !hasTerms) return null;

  return (
    <div className="space-y-6 pt-12 pb-10 border-b border-[#E8E9EA]">
      <div className="space-y-1">
        <span className="text-xs font-mono font-bold text-[#F15A3C] tracking-wider">
          {sectionNumber}
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-[#1D1D1D] tracking-tight uppercase">
          Condições Comerciais
        </h2>
      </div>

      <div className="space-y-6">
        {hasValidity && (
          <div className="bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-[#1D1D1D] uppercase tracking-wider">
              Validade da Proposta
            </span>
            <span className="text-sm font-semibold text-[#1D1D1D]">
              Esta proposta é válida até {formatDate(proposal.valid_until)}
            </span>
          </div>
        )}

        {hasTerms && proposal.terms && (
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider block">
              Termos e Condições
            </span>
            <div className="text-xs sm:text-sm text-[#666668] leading-relaxed whitespace-pre-line bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl p-5">
              {proposal.terms.trim()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
