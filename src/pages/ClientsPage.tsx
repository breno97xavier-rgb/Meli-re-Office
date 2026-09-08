import React from 'react';
import { AlertCircle } from 'lucide-react';
import { ClientsHeader } from '../components/clients/ClientsHeader';
import { ClientsTable } from '../components/clients/ClientsTable';
import { ClientDetailDrawer } from '../components/clients/ClientDetailDrawer';
import { useClients } from '../hooks/useClients';

export const ClientsPage: React.FC = () => {
  const {
    clients,
    allClients,
    loading,
    error,
    selectedClient,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    metrics,
    isUpdating,
    updateError,
    loadClients,
    handleSelectClient,
    handleUpdateClient,
  } = useClients();

  return (
    <div id="clients-page" className="p-6 md:p-8 space-y-6">
      {/* Error Alert Banner */}
      {error && (
        <div
          id="clients-error-banner"
          className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700 shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadClients}
            className="font-semibold underline hover:text-red-900 cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Header with real metrics & Refresh */}
      <ClientsHeader
        metrics={metrics}
        loading={loading}
        onRefresh={loadClients}
      />

      {/* Clients Table with Filter Tabs & Search */}
      <ClientsTable
        clients={clients}
        allClients={allClients}
        loading={loading}
        selectedClientId={selectedClient?.id || null}
        statusFilter={statusFilter}
        onSelectStatusFilter={setStatusFilter}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSelectClient={handleSelectClient}
      />

      {/* Client Detail / Basic Management Drawer */}
      <ClientDetailDrawer
        client={selectedClient}
        isOpen={Boolean(selectedClient)}
        isUpdating={isUpdating}
        updateError={updateError}
        onClose={() => handleSelectClient(null)}
        onUpdateClient={handleUpdateClient}
      />
    </div>
  );
};
