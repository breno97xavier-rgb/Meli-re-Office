import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  RefreshCw,
  Inbox,
  Search,
  X,
  SlidersHorizontal,
  FilterX,
} from 'lucide-react';
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
import { Lead, LeadStatus, LeadType } from '../types/leads';
import { CreateOpportunityInput } from '../types/opportunities';
import { getLeadServices } from '../utils/leadFormatters';

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

  // Estados dos Filtros Locais
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LeadStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | LeadType>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const isFiltered =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    typeFilter !== 'all' ||
    serviceFilter !== 'all' ||
    sourceFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setServiceFilter('all');
    setSourceFilter('all');
  };

  // Normalização de texto para busca case-insensitive e acentos
  const normalizeText = (text?: string | null): string => {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  // Filtragem combinada puramente local via useMemo
  const filteredLeads = useMemo(() => {
    const q = normalizeText(searchQuery);

    return leads.filter((lead) => {
      // 1. Busca textual local
      if (q) {
        const nameNorm = normalizeText(lead.name);
        const businessNorm = normalizeText(lead.business_name);
        const emailNorm = normalizeText(lead.email);
        const phoneNorm = normalizeText(lead.whatsapp);
        const segmentNorm = normalizeText(lead.segment_or_profession);
        const webInstaNorm = normalizeText(lead.website_or_instagram);

        const matchesQuery =
          nameNorm.includes(q) ||
          businessNorm.includes(q) ||
          emailNorm.includes(q) ||
          phoneNorm.includes(q) ||
          segmentNorm.includes(q) ||
          webInstaNorm.includes(q);

        if (!matchesQuery) return false;
      }

      // 2. Filtro por Status
      if (statusFilter !== 'all' && lead.status !== statusFilter) {
        return false;
      }

      // 3. Filtro por Tipo (Empresas / Autônomos / Todos)
      if (typeFilter !== 'all') {
        if (!lead.lead_type || lead.lead_type !== typeFilter) {
          return false;
        }
      }

      // 4. Filtro por Serviço com suporte a aliases legados
      if (serviceFilter !== 'all') {
        const services = getLeadServices(lead);
        if (serviceFilter === 'website_portfolio') {
          const hasWebsite =
            services.includes('website_portfolio') || services.includes('website');
          if (!hasWebsite) return false;
        } else if (serviceFilter === 'branding_positioning') {
          const hasBranding =
            services.includes('branding_positioning') || services.includes('branding');
          if (!hasBranding) return false;
        } else {
          if (!services.includes(serviceFilter)) return false;
        }
      }

      // 5. Filtro por Origem
      if (sourceFilter !== 'all' && lead.source !== sourceFilter) {
        return false;
      }

      return true;
    });
  }, [leads, searchQuery, statusFilter, typeFilter, serviceFilter, sourceFilter]);

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
        await convertLeadToOpportunity(input);
        if (leadForOpportunity) {
          handleLeadConverted(leadForOpportunity.id);
        }
      } else {
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

      {/* Barra de Busca e Filtros Comerciais */}
      {(loading || leads.length > 0) && (
        <div
          id="leads-filter-toolbar"
          className="bg-white border border-[#E8E9EA] rounded-xl p-3.5 sm:p-4 shadow-xs space-y-3"
        >
          {/* Linha 1: Input de Busca Textual */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#9E9EA0] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="input-lead-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, empresa, contato ou segmento..."
                className="w-full pl-9 pr-9 py-2 text-sm bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg text-[#1D1D1D] placeholder-[#9E9EA0] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#9E9EA0] hover:text-[#1D1D1D] rounded-md transition-colors"
                  title="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isFiltered && (
              <button
                id="btn-reset-filters-top"
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#F15A3C] bg-[#FDF1EE] border border-[#FBC3B8] rounded-lg hover:bg-[#FDF1EE]/80 transition-colors cursor-pointer shrink-0"
              >
                <FilterX className="w-3.5 h-3.5" />
                <span>Limpar filtros</span>
              </button>
            )}
          </div>

          {/* Linha 2: Dropdowns de Filtros Rápidos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-t border-[#E8E9EA]/60 text-xs">
            {/* Filtro por Status */}
            <div>
              <label className="block text-2xs font-semibold text-[#666668] uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                id="filter-lead-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | LeadStatus)}
                className="w-full px-2.5 py-1.5 bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg text-[#1D1D1D] font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#F15A3C] focus:border-[#F15A3C] cursor-pointer"
              >
                <option value="all">Todos os status</option>
                <option value="new">Novos</option>
                <option value="contacted">Em contato</option>
                <option value="qualified">Qualificados</option>
                <option value="converted">Convertidos</option>
                <option value="disqualified">Desqualificados</option>
              </select>
            </div>

            {/* Filtro por Tipo */}
            <div>
              <label className="block text-2xs font-semibold text-[#666668] uppercase tracking-wider mb-1">
                Tipo
              </label>
              <select
                id="filter-lead-type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | LeadType)}
                className="w-full px-2.5 py-1.5 bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg text-[#1D1D1D] font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#F15A3C] focus:border-[#F15A3C] cursor-pointer"
              >
                <option value="all">Todos os tipos</option>
                <option value="business">Empresas</option>
                <option value="self_employed">Autônomos</option>
              </select>
            </div>

            {/* Filtro por Serviço */}
            <div>
              <label className="block text-2xs font-semibold text-[#666668] uppercase tracking-wider mb-1">
                Serviço
              </label>
              <select
                id="filter-lead-service"
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg text-[#1D1D1D] font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#F15A3C] focus:border-[#F15A3C] cursor-pointer"
              >
                <option value="all">Todos os serviços</option>
                <option value="social_media">Conteúdo e redes sociais</option>
                <option value="paid_traffic">Tráfego pago e aquisição</option>
                <option value="website_portfolio">Site ou portfólio</option>
                <option value="branding_positioning">Marca e posicionamento</option>
                <option value="full_strategy">Estratégia mais completa</option>
                <option value="not_sure">Ainda não sei exatamente</option>
              </select>
            </div>

            {/* Filtro por Origem */}
            <div>
              <label className="block text-2xs font-semibold text-[#666668] uppercase tracking-wider mb-1">
                Origem
              </label>
              <select
                id="filter-lead-source"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg text-[#1D1D1D] font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#F15A3C] focus:border-[#F15A3C] cursor-pointer"
              >
                <option value="all">Todas as origens</option>
                <option value="website">Site</option>
                <option value="meta_ads">Meta Ads</option>
                <option value="google_ads">Google Ads</option>
                <option value="instagram">Instagram</option>
                <option value="referral">Indicação</option>
                <option value="prospecting">Prospecção</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Empty State: Nenhum lead cadastrado no banco */}
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

      {/* Empty State Filtrado: Leads existem, mas nenhum atende aos filtros */}
      {!loading && !error && leads.length > 0 && filteredLeads.length === 0 && (
        <div
          id="leads-filter-empty-state"
          className="bg-white border border-[#E8E9EA] rounded-xl p-10 text-center shadow-xs flex flex-col items-center justify-center max-w-md mx-auto my-6"
        >
          <div className="w-10 h-10 rounded-full bg-[#FDF1EE] border border-[#FBC3B8] flex items-center justify-center text-[#F15A3C] mb-3">
            <FilterX className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-[#1D1D1D]">
            Nenhum lead encontrado com esses filtros.
          </h3>
          <p className="text-xs text-[#666668] mt-1 leading-relaxed">
            Tente ajustar os termos de busca ou filtros selecionados para visualizar outros registros.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#F15A3C] bg-[#FDF1EE] border border-[#FBC3B8] rounded-lg hover:bg-[#FDF1EE]/80 transition-colors cursor-pointer"
          >
            <FilterX className="w-3.5 h-3.5" />
            <span>Limpar filtros</span>
          </button>
        </div>
      )}

      {/* Tabela de Leads (Populated / Filtrada) */}
      {(loading || filteredLeads.length > 0) && (
        <LeadsTable
          leads={filteredLeads}
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

