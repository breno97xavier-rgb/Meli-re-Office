import React, { useState } from 'react';
import { AlertCircle, RefreshCw, Briefcase, Plus } from 'lucide-react';
import { useRouter } from '../hooks/useRouter';
import { useOpportunities } from '../hooks/useOpportunities';
import { createProposalWithItems } from '../services/proposalsService';
import { Opportunity } from '../types/opportunities';
import { CreateProposalInput } from '../types/proposals';
import { CommercialTabs } from '../components/commercial/CommercialTabs';
import { OpportunitiesHeader } from '../components/opportunities/OpportunitiesHeader';
import { OpportunitiesTable } from '../components/opportunities/OpportunitiesTable';
import { OpportunityDetailDrawer } from '../components/opportunities/OpportunityDetailDrawer';
import { CreateOpportunityModal } from '../components/opportunities/CreateOpportunityModal';
import { CreateProposalModal } from '../components/proposals/CreateProposalModal';

export const OpportunitiesPage: React.FC = () => {
  const { navigate } = useRouter();
  const {
    opportunities,
    allOpportunities,
    loading,
    error,
    selectedOpportunity,
    metrics,
    stageFilter,
    setStageFilter,
    isSubmitting,
    submitError,
    isUpdating,
    updateError,
    loadOpportunities,
    handleCreateOpportunity,
    handleUpdateOpportunity,
    handleSelectOpportunity,
  } = useOpportunities();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [proposalOpportunity, setProposalOpportunity] = useState<Opportunity | null>(null);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [proposalSubmitError, setProposalSubmitError] = useState<string | null>(null);

  const handleOpenCreateProposal = (opp: Opportunity) => {
    setProposalOpportunity(opp);
    setProposalSubmitError(null);
    setIsProposalModalOpen(true);
  };

  const handleProposalSubmit = async (input: CreateProposalInput): Promise<boolean> => {
    setIsSubmittingProposal(true);
    setProposalSubmitError(null);
    try {
      await createProposalWithItems(input);
      setIsProposalModalOpen(false);
      handleSelectOpportunity(null);
      navigate('/comercial/propostas');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao criar proposta.';
      setProposalSubmitError(msg);
      return false;
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  return (
    <div id="opportunities-page" className="space-y-6">
      {/* Subnavigation between Leads, Opportunities and Proposals */}
      <div className="flex items-center justify-between">
        <CommercialTabs activeTab="oportunidades" onNavigate={navigate} />
      </div>

      {/* Header with Derived Real Metrics */}
      <OpportunitiesHeader
        metrics={metrics}
        loading={loading}
        onRefresh={loadOpportunities}
        onNewOpportunity={() => setIsCreateModalOpen(true)}
      />

      {/* Error State Banner */}
      {error && (
        <div
          id="opportunities-error-banner"
          className="p-4 bg-red-50 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-medium">
                Não foi possível carregar as oportunidades
              </p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={loadOpportunities}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            <span>Tentar novamente</span>
          </button>
        </div>
      )}

      {/* Empty State when zero opportunities in total */}
      {!loading && !error && allOpportunities.length === 0 && (
        <div
          id="opportunities-empty-state"
          className="bg-white border border-[#E8E9EA] rounded-xl p-12 text-center shadow-xs flex flex-col items-center justify-center max-w-2xl mx-auto my-8"
        >
          <div className="w-12 h-12 rounded-full bg-[#FDF1EE] border border-[#FBC3B8] flex items-center justify-center text-[#F15A3C] mb-4">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#1D1D1D]">
            Nenhuma oportunidade cadastrada
          </h3>
          <p className="text-sm text-[#666668] max-w-md mt-1.5 leading-relaxed">
            Inicie uma nova negociação direta ou crie uma oportunidade a partir de um Lead qualificado.
          </p>
          <button
            id="btn-empty-new-opportunity"
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d94a2e] rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar primeira oportunidade</span>
          </button>
        </div>
      )}

      {/* Opportunities Table */}
      {(loading || allOpportunities.length > 0) && (
        <OpportunitiesTable
          opportunities={opportunities}
          allOpportunities={allOpportunities}
          loading={loading}
          selectedOpportunityId={selectedOpportunity?.id || null}
          stageFilter={stageFilter}
          onSelectStageFilter={setStageFilter}
          onSelectOpportunity={handleSelectOpportunity}
        />
      )}

      {/* Opportunity Detail Drawer */}
      <OpportunityDetailDrawer
        opportunity={selectedOpportunity}
        isOpen={Boolean(selectedOpportunity)}
        isUpdating={isUpdating}
        updateError={updateError}
        onClose={() => handleSelectOpportunity(null)}
        onUpdate={handleUpdateOpportunity}
        onCreateProposal={handleOpenCreateProposal}
      />

      {/* Create Opportunity Modal */}
      <CreateOpportunityModal
        isOpen={isCreateModalOpen}
        isSubmitting={isSubmitting}
        submitError={submitError}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateOpportunity}
      />

      {/* Create Proposal Modal triggered from Opportunity */}
      <CreateProposalModal
        isOpen={isProposalModalOpen}
        initialOpportunity={proposalOpportunity}
        isSubmitting={isSubmittingProposal}
        submitError={proposalSubmitError}
        onClose={() => {
          setIsProposalModalOpen(false);
          setProposalOpportunity(null);
        }}
        onSubmit={handleProposalSubmit}
      />
    </div>
  );
};

