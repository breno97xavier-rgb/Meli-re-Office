import React from 'react';
import {
  FileCheck,
  User,
  Calendar,
  Clock,
  AlertTriangle,
  RotateCw,
  FileText,
} from 'lucide-react';
import { Contract, ContractStatus, ContractStatusFilter } from '../../types/contracts';
import {
  ContractStatusBadge,
  formatDate,
  calculateContractDuration,
  isContractExpiringSoon,
  isContractExpired,
} from './ContractStatusBadge';

interface ContractsTableProps {
  contracts: Contract[];
  allContracts: Contract[];
  loading: boolean;
  selectedContractId: string | null;
  statusFilter: ContractStatusFilter;
  onSelectStatusFilter: (status: ContractStatusFilter) => void;
  onSelectContract: (contract: Contract) => void;
}

const FILTER_TABS: Array<{ id: ContractStatusFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'draft', label: 'Rascunhos' },
  { id: 'pending_signature', label: 'Aguardando assinatura' },
  { id: 'signed', label: 'Assinados' },
  { id: 'cancelled', label: 'Cancelados' },
  { id: 'terminated', label: 'Encerrados' },
];

export const ContractsTable: React.FC<ContractsTableProps> = ({
  contracts,
  allContracts,
  loading,
  selectedContractId,
  statusFilter,
  onSelectStatusFilter,
  onSelectContract,
}) => {
  // Count per tab
  const getCount = (tabId: ContractStatusFilter) => {
    if (tabId === 'all') return allContracts.length;
    return allContracts.filter((c) => c.status === tabId).length;
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
              <th className="py-3 px-4 font-semibold">Contrato</th>
              <th className="py-3 px-4 font-semibold">Cliente / Lead</th>
              <th className="py-3 px-4 font-semibold">Proposta de Origem</th>
              <th className="py-3 px-4 font-semibold">Vigência</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold">Atualizado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E9EA]">
            {loading ? (
              // Loading Skeleton
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-4 px-4">
                    <div className="h-4 bg-[#E8E9EA] rounded w-44 mb-1.5" />
                    <div className="h-3 bg-[#F2F3F3] rounded w-24" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-[#E8E9EA] rounded w-32 mb-1" />
                    <div className="h-3 bg-[#F2F3F3] rounded w-20" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-[#E8E9EA] rounded w-36 mb-1" />
                    <div className="h-3 bg-[#F2F3F3] rounded w-16" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-[#E8E9EA] rounded w-28" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-5 bg-[#E8E9EA] rounded-full w-24" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-3 bg-[#E8E9EA] rounded w-20" />
                  </td>
                </tr>
              ))
            ) : contracts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#666668]">
                  <FileCheck className="w-8 h-8 text-[#9E9EA0] mx-auto mb-2" />
                  <p className="text-sm font-medium text-[#1D1D1D]">
                    Nenhum contrato encontrado neste filtro
                  </p>
                  <p className="text-xs text-[#9E9EA0] mt-0.5">
                    Tente selecionar outra aba ou formalizar um contrato a partir de uma proposta aceita.
                  </p>
                </td>
              </tr>
            ) : (
              contracts.map((contract) => {
                const isSelected = selectedContractId === contract.id;
                const duration = calculateContractDuration(
                  contract.start_date,
                  contract.end_date
                );
                const expiringSoon = isContractExpiringSoon(contract);
                const expired = isContractExpired(contract);

                return (
                  <tr
                    key={contract.id}
                    onClick={() => onSelectContract(contract)}
                    className={`group transition-colors cursor-pointer hover:bg-[#F9F9FA] ${
                      isSelected ? 'bg-[#FDF1EE]/50' : ''
                    }`}
                  >
                    {/* Contrato & Versão */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#1D1D1D] text-white">
                          {contract.contract_number}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#F2F3F3] text-[#1D1D1D] border border-[#E8E9EA]">
                          v{contract.version}
                        </span>
                      </div>
                      <div className="font-semibold text-xs text-[#1D1D1D] group-hover:text-[#F15A3C] transition-colors mt-1">
                        {contract.title}
                      </div>
                    </td>

                    {/* Cliente / Lead */}
                    <td className="py-3.5 px-4">
                      {contract.opportunity?.lead ? (
                        <div>
                          <div className="font-medium text-[#1D1D1D] flex items-center gap-1">
                            <User className="w-3 h-3 text-[#9E9EA0]" />
                            <span>{contract.opportunity.lead.name}</span>
                          </div>
                          {contract.opportunity.lead.business_name && (
                            <div className="text-[11px] text-[#666668] mt-0.5">
                              {contract.opportunity.lead.business_name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#9E9EA0]">—</span>
                      )}
                    </td>

                    {/* Proposta */}
                    <td className="py-3.5 px-4">
                      {contract.proposal ? (
                        <div>
                          <div className="font-medium text-[#1D1D1D] flex items-center gap-1">
                            <FileText className="w-3 h-3 text-[#9E9EA0]" />
                            <span className="truncate max-w-[180px]">
                              {contract.proposal.title}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#9E9EA0] font-mono mt-0.5">
                            Proposta v{contract.proposal.version}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#9E9EA0]">Proposta vinculada</span>
                      )}
                    </td>

                    {/* Vigência */}
                    <td className="py-3.5 px-4 text-[#666668]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#9E9EA0]" />
                        <span>
                          {contract.start_date ? formatDate(contract.start_date) : '—'}
                          {' → '}
                          {contract.end_date ? formatDate(contract.end_date) : 'Indeterminado'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                        {duration && (
                          <span className="text-[#1D1D1D] font-medium">{duration}</span>
                        )}
                        {contract.auto_renewal && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-[#047857] font-medium bg-[#ECFDF5] px-1.5 py-0.2 rounded border border-[#A7F3D0]">
                            <RotateCw className="w-2.5 h-2.5" />
                            <span>Renovável</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col items-start gap-1">
                        <ContractStatusBadge status={contract.status} />
                        {expiringSoon && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Vencendo em breve</span>
                          </span>
                        )}
                        {expired && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Vencido</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Atualizado em */}
                    <td className="py-3.5 px-4 text-[#9E9EA0] whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDate(contract.updated_at)}</span>
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
