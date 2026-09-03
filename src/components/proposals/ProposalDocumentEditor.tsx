import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Layers,
  Sparkles,
  Plus,
  Trash2,
  AlertCircle,
  Check,
  Loader2,
  Calendar,
  DollarSign,
  Info,
  Building2,
  User,
} from 'lucide-react';
import {
  Proposal,
  SaveProposalDocumentItemInput,
} from '../../types/proposals';
import { useProposalDocument } from '../../hooks/useProposalDocument';
import {
  formatCurrency,
  formatDate,
  getBillingTypeLabel,
} from './ProposalStatusBadge';

interface ProposalDocumentEditorProps {
  proposal: Proposal | null;
  isOpen: boolean;
  onClose: () => void;
}

interface EditorialItemForm {
  proposal_item_id: string;
  display_title: string;
  presentation_text: string;
  deliverables: string[];
  newDeliverableText: string;
}

export const ProposalDocumentEditor: React.FC<ProposalDocumentEditorProps> = ({
  proposal,
  isOpen,
  onClose,
}) => {
  const {
    document,
    loading,
    error,
    isSaving,
    saveError,
    saveSuccess,
    save,
  } = useProposalDocument(isOpen && proposal ? proposal.id : null);

  // Local Form State
  const [introduction, setIntroduction] = useState('');
  const [scopeSummary, setScopeSummary] = useState('');
  const [closingText, setClosingText] = useState('');
  const [itemsMap, setItemsMap] = useState<Record<string, EditorialItemForm>>({});

  // Sync state when proposal or loaded document changes
  useEffect(() => {
    if (!proposal) return;

    if (document) {
      setIntroduction(document.introduction || '');
      setScopeSummary(document.scope_summary || '');
      setClosingText(document.closing_text || '');

      const newMap: Record<string, EditorialItemForm> = {};
      const docItems = document.items || [];

      (proposal.items || []).forEach((item) => {
        const matchingDocItem = docItems.find(
          (di) => di.proposal_item_id === item.id
        );
        newMap[item.id] = {
          proposal_item_id: item.id,
          display_title: matchingDocItem?.display_title || '',
          presentation_text: matchingDocItem?.presentation_text || '',
          deliverables: matchingDocItem?.deliverables || [],
          newDeliverableText: '',
        };
      });
      setItemsMap(newMap);
    } else {
      // Document does not exist yet; initialize empty editor
      setIntroduction('');
      setScopeSummary('');
      setClosingText('');

      const newMap: Record<string, EditorialItemForm> = {};
      (proposal.items || []).forEach((item) => {
        newMap[item.id] = {
          proposal_item_id: item.id,
          display_title: '',
          presentation_text: '',
          deliverables: [],
          newDeliverableText: '',
        };
      });
      setItemsMap(newMap);
    }
  }, [proposal, document]);

  if (!isOpen || !proposal) return null;

  // Handlers for editorial items
  const handleItemFieldChange = (
    itemId: string,
    field: 'display_title' | 'presentation_text' | 'newDeliverableText',
    value: string
  ) => {
    setItemsMap((prev) => {
      const current = prev[itemId] || {
        proposal_item_id: itemId,
        display_title: '',
        presentation_text: '',
        deliverables: [],
        newDeliverableText: '',
      };
      return {
        ...prev,
        [itemId]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const handleAddDeliverable = (itemId: string) => {
    const itemData = itemsMap[itemId];
    if (!itemData || !itemData.newDeliverableText.trim()) return;

    const newDeliverable = itemData.newDeliverableText.trim();
    setItemsMap((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        deliverables: [...prev[itemId].deliverables, newDeliverable],
        newDeliverableText: '',
      },
    }));
  };

  const handleDeliverableKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    itemId: string
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDeliverable(itemId);
    }
  };

  const handleRemoveDeliverable = (itemId: string, deliverableIndex: number) => {
    setItemsMap((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      return {
        ...prev,
        [itemId]: {
          ...current,
          deliverables: current.deliverables.filter(
            (_, idx) => idx !== deliverableIndex
          ),
        },
      };
    });
  };

  const handleUpdateDeliverableText = (
    itemId: string,
    deliverableIndex: number,
    newVal: string
  ) => {
    setItemsMap((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      const updated = [...current.deliverables];
      updated[deliverableIndex] = newVal;
      return {
        ...prev,
        [itemId]: {
          ...current,
          deliverables: updated,
        },
      };
    });
  };

  const handleSave = async () => {
    const formattedItems: SaveProposalDocumentItemInput[] = (
      proposal.items || []
    ).map((item) => {
      const form = itemsMap[item.id];
      return {
        proposal_item_id: item.id,
        display_title: form?.display_title || null,
        presentation_text: form?.presentation_text || null,
        deliverables: form?.deliverables || [],
      };
    });

    await save({
      introduction: introduction || null,
      scope_summary: scopeSummary || null,
      closing_text: closingText || null,
      items: formattedItems,
    });
  };

  return (
    <>
      {/* Modal Backdrop with z-[65] to stay above Drawer (z-50) */}
      <div
        id="proposal-document-editor-backdrop"
        className="fixed inset-0 bg-[#1D1D1D]/60 backdrop-blur-xs z-[65] flex items-center justify-center p-3 sm:p-6 transition-opacity"
        onClick={onClose}
      >
        {/* Modal Dialog Card */}
        <div
          id="proposal-document-editor-dialog"
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl border border-[#E8E9EA] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#E8E9EA] bg-[#FAFAFA] flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-8 h-8 rounded-lg bg-[#FDF1EE] text-[#F15A3C] flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1D1D1D]">
                  Preparar documento da proposta
                </h2>
                <span className="font-mono text-xs font-bold bg-[#1D1D1D] text-white px-2 py-0.5 rounded">
                  v{proposal.version}
                </span>
              </div>
              <p className="text-xs text-[#666668]">
                Defina como esta proposta será apresentada ao cliente.
              </p>

              {/* Proposal Meta info */}
              <div className="flex items-center gap-3 pt-1 text-xs text-[#666668] flex-wrap">
                <span className="font-semibold text-[#1D1D1D]">
                  {proposal.title}
                </span>
                {proposal.opportunity?.lead && (
                  <>
                    <span className="text-[#9E9EA0]">•</span>
                    <span className="inline-flex items-center gap-1 text-[#666668]">
                      <User className="w-3.5 h-3.5 text-[#F15A3C]" />
                      <span>{proposal.opportunity.lead.name}</span>
                    </span>
                    {proposal.opportunity.lead.business_name && (
                      <span className="inline-flex items-center gap-1 text-[#9E9EA0]">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{proposal.opportunity.lead.business_name}</span>
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            <button
              id="btn-close-document-editor"
              onClick={onClose}
              className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#E8E9EA]/60 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-7">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#666668]">
                <Loader2 className="w-8 h-8 animate-spin text-[#F15A3C]" />
                <span className="text-sm font-medium">
                  Carregando conteúdo documental da proposta...
                </span>
              </div>
            ) : (
              <>
                {error && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* 1. Introdução */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="doc-introduction"
                      className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <span>1. Introdução</span>
                    </label>
                  </div>
                  <p className="text-xs text-[#666668]">
                    Contextualize a necessidade, o cenário ou o objetivo desta
                    proposta.
                  </p>
                  <textarea
                    id="doc-introduction"
                    rows={4}
                    value={introduction}
                    onChange={(e) => setIntroduction(e.target.value)}
                    placeholder="Ex: Apresentamos a proposta técnica e comercial elaborada para atender às necessidades estratégicas identificadas em nossos alinhamentos prévios..."
                    className="w-full bg-white border border-[#D1D2D4] rounded-xl p-3.5 text-sm text-[#1D1D1D] placeholder:text-[#9E9EA0] focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C] transition-all"
                  />
                </div>

                {/* 2. Escopo Geral */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="doc-scope-summary"
                      className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <span>2. Escopo Geral</span>
                    </label>
                  </div>
                  <p className="text-xs text-[#666668]">
                    Resuma o escopo geral antes da apresentação dos serviços.
                  </p>
                  <textarea
                    id="doc-scope-summary"
                    rows={4}
                    value={scopeSummary}
                    onChange={(e) => setScopeSummary(e.target.value)}
                    placeholder="Ex: O projeto contemplará as etapas de diagnóstico, estruturação da identidade e desenvolvimento contínuo dos ativos digitais acordados..."
                    className="w-full bg-white border border-[#D1D2D4] rounded-xl p-3.5 text-sm text-[#1D1D1D] placeholder:text-[#9E9EA0] focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C] transition-all"
                  />
                </div>

                {/* 3. Serviços e Entregáveis */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#F15A3C]" />
                      <span>
                        3. Serviços e Entregáveis ({proposal.items?.length || 0})
                      </span>
                    </label>
                  </div>
                  <p className="text-xs text-[#666668]">
                    Apresente o escopo e detalhe os entregáveis de cada item da
                    proposta comercial.
                  </p>

                  <div className="space-y-4 pt-1">
                    {(!proposal.items || proposal.items.length === 0) && (
                      <div className="p-6 text-center text-xs text-[#9E9EA0] bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl">
                        Nenhum item comercial cadastrado nesta proposta.
                      </div>
                    )}

                    {proposal.items?.map((item, index) => {
                      const itemForm = itemsMap[item.id] || {
                        proposal_item_id: item.id,
                        display_title: '',
                        presentation_text: '',
                        deliverables: [],
                        newDeliverableText: '',
                      };
                      const lineTotal = item.quantity * item.unit_price;

                      return (
                        <div
                          key={item.id}
                          className="bg-white border border-[#E8E9EA] rounded-xl p-4.5 space-y-4 shadow-2xs hover:border-[#D1D2D4] transition-all"
                        >
                          {/* Commercial Item Reference (Read-Only) */}
                          <div className="bg-[#F8F9FA] border border-[#E8E9EA] rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-md bg-[#1D1D1D] text-white text-xs font-bold flex items-center justify-center">
                                {index + 1}
                              </span>
                              <div>
                                <div className="text-xs font-bold text-[#1D1D1D]">
                                  {item.description}
                                </div>
                                <div className="text-[11px] text-[#666668]">
                                  Origem comercial (somente leitura)
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                                  item.billing_type === 'monthly'
                                    ? 'bg-[#FDF1EE] text-[#F15A3C] border-[#FBC3B8]'
                                    : 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
                                }`}
                              >
                                {getBillingTypeLabel(item.billing_type)}
                              </span>
                              <span className="text-xs text-[#666668]">
                                {item.quantity} un × {formatCurrency(item.unit_price)}
                              </span>
                              <span className="text-xs font-bold text-[#1D1D1D] bg-white px-2 py-0.5 rounded border border-[#E8E9EA]">
                                = {formatCurrency(lineTotal)}
                              </span>
                            </div>
                          </div>

                          {/* Editorial Customization Fields */}
                          <div className="space-y-3.5 pl-1">
                            {/* Título de Apresentação */}
                            <div className="space-y-1">
                              <label
                                htmlFor={`item-title-${item.id}`}
                                className="text-xs font-semibold text-[#1D1D1D] block"
                              >
                                Título de Apresentação (Opcional)
                              </label>
                              <input
                                id={`item-title-${item.id}`}
                                type="text"
                                value={itemForm.display_title}
                                onChange={(e) =>
                                  handleItemFieldChange(
                                    item.id,
                                    'display_title',
                                    e.target.value
                                  )
                                }
                                placeholder={item.description}
                                className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] placeholder:text-[#9E9EA0] focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C]"
                              />
                              <p className="text-[11px] text-[#9E9EA0]">
                                Se em branco, o título comercial acima será
                                utilizado.
                              </p>
                            </div>

                            {/* Texto de Apresentação */}
                            <div className="space-y-1">
                              <label
                                htmlFor={`item-text-${item.id}`}
                                className="text-xs font-semibold text-[#1D1D1D] block"
                              >
                                Texto de Apresentação do Serviço (Opcional)
                              </label>
                              <textarea
                                id={`item-text-${item.id}`}
                                rows={3}
                                value={itemForm.presentation_text}
                                onChange={(e) =>
                                  handleItemFieldChange(
                                    item.id,
                                    'presentation_text',
                                    e.target.value
                                  )
                                }
                                placeholder="Descreva o escopo executivo, metodologia ou impacto deste serviço para o cliente..."
                                className="w-full bg-white border border-[#D1D2D4] rounded-lg p-3 text-xs text-[#1D1D1D] placeholder:text-[#9E9EA0] focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C]"
                              />
                            </div>

                            {/* Entregáveis */}
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-[#1D1D1D] flex items-center justify-between">
                                <span>Entregáveis Específicos</span>
                                <span className="text-[11px] font-normal text-[#666668]">
                                  {itemForm.deliverables.length} adicionado(s)
                                </span>
                              </label>

                              {/* Deliverables List */}
                              {itemForm.deliverables.length > 0 && (
                                <div className="space-y-1.5 bg-[#FAFAFA] p-2.5 rounded-lg border border-[#E8E9EA]">
                                  {itemForm.deliverables.map(
                                    (deliv, delivIdx) => (
                                      <div
                                        key={delivIdx}
                                        className="flex items-center gap-2 bg-white p-1.5 px-2.5 rounded-md border border-[#E8E9EA]"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#F15A3C] shrink-0" />
                                        <input
                                          type="text"
                                          value={deliv}
                                          onChange={(e) =>
                                            handleUpdateDeliverableText(
                                              item.id,
                                              delivIdx,
                                              e.target.value
                                            )
                                          }
                                          className="flex-1 text-xs text-[#1D1D1D] bg-transparent border-none focus:outline-none"
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemoveDeliverable(
                                              item.id,
                                              delivIdx
                                            )
                                          }
                                          title="Remover entregável"
                                          className="p-1 text-[#9E9EA0] hover:text-red-600 rounded transition-colors cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}

                              {/* Add Deliverable Input */}
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={itemForm.newDeliverableText}
                                  onChange={(e) =>
                                    handleItemFieldChange(
                                      item.id,
                                      'newDeliverableText',
                                      e.target.value
                                    )
                                  }
                                  onKeyDown={(e) =>
                                    handleDeliverableKeyDown(e, item.id)
                                  }
                                  placeholder="Novo entregável (ex: Relatório quinzenal de performance)"
                                  className="flex-1 bg-white border border-[#D1D2D4] rounded-lg px-3 py-1.5 text-xs text-[#1D1D1D] placeholder:text-[#9E9EA0] focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C]"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddDeliverable(item.id)}
                                  disabled={!itemForm.newDeliverableText.trim()}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#1D1D1D] bg-[#F2F3F3] hover:bg-[#E8E9EA] border border-[#D1D2D4] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Adicionar</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Condições Comerciais (Somente Leitura) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#9E9EA0]" />
                      <span>4. Condições Comerciais Registradas</span>
                    </label>
                  </div>
                  <p className="text-xs text-[#666668]">
                    Estes dados são herdados diretamente da proposta comercial
                    (somente leitura).
                  </p>

                  <div className="bg-[#F8F9FA] border border-[#E8E9EA] rounded-xl divide-y divide-[#E8E9EA]">
                    <div className="p-3 flex items-center justify-between gap-4">
                      <span className="text-xs text-[#666668] font-medium">
                        Validade da Proposta
                      </span>
                      <span className="text-xs font-semibold text-[#1D1D1D]">
                        {formatDate(proposal.valid_until)}
                      </span>
                    </div>

                    {proposal.notes && (
                      <div className="p-3 space-y-1">
                        <span className="text-xs text-[#666668] font-medium">
                          Observações Gerais
                        </span>
                        <div className="text-xs text-[#1D1D1D] bg-white p-2.5 rounded-lg border border-[#E8E9EA] whitespace-pre-wrap">
                          {proposal.notes}
                        </div>
                      </div>
                    )}

                    {proposal.terms && (
                      <div className="p-3 space-y-1">
                        <span className="text-xs text-[#666668] font-medium">
                          Termos e Condições
                        </span>
                        <div className="text-xs text-[#1D1D1D] bg-white p-2.5 rounded-lg border border-[#E8E9EA] whitespace-pre-wrap">
                          {proposal.terms}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Encerramento */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="doc-closing-text"
                      className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <span>5. Encerramento</span>
                    </label>
                  </div>
                  <p className="text-xs text-[#666668]">
                    Adicione considerações finais ou orientações de fechamento
                    para o cliente.
                  </p>
                  <textarea
                    id="doc-closing-text"
                    rows={4}
                    value={closingText}
                    onChange={(e) => setClosingText(e.target.value)}
                    placeholder="Ex: Permanecemos à inteira disposição para o esclarecimento de eventuais dúvidas e alinhamento dos próximos passos para o início dos trabalhos."
                    className="w-full bg-white border border-[#D1D2D4] rounded-xl p-3.5 text-sm text-[#1D1D1D] placeholder:text-[#9E9EA0] focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C] transition-all"
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-4 border-t border-[#E8E9EA] bg-[#FAFAFA] flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {saveSuccess && (
                <div className="inline-flex items-center gap-1.5 text-xs text-[#047857] font-semibold bg-[#DCFCE7] px-3 py-1.5 rounded-lg border border-[#BBF7D0]">
                  <Check className="w-4 h-4" />
                  <span>Documento salvo com sucesso!</span>
                </div>
              )}
              {saveError && (
                <div className="inline-flex items-center gap-1.5 text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                  <AlertCircle className="w-4 h-4" />
                  <span>{saveError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                id="btn-cancel-document-editor"
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold text-[#666668] hover:text-[#1D1D1D] bg-white border border-[#E8E9EA] hover:border-[#D1D2D4] rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                Cancelar
              </button>

              <button
                id="btn-save-document"
                type="button"
                onClick={handleSave}
                disabled={isSaving || loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d94a2e] rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar documento</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
