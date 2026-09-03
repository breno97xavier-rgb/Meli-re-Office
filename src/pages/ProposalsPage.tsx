import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, FileText, Plus } from 'lucide-react';
import { useRouter } from '../hooks/useRouter';
import { useProposals } from '../hooks/useProposals';
import { fetchOpportunities } from '../services/opportunitiesService';
import { Opportunity } from '../types/opportunities';
import { CommercialTabs } from '../components/commercial/CommercialTabs';
import { ProposalsHeader } from '../components/proposals/ProposalsHeader';
import { ProposalsTable } from '../components/proposals/ProposalsTable';
import { ProposalDetailDrawer } from '../components/proposals/ProposalDetailDrawer';
import { CreateProposalModal } from '../components/proposals/CreateProposalModal';

export const ProposalsPage: React.FC = () => {
  const { navigate } = useRouter();
  const {
    proposals,
    allProposals,
    loading,
    error,
    selectedProposal,
    statusFilter,
    setStatusFilter,
    metrics,
    isSubmitting,
    submitError,
    isUpdating,
    updateError,
    loadProposals,
    handleCreateProposal,
    handleUpdateStatus,
    handleSelectProposal,
  } = useProposals();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  // Load available opportunities for the creation modal
  useEffect(() => {
    let isMounted = true;
    async function loadOpps() {
      try {
        const opps = await fetchOpportunities();
        if (isMounted) {
          setOpportunities(opps);
        }
      } catch (err) {
        console.error('Error loading opportunities for proposal modal:', err);
      }
    }
    loadOpps();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div id="proposals-page" className="space-y-6">
      {/* Subnavigation across Commercial */}
      <div className="flex items-center justify-between">
        <CommercialTabs activeTab="propostas" onNavigate={navigate} />
      </div>

      {/* Header with Derived Real Metrics */}
      <ProposalsHeader
        metrics={metrics}
        loading={loading}
        onRefresh={loadProposals}
        onNewProposal={() => setIsCreateModalOpen(true)}
      />

      {/* Error State Banner */}
      {error && (
        <div
          id="proposals-error-banner"
          className="p-4 bg-red-50 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-medium">
                Não foi possível carregar as propostas
              </p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={loadProposals}
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

      {/* Empty State when 0 proposals exist */}
      {!loading && !error && allProposals.length === 0 && (
        <div
          id="proposals-empty-state"
          className="bg-white border border-[#E8E9EA] rounded-xl p-12 text-center shadow-xs flex flex-col items-center justify-center max-w-2xl mx-auto my-8"
        >
          <div className="w-12 h-12 rounded-full bg-[#FDF1EE] border border-[#FBC3B8] flex items-center justify-center text-[#F15A3C] mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#1D1D1D]">
            Nenhuma proposta cadastrada
          </h3>
          <p className="text-sm text-[#666668] max-w-md mt-1.5 leading-relaxed">
            Crie uma proposta comercial formal para uma oportunidade aberta e defina seus itens de serviço.
          </p>
          <button
            id="btn-empty-new-proposal"
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d94a2e] rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Criar primeira proposta</span>
          </button>
        </div>
      )}

      {/* Proposals Table */}
      {(loading || allProposals.length > 0) && (
        <ProposalsTable
          proposals={proposals}
          allProposals={allProposals}
          loading={loading}
          selectedProposalId={selectedProposal?.id || null}
          statusFilter={statusFilter}
          onSelectStatusFilter={setStatusFilter}
          onSelectProposal={handleSelectProposal}
        />
      )}

      {/* Proposal Detail Drawer */}
      <ProposalDetailDrawer
        proposal={selectedProposal}
        isOpen={Boolean(selectedProposal)}
        isUpdating={isUpdating}
        updateError={updateError}
        onClose={() => handleSelectProposal(null)}
        onUpdateStatus={handleUpdateStatus}
        onProposalUpdated={loadProposals}
      />

      {/* Create Proposal Modal */}
      <CreateProposalModal
        isOpen={isCreateModalOpen}
        opportunities={opportunities}
        isSubmitting={isSubmitting}
        submitError={submitError}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProposal}
      />
    </div>
  );
};
