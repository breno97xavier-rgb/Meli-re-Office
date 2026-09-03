import React, { useState } from 'react';
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react';
import { useRouter } from '../hooks/useRouter';
import { useLeads } from '../hooks/useLeads';
import { CommercialTabs } from '../components/commercial/CommercialTabs';
import { LeadsHeader } from '../components/leads/LeadsHeader';
import { LeadsTable } from '../components/leads/LeadsTable';
import { LeadDetailDrawer } from '../components/leads/LeadDetailDrawer';
import { CreateOpportunityModal } from '../components/opportunities/CreateOpportunityModal';
import {
  createOpportunity,
  convertLeadToOpportunity,
} from '../services/opportunitiesService';
import { Lead } from '../types/leads';
import { CreateOpportunityInput } from '../types/opportunities';

export const LeadsPage: React.FC = () => {
  const { navigate } = useRouter();
  const {
    leads,
    loading,
    error,
    selectedLead,
    counters,
    isUpdatingStatus,
    updateStatusError,
    loadLeads,
    handleSelectLead,
    handleUpdateStatus,
    handleLeadConverted,
  } = useLeads();

  const [leadForOpportunity, setLeadForOpportunity] = useState<Lead | null>(null);
  const [isCreatingOpp, setIsCreatingOpp] = useState(false);
  const [oppSubmitError, setOppSubmitError] = useState<string | null>(null);

  const handleOpenCreateOpportunity = (lead: Lead) => {
    setLeadForOpportunity(lead);
    setOppSubmitError(null);
  };

  const handleCreateOpportunitySubmit = async (input: CreateOpportunityInput) => {
    try {
      setIsCreatingOpp(true);
      setOppSubmitError(null);

      const isFirstConversion =
        leadForOpportunity && leadForOpportunity.status !== 'converted';

      if (isFirstConversion) {
        // Execute atomic RPC: insert opportunity + update lead status to converted
        await convertLeadToOpportunity(input);
        if (leadForOpportunity) {
          handleLeadConverted(leadForOpportunity.id);
        }
      } else {
        // Normal linked creation for leads that are already converted
        await createOpportunity(input);
      }

      setLeadForOpportunity(null);
      handleSelectLead(null);
      navigate('/comercial/oportunidades');
      return true;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao criar oportunidade.';
      setOppSubmitError(msg);
      return false;
    } finally {
      setIsCreatingOpp(false);
    }
  };

  return (
    <div id="leads-page" className="space-y-6">
      {/* Subnavigation between Leads and Opportunities */}
      <div className="flex items-center justify-between">
        <CommercialTabs activeTab="leads" onNavigate={navigate} />
      </div>

      {/* Header with Derived Real Counters */}
      <LeadsHeader
        counters={counters}
        loading={loading}
        onRefresh={loadLeads}
      />

      {/* Error State Banner */}
      {error && (
        <div
          id="leads-error-banner"
          className="p-4 bg-red-50 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-medium">Não foi possível carregar os leads</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={loadLeads}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Tentar novamente</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && leads.length === 0 && (
        <div
          id="leads-empty-state"
          className="bg-white border border-[#E8E9EA] rounded-xl p-12 text-center shadow-xs flex flex-col items-center justify-center max-w-2xl mx-auto my-8"
        >
          <div className="w-12 h-12 rounded-full bg-[#F7F7F8] border border-[#E8E9EA] flex items-center justify-center text-[#9E9EA0] mb-4">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#1D1D1D]">
            Nenhum lead recebido até o momento
          </h3>
          <p className="text-sm text-[#666668] max-w-md mt-1.5 leading-relaxed">
            Os briefings preenchidos no formulário do site público aparecerão automaticamente nesta lista em tempo real.
          </p>
          <button
            onClick={loadLeads}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg hover:bg-[#E8E9EA]/60 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#666668]" />
            <span>Verificar novos leads</span>
          </button>
        </div>
      )}

      {/* Leads Table (Loading / Populated) */}
      {(loading || leads.length > 0) && (
        <LeadsTable
          leads={leads}
          loading={loading}
          selectedLeadId={selectedLead?.id || null}
          onSelectLead={handleSelectLead}
        />
      )}

      {/* Lead Detail Drawer */}
      <LeadDetailDrawer
        lead={selectedLead}
        isOpen={Boolean(selectedLead)}
        isUpdatingStatus={isUpdatingStatus}
        updateStatusError={updateStatusError}
        onClose={() => handleSelectLead(null)}
        onUpdateStatus={handleUpdateStatus}
        onCreateOpportunity={handleOpenCreateOpportunity}
      />

      {/* Create Opportunity Modal from Lead */}
      <CreateOpportunityModal
        isOpen={Boolean(leadForOpportunity)}
        initialLead={leadForOpportunity}
        isSubmitting={isCreatingOpp}
        submitError={oppSubmitError}
        onClose={() => setLeadForOpportunity(null)}
        onSubmit={handleCreateOpportunitySubmit}
      />
    </div>
  );
};
