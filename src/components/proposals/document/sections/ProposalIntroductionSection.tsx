import React from 'react';

interface ProposalIntroductionSectionProps {
  sectionNumber?: string;
  introduction?: string | null;
}

export const ProposalIntroductionSection: React.FC<ProposalIntroductionSectionProps> = ({
  sectionNumber = '01',
  introduction,
}) => {
  if (!introduction || !introduction.trim()) return null;

  return (
    <div className="space-y-6 pt-12 pb-10 border-b border-[#E8E9EA]">
      <div className="space-y-1">
        <span className="text-xs font-mono font-bold text-[#F15A3C] tracking-wider">
          {sectionNumber}
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-[#1D1D1D] tracking-tight uppercase">
          Introdução e Contexto
        </h2>
      </div>

      <div className="text-sm sm:text-base text-[#1D1D1D] leading-relaxed max-w-3xl whitespace-pre-line font-normal">
        {introduction.trim()}
      </div>
    </div>
  );
};
