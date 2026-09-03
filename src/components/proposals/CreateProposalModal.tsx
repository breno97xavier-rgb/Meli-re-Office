import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Calendar,
  Briefcase,
  FileText,
  DollarSign,
  Sparkles,
} from 'lucide-react';
import { Opportunity } from '../../types/opportunities';
import {
  CreateProposalInput,
  CreateProposalItemInput,
  ProposalBillingType,
} from '../../types/proposals';
import { formatCurrency } from './ProposalStatusBadge';

interface CreateProposalModalProps {
  isOpen: boolean;
  initialOpportunity?: Opportunity | null;
  opportunities?: Opportunity[];
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (input: CreateProposalInput) => Promise<boolean>;
}

const SERVICE_KEY_OPTIONS = [
  { value: '', label: 'Nenhum / Personalizado' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'paid_traffic', label: 'Tráfego Pago' },
  { value: 'website', label: 'Criação de Site' },
  { value: 'branding', label: 'Identidade & Branding' },
  { value: 'other', label: 'Outro Serviço' },
];

const EMPTY_OPPORTUNITIES: Opportunity[] = [];

const DEFAULT_ITEM: CreateProposalItemInput = {
  description: '',
  service_key: null,
  billing_type: 'monthly',
  quantity: 1,
  unit_price: 0,
};

export const CreateProposalModal: React.FC<CreateProposalModalProps> = ({
  isOpen,
  initialOpportunity,
  opportunities = EMPTY_OPPORTUNITIES,
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
}) => {
  const [selectedOpportunityId, setSelectedOpportunityId] = useState('');
  const [title, setTitle] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [items, setItems] = useState<CreateProposalItemInput[]>([
    { ...DEFAULT_ITEM },
  ]);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize/Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialOpportunity) {
        setSelectedOpportunityId(initialOpportunity.id);
        setTitle(`Proposta Comercial — ${initialOpportunity.title}`);
      } else {
        const firstOpp = opportunities[0];
        setSelectedOpportunityId(firstOpp?.id || '');
        if (firstOpp) {
          setTitle(`Proposta Comercial — ${firstOpp.title}`);
        } else {
          setTitle('');
        }
      }

      // Default valid until: 15 days from today
      const d = new Date();
      d.setDate(d.getDate() + 15);
      const defaultDateStr = d.toISOString().split('T')[0];
      setValidUntil(defaultDateStr);

      setNotes('');
      setTerms(
        '1. Validade da proposta: 15 dias.\n2. Início das atividades em até 5 dias úteis após confirmação do contrato.'
      );
      setItems([{ ...DEFAULT_ITEM }]);
      setValidationError(null);
    }
  }, [isOpen, initialOpportunity?.id]);

  if (!isOpen) return null;

  const handleOpportunityChange = (oppId: string) => {
    setSelectedOpportunityId(oppId);
    const opp = opportunities.find((o) => o.id === oppId);
    if (opp && (!title || title.startsWith('Proposta Comercial — '))) {
      setTitle(`Proposta Comercial — ${opp.title}`);
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { ...DEFAULT_ITEM }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof CreateProposalItemInput,
    value: unknown
  ) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        return {
          ...item,
          [field]: value,
        };
      })
    );
  };

  // Calculate real-time totals
  const monthlyTotal = items.reduce((acc, item) => {
    if (item.billing_type === 'monthly') {
      return acc + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    }
    return acc;
  }, 0);

  const oneTimeTotal = items.reduce((acc, item) => {
    if (item.billing_type === 'one_time') {
      return acc + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    }
    return acc;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!selectedOpportunityId) {
      setValidationError('Selecione uma oportunidade vinculada.');
      return;
    }

    if (!title.trim()) {
      setValidationError('O título da proposta é obrigatório.');
      return;
    }

    if (items.length === 0) {
      setValidationError('Adicione pelo menos um item à proposta.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.description.trim()) {
        setValidationError(`A descrição do item ${i + 1} é obrigatória.`);
        return;
      }
      if (item.quantity < 1) {
        setValidationError(`A quantidade do item ${i + 1} deve ser pelo menos 1.`);
        return;
      }
      if (item.unit_price < 0) {
        setValidationError(
          `O preço unitário do item ${i + 1} não pode ser negativo.`
        );
        return;
      }
    }

    const payload: CreateProposalInput = {
      opportunity_id: selectedOpportunityId,
      title: title.trim(),
      valid_until: validUntil || null,
      notes: notes.trim() || null,
      terms: terms.trim() || null,
      items: items.map((item, idx) => ({
        description: item.description.trim(),
        service_key: item.service_key || null,
        billing_type: item.billing_type,
        quantity: Math.floor(item.quantity),
        unit_price: Number(item.unit_price),
        display_order: idx,
      })),
    };

    const success = await onSubmit(payload);
    if (success) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1D1D1D]/40 backdrop-blur-xs z-[60] transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        onClick={onClose}
      >
        <div
          id="create-proposal-modal"
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-[#E8E9EA] overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-150 relative z-10"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#E8E9EA] bg-[#FAFAFA] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FDF1EE] text-[#F15A3C] flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1D1D1D]">
                  Nova Proposta Comercial
                </h3>
                <p className="text-xs text-[#666668] mt-0.5">
                  Elabore o escopo de serviços e valores para a negociação.
                </p>
              </div>
            </div>

            <button
              id="btn-close-create-proposal-modal"
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#E8E9EA]/60 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-6 space-y-6"
          >
            {/* Error Banners */}
            {(validationError || submitError) && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{validationError || submitError}</span>
              </div>
            )}

            {/* Opportunity Selection & Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Oportunidade */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#666668] flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-[#9E9EA0]" />
                  <span>Oportunidade Vinculada *</span>
                </label>

                {initialOpportunity ? (
                  <div className="w-full bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg px-3 py-2 text-xs font-medium text-[#1D1D1D] truncate">
                    {initialOpportunity.title}
                    {initialOpportunity.lead && (
                      <span className="text-[#666668] font-normal">
                        {' '}
                        • {initialOpportunity.lead.name}
                      </span>
                    )}
                  </div>
                ) : (
                  <select
                    id="select-proposal-opportunity"
                    required
                    value={selectedOpportunityId}
                    onChange={(e) => handleOpportunityChange(e.target.value)}
                    className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C] cursor-pointer"
                  >
                    {opportunities.length === 0 ? (
                      <option value="">Nenhuma oportunidade disponível</option>
                    ) : (
                      opportunities.map((opp) => (
                        <option key={opp.id} value={opp.id}>
                          {opp.title}{' '}
                          {opp.lead?.name ? `(${opp.lead.name})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              {/* Título da Proposta */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#666668] block">
                  Título da Proposta *
                </label>
                <input
                  type="text"
                  required
                  id="input-proposal-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Proposta Comercial — Tráfego e Social Media"
                  className="w-full bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:bg-white focus:outline-none focus:border-[#F15A3C]"
                />
              </div>
            </div>

            {/* Validade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#666668] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#9E9EA0]" />
                  <span>Validade da Proposta</span>
                </label>
                <input
                  type="date"
                  id="input-proposal-valid-until"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:bg-white focus:outline-none focus:border-[#F15A3C]"
                />
              </div>
            </div>

            {/* Section: Proposal Items Dynamic Builder */}
            <div className="space-y-3 pt-2 border-t border-[#E8E9EA]">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider">
                    Itens e Serviços da Proposta
                  </h4>
                  <p className="text-[11px] text-[#666668] mt-0.5">
                    Adicione os serviços acordados, especificando recorrência e valor.
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-add-proposal-item"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#F15A3C] bg-[#FDF1EE] hover:bg-[#FBE4DF] border border-[#FBC3B8] rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Serviço</span>
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {items.map((item, idx) => {
                  const lineSubtotal =
                    (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);

                  return (
                    <div
                      key={idx}
                      className="p-4 bg-[#F9F9FA] border border-[#E8E9EA] rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-[#666668] uppercase tracking-wider">
                          Item {idx + 1}
                        </span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-[#9E9EA0] hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Remover item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        {/* Descrição */}
                        <div className="sm:col-span-5 space-y-1">
                          <label className="text-[11px] text-[#666668] block">
                            Descrição do Serviço *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Gestão de Tráfego Pago"
                            value={item.description}
                            onChange={(e) =>
                              handleItemChange(idx, 'description', e.target.value)
                            }
                            className="w-full bg-white border border-[#D1D2D4] rounded-lg px-2.5 py-1.5 text-xs text-[#1D1D1D] focus:outline-none focus:border-[#F15A3C]"
                          />
                        </div>

                        {/* Service Key Opcional */}
                        <div className="sm:col-span-3 space-y-1">
                          <label className="text-[11px] text-[#666668] block">
                            Categoria
                          </label>
                          <select
                            value={item.service_key || ''}
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                'service_key',
                                e.target.value || null
                              )
                            }
                            className="w-full bg-white border border-[#D1D2D4] rounded-lg px-2.5 py-1.5 text-xs text-[#1D1D1D] focus:outline-none focus:border-[#F15A3C] cursor-pointer"
                          >
                            {SERVICE_KEY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Tipo de Cobrança */}
                        <div className="sm:col-span-4 space-y-1">
                          <label className="text-[11px] text-[#666668] block">
                            Cobrança *
                          </label>
                          <select
                            value={item.billing_type}
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                'billing_type',
                                e.target.value as ProposalBillingType
                              )
                            }
                            className="w-full bg-white border border-[#D1D2D4] rounded-lg px-2.5 py-1.5 text-xs text-[#1D1D1D] focus:outline-none focus:border-[#F15A3C] cursor-pointer"
                          >
                            <option value="monthly">Mensal (Recorrente)</option>
                            <option value="one_time">Pontual (Projeto)</option>
                          </select>
                        </div>
                      </div>

                      {/* Quantidade, Preço Unitário e Subtotal da Linha */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-[#E8E9EA]/80 items-end">
                        <div className="sm:col-span-3 space-y-1">
                          <label className="text-[11px] text-[#666668] block">
                            Quantidade
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                'quantity',
                                parseInt(e.target.value, 10) || 1
                              )
                            }
                            className="w-full bg-white border border-[#D1D2D4] rounded-lg px-2.5 py-1.5 text-xs text-[#1D1D1D] focus:outline-none focus:border-[#F15A3C]"
                          />
                        </div>

                        <div className="sm:col-span-4 space-y-1">
                          <label className="text-[11px] text-[#666668] block">
                            Preço Unitário (R$) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            placeholder="0.00"
                            value={item.unit_price}
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                'unit_price',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full bg-white border border-[#D1D2D4] rounded-lg px-2.5 py-1.5 text-xs text-[#1D1D1D] focus:outline-none focus:border-[#F15A3C]"
                          />
                        </div>

                        <div className="sm:col-span-5 flex items-center justify-end gap-2 py-1.5">
                          <span className="text-[11px] text-[#666668]">Subtotal:</span>
                          <span className="text-xs font-bold text-[#1D1D1D]">
                            {formatCurrency(lineSubtotal)}
                            <span className="text-[10px] font-normal text-[#666668]">
                              {item.billing_type === 'monthly' ? ' /mês' : ''}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Derived Real-Time Summary Cards */}
            <div className="p-4 bg-[#F2F3F3] rounded-xl border border-[#E8E9EA] grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-[#E8E9EA] flex items-center justify-center text-[#F15A3C]">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-[#666668] block">
                    Total Mensal (Recorrente)
                  </span>
                  <span className="text-base font-bold text-[#1D1D1D]">
                    {formatCurrency(monthlyTotal)}
                    <span className="text-xs font-normal text-[#666668]"> /mês</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-[#E8E9EA] flex items-center justify-center text-[#3B82F6]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-[#666668] block">
                    Total Pontual (Projeto)
                  </span>
                  <span className="text-base font-bold text-[#1D1D1D]">
                    {formatCurrency(oneTimeTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Observações & Termos */}
            <div className="space-y-4 pt-2 border-t border-[#E8E9EA]">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#666668] block">
                  Observações Gerais (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Escopo contempla 12 posts mensais e relatórios quinzenais."
                  className="w-full bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg p-2.5 text-xs text-[#1D1D1D] focus:bg-white focus:outline-none focus:border-[#F15A3C]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#666668] block">
                  Termos & Condições Comerciais
                </label>
                <textarea
                  rows={3}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="Condições de pagamento, prazos de entrega e validade."
                  className="w-full bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg p-2.5 text-xs text-[#1D1D1D] focus:bg-white focus:outline-none focus:border-[#F15A3C]"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-[#E8E9EA] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                id="btn-submit-proposal"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d94a2e] rounded-lg transition-all shadow-2xs disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Criando Proposta...</span>
                  </>
                ) : (
                  <span>Criar Proposta</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
