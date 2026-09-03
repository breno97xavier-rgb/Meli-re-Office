import React from 'react';
import {
  Opportunity,
  OpportunityStageFilter,
  OpportunityStage,
} from '../../types/opportunities';
import {
  OpportunityStageBadge,
  formatCurrency,
  formatDate,
} from './OpportunityStageBadge';
import { getServiceLabel } from '../leads/LeadStatusBadge';
import { Calendar, User, ChevronRight, Clock, AlertTriangle } from 'lucide-react';

interface OpportunitiesTableProps {
  opportunities: Opportunity[];
  allOpportunities: Opportunity[];
  loading: boolean;
  selectedOpportunityId: string | null;
  stageFilter: OpportunityStageFilter;
  onSelectStageFilter: (filter: OpportunityStageFilter) => void;
  onSelectOpportunity: (opportunity: Opportunity) => void;
}

const FILTER_OPTIONS: { id: OpportunityStageFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'open', label: 'Em aberto' },
  { id: 'discovery', label: 'Diagnóstico' },
  { id: 'briefing', label: 'Briefing' },
  { id: 'proposal', label: 'Proposta' },
  { id: 'negotiation', label: 'Negociação' },
  { id: 'won', label: 'Ganhos' },
  { id: 'lost', label: 'Perdidos' },
];

const OPEN_STAGES: OpportunityStage[] = [
  'discovery',
  'briefing',
  'proposal',
  'negotiation',
];

export const OpportunitiesTable: React.FC<OpportunitiesTableProps> = ({
  opportunities,
  allOpportunities,
  loading,
  selectedOpportunityId,
  stageFilter,
  onSelectStageFilter,
  onSelectOpportunity,
}) => {
  const getFilterCount = (filterId: OpportunityStageFilter): number => {
    if (filterId === 'all') return allOpportunities.length;
    if (filterId === 'open') {
      return allOpportunities.filter((o) => OPEN_STAGES.includes(o.stage)).length;
    }
    return allOpportunities.filter((o) => o.stage === filterId).length;
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs Bar */}
      <div
        id="opportunity-filters-bar"
        className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none"
      >
        {FILTER_OPTIONS.map((f) => {
          const count = getFilterCount(f.id);
          const isActive = stageFilter === f.id;

          return (
            <button
              key={f.id}
              id={`filter-btn-${f.id}`}
              onClick={() => onSelectStageFilter(f.id)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
                isActive
                  ? 'bg-[#1D1D1D] text-white border-[#1D1D1D] shadow-2xs'
                  : 'bg-white text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F7F7F8] border-[#E8E9EA]'
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-[#F7F7F8] text-[#9E9EA0] border border-[#E8E9EA]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table Container */}
      <div
        id="opportunities-table-container"
        className="bg-white border border-[#E8E9EA] rounded-xl overflow-hidden shadow-xs"
      >
        {loading && allOpportunities.length === 0 ? (
          <div className="divide-y divide-[#E8E9EA]">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="p-4.5 flex items-center justify-between gap-4 animate-pulse"
              >
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-[#E8E9EA] rounded w-1/3" />
                  <div className="h-3 bg-[#E8E9EA]/60 rounded w-1/4" />
                </div>
                <div className="h-6 bg-[#E8E9EA] rounded w-24 hidden sm:block" />
                <div className="h-6 bg-[#E8E9EA] rounded w-20" />
                <div className="h-4 bg-[#E8E9EA] rounded w-24 hidden md:block" />
              </div>
            ))}
          </div>
        ) : opportunities.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-[#666668]">
              Nenhuma oportunidade encontrada neste filtro.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E8E9EA] bg-[#FAFAFA] text-xs font-semibold text-[#666668] uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Oportunidade</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">
                    Lead / Contato
                  </th>
                  <th className="py-3.5 px-4">Estágio</th>
                  <th className="py-3.5 px-4 hidden lg:table-cell">Serviços</th>
                  <th className="py-3.5 px-4">Valor Estimado</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">
                    Próxima Ação
                  </th>
                  <th className="py-3.5 px-4 hidden xl:table-cell text-right">
                    Previsão Fechamento
                  </th>
                  <th className="py-3.5 px-3 text-right">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E9EA] text-sm text-[#1D1D1D]">
                {opportunities.map((opp) => {
                  const isSelected = selectedOpportunityId === opp.id;

                  return (
                    <tr
                      key={opp.id}
                      id={`opportunity-row-${opp.id}`}
                      onClick={() => onSelectOpportunity(opp)}
                      className={`group cursor-pointer transition-colors duration-150 ${
                        isSelected
                          ? 'bg-[#FDF1EE]/40 hover:bg-[#FDF1EE]/60'
                          : 'hover:bg-[#F7F7F8]'
                      }`}
                    >
                      {/* 1. Título */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="font-medium text-[#1D1D1D] group-hover:text-[#F15A3C] transition-colors">
                          {opp.title}
                        </div>
                        {opp.probability !== null && opp.probability !== undefined && (
                          <div className="text-xs text-[#666668] mt-0.5 font-normal">
                            Probabilidade: <span className="font-medium text-[#1D1D1D]">{opp.probability}%</span>
                          </div>
                        )}
                      </td>

                      {/* 2. Lead / Contato */}
                      <td className="py-4 px-4 hidden md:table-cell">
                        {opp.lead ? (
                          <div>
                            <div className="font-medium text-xs text-[#1D1D1D] flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-[#F15A3C]" />
                              <span>{opp.lead.name}</span>
                            </div>
                            {opp.lead.business_name && (
                              <div className="text-xs text-[#666668] mt-0.5">
                                {opp.lead.business_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[#9E9EA0] italic font-normal">
                            Negociação direta
                          </span>
                        )}
                      </td>

                      {/* 3. Estágio */}
                      <td className="py-4 px-4">
                        <OpportunityStageBadge stage={opp.stage} />
                      </td>

                      {/* 4. Serviços */}
                      <td className="py-4 px-4 hidden lg:table-cell">
                        {opp.services_of_interest && opp.services_of_interest.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {opp.services_of_interest.map((svc, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center text-[11px] font-medium text-[#333335] bg-[#F7F7F8] border border-[#E8E9EA] px-2 py-0.5 rounded"
                              >
                                {getServiceLabel(svc)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-[#9E9EA0] italic">
                            Não definidos
                          </span>
                        )}
                      </td>

                      {/* 5. Valor Estimado */}
                      <td className="py-4 px-4 font-mono font-medium text-sm text-[#1D1D1D]">
                        {formatCurrency(opp.estimated_value)}
                      </td>

                      {/* 6. Próxima Ação */}
                      <td className="py-4 px-4 hidden sm:table-cell">
                        {opp.next_action ? (
                          <div>
                            <span className="text-xs font-medium text-[#1D1D1D] block truncate max-w-xs">
                              {opp.next_action}
                            </span>
                            {opp.next_action_date && (
                              <div className="inline-flex items-center gap-1 text-[11px] text-[#666668] mt-0.5">
                                <Clock className="w-3 h-3 text-[#9E9EA0]" />
                                <span>{formatDate(opp.next_action_date)}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[#9E9EA0] italic font-normal">
                            Sem próxima ação
                          </span>
                        )}
                      </td>

                      {/* 7. Previsão Fechamento */}
                      <td className="py-4 px-4 hidden xl:table-cell text-right">
                        {opp.expected_close_date ? (
                          <div className="inline-flex items-center gap-1.5 text-xs text-[#666668]">
                            <Calendar className="w-3.5 h-3.5 text-[#9E9EA0]" />
                            <span>{formatDate(opp.expected_close_date)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#9E9EA0] italic">
                            —
                          </span>
                        )}
                      </td>

                      {/* Seta */}
                      <td className="py-4 px-3 text-right">
                        <ChevronRight className="w-4 h-4 text-[#9E9EA0] group-hover:text-[#F15A3C] transition-colors ml-auto" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
