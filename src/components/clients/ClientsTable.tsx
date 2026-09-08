import React from 'react';
import {
  Users,
  Search,
  X,
  Mail,
  Phone,
  Calendar,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Client, ClientStatusFilter } from '../../types/clients';
import {
  ClientStatusBadge,
  formatCurrency,
  formatDate,
} from './ClientStatusBadge';

interface ClientsTableProps {
  clients: Client[];
  allClients: Client[];
  loading: boolean;
  selectedClientId: string | null;
  statusFilter: ClientStatusFilter;
  onSelectStatusFilter: (status: ClientStatusFilter) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSelectClient: (client: Client) => void;
}

const FILTER_TABS: Array<{ id: ClientStatusFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'active', label: 'Ativos' },
  { id: 'paused', label: 'Pausados' },
  { id: 'ended', label: 'Encerrados' },
];

export const ClientsTable: React.FC<ClientsTableProps> = ({
  clients,
  allClients,
  loading,
  selectedClientId,
  statusFilter,
  onSelectStatusFilter,
  searchTerm,
  onSearchChange,
  onSelectClient,
}) => {
  // Count per status tab from allClients
  const getCount = (tabId: ClientStatusFilter) => {
    if (tabId === 'all') return allClients.length;
    return allClients.filter((c) => c.status === tabId).length;
  };

  const getClientInitials = (client: Client) => {
    const title = client.commercial_name || client.name || 'CL';
    const parts = title.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return title.slice(0, 2).toUpperCase();
  };

  return (
    <div className="bg-white border border-[#E8E9EA] rounded-xl shadow-xs overflow-hidden">
      {/* Filter Tabs & Search Bar */}
      <div className="p-4 border-b border-[#E8E9EA] flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-white">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {FILTER_TABS.map((tab) => {
            const isActive = statusFilter === tab.id;
            const count = getCount(tab.id);

            return (
              <button
                key={tab.id}
                id={`filter-tab-${tab.id}`}
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

        {/* Search Input */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="w-3.5 h-3.5 text-[#9E9EA0] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="clients-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar cliente, e-mail, telefone..."
            className="w-full bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg pl-8 pr-8 py-1.5 text-xs text-[#1D1D1D] placeholder:text-[#9E9EA0] focus:outline-none focus:border-[#D1D2D4] focus:bg-white transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9E9EA0] hover:text-[#1D1D1D] p-0.5 rounded cursor-pointer"
              title="Limpar busca"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#FAFAFA] border-b border-[#E8E9EA] text-[#666668] uppercase text-[10px] font-semibold tracking-wider">
              <th className="py-3 px-4 font-semibold">Cliente</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold">Contato</th>
              <th className="py-3 px-4 font-semibold">Contrato</th>
              <th className="py-3 px-4 font-semibold">Mensalidade</th>
              <th className="py-3 px-4 font-semibold">Criado em</th>
              <th className="py-3 px-2 text-right">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E9EA]">
            {loading && allClients.length === 0 ? (
              // Loading Skeleton
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#E8E9EA]" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-4 bg-[#E8E9EA] rounded w-36" />
                        <div className="h-3 bg-[#F2F3F3] rounded w-24" />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-5 bg-[#E8E9EA] rounded-full w-20" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-3.5 bg-[#E8E9EA] rounded w-28 mb-1" />
                    <div className="h-3 bg-[#F2F3F3] rounded w-20" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-[#E8E9EA] rounded w-28" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-[#E8E9EA] rounded w-24" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-3.5 bg-[#E8E9EA] rounded w-20" />
                  </td>
                  <td className="py-4 px-2" />
                </tr>
              ))
            ) : allClients.length === 0 ? (
              // Global empty state when no clients exist yet
              <tr>
                <td colSpan={7} className="py-14 text-center text-[#666668]">
                  <div className="w-12 h-12 rounded-full bg-[#F7F7F8] border border-[#E8E9EA] flex items-center justify-center text-[#9E9EA0] mx-auto mb-3">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-[#1D1D1D]">
                    Nenhum cliente cadastrado.
                  </p>
                  <p className="text-xs text-[#9E9EA0] mt-1 max-w-md mx-auto leading-relaxed">
                    Clientes são gerados a partir da conversão de contratos assinados na área Comercial.
                  </p>
                </td>
              </tr>
            ) : clients.length === 0 ? (
              // Empty search / filter results
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#666668]">
                  <Users className="w-8 h-8 text-[#9E9EA0] mx-auto mb-2" />
                  <p className="text-sm font-medium text-[#1D1D1D]">
                    Nenhum cliente encontrado com os filtros aplicados
                  </p>
                  <p className="text-xs text-[#9E9EA0] mt-0.5">
                    Tente selecionar outra aba ou alterar o termo de busca.
                  </p>
                </td>
              </tr>
            ) : (
              clients.map((client) => {
                const isSelected = selectedClientId === client.id;
                const displayName = client.commercial_name || client.name;
                const legalName =
                  client.commercial_name && client.commercial_name !== client.name
                    ? client.name
                    : null;

                return (
                  <tr
                    key={client.id}
                    id={`client-row-${client.id}`}
                    onClick={() => onSelectClient(client)}
                    className={`group transition-colors cursor-pointer hover:bg-[#F9F9FA] ${
                      isSelected ? 'bg-[#FDF1EE]/50' : ''
                    }`}
                  >
                    {/* 1. Cliente (Logo/Avatar + Nome + Segmento) */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {client.logo_url ? (
                          <img
                            src={client.logo_url}
                            alt={displayName}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-lg object-contain bg-white border border-[#E8E9EA] p-0.5 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-[#1D1D1D] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {getClientInitials(client)}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-[#1D1D1D] group-hover:text-[#F15A3C] transition-colors truncate max-w-xs">
                            {displayName}
                          </div>
                          {legalName && (
                            <div className="text-[11px] text-[#666668] truncate max-w-xs">
                              {legalName}
                            </div>
                          )}
                          {client.segment && (
                            <span className="inline-block mt-0.5 text-[10px] font-medium text-[#666668] bg-[#F2F3F3] px-1.5 py-0.2 rounded border border-[#E8E9EA]">
                              {client.segment}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Status */}
                    <td className="py-3.5 px-4">
                      <ClientStatusBadge status={client.status} />
                    </td>

                    {/* 3. Contato */}
                    <td className="py-3.5 px-4 text-[#666668]">
                      <div className="space-y-0.5 max-w-[200px]">
                        {client.email && (
                          <div className="flex items-center gap-1.5 text-[11px] truncate">
                            <Mail className="w-3 h-3 text-[#9E9EA0] shrink-0" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#1D1D1D] truncate font-medium">
                            <Phone className="w-3 h-3 text-[#9E9EA0] shrink-0" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {!client.email && !client.phone && (
                          <span className="text-[#9E9EA0] italic text-[11px]">
                            Sem contato
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 4. Contrato (Vigência) */}
                    <td className="py-3.5 px-4 text-[#666668]">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-[#9E9EA0] shrink-0" />
                        <span>
                          {client.contract_start_date
                            ? formatDate(client.contract_start_date)
                            : '—'}
                          {' → '}
                          {client.contract_end_date
                            ? formatDate(client.contract_end_date)
                            : 'Indeterminado'}
                        </span>
                      </div>
                    </td>

                    {/* 5. Mensalidade (monthly_amount) */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-xs text-[#1D1D1D]">
                        {client.monthly_amount !== null &&
                        client.monthly_amount !== undefined
                          ? `${formatCurrency(client.monthly_amount)} /mês`
                          : '—'}
                      </div>
                      {client.one_time_amount !== null &&
                        client.one_time_amount !== undefined &&
                        client.one_time_amount > 0 && (
                          <div className="text-[10px] text-[#666668] mt-0.5 font-medium">
                            Setup: {formatCurrency(client.one_time_amount)}
                          </div>
                        )}
                    </td>

                    {/* 6. Criado em */}
                    <td className="py-3.5 px-4 text-[#9E9EA0] whitespace-nowrap">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDate(client.created_at)}</span>
                      </div>
                    </td>

                    {/* 7. Seta indicativa */}
                    <td className="py-3.5 px-2 text-right">
                      <ChevronRight className="w-4 h-4 text-[#9E9EA0] group-hover:text-[#F15A3C] transition-colors ml-auto" />
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
