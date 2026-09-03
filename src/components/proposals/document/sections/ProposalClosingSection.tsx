import React from 'react';

interface ProposalClosingSectionProps {
  sectionNumber?: string;
  closingText?: string | null;
}

export const ProposalClosingSection: React.FC<ProposalClosingSectionProps> = ({
  sectionNumber = '07',
  closingText,
}) => {
  return (
    <div className="space-y-12 pt-12 pb-14">
      {/* Optional Editorial Closing Text */}
      {closingText && closingText.trim() && (
        <div className="space-y-6 border-b border-[#E8E9EA] pb-10">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold text-[#F15A3C] tracking-wider">
              {sectionNumber}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1D1D1D] tracking-tight uppercase">
              Considerações Finais
            </h2>
          </div>

          <div className="text-sm sm:text-base text-[#1D1D1D] leading-relaxed max-w-3xl whitespace-pre-line font-normal">
            {closingText.trim()}
          </div>
        </div>
      )}

      {/* Institutional Signoff & Brand Anchor */}
      <div className="pt-6 flex flex-col sm:flex-row sm:items-end justify-between gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F15A3C]" />
            <span className="text-sm font-bold tracking-[0.2em] text-[#1D1D1D] uppercase">
              Melière Marketing
            </span>
          </div>
          <p className="text-xs text-[#666668] tracking-wide leading-relaxed">
            Entender. Estruturar. Comunicar. Acompanhar.
          </p>
        </div>

        <div className="text-left sm:text-right space-y-1">
          <span className="text-[11px] font-bold text-[#9E9EA0] uppercase tracking-wider block">
            Melière Office
          </span>
          <span className="text-xs text-[#666668]">
            Documento gerado em conformidade comercial
          </span>
        </div>
      </div>
    </div>
  );
};
