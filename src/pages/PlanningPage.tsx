import React, { useState, useEffect } from 'react';
import { useClients } from '../hooks/useClients';
import { useClientStrategy } from '../hooks/useClientStrategy';
import { useClientPillars } from '../hooks/useClientPillars';
import { PlanningHeader } from '../components/planning/PlanningHeader';
import { BrandStrategySection } from '../components/planning/BrandStrategySection';
import { EditorialPillarsSection } from '../components/planning/EditorialPillarsSection';
import { EditorialCyclesSection } from '../components/planning/EditorialCyclesSection';
import { CampaignsSection } from '../components/planning/CampaignsSection';
import { Building2 } from 'lucide-react';

export const PlanningPage: React.FC = () => {
  const { clients, loading: loadingClients } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Auto-select first active client when clients load if none selected
  useEffect(() => {
    if (!selectedClientId && clients.length > 0) {
      const activeClient = clients.find(
        (c) => c.status === 'active' || c.status === 'onboarding'
      );
      if (activeClient) {
        setSelectedClientId(activeClient.id);
      } else if (clients[0]) {
        setSelectedClientId(clients[0].id);
      }
    }
  }, [clients, selectedClientId]);

  // Strategy hook
  const {
    strategy,
    loading: loadingStrategy,
    error: strategyError,
    saving: savingStrategy,
    saveError,
    loadStrategy,
    saveStrategy,
  } = useClientStrategy(selectedClientId);

  // Pillars hook
  const {
    pillars,
    loading: loadingPillars,
    error: pillarsError,
    mutating: mutatingPillars,
    mutationError: pillarMutationError,
    createPillar,
    updatePillar,
    togglePillarActive,
    reorderPillars,
  } = useClientPillars(selectedClientId, { includeInactive: true });

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <div id="planning-page" className="p-6 md:p-8 space-y-6">
      {/* 1. Header & Client Selector */}
      <PlanningHeader
        clients={clients}
        selectedClientId={selectedClientId}
        onSelectClient={setSelectedClientId}
        loadingClients={loadingClients}
      />

      {/* 2. Content Area based on Client Selection */}
      {!selectedClientId ? (
        /* Empty State: No Client Selected */
        <div
          id="planning-no-client-state"
          className="bg-white border border-[#E8E9EA] rounded-xl p-12 shadow-2xs text-center space-y-4 max-w-xl mx-auto my-8"
        >
          <div className="w-12 h-12 mx-auto rounded-full bg-[#F7F7F8] border border-[#E8E9EA] flex items-center justify-center text-[#1D1D1D]">
            <Building2 className="w-6 h-6 text-[#8C8D8F]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[#1D1D1D]">
              Selecione um cliente para acessar o planejamento
            </h3>
            <p className="text-xs text-[#666668] leading-relaxed">
              O módulo de Planejamento é estruturado individualmente por cliente para
              garantir isolamento de estratégia e pilares de conteúdo.
            </p>
          </div>
        </div>
      ) : (
        /* Client Planning Workspace: Strategy & Pillars */
        <div className="space-y-6">
          {/* Section 1: Brand Strategy */}
          <BrandStrategySection
            strategy={strategy}
            loading={loadingStrategy}
            error={strategyError}
            saving={savingStrategy}
            saveError={saveError}
            onSave={saveStrategy}
            onRefresh={loadStrategy}
          />

          {/* Section 2: Editorial Pillars */}
          <EditorialPillarsSection
            pillars={pillars}
            loading={loadingPillars}
            error={pillarsError}
            mutating={mutatingPillars}
            mutationError={pillarMutationError}
            onCreatePillar={createPillar}
            onUpdatePillar={updatePillar}
            onToggleActive={togglePillarActive}
            onReorderPillars={reorderPillars}
          />

          {/* Section 3: Editorial Planning Cycles */}
          <EditorialCyclesSection
            clientId={selectedClientId}
            clientPillars={pillars}
          />

          {/* Section 4: Campaigns */}
          <CampaignsSection
            clientId={selectedClientId}
          />
        </div>
      )}
    </div>
  );
};
