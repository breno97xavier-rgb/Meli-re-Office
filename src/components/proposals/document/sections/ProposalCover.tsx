import React from 'react';
import { Proposal } from '../../../../types/proposals';
import { formatDate } from '../../ProposalStatusBadge';

interface ProposalCoverProps {
  proposal: Proposal;
}

export const ProposalCover: React.FC<ProposalCoverProps> = ({ proposal }) => {
  const clientName =
    proposal.opportunity?.lead?.business_name ||
    proposal.opportunity?.lead?.name ||
    'Cliente';

  const contactName =
    proposal.opportunity?.lead?.business_name && proposal.opportunity?.lead?.name
      ? proposal.opportunity.lead.name
      : null;

  return (
    <div className="border-b border-[#E8E9EA] pb-16 pt-8 sm:pt-14 space-y-16">
      {/* Brand Top Header */}
      <div className="flex items-center justify-between gap-4 border-b border-[#E8E9EA] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F15A3C]" />
            <span className="text-sm font-bold tracking-[0.2em] text-[#1D1D1D] uppercase">
              Melière Marketing
            </span>
          </div>
          <p className="text-[11px] text-[#666668] tracking-wide pl-4.5">
            Entender. Estruturar. Comunicar. Acompanhar.
          </p>
        </div>

        <div className="text-right">
          <span className="inline-block text-[11px] font-mono font-semibold text-[#666668] bg-[#F7F7F8] border border-[#E8E9EA] px-2.5 py-1 rounded">
            v{proposal.version}
          </span>
        </div>
      </div>

      {/* Main Cover Title & Lead */}
      <div className="space-y-6 pt-4">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#F15A3C] tracking-widest uppercase">
          <span>Proposta Comercial</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1D1D1D] tracking-tight leading-[1.15] max-w-2xl">
          {proposal.title}
        </h1>
      </div>

      {/* Meta Information Grid (Client & Issuing Details) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 border-t border-[#E8E9EA]">
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-[#9E9EA0] uppercase tracking-wider block">
            Apresentado a
          </span>
          <div className="text-base font-bold text-[#1D1D1D]">
            {clientName}
          </div>
          {contactName && (
            <div className="text-xs text-[#666668]">
              Aos cuidados de: <span className="font-medium text-[#1D1D1D]">{contactName}</span>
            </div>
          )}
        </div>

        <div className="space-y-1.5 sm:text-right">
          <span className="text-[11px] font-bold text-[#9E9EA0] uppercase tracking-wider block">
            Data de Emissão
          </span>
          <div className="text-sm font-semibold text-[#1D1D1D]">
            {formatDate(proposal.created_at)}
          </div>
          {proposal.valid_until && (
            <div className="text-xs text-[#666668]">
              Válida até: <span className="font-medium text-[#1D1D1D]">{formatDate(proposal.valid_until)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
