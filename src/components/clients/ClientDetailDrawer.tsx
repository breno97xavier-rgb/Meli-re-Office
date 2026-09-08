import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Mail,
  Phone,
  Globe,
  Instagram,
  Calendar,
  DollarSign,
  FileCheck,
  AlertCircle,
  Loader2,
  Check,
  FileText,
  Clock,
} from 'lucide-react';
import { Client, ClientStatus, UpdateClientInput } from '../../types/clients';
import {
  ClientStatusBadge,
  STATUS_CONFIG,
  formatCurrency,
  formatDate,
} from './ClientStatusBadge';

interface ClientDetailDrawerProps {
  client: Client | null;
  isOpen: boolean;
  isUpdating: boolean;
  updateError: string | null;
  onClose: () => void;
  onUpdateClient: (clientId: string, input: UpdateClientInput) => Promise<boolean>;
}

export const ClientDetailDrawer: React.FC<ClientDetailDrawerProps> = ({
  client,
  isOpen,
  isUpdating,
  updateError,
  onClose,
  onUpdateClient,
}) => {
  // Local form state
  const [formData, setFormData] = useState<UpdateClientInput>({
    name: '',
    commercial_name: '',
    segment: '',
    website: '',
    instagram: '',
    phone: '',
    email: '',
    notes: '',
    status: 'onboarding',
    contract_start_date: '',
    contract_end_date: '',
  });

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync form state when active client changes
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        commercial_name: client.commercial_name || '',
        segment: client.segment || '',
        website: client.website || '',
        instagram: client.instagram || '',
        phone: client.phone || '',
        email: client.email || '',
        notes: client.notes || '',
        status: client.status || 'onboarding',
        contract_start_date: client.contract_start_date || '',
        contract_end_date: client.contract_end_date || '',
      });
      setHasChanges(false);
      setSaveSuccess(false);
    }
  }, [client]);

  if (!isOpen || !client) return null;

  const handleChange = (
    field: keyof UpdateClientInput,
    value: string | ClientStatus | null
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    const success = await onUpdateClient(client.id, formData);
    if (success) {
      setSaveSuccess(true);
      setHasChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const getClientInitials = () => {
    const title = client.commercial_name || client.name || 'CL';
    const parts = title.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return title.slice(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1D1D1D]/30 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white border-l border-[#E8E9EA] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-[#E8E9EA] bg-white flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {client.logo_url ? (
                <img
                  src={client.logo_url}
                  alt={client.commercial_name || client.name}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-xl object-contain bg-white border border-[#E8E9EA] p-1 shrink-0 shadow-2xs"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-[#1D1D1D] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                  {getClientInitials()}
                </div>
              )}

              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-[#1D1D1D] truncate tracking-tight">
                    {client.commercial_name || client.name}
                  </h2>
                  <ClientStatusBadge status={client.status} />
                </div>
                {client.commercial_name && client.commercial_name !== client.name && (
                  <p className="text-xs text-[#666668] truncate">
                    {client.name}
                  </p>
                )}
              </div>
            </div>

            <button
              id="btn-close-client-drawer"
              onClick={onClose}
              className="p-2 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F7F7F8] rounded-lg transition-colors cursor-pointer shrink-0"
              title="Fechar painel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback Banners */}
          {updateError && (
            <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2.5 shadow-2xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{updateError}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2.5 shadow-2xs">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Dados do cliente atualizados com sucesso.</span>
            </div>
          )}

          {/* Form / Scrollable Content */}
          <form
            id="client-drawer-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-6 space-y-6 text-xs"
          >
            {/* 1. Seletor de Status */}
            <div className="space-y-2">
              <label
                htmlFor="client-status-select"
                className="text-xs font-semibold text-[#1D1D1D] block"
              >
                Status do Cliente
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['onboarding', 'active', 'paused', 'ended'] as ClientStatus[]).map(
                  (st) => {
                    const cfg = STATUS_CONFIG[st];
                    const isSelected = formData.status === st;

                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleChange('status', st)}
                        className={`p-2.5 rounded-lg border text-xs font-medium transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? 'border-[#1D1D1D] bg-[#1D1D1D] text-white shadow-xs'
                            : 'border-[#E8E9EA] bg-white text-[#666668] hover:bg-[#F7F7F8] hover:text-[#1D1D1D]'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isSelected ? 'bg-white' : cfg.dot
                          }`}
                        />
                        <span>{cfg.label}</span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* 2. Dados Cadastrais & Empresa */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E8E9EA] pb-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#9E9EA0]" />
                <span>Dados Cadastrais</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label
                    htmlFor="client-commercial-name-input"
                    className="font-medium text-[#1D1D1D] block"
                  >
                    Nome Comercial / Fantasia
                  </label>
                  <input
                    id="client-commercial-name-input"
                    type="text"
                    value={formData.commercial_name || ''}
                    onChange={(e) => handleChange('commercial_name', e.target.value)}
                    placeholder="Ex: Melière Studio"
                    className="w-full bg-white border border-[#E8E9EA] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="client-legal-name-input"
                    className="font-medium text-[#1D1D1D] block"
                  >
                    Razão Social / Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="client-legal-name-input"
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Ex: Melière Marketing Ltda"
                    className="w-full bg-white border border-[#E8E9EA] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label
                    htmlFor="client-segment-input"
                    className="font-medium text-[#1D1D1D] block"
                  >
                    Segmento de Atuação
                  </label>
                  <input
                    id="client-segment-input"
                    type="text"
                    value={formData.segment || ''}
                    onChange={(e) => handleChange('segment', e.target.value)}
                    placeholder="Ex: Saúde, Tecnologia, Varejo, etc."
                    className="w-full bg-white border border-[#E8E9EA] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* 3. Contatos & Presença Digital */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E8E9EA] pb-1.5">
                <Mail className="w-3.5 h-3.5 text-[#9E9EA0]" />
                <span>Contato & Canais</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label
                    htmlFor="client-email-input"
                    className="font-medium text-[#1D1D1D] block"
                  >
                    E-mail Principal
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-[#9E9EA0] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="client-email-input"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="contato@empresa.com"
                      className="w-full bg-white border border-[#E8E9EA] rounded-lg pl-8 pr-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="client-phone-input"
                    className="font-medium text-[#1D1D1D] block"
                  >
                    Telefone / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-[#9E9EA0] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="client-phone-input"
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-white border border-[#E8E9EA] rounded-lg pl-8 pr-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="client-website-input"
                    className="font-medium text-[#1D1D1D] block"
                  >
                    Website
                  </label>
                  <div className="relative">
                    <Globe className="w-3.5 h-3.5 text-[#9E9EA0] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="client-website-input"
                      type="url"
                      value={formData.website || ''}
                      onChange={(e) => handleChange('website', e.target.value)}
                      placeholder="https://empresa.com.br"
                      className="w-full bg-white border border-[#E8E9EA] rounded-lg pl-8 pr-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="client-instagram-input"
                    className="font-medium text-[#1D1D1D] block"
                  >
                    Instagram
                  </label>
                  <div className="relative">
                    <Instagram className="w-3.5 h-3.5 text-[#9E9EA0] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="client-instagram-input"
                      type="text"
                      value={formData.instagram || ''}
                      onChange={(e) => handleChange('instagram', e.target.value)}
                      placeholder="@empresa"
                      className="w-full bg-white border border-[#E8E9EA] rounded-lg pl-8 pr-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Vigência do Contrato */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E8E9EA] pb-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#9E9EA0]" />
                <span>Vigência Contratual</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label
                    htmlFor="client-start-date-input"
                    className="font-medium text-[#1D1D1D] block"
                  >
                    Data de Início
                  </label>
                  <input
                    id="client-start-date-input"
                    type="date"
                    value={formData.contract_start_date || ''}
                    onChange={(e) =>
                      handleChange('contract_start_date', e.target.value || null)
                    }
                    className="w-full bg-white border border-[#E8E9EA] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="client-end-date-input"
                    className="font-medium text-[#1D1D1D] block"
                  >
                    Data de Término
                  </label>
                  <input
                    id="client-end-date-input"
                    type="date"
                    value={formData.contract_end_date || ''}
                    onChange={(e) =>
                      handleChange('contract_end_date', e.target.value || null)
                    }
                    className="w-full bg-white border border-[#E8E9EA] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* 5. Condições Financeiras (Somente Leitura) */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E8E9EA] pb-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#9E9EA0]" />
                <span>Condições Comerciais (Contratadas)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#F7F7F8] border border-[#E8E9EA] rounded-xl p-3 space-y-1">
                  <span className="text-[11px] text-[#666668] font-medium block">
                    Mensalidade Recorrente
                  </span>
                  <span className="text-sm font-bold text-[#1D1D1D] block">
                    {client.monthly_amount !== null && client.monthly_amount !== undefined
                      ? `${formatCurrency(client.monthly_amount)} /mês`
                      : '—'}
                  </span>
                </div>

                <div className="bg-[#F7F7F8] border border-[#E8E9EA] rounded-xl p-3 space-y-1">
                  <span className="text-[11px] text-[#666668] font-medium block">
                    Setup / Valor Pontual
                  </span>
                  <span className="text-sm font-bold text-[#1D1D1D] block">
                    {client.one_time_amount !== null && client.one_time_amount !== undefined
                      ? formatCurrency(client.one_time_amount)
                      : '—'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-[#9E9EA0] italic">
                * Os valores financeiros são de caráter histórico e vinculados ao contrato de conversão.
              </p>
            </div>

            {/* 6. Origem Comercial */}
            {(client.origin_contract_id || client.origin_opportunity_id) && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E8E9EA] pb-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-[#9E9EA0]" />
                  <span>Origem Comercial</span>
                </h3>

                <div className="bg-[#F7F7F8] border border-[#E8E9EA] rounded-xl divide-y divide-[#E8E9EA] text-xs">
                  {client.origin_contract_id && (
                    <div className="p-3 flex items-center justify-between gap-3">
                      <span className="text-[#666668]">Contrato de Origem</span>
                      <div className="font-semibold text-[#1D1D1D] flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#F15A3C]" />
                        <span>
                          {client.origin_contract?.contract_number ||
                            `Contrato #${client.origin_contract_id.slice(0, 8)}`}
                        </span>
                        {client.origin_contract?.title && (
                          <span className="text-[#666668] font-normal truncate max-w-[140px]">
                            ({client.origin_contract.title})
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {client.origin_opportunity_id && (
                    <div className="p-3 flex items-center justify-between gap-3">
                      <span className="text-[#666668]">Oportunidade Comercial</span>
                      <span className="font-medium text-[#1D1D1D] truncate max-w-[200px]">
                        {client.origin_opportunity?.title ||
                          `#${client.origin_opportunity_id.slice(0, 8)}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 7. Observações Internas */}
            <div className="space-y-2 pt-2">
              <label
                htmlFor="client-notes-textarea"
                className="font-medium text-[#1D1D1D] block"
              >
                Observações Internas
              </label>
              <textarea
                id="client-notes-textarea"
                rows={3}
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Anotações e diretrizes sobre a operação do cliente..."
                className="w-full bg-white border border-[#E8E9EA] rounded-lg p-3 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all leading-relaxed"
              />
            </div>

            {/* 8. Registro de Sistema */}
            <div className="pt-2 border-t border-[#E8E9EA] flex items-center justify-between text-[11px] text-[#9E9EA0]">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Criado em: {formatDate(client.created_at)}</span>
              </div>
              <div>
                <span>Atualizado em: {formatDate(client.updated_at)}</span>
              </div>
            </div>
          </form>

          {/* Footer Actions */}
          <div className="p-4 border-t border-[#E8E9EA] bg-[#FAFAFA] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#666668] bg-white border border-[#E8E9EA] rounded-lg hover:bg-[#F2F3F3] hover:text-[#1D1D1D] transition-all cursor-pointer shadow-2xs"
            >
              Fechar
            </button>

            <button
              type="button"
              id="btn-save-client-drawer"
              onClick={handleSubmit}
              disabled={isUpdating || !hasChanges}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#1D1D1D] hover:bg-black rounded-lg transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isUpdating ? (
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
        </div>
      </div>
    </div>
  );
};
