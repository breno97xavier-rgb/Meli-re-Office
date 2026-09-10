import React, { useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useContents } from '../hooks/useContents';
import { ContentsHeader } from '../components/contents/ContentsHeader';
import { ContentFiltersBar } from '../components/contents/ContentFiltersBar';
import { ContentsTable } from '../components/contents/ContentsTable';
import { CreateContentModal } from '../components/contents/CreateContentModal';
import { ContentDetailDrawer } from '../components/contents/ContentDetailDrawer';

export const ContentsPage: React.FC = () => {
  const {
    contents,
    allContents,
    clients,
    teamProfiles,
    loading,
    error,
    metrics,
    selectedContent,
    clientIdFilter,
    setClientIdFilter,
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
  } = useContents();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div id="contents-page" className="p-6 md:p-8 space-y-6">
      {/* 1. Header with Metrics & Primary Action */}
      <ContentsHeader
        metrics={metrics}
        loading={loading}
        onRefresh={loadContents}
        onNewContent={() => setIsCreateModalOpen(true)}
      />

      {/* 2. Error Banner */}
      {error && (
        <div
          id="contents-error-banner"
          className="p-4 bg-red-50 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-medium">
                Não foi possível carregar os conteúdos
              </p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={loadContents}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Tentar novamente</span>
          </button>
        </div>
      )}

      {/* 3. Filters & Search Bar */}
      <ContentFiltersBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        clients={clients}
        selectedClientId={clientIdFilter}
        onClientChange={setClientIdFilter}
        formatFilter={formatFilter}
        onFormatChange={setFormatFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        isFilterActive={isFilterActive}
        onResetFilters={resetFilters}
        totalFiltered={contents.length}
      />

      {/* 4. Editorial Contents Table */}
      <ContentsTable
        contents={contents}
        loading={loading}
        onSelectContent={handleSelectContent}
        onNewContent={() => setIsCreateModalOpen(true)}
        isFiltered={isFilterActive}
        onResetFilters={resetFilters}
      />

      {/* 5. Create Content Modal */}
      <CreateContentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateContent}
        clients={clients}
        teamProfiles={teamProfiles}
        isSaving={isCreating}
        error={createError}
      />

      {/* 6. Content Detail & Editor Drawer */}
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
