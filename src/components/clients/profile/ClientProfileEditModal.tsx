import React, { useState, useEffect } from 'react';
import {
  Building2,
  X,
  Check,
  Loader2,
  AlertCircle,
  FileText,
  DollarSign,
  Calendar,
  ShieldCheck,
  Tag,
  Mail,
  Phone,
  Globe,
  Instagram,
  Info,
} from 'lucide-react';
import { Client, ClientStatus, UpdateClientInput } from '../../../types/clients';
import { STATUS_CONFIG, formatCurrency, formatDate } from '../ClientStatusBadge';

interface ClientProfileEditModalProps {
  isOpen: boolean;
  client: Client;
  onClose: () => void;
  onSave: (input: UpdateClientInput) => Promise<boolean>;
  isSaving: boolean;
  error: string | null;
}

export const ClientProfileEditModal: React.FC<ClientProfileEditModalProps> = ({
  isOpen,
  client,
  onClose,
  onSave,
  isSaving,
  error,
}) => {
  const [formData, setFormData] = useState<UpdateClientInput>({
    name: client.name || '',
    commercial_name: client.commercial_name || '',
    segment: client.segment || '',
    website: client.website || '',
    instagram: client.instagram || '',
    phone: client.phone || '',
    email: client.email || '',
    notes: client.notes || '',
    status: client.status,
    contract_start_date: client.contract_start_date || '',
    contract_end_date: client.contract_end_date || '',
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: client.name || '',
        commercial_name: client.commercial_name || '',
        segment: client.segment || '',
        website: client.website || '',
        instagram: client.instagram || '',
        phone: client.phone || '',
        email: client.email || '',
        notes: client.notes || '',
        status: client.status,
        contract_start_date: client.contract_start_date ? client.contract_start_date.split('T')[0] : '',
        contract_end_date: client.contract_end_date ? client.contract_end_date.split('T')[0] : '',
      });
      setValidationError(null);
    }
  }, [isOpen, client]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setValidationError('A razão social é obrigatória.');
      return;
    }

    setValidationError(null);

    const payload: UpdateClientInput = {
      name: formData.name.trim(),
      commercial_name: formData.commercial_name?.trim() || null,
      segment: formData.segment?.trim() || null,
      website: formData.website?.trim() || null,
      instagram: formData.instagram?.trim() || null,
      phone: formData.phone?.trim() || null,
      email: formData.email?.trim() || null,
      notes: formData.notes?.trim() || null,
      status: formData.status,
      contract_start_date: formData.contract_start_date || null,
      contract_end_date: formData.contract_end_date || null,
    };

    const success = await onSave(payload);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[#1D1D1D]/50 backdrop-blur-xs">
      <div className="bg-white border border-[#E8E9EA] rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-[#E8E9EA] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1D1D1D] text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5 text-[#F15A3C]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1D1D1D]">
                Editar Dados do Cliente
              </h3>
              <p className="text-xs text-[#666668] mt-0.5">
                Atualize as informações cadastrais e status operacional do cliente.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F7F7F8] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {(validationError || error) && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2.5 shadow-2xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError || error}</span>
            </div>
          )}

          {/* Seção 1: Identificação e Status */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9EA0] pb-1 border-b border-[#E8E9EA]">
              Identificação & Status
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#1D1D1D] block">
                  Razão Social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome formal / Razão social"
                  className="w-full bg-white border border-[#E8E9EA] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#1D1D1D] block">
                  Nome Comercial / Fantasia
                </label>
                <input
                  type="text"
                  value={formData.commercial_name || ''}
                  onChange={(e) => setFormData({ ...formData, commercial_name: e.target.value })}
                  placeholder="Nome de exibição diário"
                  className="w-full bg-white border border-[#E8E9EA] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#1D1D1D] block">
                  Segmento de Atuação
                </label>
                <input
                  type="text"
                  value={formData.segment || ''}
                  onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                  placeholder="Ex: Varejo, Saúde, Tecnologia, Serviços"
                  className="w-full bg-white border border-[#E8E9EA] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#1D1D1D] block">
                  Status Operacional
                </label>
                <select
                  value={formData.status || 'onboarding'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ClientStatus })}
                  className="w-full bg-white border border-[#E8E9EA] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all cursor-pointer font-medium"
                >
                  <option value="onboarding">Onboarding</option>
                  <option value="active">Ativo</option>
                  <option value="paused">Pausado</option>
                  <option value="ended">Encerrado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Seção 2: Contato & Canais Digitais */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9EA0] pb-1 border-b border-[#E8E9EA]">
              Canais de Contato & Presença Digital
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#1D1D1D] block">
                  E-mail Principal
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contato@empresa.com"
                  className="w-full bg-white border border-[#E8E9EA] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#1D1D1D] block">
                  Telefone Geral
                </label>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-white border border-[#E8E9EA] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#1D1D1D] block">
                  Website
                </label>
                <input
                  type="text"
                  value={formData.website || ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://empresa.com.br"
                  className="w-full bg-white border border-[#E8E9EA] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#1D1D1D] block">
                  Instagram
                </label>
                <input
                  type="text"
                  value={formData.instagram || ''}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder="@perfil"
                  className="w-full bg-white border border-[#E8E9EA] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Vigência Contratual */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9EA0] pb-1 border-b border-[#E8E9EA]">
              Vigência Contratual
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#1D1D1D] block">
                  Data de Início
                </label>
                <input
                  type="date"
                  value={formData.contract_start_date || ''}
                  onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
                  className="w-full bg-white border border-[#E8E9EA] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#1D1D1D] block">
                  Data de Término
                </label>
                <input
                  type="date"
                  value={formData.contract_end_date || ''}
                  onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                  className="w-full bg-white border border-[#E8E9EA] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Seção 4: Valores Financeiros e Origem Comercial (Somente Leitura) */}
          <div className="space-y-3 bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl p-4 text-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E8E9EA]">
              <ShieldCheck className="w-4 h-4 text-[#F15A3C]" />
              <span className="font-bold text-[#1D1D1D] text-xs">
                Dados Comerciais & Financeiros de Origem (Somente Leitura)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <span className="text-[10px] text-[#666668] block">Mensalidade</span>
                <span className="font-bold text-[#1D1D1D] block mt-0.5">
                  {client.monthly_amount !== null && client.monthly_amount !== undefined
                    ? `${formatCurrency(client.monthly_amount)}/mês`
                    : '—'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-[#666668] block">Setup / Pontual</span>
                <span className="font-bold text-[#1D1D1D] block mt-0.5">
                  {client.one_time_amount !== null && client.one_time_amount !== undefined
                    ? formatCurrency(client.one_time_amount)
                    : '—'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-[#666668] block">Contrato de Origem</span>
                <span className="font-medium text-[#1D1D1D] block mt-0.5 truncate">
                  {client.origin_contract?.contract_number || (client.origin_contract_id ? `#${client.origin_contract_id.slice(0, 8)}` : 'Nenhum')}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-[#666668] block">Oportunidade Origem</span>
                <span className="font-medium text-[#1D1D1D] block mt-0.5 truncate">
                  {client.origin_opportunity?.title || (client.origin_opportunity_id ? `#${client.origin_opportunity_id.slice(0, 8)}` : 'Nenhum')}
                </span>
              </div>
            </div>
          </div>

          {/* Seção 5: Observações */}
          <div className="space-y-1 text-xs">
            <label className="font-semibold text-[#1D1D1D] block">
              Observações Internas
            </label>
            <textarea
              rows={3}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Anotações gerais, orientações de atendimento..."
              className="w-full bg-white border border-[#E8E9EA] rounded-lg p-3 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all leading-relaxed"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-[#E8E9EA] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#666668] hover:text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#EDEEEE] rounded-lg transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white bg-[#1D1D1D] hover:bg-black rounded-lg transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
