import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  RotateCcw,
  Check,
  Search,
  AlertCircle,
  Loader2,
  Layers,
  MessageSquare,
  ArrowRight,
  Plus,
  Sparkles,
  Info,
} from 'lucide-react';
import { Presentation, PresentationItem } from '../../types/presentations';
import { Content } from '../../types/contents';
import { PresentationItemApprovalBadge } from './PresentationStatusBadge';
import { ContentFormatBadge } from '../contents/ContentFormatBadge';
import { createNextPresentationRound } from '../../services/presentationsService';

interface CreateNextRoundModalProps {
  isOpen: boolean;
  presentation: Presentation;
  currentItems: PresentationItem[];
  availableClientContents: Content[];
  onClose: () => void;
  onSuccess: (newPresentationId: string) => void;
}

export const CreateNextRoundModal: React.FC<CreateNextRoundModalProps> = ({
  isOpen,
  presentation,
  currentItems,
  availableClientContents,
  onClose,
  onSuccess,
}) => {
  const currentRound = presentation.round_number || 1;
  const nextRoundNumber = currentRound + 1;

  // Pre-select items that need rework (changes_requested and rejected)
  const initialSelectedContentIds = useMemo(() => {
    const set = new Set<string>();
    for (const item of currentItems) {
      if (
        item.client_approval_status === 'changes_requested' ||
        item.client_approval_status === 'rejected'
      ) {
        set.add(item.content_id);
      }
    }
    return set;
  }, [currentItems]);

  const [selectedContentIds, setSelectedContentIds] = useState<Set<string>>(new Set());
  const [customTitle, setCustomTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOtherContents, setShowOtherContents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedContentIds(new Set(initialSelectedContentIds));
      setCustomTitle('');
      setSearchTerm('');
      setShowOtherContents(false);
      setError(null);
    }
  }, [isOpen, initialSelectedContentIds]);

  if (!isOpen) return null;

  const clientName =
    presentation.client?.commercial_name ||
    presentation.client?.name ||
    'Cliente';

  // Toggle selection of a content
  const toggleContent = (contentId: string) => {
    const next = new Set(selectedContentIds);
    if (next.has(contentId)) {
      next.delete(contentId);
    } else {
      next.add(contentId);
    }
    setSelectedContentIds(next);
  };

  // Other contents of this client not in the current presentation
  const currentContentIds = new Set(currentItems.map((i) => i.content_id));
  const otherContents = availableClientContents.filter(
    (c) => !currentContentIds.has(c.id)
  );

  const filteredOtherContents = otherContents.filter((c) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase().trim();
    return (
      c.internal_title.toLowerCase().includes(query) ||
      (c.caption || c.copy || '').toLowerCase().includes(query)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const selectedArray = Array.from<string>(selectedContentIds);
      const result = await createNextPresentationRound(
        presentation.id,
        selectedArray,
        customTitle.trim() || undefined
      );

      onSuccess(result.presentation.id);
    } catch (err: unknown) {
      console.error('Error creating next round:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao gerar próxima rodada.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if current presentation already has a next round
  const hasExistingNextRound = !!presentation.next_presentation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-[#E8E9EA] rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#E8E9EA] flex items-center justify-between bg-[#FAFAFA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FDF1EE] text-[#F15A3C] flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#1D1D1D] tracking-tight">
                  Gerar Próxima Rodada
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[#FDF1EE] text-[#F15A3C] border border-[#F15A3C]/20">
                  <span>Rodada {currentRound}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>Rodada {nextRoundNumber}</span>
                </span>
              </div>
              <p className="text-xs text-[#666668] mt-0.5">
                Crie a Rodada {nextRoundNumber} para {clientName} mantendo histórico e linhagem inalterados.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#E8E9EA] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Next Round Warning */}
        {hasExistingNextRound && (
          <div className="p-4 mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-900">
                  Próxima rodada já existente
                </h4>
                <p className="text-xs text-amber-800">
                  Esta apresentação já possui a Rodada {presentation.next_presentation?.round_number || nextRoundNumber} gerada ({presentation.next_presentation?.title}). Para evitar duplicações acidentais, você pode navegar diretamente até ela.
                </p>
              </div>
            </div>

            {presentation.next_presentation?.id && (
              <button
                type="button"
                onClick={() => onSuccess(presentation.next_presentation!.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                <span>Acessar Rodada {presentation.next_presentation.round_number}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-4 mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-red-900">Falha ao criar rodada</h4>
              <p className="text-xs text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Presentation Title Info */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#1D1D1D] uppercase tracking-wider">
              Título da Nova Rodada (Opcional)
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={`${presentation.title} (mantém título limpo com Rodada ${nextRoundNumber})`}
              className="w-full px-3.5 py-2.5 bg-white border border-[#E8E9EA] rounded-xl text-xs text-[#1D1D1D] placeholder-[#9E9EA0] focus:outline-none focus:border-[#F15A3C] transition-colors"
            />
            <p className="text-[11px] text-[#666668]">
              Deixe em branco para herdar o título base da apresentação. O número da rodada será exibido automaticamente.
            </p>
          </div>

          {/* Section 1: Re-present Contents from Current Round */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#F15A3C]" />
                  <span>Conteúdos da Rodada Atual</span>
                </h3>
                <p className="text-xs text-[#666668]">
                  Itens com solicitação de ajustes ou recusados foram pré-selecionados automaticamente.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#666668]">
                {selectedContentIds.size} de {currentItems.length} selecionados
              </span>
            </div>

            {currentItems.length === 0 ? (
              <p className="text-xs text-[#9E9EA0] italic py-3 text-center border border-dashed border-[#E8E9EA] rounded-xl">
                Nenhum conteúdo na rodada atual.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {currentItems.map((item) => {
                  const isSelected = selectedContentIds.has(item.content_id);
                  const contentTitle =
                    item.content?.internal_title || `Conteúdo #${item.content_id.slice(0, 8)}`;
                  const isRework =
                    item.client_approval_status === 'changes_requested' ||
                    item.client_approval_status === 'rejected';

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleContent(item.content_id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                        isSelected
                          ? 'bg-[#FFF9F8] border-[#F15A3C]/40 shadow-2xs'
                          : 'bg-white border-[#E8E9EA] hover:border-[#D0D1D2]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              isSelected
                                ? 'bg-[#F15A3C] border-[#F15A3C] text-white'
                                : 'border-[#D0D1D2] bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-[#1D1D1D]">
                                {contentTitle}
                              </span>
                              {item.content?.format && (
                                <ContentFormatBadge format={item.content.format} size="sm" />
                              )}
                              <PresentationItemApprovalBadge status={item.client_approval_status} />
                              {isRework && (
                                <span className="text-[10px] font-semibold text-[#F15A3C] bg-[#FDF1EE] px-1.5 py-0.5 rounded">
                                  Reapresentação recomendada
                                </span>
                              )}
                            </div>
                            {item.content?.caption && (
                              <p className="text-xs text-[#666668] line-clamp-1">
                                {item.content.caption}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Previous Feedback Context (Read-only!) */}
                      {item.client_feedback && (
                        <div className="ml-8 p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs space-y-1">
                          <div className="flex items-center gap-1.5 text-amber-900 font-semibold text-[11px]">
                            <MessageSquare className="w-3 h-3 text-amber-700" />
                            <span>Feedback do cliente na Rodada {currentRound} (Contexto):</span>
                          </div>
                          <p className="text-amber-900/90 text-xs italic">
                            "{item.client_feedback}"
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Add Other Client Contents */}
          <div className="pt-2 border-t border-[#E8E9EA] space-y-3">
            <button
              type="button"
              onClick={() => setShowOtherContents(!showOtherContents)}
              className="flex items-center justify-between w-full text-left py-1 text-xs font-bold text-[#1D1D1D] hover:text-[#F15A3C] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#F15A3C]" />
                <span>Adicionar outros conteúdos de {clientName} ({otherContents.length} disponíveis)</span>
              </div>
              <span className="text-[11px] font-medium text-[#666668]">
                {showOtherContents ? 'Ocultar' : 'Expandir'}
              </span>
            </button>

            {showOtherContents && (
              <div className="space-y-3 pt-2">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9EA0]" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar outros conteúdos por título ou legenda..."
                    className="w-full pl-8 pr-3 py-2 bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl text-xs text-[#1D1D1D] placeholder-[#9E9EA0] focus:outline-none focus:border-[#F15A3C] transition-colors"
                  />
                </div>

                {filteredOtherContents.length === 0 ? (
                  <p className="text-xs text-[#9E9EA0] italic py-3 text-center border border-dashed border-[#E8E9EA] rounded-xl">
                    Nenhum outro conteúdo disponível encontrado.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {filteredOtherContents.map((content) => {
                      const isSelected = selectedContentIds.has(content.id);
                      return (
                        <div
                          key={content.id}
                          onClick={() => toggleContent(content.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-[#FFF9F8] border-[#F15A3C]/40'
                              : 'bg-white border-[#E8E9EA] hover:border-[#D0D1D2]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-[#F15A3C] border-[#F15A3C] text-white'
                                  : 'border-[#D0D1D2] bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-[#1D1D1D] block">
                                {content.internal_title}
                              </span>
                              {content.caption && (
                                <p className="text-[11px] text-[#666668] line-clamp-1">
                                  {content.caption}
                                </p>
                              )}
                            </div>
                          </div>

                          <ContentFormatBadge format={content.format} size="sm" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lineage Info Note */}
          <div className="p-3.5 bg-[#F7F7F8] border border-[#E8E9EA] rounded-xl flex items-start gap-2.5 text-xs text-[#666668]">
            <Info className="w-4 h-4 text-[#9E9EA0] shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Histórico Preservado:</strong> Todos os itens selecionados nascerão como <span className="font-semibold text-[#1D1D1D]">pending</span> na Rodada {nextRoundNumber}. As decisões, notas e feedbacks da Rodada {currentRound} permanecerão permanentemente intactos para auditoria.
            </p>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#E8E9EA] flex items-center justify-between bg-[#FAFAFA]">
          <span className="text-xs text-[#666668]">
            <strong className="text-[#1D1D1D]">{selectedContentIds.size}</strong> conteúdos farão parte da Rodada {nextRoundNumber}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#666668] hover:text-[#1D1D1D] hover:bg-[#E8E9EA] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || hasExistingNextRound}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#F15A3C] hover:bg-[#d9482b] rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Criando Rodada {nextRoundNumber}...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Criar Rodada {nextRoundNumber}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
