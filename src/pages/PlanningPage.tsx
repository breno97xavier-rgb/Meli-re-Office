import React, { useState, useEffect, useCallback } from 'react';
import type { Client } from '../types/clients';
import { BriefingSection } from '../components/planning/BriefingSection';
import { EditorialSeriesSection } from '../components/planning/EditorialSeriesSection';
import { StrategyHistory } from '../components/planning/StrategyHistory';
import { EditorialTemplatesSection } from '../components/planning/EditorialTemplatesSection';
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

  return <ClientPlanningWorkspace key={selectedClientId || 'no-client'} clients={clients} selectedClientId={selectedClientId} loadingClients={loadingClients} onSelectClient={setSelectedClientId}/>;
};

const ClientPlanningWorkspace: React.FC<{clients:Client[];selectedClientId:string;loadingClients:boolean;onSelectClient:(id:string)=>void}> = ({clients,selectedClientId,loadingClients,onSelectClient}) => {
  const [tab,setTab]=useState('strategy');
  const [dirty,setDirty]=useState(false);
  const onDirty=useCallback((value:boolean)=>setDirty(value),[]);
  const canLeave=()=>!dirty||window.confirm('Descartar alterações não salvas deste planejamento?');
  useEffect(()=>{
    const guard=(event:Event)=>{
      if(dirty&&!window.confirm('Descartar alterações não salvas deste planejamento?'))event.preventDefault();
    };
    window.addEventListener('meliere:before-navigate',guard);
    return()=>window.removeEventListener('meliere:before-navigate',guard);
  },[dirty]);
  useEffect(()=>{const guard=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[dirty]);

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

  return (
    <div id="planning-page" className="p-6 md:p-8 space-y-6">
      {/* 1. Header & Client Selector */}
      <PlanningHeader
        clients={clients}
        selectedClientId={selectedClientId}
        onSelectClient={id=>{if(canLeave())onSelectClient(id);}}
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
          <p className="text-sm text-[#666668]">Briefing, estratégia e séries são opcionais. Clientes de sites, branding ou serviços avulsos podem continuar sem planejamento editorial.</p>
          <div role="tablist" aria-label="Áreas do planejamento" className="flex flex-wrap gap-2 border-b border-[#E8E9EA] pb-3">
            {[['strategy','Estratégia'],['briefing','Briefing'],['pillars','Pilares e séries'],['templates','Grade editorial'],['cycles','Ciclos editoriais'],['campaigns','Campanhas']].map(([id,label])=><button key={id} id={`planning-tab-${id}`} type="button" role="tab" aria-selected={tab===id} aria-controls={`planning-panel-${id}`} tabIndex={tab===id?0:-1} onKeyDown={event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();const ids=['strategy','briefing','pillars','templates','cycles','campaigns'];const next=ids[(ids.indexOf(tab)+(event.key==='ArrowRight'?1:ids.length-1))%ids.length];if(canLeave()){setDirty(false);setTab(next);requestAnimationFrame(()=>document.getElementById(`planning-tab-${next}`)?.focus());}}}} onClick={()=>{if(id!==tab&&canLeave()){setDirty(false);setTab(id);}}} className={`rounded-lg px-4 py-2 text-sm ${tab===id?'bg-[#1D1D1D] text-white':'bg-white text-[#666668] hover:bg-[#EDEEEE]'}`}>{label}</button>)}
          </div>
          <div role="tabpanel" id={`planning-panel-${tab}`} aria-labelledby={`planning-tab-${tab}`} className="space-y-5">
          {tab==='briefing'&&<BriefingSection clientId={selectedClientId} onDirty={onDirty}/>}
          {tab==='templates'&&<EditorialTemplatesSection clientId={selectedClientId} pillars={pillars} onDirty={onDirty}/>}
          {tab==='strategy'&&<>
          {/* Section 1: Brand Strategy */}
          <BrandStrategySection
            strategy={strategy}
            loading={loadingStrategy}
            error={strategyError}
            saving={savingStrategy}
            saveError={saveError}
            onSave={saveStrategy}
            onRefresh={loadStrategy}
            onDirty={onDirty}
          />
          <StrategyHistory clientId={selectedClientId} revision={strategy?.revision}/>
          </>}

          {/* Section 2: Editorial Pillars */}
          {tab==='pillars'&&<><EditorialPillarsSection
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
          <EditorialSeriesSection clientId={selectedClientId} pillars={pillars} onDirty={onDirty}/></>}

          {/* Section 3: Editorial Planning Cycles */}
          {tab==='cycles'&&<EditorialCyclesSection
            clients={clients.filter(client => client.id === selectedClientId)}
            onDirty={onDirty}
            clientId={selectedClientId}
            clientPillars={pillars}
          />}

          {/* Section 4: Campaigns */}
          {tab==='campaigns'&&<CampaignsSection
            clientId={selectedClientId}
          />}
          </div>
        </div>
      )}
    </div>
  );
};
