import React from 'react';

interface ProposalScopeSectionProps {
  sectionNumber?: string;
  scopeSummary?: string | null;
}

export const ProposalScopeSection: React.FC<ProposalScopeSectionProps> = ({
  sectionNumber = '02',
  scopeSummary,
}) => {
  if (!scopeSummary || !scopeSummary.trim()) return null;

  return (
    <div className="space-y-6 pt-12 pb-10 border-b border-[#E8E9EA]">
      <div className="space-y-1">
        <span className="text-xs font-mono font-bold text-[#F15A3C] tracking-wider">
          {sectionNumber}
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-[#1D1D1D] tracking-tight uppercase">
          Escopo Geral
        </h2>
      </div>

      <div className="text-sm sm:text-base text-[#1D1D1D] leading-relaxed max-w-3xl whitespace-pre-line font-normal">
        {scopeSummary.trim()}
      </div>
    </div>
  );
};
