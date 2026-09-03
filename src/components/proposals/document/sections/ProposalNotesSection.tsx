import React from 'react';

interface ProposalNotesSectionProps {
  sectionNumber?: string;
  notes?: string | null;
}

export const ProposalNotesSection: React.FC<ProposalNotesSectionProps> = ({
  sectionNumber = '06',
  notes,
}) => {
  if (!notes || !notes.trim()) return null;

  return (
    <div className="space-y-6 pt-12 pb-10 border-b border-[#E8E9EA]">
      <div className="space-y-1">
        <span className="text-xs font-mono font-bold text-[#F15A3C] tracking-wider">
          {sectionNumber}
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-[#1D1D1D] tracking-tight uppercase">
          Observações Gerais
        </h2>
      </div>

      <div className="text-xs sm:text-sm text-[#666668] leading-relaxed whitespace-pre-line bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl p-5">
        {notes.trim()}
      </div>
    </div>
  );
};
