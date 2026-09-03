import React, { useState, useCallback, useEffect } from 'react';
import { CommercialTabs } from '../components/commercial/CommercialTabs';
import { ContractsHeader } from '../components/contracts/ContractsHeader';
import { ContractsTable } from '../components/contracts/ContractsTable';
import { ContractDetailDrawer } from '../components/contracts/ContractDetailDrawer';
import { CreateContractModal } from '../components/contracts/CreateContractModal';
import { useContracts } from '../hooks/useContracts';
import { fetchEligibleProposals } from '../services/contractsService';
import { Proposal } from '../types/proposals';
import { Contract } from '../types/contracts';
import { AlertCircle } from 'lucide-react';

export const ContractsPage: React.FC = () => {
  const {
    contracts,
    allContracts,
    loading,
    error,
    selectedContract,
    statusFilter,
    setStatusFilter,
    metrics,
    isSubmitting,
    submitError,
    isTransitioning,
    transitionError,
    isUpdating,
    updateError,
    loadContracts,
    handleCreateContract,
    handleTransitionStatus,
    handleUpdateContract,
    handleSelectContract,
  } = useContracts();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [eligibleProposals, setEligibleProposals] = useState<Proposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);

  const loadEligibleProposals = useCallback(async () => {
    try {
      setLoadingProposals(true);
      const data = await fetchEligibleProposals();
      setEligibleProposals(data);
    } catch (err) {
      console.error('Error loading eligible proposals for contracts modal:', err);
    } finally {
      setLoadingProposals(false);
    }
  }, []);

  const handleOpenCreateModal = async () => {
    await loadEligibleProposals();
    setIsCreateModalOpen(true);
  };

  const handleContractCreated = (newContract: Contract) => {
    handleSelectContract(newContract);
  };

  return (
    <div className="space-y-6">
      {/* Commercial Subnavigation */}
      <CommercialTabs activeTab="contratos" />

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadContracts}
            className="font-semibold underline hover:text-red-900 cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Header with real metrics & Actions */}
      <ContractsHeader
        metrics={metrics}
        loading={loading}
        onRefresh={loadContracts}
        onNewContract={handleOpenCreateModal}
      />

      {/* Contracts Table */}
      <ContractsTable
        contracts={contracts}
        allContracts={allContracts}
        loading={loading}
        selectedContractId={selectedContract?.id || null}
        statusFilter={statusFilter}
        onSelectStatusFilter={setStatusFilter}
        onSelectContract={handleSelectContract}
      />

      {/* Detail Drawer */}
      <ContractDetailDrawer
        contract={selectedContract}
        isOpen={Boolean(selectedContract)}
        isUpdating={isUpdating}
        updateError={updateError}
        isTransitioning={isTransitioning}
        transitionError={transitionError}
        onClose={() => handleSelectContract(null)}
        onTransitionStatus={handleTransitionStatus}
        onUpdateContract={handleUpdateContract}
      />

      {/* Create Modal */}
      <CreateContractModal
        isOpen={isCreateModalOpen}
        acceptedProposals={eligibleProposals}
        isSubmitting={isSubmitting}
        submitError={submitError}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateContract}
        onSuccess={handleContractCreated}
      />
    </div>
  );
};
