import React from 'react';
import {
  FileText,
  User,
  Building2,
  Calendar,
  AlertTriangle,
  Clock,
  Layers,
} from 'lucide-react';
import { Proposal, ProposalStatus } from '../../types/proposals';
import {
  ProposalStatusBadge,
  formatCurrency,
  formatDate,
  calculateProposalTotals,
  isProposalExpired,
} from './ProposalStatusBadge';

interface ProposalsTableProps {
  proposals: Proposal[];
  allProposals: Proposal[];
  loading: boolean;
  selectedProposalId: string | null;
  statusFilter: 'all' | ProposalStatus;
  onSelectStatusFilter: (status: 'all' | ProposalStatus) => void;
  onSelectProposal: (proposal: Proposal) => void;
}

const FILTER_TABS: Array<{ id: 'all' | ProposalStatus; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'draft', label: 'Rascunhos' },
  { id: 'sent', label: 'Enviadas' },
  { id: 'accepted', label: 'Aceitas' },
  { id: 'rejected', label: 'Rejeitadas' },
  { id: 'superseded', label: 'Substituídas' },
];

export const ProposalsTable: React.FC<ProposalsTableProps> = ({
  proposals,
  allProposals,
  loading,
  selectedProposalId,
  statusFilter,
  onSelectStatusFilter,
  onSelectProposal,
}) => {
  // Counts per tab
  const getCount = (tabId: 'all' | ProposalStatus) => {
    if (tabId === 'all') return allProposals.length;
    return allProposals.filter((p) => p.status === tabId).length;
  };

  return (
    <div className="bg-white border border-[#E8E9EA] rounded-xl shadow-xs overflow-hidden">
      {/* Filter Tabs */}
      <div className="p-4 border-b border-[#E8E9EA] flex items-center gap-1.5 overflow-x-auto">
        {FILTER_TABS.map((tab) => {
          const isActive = statusFilter === tab.id;
          const count = getCount(tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => onSelectStatusFilter(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#1D1D1D] text-white'
                  : 'text-[#666668] hover:bg-[#F2F3F3] hover:text-[#1D1D1D]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-[#E8E9EA] text-[#666668]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#FAFAFA] border-b border-[#E8E9EA] text-[#666668] uppercase text-[10px] font-semibold tracking-wider">
              <th className="py-3 px-4 font-semibold">Proposta</th>
              <th className="py-3 px-4 font-semibold">Oportunidade</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold">Valores</th>
              <th className="py-3 px-4 font-semibold">Validade</th>
              <th className="py-3 px-4 font-semibold">Atualização</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E9EA]">
            {loading ? (
              // Loading Skeleton
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-4 px-4">
                    <div className="h-4 bg-[#E8E9EA] rounded w-40 mb-1.5" />
                    <div className="h-3 bg-[#F2F3F3] rounded w-20" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-[#E8E9EA] rounded w-32 mb-1" />
                    <div className="h-3 bg-[#F2F3F3] rounded w-24" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-5 bg-[#E8E9EA] rounded-full w-18" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-[#E8E9EA] rounded w-28" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-3 bg-[#E8E9EA] rounded w-20" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-3 bg-[#E8E9EA] rounded w-20" />
                  </td>
                </tr>
              ))
            ) : proposals.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#666668]">
                  <FileText className="w-8 h-8 text-[#9E9EA0] mx-auto mb-2" />
                  <p className="text-sm font-medium text-[#1D1D1D]">
                    Nenhuma proposta encontrada neste filtro
                  </p>
                  <p className="text-xs text-[#9E9EA0] mt-0.5">
                    Tente selecionar outra aba ou cadastrar uma nova proposta.
                  </p>
                </td>
              </tr>
            ) : (
              proposals.map((proposal) => {
                const isSelected = selectedProposalId === proposal.id;
                const totals = calculateProposalTotals(proposal.items);
                const expired = isProposalExpired(proposal);

                return (
                  <tr
                    key={proposal.id}
                    onClick={() => onSelectProposal(proposal)}
                    className={`group transition-colors cursor-pointer hover:bg-[#F9F9FA] ${
                      isSelected ? 'bg-[#FDF1EE]/50' : ''
                    }`}
                  >
                    {/* Proposta & Versão */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#1D1D1D] group-hover:text-[#F15A3C] transition-colors">
                          {proposal.title}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#F2F3F3] text-[#1D1D1D] border border-[#E8E9EA]">
                          v{proposal.version}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#9E9EA0] mt-0.5 flex items-center gap-1.5">
                        <Layers className="w-3 h-3" />
                        <span>
                          {proposal.items?.length || 0}{' '}
                          {proposal.items?.length === 1 ? 'item' : 'itens'}
                        </span>
                      </div>
                    </td>

                    {/* Oportunidade & Lead */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#1D1D1D]">
                        {proposal.opportunity?.title || 'Oportunidade vinculada'}
                      </div>
                      {proposal.opportunity?.lead && (
                        <div className="text-[11px] text-[#666668] flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3 text-[#9E9EA0]" />
                          <span>{proposal.opportunity.lead.name}</span>
                          {proposal.opportunity.lead.business_name && (
                            <>
                              <span className="text-[#9E9EA0]">•</span>
                              <span className="text-[#9E9EA0]">
                                {proposal.opportunity.lead.business_name}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col items-start gap-1">
                        <ProposalStatusBadge status={proposal.status} />
                        {expired && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Expirada</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Valores */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5 text-xs">
                        {totals.monthlyTotal > 0 && (
                          <div className="font-semibold text-[#1D1D1D]">
                            {formatCurrency(totals.monthlyTotal)}
                            <span className="text-[10px] font-normal text-[#666668]">
                              {' '}
                              /mês
                            </span>
                          </div>
                        )}
                        {totals.oneTimeTotal > 0 && (
                          <div className="text-[#666668] font-medium text-[11px]">
                            {formatCurrency(totals.oneTimeTotal)}
                            <span className="text-[10px] font-normal text-[#9E9EA0]">
                              {' '}
                              pontual
                            </span>
                          </div>
                        )}
                        {totals.monthlyTotal === 0 && totals.oneTimeTotal === 0 && (
                          <span className="text-[#9E9EA0]">—</span>
                        )}
                      </div>
                    </td>

                    {/* Validade */}
                    <td className="py-3.5 px-4 text-[#666668] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#9E9EA0]" />
                        <span className={expired ? 'text-amber-700 font-medium' : ''}>
                          {formatDate(proposal.valid_until)}
                        </span>
                      </div>
                    </td>

                    {/* Atualização */}
                    <td className="py-3.5 px-4 text-[#9E9EA0] whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDate(proposal.updated_at)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
