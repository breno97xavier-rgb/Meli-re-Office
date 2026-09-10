import React, { useState } from 'react';
import {
  FileText,
  Plus,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Client } from '../../../types/clients';
import { useContents } from '../../../hooks/useContents';
import { ContentFiltersBar } from '../../contents/ContentFiltersBar';
import { ContentsTable } from '../../contents/ContentsTable';
import { CreateContentModal } from '../../contents/CreateContentModal';
import { ContentDetailDrawer } from '../../contents/ContentDetailDrawer';
import { ContentMetricsCards } from '../../contents/ContentMetricsCards';

interface ClientContentsSectionProps {
  client: Client;
}

export const ClientContentsSection: React.FC<ClientContentsSectionProps> = ({
  client,
}) => {
  const {
    contents,
    allContents,
    clients,
    teamProfiles,
    loading,
    error,
    metrics,
    selectedContent,
    formatFilter,
    setFormatFilter,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    isFilterActive,
    resetFilters,
    isCreating,
    createError,
    isUpdating,
    updateError,
    loadContents,
    handleCreateContent,
    handleUpdateContent,
    handleUpdateStatus,
    handleSelectContent,
  } = useContents({ initialClientId: client.id });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="p-6 md:p-8 bg-white rounded-b-2xl border-x border-b border-[#E8E9EA] space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E9EA]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#1D1D1D]">
              Grade Editorial do Cliente
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#F2F3F3] text-[#666668]">
              {allContents.length} {allContents.length === 1 ? 'peça' : 'peças'}
            </span>
          </div>
          <p className="text-xs text-[#666668]">
            Planejamento de publicações, formatos, redação e aprovações para{' '}
            <strong className="text-[#1D1D1D]">
              {client.commercial_name || client.name}
            </strong>
            .
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadContents}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#666668] bg-[#F7F7F8] hover:bg-[#EDEEEE] hover:text-[#1D1D1D] rounded-lg transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d94a2e] rounded-lg transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Conteúdo</span>
          </button>
        </div>
      </div>

      {/* Mini Metrics */}
      <ContentMetricsCards metrics={metrics} />

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadContents}
            className="font-semibold underline hover:text-red-900"
          >
            Recarregar
          </button>
        </div>
      )}

      {/* Filters (Client Filter is hidden since it's already scoped) */}
      <ContentFiltersBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        clients={clients}
        selectedClientId={client.id}
        onClientChange={() => {}}
        formatFilter={formatFilter}
        onFormatChange={setFormatFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        isFilterActive={isFilterActive}
        onResetFilters={resetFilters}
        totalFiltered={contents.length}
        hideClientFilter={true}
      />

      {/* Contents Table */}
      <ContentsTable
        contents={contents}
        loading={loading}
        onSelectContent={handleSelectContent}
        onNewContent={() => setIsCreateModalOpen(true)}
        isFiltered={isFilterActive}
        onResetFilters={resetFilters}
        hideClientColumn={true}
      />

      {/* Modal de Criação */}
      <CreateContentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateContent}
        clients={clients}
        teamProfiles={teamProfiles}
        initialClientId={client.id}
        isSaving={isCreating}
        error={createError}
      />

      {/* Drawer de Detalhe / Editor */}
      <ContentDetailDrawer
        content={selectedContent}
        isOpen={Boolean(selectedContent)}
        onClose={() => handleSelectContent(null)}
        onSave={handleUpdateContent}
        onUpdateStatus={handleUpdateStatus}
        teamProfiles={teamProfiles}
        clients={clients}
        isSaving={isUpdating}
        error={updateError}
      />
    </div>
  );
};
