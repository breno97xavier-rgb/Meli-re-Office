import React from 'react';
import { Search, Filter, X, Building2 } from 'lucide-react';
import { Client } from '../../types/clients';
import { PRESENTATION_STATUS_LABELS } from './PresentationStatusBadge';

interface PresentationFiltersBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  clients: Client[];
  selectedClientId: string | 'all';
  onClientChange: (clientId: string | 'all') => void;
  statusFilter: string | 'all';
  onStatusChange: (status: string | 'all') => void;
  isFilterActive: boolean;
  onResetFilters: () => void;
  totalFiltered: number;
}

export const PresentationFiltersBar: React.FC<PresentationFiltersBarProps> = ({
  searchTerm,
  onSearchChange,
  clients,
  selectedClientId,
  onClientChange,
  statusFilter,
  onStatusChange,
  isFilterActive,
  onResetFilters,
  totalFiltered,
}) => {
  return (
    <div className="bg-white border border-[#E8E9EA] p-3.5 rounded-2xl shadow-2xs space-y-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#9E9EA0] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar apresentação por título, cliente ou descrição..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl text-[#1D1D1D] placeholder-[#9E9EA0] focus:outline-hidden focus:border-[#F15A3C] focus:bg-white transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9E9EA0] hover:text-[#1D1D1D] p-0.5 rounded-md cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Client Filter */}
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#9E9EA0] shrink-0" />
            <select
              value={selectedClientId}
              onChange={(e) => onClientChange(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl text-[#1D1D1D] focus:outline-hidden focus:border-[#F15A3C] cursor-pointer"
            >
              <option value="all">Todos os clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.commercial_name ? `(${c.commercial_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#9E9EA0] shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl text-[#1D1D1D] focus:outline-hidden focus:border-[#F15A3C] cursor-pointer"
            >
              <option value="all">Todos os status</option>
              {Object.entries(PRESENTATION_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {isFilterActive && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#F15A3C] hover:bg-[#FDF1EE] rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Results counter indicator */}
      <div className="flex items-center justify-between text-[11px] text-[#9E9EA0] pt-1 border-t border-[#F2F3F3]">
        <span>
          Exibindo <strong className="text-[#1D1D1D]">{totalFiltered}</strong>{' '}
          {totalFiltered === 1 ? 'apresentação' : 'apresentações'}
        </span>
        {isFilterActive && (
          <span className="text-[#F15A3C] font-medium">Filtros ativos</span>
        )}
      </div>
    </div>
  );
};
