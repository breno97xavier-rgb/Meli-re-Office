import React from 'react';
import {
  Search,
  Filter,
  X,
  Building2,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ContentFormatFilter,
  EditorialStatusFilter,
} from '../../types/contents';
import { Client } from '../../types/clients';

interface ContentFiltersBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  clients: Client[];
  selectedClientId: string | 'all';
  onClientChange: (clientId: string | 'all') => void;
  formatFilter: ContentFormatFilter;
  onFormatChange: (format: ContentFormatFilter) => void;
  statusFilter: EditorialStatusFilter;
  onStatusChange: (status: EditorialStatusFilter) => void;
  isFilterActive: boolean;
  onResetFilters: () => void;
  totalFiltered: number;
  hideClientFilter?: boolean;
}

export const ContentFiltersBar: React.FC<ContentFiltersBarProps> = ({
  searchTerm,
  onSearchChange,
  clients,
  selectedClientId,
  onClientChange,
  formatFilter,
  onFormatChange,
  statusFilter,
  onStatusChange,
  isFilterActive,
  onResetFilters,
  totalFiltered,
  hideClientFilter = false,
}) => {
  return (
    <div className="bg-white border border-[#E8E9EA] rounded-xl p-4 shadow-2xs space-y-3.5">
      {/* Top row: Search input + Client selector */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8D8F]" />
          <input
            id="content-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por título, objetivo, pilar, legenda..."
            className="w-full pl-9.5 pr-8 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] placeholder:text-[#8C8D8F] transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C8D8F] hover:text-[#1D1D1D] p-1"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Client Filter Dropdown (if not hidden in client profile) */}
        {!hideClientFilter && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C8D8F] pointer-events-none" />
              <select
                id="content-client-filter"
                value={selectedClientId}
                onChange={(e) => onClientChange(e.target.value)}
                className="pl-8.5 pr-8 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:border-[#1D1D1D] cursor-pointer appearance-none min-w-[180px] max-w-[240px] truncate"
              >
                <option value="all">Todos os clientes ({clients.length})</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.commercial_name || c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Bottom row: Format buttons + Status Filter + Reset button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#F2F3F3]">
        <div className="flex flex-wrap items-center gap-2">
          {/* Formats Tabs */}
          <div className="inline-flex p-0.5 bg-[#F2F3F3] rounded-lg border border-[#E8E9EA] shrink-0">
            <button
              type="button"
              onClick={() => onFormatChange('all')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                formatFilter === 'all'
                  ? 'bg-white text-[#1D1D1D] shadow-2xs'
                  : 'text-[#666668] hover:text-[#1D1D1D]'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => onFormatChange('feed_single')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                formatFilter === 'feed_single'
                  ? 'bg-white text-[#1D1D1D] shadow-2xs'
                  : 'text-[#666668] hover:text-[#1D1D1D]'
              }`}
            >
              Post estático
            </button>
            <button
              type="button"
              onClick={() => onFormatChange('carousel')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                formatFilter === 'carousel'
                  ? 'bg-white text-[#1D1D1D] shadow-2xs'
                  : 'text-[#666668] hover:text-[#1D1D1D]'
              }`}
            >
              Carrossel
            </button>
            <button
              type="button"
              onClick={() => onFormatChange('reels')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                formatFilter === 'reels'
                  ? 'bg-white text-[#1D1D1D] shadow-2xs'
                  : 'text-[#666668] hover:text-[#1D1D1D]'
              }`}
            >
              Reel
            </button>
            <button
              type="button"
              onClick={() => onFormatChange('story')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                formatFilter === 'story'
                  ? 'bg-white text-[#1D1D1D] shadow-2xs'
                  : 'text-[#666668] hover:text-[#1D1D1D]'
              }`}
            >
              Story
            </button>
          </div>

          {/* Status Dropdown */}
          <div className="inline-flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-[#8C8D8F]">Status:</span>
            <select
              id="content-status-filter"
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value as EditorialStatusFilter)}
              className="px-2.5 py-1 text-xs font-semibold text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-md focus:outline-none focus:border-[#1D1D1D] cursor-pointer"
            >
              <option value="all">Todos os status</option>
              <option value="draft">Rascunho</option>
              <option value="in_production">Em produção</option>
              <option value="review">Revisão interna</option>
              <option value="client_review">Revisão do cliente</option>
              <option value="approved">Aprovado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
        </div>

        {/* Right side: Count & Clear button */}
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-xs text-[#666668] font-medium">
            <strong className="text-[#1D1D1D] font-bold">{totalFiltered}</strong>{' '}
            {totalFiltered === 1 ? 'conteúdo listado' : 'conteúdos listados'}
          </span>

          {isFilterActive && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#F15A3C] hover:bg-orange-50 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
