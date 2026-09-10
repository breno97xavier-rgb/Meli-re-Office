import React, { useState } from 'react';
import { usePresentations } from '../hooks/usePresentations';
import { useRouter } from '../hooks/useRouter';
import { PresentationsHeader } from '../components/presentations/PresentationsHeader';
import { PresentationFiltersBar } from '../components/presentations/PresentationFiltersBar';
import { PresentationsTable } from '../components/presentations/PresentationsTable';
import { CreatePresentationModal } from '../components/presentations/CreatePresentationModal';
import { AlertCircle } from 'lucide-react';

export const PresentationsPage: React.FC = () => {
  const {
    presentations,
    clients,
    loading,
    error,
    metrics,
    clientIdFilter,
    setClientIdFilter,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    isFilterActive,
    resetFilters,
    isCreating,
    createError,
    loadData,
    handleCreatePresentation,
  } = usePresentations();

  const { navigate } = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleOpenPresentation = (id: string) => {
    navigate(`/apresentacoes/${id}`);
  };

  const handleCreateAndNavigate = async (input: Parameters<typeof handleCreatePresentation>[0]) => {
    const created = await handleCreatePresentation(input);
    setIsCreateModalOpen(false);
    navigate(`/apresentacoes/${created.id}`);
    return created;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Top Header & Metrics */}
      <PresentationsHeader
        metrics={metrics}
        loading={loading}
        onRefresh={loadData}
        onNewPresentation={() => setIsCreateModalOpen(true)}
      />

      {/* Global Error Notice if any */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="underline font-bold hover:text-red-900 cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <PresentationFiltersBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        clients={clients}
        selectedClientId={clientIdFilter}
        onClientChange={setClientIdFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        isFilterActive={isFilterActive}
        onResetFilters={resetFilters}
        totalFiltered={presentations.length}
      />

      {/* Presentations Table / List */}
      <PresentationsTable
        presentations={presentations}
        loading={loading}
        onOpenPresentation={handleOpenPresentation}
        onNewPresentation={() => setIsCreateModalOpen(true)}
      />

      {/* Create Presentation Modal */}
      <CreatePresentationModal
        isOpen={isCreateModalOpen}
        clients={clients}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateAndNavigate}
        isSubmitting={isCreating}
        error={createError}
      />
    </div>
  );
};
