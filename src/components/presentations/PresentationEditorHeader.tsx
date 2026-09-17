import React from 'react';
import {
  ArrowLeft,
  Building2,
  Layers,
  Plus,
  Edit2,
  RefreshCw,
  Share2,
  Play,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  GitCommit,
} from 'lucide-react';
import { Presentation } from '../../types/presentations';
import { PresentationStatusBadge } from './PresentationStatusBadge';

interface PresentationEditorHeaderProps {
  presentation: Presentation;
  itemsCount: number;
  loading: boolean;
  onBack: () => void;
  onPresent: () => void;
  onOpenAddContents: () => void;
  onOpenEditMetadata: () => void;
  onOpenShare: () => void;
  onOpenNextRoundModal: () => void;
  onNavigateToRound?: (targetPresentationId: string) => void;
  onRefresh: () => void;
}

export const PresentationEditorHeader: React.FC<PresentationEditorHeaderProps> = ({
  presentation,
  itemsCount,
  loading,
  onBack,
  onPresent,
  onOpenAddContents,
  onOpenEditMetadata,
  onOpenShare,
  onOpenNextRoundModal,
  onNavigateToRound,
  onRefresh,
}) => {
  const clientName =
    presentation.client?.commercial_name ||
    presentation.client?.name ||
    'Cliente';

  const seriesRounds = presentation.series_rounds || [];
  const currentRoundNumber = presentation.round_number || 1;
  const totalRounds = Math.max(seriesRounds.length, currentRoundNumber);

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
            {/* Client Badge & Round Info */}
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

              {/* Round Indicator with Series Count */}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FDF1EE] text-[#F15A3C] border border-[#F15A3C]/20">
                <span>Rodada {currentRoundNumber}</span>
                {totalRounds > 1 && <span className="text-[#F15A3C]/70">de {totalRounds}</span>}
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

          {/* Gerar Próxima Rodada Button */}
          <button
            type="button"
            onClick={onOpenNextRoundModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#FDF1EE] hover:text-[#F15A3C] hover:border-[#F15A3C]/30 border border-[#E8E9EA] rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Gerar próxima rodada desta apresentação"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#F15A3C]" />
            <span>Nova Rodada</span>
          </button>

          <button
            type="button"
            onClick={onPresent}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#1D1D1D] hover:bg-[#333333] rounded-xl transition-all cursor-pointer shadow-2xs active:scale-98"
            title="Iniciar modo de apresentação executiva"
          >
            <Play className="w-3.5 h-3.5 fill-current text-[#F15A3C]" />
            <span>Apresentar</span>
          </button>

          <button
            type="button"
            onClick={onOpenShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#EDEEEE] border border-[#E8E9EA] rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Gerenciar link de acesso do cliente"
          >
            <Share2 className="w-3.5 h-3.5 text-[#666668]" />
            <span>Compartilhar</span>
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

      {/* Series Lineage Navigation (if multiple rounds exist) */}
      {seriesRounds.length > 1 && onNavigateToRound && (
        <div className="flex items-center justify-between p-2.5 bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#666668] font-semibold flex items-center gap-1">
              <GitCommit className="w-3.5 h-3.5 text-[#F15A3C]" />
              <span>Sequência de Rodadas:</span>
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              {seriesRounds.map((r) => {
                const isCurrent = r.id === presentation.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => !isCurrent && onNavigateToRound(r.id)}
                    disabled={isCurrent}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#1D1D1D] text-white shadow-2xs cursor-default'
                        : 'bg-white border border-[#E8E9EA] text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F2F3F3]'
                    }`}
                  >
                    R{r.round_number}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {presentation.previous_presentation && (
              <button
                type="button"
                onClick={() => onNavigateToRound(presentation.previous_presentation!.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#666668] hover:text-[#1D1D1D] bg-white border border-[#E8E9EA] hover:bg-[#F2F3F3] rounded-lg transition-colors cursor-pointer"
                title={`Ir para a Rodada ${presentation.previous_presentation.round_number}`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Rodada {presentation.previous_presentation.round_number}</span>
              </button>
            )}

            {presentation.next_presentation && (
              <button
                type="button"
                onClick={() => onNavigateToRound(presentation.next_presentation!.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#F15A3C] hover:bg-[#FDF1EE] bg-white border border-[#F15A3C]/30 rounded-lg transition-colors cursor-pointer"
                title={`Ir para a Rodada ${presentation.next_presentation.round_number}`}
              >
                <span>Rodada {presentation.next_presentation.round_number}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

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

