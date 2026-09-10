import React from 'react';
import {
  ArrowLeft,
  Building2,
  Layers,
  Plus,
  Edit2,
  RefreshCw,
  Send,
  Calendar,
} from 'lucide-react';
import { Presentation } from '../../types/presentations';
import { PresentationStatusBadge } from './PresentationStatusBadge';

interface PresentationEditorHeaderProps {
  presentation: Presentation;
  itemsCount: number;
  loading: boolean;
  onBack: () => void;
  onOpenAddContents: () => void;
  onOpenEditMetadata: () => void;
  onRefresh: () => void;
}

export const PresentationEditorHeader: React.FC<PresentationEditorHeaderProps> = ({
  presentation,
  itemsCount,
  loading,
  onBack,
  onOpenAddContents,
  onOpenEditMetadata,
  onRefresh,
}) => {
  const clientName =
    presentation.client?.commercial_name ||
    presentation.client?.name ||
    'Cliente';

  return (
    <div className="bg-white border border-[#E8E9EA] rounded-2xl p-5 shadow-2xs space-y-4">
      {/* Top Navigation Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Back button + Client & Title info */}
        <div className="flex items-start gap-3.5">
          <button
            type="button"
            onClick={onBack}
            className="p-2 text-[#666668] hover:text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#EDEEEE] rounded-xl transition-colors cursor-pointer shrink-0 mt-0.5"
            title="Voltar para a listagem de apresentações"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="space-y-1">
            {/* Client Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#FAFAFA] border border-[#E8E9EA] rounded-lg text-xs font-semibold text-[#1D1D1D]">
                {presentation.client?.logo_url ? (
                  <img
                    src={presentation.client.logo_url}
                    alt={clientName}
                    className="w-4 h-4 rounded object-contain"
                  />
                ) : (
                  <Building2 className="w-3.5 h-3.5 text-[#9E9EA0]" />
                )}
                <span>{clientName}</span>
              </div>

              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F7F7F8] text-[#555557] border border-[#E8E9EA]">
                Rodada {presentation.round_number || 1}
              </span>

              <PresentationStatusBadge status={presentation.status} size="sm" />
            </div>

            {/* Title */}
            <h1 className="text-xl font-bold text-[#1D1D1D] tracking-tight font-display">
              {presentation.title}
            </h1>

            {presentation.description && (
              <p className="text-xs text-[#666668] max-w-2xl">
                {presentation.description}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#666668] bg-white border border-[#E8E9EA] rounded-xl hover:bg-[#F2F3F3] hover:text-[#1D1D1D] transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            title="Recarregar apresentação"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#F15A3C]' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            type="button"
            onClick={onOpenEditMetadata}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#EDEEEE] border border-[#E8E9EA] rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <Edit2 className="w-3.5 h-3.5 text-[#666668]" />
            <span>Editar Dados</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddContents}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d9482b] rounded-xl transition-all shadow-2xs cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Conteúdos</span>
          </button>
        </div>
      </div>

      {/* Bottom info summary */}
      <div className="flex items-center justify-between text-xs text-[#666668] pt-3 border-t border-[#F2F3F3]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <Layers className="w-3.5 h-3.5 text-[#9E9EA0]" />
            <span>
              Total de itens: <strong className="text-[#1D1D1D]">{itemsCount}</strong>
            </span>
          </span>
        </div>

        <span className="text-[11px] text-[#9E9EA0]">
          Ordene os conteúdos usando as setas para definir a sequência apresentada ao cliente.
        </span>
      </div>
    </div>
  );
};
