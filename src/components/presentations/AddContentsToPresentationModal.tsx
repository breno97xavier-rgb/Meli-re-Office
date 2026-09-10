import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Filter,
  Plus,
  Check,
  Calendar,
  Layers,
  FileText,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { Content, ContentFormat, EditorialStatus } from '../../types/contents';
import { ContentFormatBadge } from '../contents/ContentFormatBadge';
import { ContentStatusBadge } from '../contents/ContentStatusBadge';

interface AddContentsToPresentationModalProps {
  isOpen: boolean;
  clientName: string;
  availableContents: Content[];
  alreadyIncludedContentIds: Set<string>;
  onClose: () => void;
  onAddContents: (contentIds: string[]) => Promise<void>;
  isAdding: boolean;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'Sem data planejada';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export const AddContentsToPresentationModal: React.FC<AddContentsToPresentationModalProps> = ({
  isOpen,
  clientName,
  availableContents,
  alreadyIncludedContentIds,
  onClose,
  onAddContents,
  isAdding,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Filtered available contents
  const filteredContents = useMemo(() => {
    return availableContents.filter((content) => {
      // Exclude if already in presentation
      if (alreadyIncludedContentIds.has(content.id)) {
        return false;
      }

      // Format filter
      if (selectedFormat !== 'all' && content.format !== selectedFormat) {
        return false;
      }

      // Editorial status filter
      if (selectedStatus !== 'all' && content.editorial_status !== selectedStatus) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const titleMatch = content.internal_title.toLowerCase().includes(query);
        const copyMatch = (content.caption || content.copy || '').toLowerCase().includes(query);
        const pillarMatch = (content.pillar || '').toLowerCase().includes(query);
        if (!titleMatch && !copyMatch && !pillarMatch) return false;
      }

      return true;
    });
  }, [
    availableContents,
    alreadyIncludedContentIds,
    selectedFormat,
    selectedStatus,
    searchTerm,
  ]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredContents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContents.map((c) => c.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;
    setError(null);
    try {
      await onAddContents(Array.from(selectedIds));
      setSelectedIds(new Set());
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao adicionar conteúdos.';
      setError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-[#E8E9EA] rounded-2xl w-full max-w-3xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E9EA] bg-[#FAFAFA] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FDF1EE] text-[#F15A3C] flex items-center justify-center font-bold">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1D1D1D] font-display">
                Adicionar Conteúdos à Apresentação
              </h2>
              <p className="text-[11px] text-[#666668]">
                Selecione os conteúdos de <strong className="text-[#1D1D1D]">{clientName}</strong> para incluir nesta rodada.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9E9EA0] hover:text-[#1D1D1D] p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters and search row */}
        <div className="p-4 border-b border-[#E8E9EA] bg-white space-y-3 shrink-0">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <p className="flex-1">{error}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[#9E9EA0] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por título, pilar ou legenda..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl text-[#1D1D1D] placeholder-[#9E9EA0] focus:outline-hidden focus:border-[#F15A3C] focus:bg-white transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9E9EA0] hover:text-[#1D1D1D] p-0.5 rounded-md"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Format Filter */}
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl text-[#1D1D1D] focus:outline-hidden focus:border-[#F15A3C] cursor-pointer"
            >
              <option value="all">Todos os formatos</option>
              <option value="feed_single">Post Estático</option>
              <option value="carousel">Carrossel</option>
              <option value="reels">Reels</option>
              <option value="story">Story</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl text-[#1D1D1D] focus:outline-hidden focus:border-[#F15A3C] cursor-pointer"
            >
              <option value="all">Todos os status</option>
              <option value="draft">Rascunho</option>
              <option value="in_production">Em Produção</option>
              <option value="review">Revisão Interna</option>
              <option value="client_review">Revisão do Cliente</option>
              <option value="approved">Aprovado</option>
            </select>
          </div>

          {/* Quick select all and count */}
          <div className="flex items-center justify-between text-[11px] text-[#666668] pt-1">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={filteredContents.length === 0}
              className="font-semibold text-[#1D1D1D] hover:text-[#F15A3C] transition-colors cursor-pointer disabled:opacity-40"
            >
              {selectedIds.size === filteredContents.length && filteredContents.length > 0
                ? 'Desmarcar todos'
                : 'Selecionar todos os visíveis'}
            </button>

            <span>
              {selectedIds.size} de {filteredContents.length} selecionados
            </span>
          </div>
        </div>

        {/* Contents List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-[#F2F3F3]">
          {filteredContents.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <FileText className="w-8 h-8 text-[#9E9EA0] mx-auto opacity-50" />
              <p className="text-xs font-semibold text-[#666668]">
                Nenhum conteúdo disponível para inclusão.
              </p>
              <p className="text-[11px] text-[#9E9EA0] max-w-sm mx-auto">
                {alreadyIncludedContentIds.size > 0
                  ? 'Todos os conteúdos deste cliente já estão nesta apresentação ou não correspondem aos filtros aplicados.'
                  : 'Nenhum conteúdo encontrado para os filtros selecionados.'}
              </p>
            </div>
          ) : (
            filteredContents.map((content) => {
              const isSelected = selectedIds.has(content.id);

              return (
                <div
                  key={content.id}
                  onClick={() => toggleSelect(content.id)}
                  className={`pt-2.5 first:pt-0 flex items-start gap-3.5 p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#F15A3C] bg-[#FDF1EE]/20 shadow-2xs'
                      : 'border-[#E8E9EA] bg-white hover:border-[#D1D2D4] hover:bg-[#FAFAFA]'
                  }`}
                >
                  {/* Checkbox custom */}
                  <div className="pt-0.5 shrink-0">
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-[#F15A3C] border-[#F15A3C] text-white'
                          : 'border-[#D1D2D4] bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Content details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-[#1D1D1D] truncate">
                        {content.internal_title}
                      </p>
                      <ContentFormatBadge format={content.format} size="sm" />
                      <ContentStatusBadge status={content.editorial_status} size="sm" />
                    </div>

                    {content.caption ? (
                      <p className="text-[11px] text-[#666668] line-clamp-2">
                        {content.caption}
                      </p>
                    ) : content.copy ? (
                      <p className="text-[11px] text-[#666668] line-clamp-2">
                        {content.copy}
                      </p>
                    ) : null}

                    <div className="flex items-center gap-3 text-[10px] text-[#9E9EA0] pt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(content.planned_date)}</span>
                      </span>
                      {content.pillar && (
                        <span className="bg-[#F2F3F3] px-1.5 py-0.5 rounded text-[#555557]">
                          {content.pillar}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E8E9EA] bg-[#FAFAFA] shrink-0">
          <span className="text-xs text-[#666668]">
            <strong className="text-[#1D1D1D] font-bold">{selectedIds.size}</strong>{' '}
            {selectedIds.size === 1 ? 'conteúdo selecionado' : 'conteúdos selecionados'}
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isAdding}
              className="px-4 py-2 text-xs font-semibold text-[#666668] hover:text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#EDEEEE] rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isAdding || selectedIds.size === 0}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d9482b] rounded-xl transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isAdding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Adicionar à Apresentação ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
