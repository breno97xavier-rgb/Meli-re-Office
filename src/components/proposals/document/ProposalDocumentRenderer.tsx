import React from 'react';
import { Proposal, ProposalDocument } from '../../../types/proposals';
import { ProposalCover } from './sections/ProposalCover';
import { ProposalIntroductionSection } from './sections/ProposalIntroductionSection';
import { ProposalScopeSection } from './sections/ProposalScopeSection';
import { ProposalServicesSection } from './sections/ProposalServicesSection';
import { ProposalInvestmentSection } from './sections/ProposalInvestmentSection';
import { ProposalCommercialConditionsSection } from './sections/ProposalCommercialConditionsSection';
import { ProposalNotesSection } from './sections/ProposalNotesSection';
import { ProposalClosingSection } from './sections/ProposalClosingSection';

interface ProposalDocumentRendererProps {
  proposal: Proposal;
  document: ProposalDocument | null;
}

export const ProposalDocumentRenderer: React.FC<ProposalDocumentRendererProps> = ({
  proposal,
  document,
}) => {
  // Dynamically calculate section numbers for sequentially rendered sections
  let currentSectionCounter = 1;

  const getNextSectionNumber = () => {
    const numStr = String(currentSectionCounter).padStart(2, '0');
    currentSectionCounter += 1;
    return numStr;
  };

  const hasIntroduction = Boolean(document?.introduction?.trim());
  const introNumber = hasIntroduction ? getNextSectionNumber() : undefined;

  const hasScope = Boolean(document?.scope_summary?.trim());
  const scopeNumber = hasScope ? getNextSectionNumber() : undefined;

  const hasServices = Boolean(proposal.items && proposal.items.length > 0);
  const servicesNumber = hasServices ? getNextSectionNumber() : undefined;

  const hasInvestment = Boolean(proposal.items && proposal.items.length > 0);
  const investmentNumber = hasInvestment ? getNextSectionNumber() : undefined;

  const hasCommercialConditions = Boolean(
    proposal.valid_until || (proposal.terms && proposal.terms.trim())
  );
  const conditionsNumber = hasCommercialConditions
    ? getNextSectionNumber()
    : undefined;

  const hasNotes = Boolean(proposal.notes && proposal.notes.trim());
  const notesNumber = hasNotes ? getNextSectionNumber() : undefined;

  const hasClosingText = Boolean(document?.closing_text?.trim());
  const closingNumber = hasClosingText ? getNextSectionNumber() : undefined;

  return (
    <div
      id="proposal-document-sheet"
      className="w-full max-w-4xl mx-auto bg-white text-[#1D1D1D] shadow-sm border border-[#E8E9EA] p-6 sm:p-12 md:p-16 transition-all font-sans"
    >
      {/* 01. Capa Editorial */}
      <ProposalCover proposal={proposal} />

      {/* 02. Introdução / Contexto */}
      {hasIntroduction && (
        <ProposalIntroductionSection
          sectionNumber={introNumber}
          introduction={document?.introduction}
        />
      )}

      {/* 03. Escopo Geral */}
      {hasScope && (
        <ProposalScopeSection
          sectionNumber={scopeNumber}
          scopeSummary={document?.scope_summary}
        />
      )}

      {/* 04. Serviços e Entregáveis */}
      {hasServices && (
        <ProposalServicesSection
          sectionNumber={servicesNumber}
          items={proposal.items}
          documentItems={document?.items}
        />
      )}

      {/* 05. Investimento (Recorrente e Pontual separados) */}
      {hasInvestment && (
        <ProposalInvestmentSection
          sectionNumber={investmentNumber}
          items={proposal.items}
        />
      )}

      {/* 06. Condições Comerciais */}
      {hasCommercialConditions && (
        <ProposalCommercialConditionsSection
          sectionNumber={conditionsNumber}
          proposal={proposal}
        />
      )}

      {/* 07. Observações */}
      {hasNotes && (
        <ProposalNotesSection
          sectionNumber={notesNumber}
          notes={proposal.notes}
        />
      )}

      {/* 08. Encerramento & Assinatura Institucional */}
      <ProposalClosingSection
        sectionNumber={closingNumber}
        closingText={document?.closing_text}
      />
    </div>
  );
};
