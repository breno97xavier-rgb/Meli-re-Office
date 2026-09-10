import React, { useState } from 'react';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { useClientProfile } from '../hooks/useClientProfile';
import { ClientProfileHeader } from '../components/clients/profile/ClientProfileHeader';
import {
  ClientProfileTabs,
  ClientTabKey,
} from '../components/clients/profile/ClientProfileTabs';
import { ClientOverviewSection } from '../components/clients/profile/ClientOverviewSection';
import { ClientContactsSection } from '../components/clients/profile/ClientContactsSection';
import { ClientCommercialSection } from '../components/clients/profile/ClientCommercialSection';
import { ClientContentsSection } from '../components/clients/profile/ClientContentsSection';
import { ClientPresentationsSection } from '../components/clients/profile/ClientPresentationsSection';
import { ClientPlaceholderSection } from '../components/clients/profile/ClientPlaceholderSection';
import { ClientProfileEditModal } from '../components/clients/profile/ClientProfileEditModal';

interface ClientProfilePageProps {
  clientId: string;
  onNavigate: (path: string) => void;
}

export const ClientProfilePage: React.FC<ClientProfilePageProps> = ({
  clientId,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<ClientTabKey>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const {
    client,
    contacts,
    commercialHistory,
    loading,
    error,
    isUpdatingClient,
    updateClientError,
    isContactMutating,
    contactError,
    loadProfile,
    handleUpdateClient,
    handleAddContact,
    handleUpdateContact,
    handleSetPrimaryContact,
    handleDeleteContact,
  } = useClientProfile(clientId);

  const totalCommercialCount =
    commercialHistory.contracts.length +
    commercialHistory.proposals.length +
    commercialHistory.opportunities.length;

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="w-8 h-8 text-[#1D1D1D] animate-spin" />
        <p className="text-xs font-semibold text-[#666668]">
          Carregando perfil do cliente...
        </p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-6">
        <div className="bg-white border border-[#E8E9EA] rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#1D1D1D]">
              Não foi possível carregar o cliente
            </h2>
            <p className="text-xs text-[#666668]">
              {error || 'O cliente solicitado não foi encontrado no sistema.'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('/clientes')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#666668] hover:text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#EDEEEE] rounded-lg transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para Lista de Clientes</span>
            </button>

            <button
              type="button"
              onClick={loadProfile}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1D1D1D] hover:bg-black rounded-lg transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tentar Novamente</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Header do Cliente */}
      <ClientProfileHeader
        client={client}
        onBack={() => onNavigate('/clientes')}
        onOpenEdit={() => setIsEditModalOpen(true)}
      />

      {/* 2. Container das Abas + Conteúdo */}
      <div className="shadow-2xs rounded-2xl">
        {/* Barra de Abas */}
        <ClientProfileTabs
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          contactsCount={contacts.length}
          commercialCount={totalCommercialCount}
        />

        {/* Conteúdo da Aba Ativa */}
        {activeTab === 'overview' && (
          <ClientOverviewSection
            client={client}
            onOpenEdit={() => setIsEditModalOpen(true)}
          />
        )}

        {activeTab === 'contacts' && (
          <ClientContactsSection
            client={client}
            contacts={contacts}
            isMutating={isContactMutating}
            error={contactError}
            onAddContact={handleAddContact}
            onUpdateContact={handleUpdateContact}
            onSetPrimaryContact={handleSetPrimaryContact}
            onDeleteContact={handleDeleteContact}
          />
        )}

        {activeTab === 'commercial' && (
          <ClientCommercialSection
            commercialHistory={commercialHistory}
          />
        )}

        {activeTab === 'contents' && (
          <ClientContentsSection client={client} />
        )}

        {activeTab === 'presentations' && (
          <ClientPresentationsSection client={client} onNavigate={onNavigate} />
        )}

        {activeTab !== 'overview' &&
          activeTab !== 'contacts' &&
          activeTab !== 'commercial' &&
          activeTab !== 'contents' &&
          activeTab !== 'presentations' && (
            <ClientPlaceholderSection tabKey={activeTab} />
          )}
      </div>

      {/* Modal de Edição de Dados do Cliente */}
      <ClientProfileEditModal
        isOpen={isEditModalOpen}
        client={client}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateClient}
        isSaving={isUpdatingClient}
        error={updateClientError}
      />
    </div>
  );
};
