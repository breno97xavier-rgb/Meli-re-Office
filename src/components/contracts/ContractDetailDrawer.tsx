import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Building2,
  Calendar,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Check,
  RotateCw,
  FileText,
  FileCheck,
  Edit3,
  Save,
  AlertTriangle,
  FileSignature,
  ExternalLink,
} from 'lucide-react';
import {
  Contract,
  ContractStatus,
  UpdateContractOperationalInput,
} from '../../types/contracts';
import {
  ContractStatusBadge,
  getContractStatusLabel,
  formatDate,
  formatDateTime,
  calculateContractDuration,
  isContractExpiringSoon,
  isContractExpired,
} from './ContractStatusBadge';

interface ContractDetailDrawerProps {
  contract: Contract | null;
  isOpen: boolean;
  isUpdating: boolean;
  updateError: string | null;
  isTransitioning: boolean;
  transitionError: string | null;
  onClose: () => void;
  onTransitionStatus: (
    contractId: string,
    targetStatus: ContractStatus,
    reason?: string | null
  ) => Promise<boolean>;
  onUpdateContract: (
    id: string,
    updates: UpdateContractOperationalInput
  ) => Promise<boolean>;
}

export const ContractDetailDrawer: React.FC<ContractDetailDrawerProps> = ({
  contract,
  isOpen,
  isUpdating,
  updateError,
  isTransitioning,
  transitionError,
  onClose,
  onTransitionStatus,
  onUpdateContract,
}) => {
  // Edit mode for draft status
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [autoRenewal, setAutoRenewal] = useState(true);
  const [renewalPeriodMonths, setRenewalPeriodMonths] = useState<number | ''>(12);
  const [cancellationNoticeDays, setCancellationNoticeDays] = useState<number | ''>(30);
  const [specialTerms, setSpecialTerms] = useState('');
  const [notes, setNotes] = useState('');

  // Status transition modal with reason
  const [reasonModal, setReasonModal] = useState<{
    isOpen: boolean;
    targetStatus: 'cancelled' | 'terminated';
    reason: string;
  }>({
    isOpen: false,
    targetStatus: 'cancelled',
    reason: '',
  });

  const [reasonError, setReasonError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Sync edit state when contract changes
  useEffect(() => {
    if (contract) {
      setTitle(contract.title || '');
      setStartDate(contract.start_date || '');
      setEndDate(contract.end_date || '');
      setAutoRenewal(Boolean(contract.auto_renewal));
      setRenewalPeriodMonths(contract.renewal_period_months ?? 12);
      setCancellationNoticeDays(contract.cancellation_notice_days ?? 30);
      setSpecialTerms(contract.special_terms || '');
      setNotes(contract.notes || '');
      setIsEditing(false);
      setReasonModal({ isOpen: false, targetStatus: 'cancelled', reason: '' });
      setReasonError(null);
    }
  }, [contract?.id, isOpen]);

  if (!isOpen || !contract) return null;

  const duration = calculateContractDuration(contract.start_date, contract.end_date);
  const isDraft = contract.status === 'draft';
  const isPending = contract.status === 'pending_signature';
  const isSigned = contract.status === 'signed';
  const isFinal = contract.status === 'cancelled' || contract.status === 'terminated';
  const expiringSoon = isContractExpiringSoon(contract);
  const expired = isContractExpired(contract);

  const handleSaveEdit = async () => {
    if (!title.trim()) {
      return;
    }

    const updates: UpdateContractOperationalInput = {
      title: title.trim(),
      start_date: startDate || null,
      end_date: endDate || null,
      auto_renewal: autoRenewal,
      renewal_period_months: autoRenewal && renewalPeriodMonths !== '' ? Number(renewalPeriodMonths) : null,
      cancellation_notice_days: cancellationNoticeDays !== '' ? Number(cancellationNoticeDays) : null,
      special_terms: specialTerms.trim() || null,
      notes: notes.trim() || null,
    };

    const ok = await onUpdateContract(contract.id, updates);
    if (ok) {
      setIsEditing(false);
      setSaveSuccessMessage('Contrato atualizado com sucesso!');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    }
  };

  const handleDirectTransition = async (target: ContractStatus) => {
    const ok = await onTransitionStatus(contract.id, target, null);
    if (ok) {
      setSaveSuccessMessage(`Status alterado para ${getContractStatusLabel(target)}.`);
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    }
  };

  const handleOpenReasonModal = (target: 'cancelled' | 'terminated') => {
    setReasonModal({
      isOpen: true,
      targetStatus: target,
      reason: '',
    });
    setReasonError(null);
  };

  const handleConfirmReasonTransition = async () => {
    if (!reasonModal.reason.trim()) {
      setReasonError('O motivo é obrigatório para esta operação.');
      return;
    }

    const ok = await onTransitionStatus(
      contract.id,
      reasonModal.targetStatus,
      reasonModal.reason.trim()
    );

    if (ok) {
      setReasonModal({ isOpen: false, targetStatus: 'cancelled', reason: '' });
      setSaveSuccessMessage(
        `Contrato ${
          reasonModal.targetStatus === 'cancelled' ? 'cancelado' : 'encerrado'
        } com sucesso.`
      );
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1D1D1D]/40 backdrop-blur-xs z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div
        id="contract-detail-drawer"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl border-l border-[#E8E9EA] flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#E8E9EA] bg-[#FAFAFA] flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#1D1D1D] text-white">
                {contract.contract_number}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-semibold bg-[#F2F3F3] text-[#1D1D1D] border border-[#E8E9EA]">
                v{contract.version}
              </span>
              <ContractStatusBadge status={contract.status} size="md" />
              {expiringSoon && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Vencendo em breve</span>
                </span>
              )}
              {expired && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Vencido</span>
                </span>
              )}
            </div>

            <h2 className="text-xl font-semibold text-[#1D1D1D] mt-2">
              {contract.title}
            </h2>

            {contract.opportunity?.lead && (
              <p className="text-sm font-medium text-[#666668] mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-[#1D1D1D] font-semibold">
                  <User className="w-3.5 h-3.5 text-[#F15A3C]" />
                  <span>{contract.opportunity.lead.name}</span>
                </span>
                {contract.opportunity.lead.business_name && (
                  <span className="text-[#9E9EA0]">
                    ({contract.opportunity.lead.business_name})
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isDraft && !isEditing && (
              <button
                id="btn-edit-contract"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg hover:bg-[#F7F7F8] hover:border-[#D1D2D4] transition-all cursor-pointer shadow-2xs"
                title="Editar dados operacionais do contrato"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#F15A3C]" />
                <span>Editar</span>
              </button>
            )}
            <button
              id="btn-close-contract-drawer"
              onClick={onClose}
              className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#E8E9EA]/60 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notification / Success Banners */}
          {saveSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          {(updateError || transitionError) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{updateError || transitionError}</span>
            </div>
          )}

          {/* Action Bar / Status Transition Controls */}
          <div className="bg-[#F7F7F8] border border-[#E8E9EA] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#666668] uppercase tracking-wider">
                Ações do Ciclo de Vida
              </span>
              {isTransitioning && (
                <div className="flex items-center gap-1.5 text-xs text-[#F15A3C] font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processando transição...</span>
                </div>
              )}
            </div>

            {isDraft && (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  id="btn-send-to-signature"
                  onClick={() => handleDirectTransition('pending_signature')}
                  disabled={isTransitioning || isUpdating}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar para Assinatura</span>
                </button>
                <button
                  id="btn-cancel-contract-draft"
                  onClick={() => handleOpenReasonModal('cancelled')}
                  disabled={isTransitioning || isUpdating}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancelar Contrato</span>
                </button>
              </div>
            )}

            {isPending && (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  id="btn-mark-as-signed"
                  onClick={() => handleDirectTransition('signed')}
                  disabled={isTransitioning || isUpdating}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#047857] hover:bg-[#065F46] rounded-lg transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Marcar como Assinado</span>
                </button>
                <button
                  id="btn-cancel-contract-pending"
                  onClick={() => handleOpenReasonModal('cancelled')}
                  disabled={isTransitioning || isUpdating}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancelar Contrato</span>
                </button>
              </div>
            )}

            {isSigned && (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  id="btn-terminate-contract"
                  onClick={() => handleOpenReasonModal('terminated')}
                  disabled={isTransitioning || isUpdating}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#71717A] bg-white border border-[#D4D4D8] hover:bg-[#F4F4F5] hover:text-[#18181B] rounded-lg transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Encerrar Contrato (Rescisão/Término)</span>
                </button>
              </div>
            )}

            {isFinal && (
              <div className="text-xs text-[#666668]">
                Este contrato está em estado final (
                <strong>{getContractStatusLabel(contract.status)}</strong>) e não permite novas transições.
              </div>
            )}
          </div>

          {/* Edit Form (Active when isEditing) */}
          {isEditing ? (
            <div className="bg-white border-2 border-[#F15A3C]/30 rounded-xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#E8E9EA] pb-3">
                <h3 className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-[#F15A3C]" />
                  <span>Editando Contrato em Rascunho</span>
                </h3>
                <span className="text-[11px] text-[#666668]">
                  Apenas dados operacionais editáveis
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1D1D1D]">
                  Título do Contrato
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1D1D1D]">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1D1D1D]">
                    Data de Término
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C]"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-[#E8E9EA]">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRenewal}
                    onChange={(e) => setAutoRenewal(e.target.checked)}
                    className="w-4 h-4 rounded text-[#F15A3C] border-[#D1D2D4] focus:ring-[#F15A3C]"
                  />
                  <span className="text-xs font-medium text-[#1D1D1D]">
                    Renovação Automática
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#666668]">
                      Período de Renovação (meses)
                    </label>
                    <input
                      type="number"
                      min="1"
                      disabled={!autoRenewal}
                      value={renewalPeriodMonths}
                      onChange={(e) =>
                        setRenewalPeriodMonths(
                          e.target.value === '' ? '' : parseInt(e.target.value, 10)
                        )
                      }
                      className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#666668]">
                      Aviso Prévio (dias)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={cancellationNoticeDays}
                      onChange={(e) =>
                        setCancellationNoticeDays(
                          e.target.value === '' ? '' : parseInt(e.target.value, 10)
                        )
                      }
                      className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3 py-2 text-xs text-[#1D1D1D]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#E8E9EA]">
                <label className="text-xs font-semibold text-[#1D1D1D]">
                  Condições Especiais
                </label>
                <textarea
                  rows={3}
                  value={specialTerms}
                  onChange={(e) => setSpecialTerms(e.target.value)}
                  className="w-full bg-white border border-[#D1D2D4] rounded-lg p-2.5 text-xs text-[#1D1D1D]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1D1D1D]">
                  Observações Internas
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-[#D1D2D4] rounded-lg p-2.5 text-xs text-[#1D1D1D]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8E9EA]">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isUpdating}
                  className="px-3 py-1.5 text-xs font-medium text-[#666668] bg-white border border-[#E8E9EA] rounded-lg hover:bg-[#F2F3F3]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d94a2e] rounded-lg transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}

          {/* Section: Origem Comercial */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#9E9EA0]" />
              <span>Origem Comercial</span>
            </h3>

            <div className="bg-white border border-[#E8E9EA] rounded-xl divide-y divide-[#E8E9EA]">
              {/* Oportunidade */}
              <div className="p-3.5 flex items-center justify-between gap-4">
                <div className="text-xs text-[#666668]">Oportunidade Vinculada</div>
                <div className="text-xs font-semibold text-[#1D1D1D]">
                  {contract.opportunity?.title || 'Oportunidade'}
                </div>
              </div>

              {/* Proposta */}
              <div className="p-3.5 flex items-center justify-between gap-4">
                <div className="text-xs text-[#666668]">Proposta Comercial</div>
                <div className="text-xs font-medium text-[#1D1D1D] flex items-center gap-2">
                  <span>{contract.proposal?.title || 'Proposta de Origem'}</span>
                  {contract.proposal && (
                    <span className="font-mono text-[10px] bg-[#F2F3F3] px-1.5 py-0.2 rounded border border-[#E8E9EA]">
                      v{contract.proposal.version}
                    </span>
                  )}
                </div>
              </div>

              {/* Lead / Cliente */}
              {contract.opportunity?.lead && (
                <div className="p-3.5 space-y-1">
                  <div className="text-xs text-[#666668]">Cliente / Contato</div>
                  <div className="text-xs font-medium text-[#1D1D1D] flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#1D1D1D]">
                      {contract.opportunity.lead.name}
                    </span>
                    {contract.opportunity.lead.business_name && (
                      <span className="text-[#666668]">
                        ({contract.opportunity.lead.business_name})
                      </span>
                    )}
                    {contract.opportunity.lead.email && (
                      <span className="text-[#9E9EA0]">
                        • {contract.opportunity.lead.email}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Vigência e Duração */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#9E9EA0]" />
              <span>Vigência e Prazos</span>
            </h3>

            <div className="bg-white border border-[#E8E9EA] rounded-xl divide-y divide-[#E8E9EA]">
              <div className="p-3.5 flex items-center justify-between gap-4">
                <div className="text-xs text-[#666668]">Data de Início</div>
                <div className="text-xs font-medium text-[#1D1D1D]">
                  {formatDate(contract.start_date)}
                </div>
              </div>

              <div className="p-3.5 flex items-center justify-between gap-4">
                <div className="text-xs text-[#666668]">Data de Término</div>
                <div className="text-xs font-medium text-[#1D1D1D]">
                  {contract.end_date ? formatDate(contract.end_date) : 'Indeterminado'}
                </div>
              </div>

              {duration && (
                <div className="p-3.5 flex items-center justify-between gap-4 bg-[#FAFAFA]">
                  <div className="text-xs font-medium text-[#666668]">
                    Duração Contratual
                  </div>
                  <div className="text-xs font-bold text-[#1D1D1D]">{duration}</div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Renovação e Aviso Prévio */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5 text-[#9E9EA0]" />
              <span>Renovação e Rescisão</span>
            </h3>

            <div className="bg-white border border-[#E8E9EA] rounded-xl divide-y divide-[#E8E9EA]">
              <div className="p-3.5 flex items-center justify-between gap-4">
                <div className="text-xs text-[#666668]">Renovação Automática</div>
                <div className="text-xs font-medium">
                  {contract.auto_renewal ? (
                    <span className="text-[#047857] font-semibold bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0]">
                      Sim (Ativa)
                    </span>
                  ) : (
                    <span className="text-[#666668]">Não</span>
                  )}
                </div>
              </div>

              {contract.auto_renewal && contract.renewal_period_months && (
                <div className="p-3.5 flex items-center justify-between gap-4">
                  <div className="text-xs text-[#666668]">Período de Renovação</div>
                  <div className="text-xs font-medium text-[#1D1D1D]">
                    {contract.renewal_period_months} meses
                  </div>
                </div>
              )}

              {contract.cancellation_notice_days !== null && (
                <div className="p-3.5 flex items-center justify-between gap-4">
                  <div className="text-xs text-[#666668]">Aviso Prévio para Rescisão</div>
                  <div className="text-xs font-medium text-[#1D1D1D]">
                    {contract.cancellation_notice_days} dias
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Condições Especiais & Notas */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider">
              Condições e Observações
            </h3>

            <div className="bg-white border border-[#E8E9EA] rounded-xl divide-y divide-[#E8E9EA]">
              {contract.special_terms ? (
                <div className="p-3.5 space-y-1">
                  <div className="text-xs text-[#666668] font-medium">
                    Condições / Cláusulas Especiais
                  </div>
                  <div className="text-xs text-[#1D1D1D] whitespace-pre-wrap leading-relaxed bg-[#F9F9FA] p-3 rounded-lg border border-[#E8E9EA]">
                    {contract.special_terms}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 text-xs text-[#9E9EA0]">
                  Nenhuma cláusula especial registrada.
                </div>
              )}

              {contract.notes && (
                <div className="p-3.5 space-y-1">
                  <div className="text-xs text-[#666668] font-medium">
                    Observações Internas
                  </div>
                  <div className="text-xs text-[#1D1D1D] whitespace-pre-wrap leading-relaxed bg-[#F9F9FA] p-3 rounded-lg border border-[#E8E9EA]">
                    {contract.notes}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Histórico Operacional */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider">
              Histórico do Ciclo de Vida
            </h3>

            <div className="bg-white border border-[#E8E9EA] rounded-xl divide-y divide-[#E8E9EA]">
              <div className="p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-[#666668]">
                  <Calendar className="w-4 h-4 text-[#9E9EA0]" />
                  <span>Criado em</span>
                </div>
                <div className="text-xs font-medium text-[#1D1D1D]">
                  {formatDateTime(contract.created_at)}
                </div>
              </div>

              {contract.sent_for_signature_at && (
                <div className="p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-[#1D4ED8]">
                    <Send className="w-4 h-4 text-[#3B82F6]" />
                    <span>Enviado para assinatura em</span>
                  </div>
                  <div className="text-xs font-medium text-[#1D1D1D]">
                    {formatDateTime(contract.sent_for_signature_at)}
                  </div>
                </div>
              )}

              {contract.signed_at && (
                <div className="p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-[#047857]">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    <span>Assinado formalmente em</span>
                  </div>
                  <div className="text-xs font-medium text-[#1D1D1D]">
                    {formatDateTime(contract.signed_at)}
                  </div>
                </div>
              )}

              {contract.cancelled_at && (
                <div className="p-3.5 space-y-1 bg-red-50/50">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs text-red-700 font-medium">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span>Cancelado em</span>
                    </div>
                    <div className="text-xs font-medium text-red-900">
                      {formatDateTime(contract.cancelled_at)}
                    </div>
                  </div>
                  {contract.cancellation_reason && (
                    <div className="text-xs text-red-800 bg-white p-2.5 rounded-lg border border-red-200 mt-1">
                      <strong>Motivo:</strong> {contract.cancellation_reason}
                    </div>
                  )}
                </div>
              )}

              {contract.terminated_at && (
                <div className="p-3.5 space-y-1 bg-zinc-50">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs text-zinc-700 font-medium">
                      <XCircle className="w-4 h-4 text-zinc-500" />
                      <span>Encerrado em</span>
                    </div>
                    <div className="text-xs font-medium text-zinc-900">
                      {formatDateTime(contract.terminated_at)}
                    </div>
                  </div>
                  {contract.termination_reason && (
                    <div className="text-xs text-zinc-800 bg-white p-2.5 rounded-lg border border-zinc-200 mt-1">
                      <strong>Motivo:</strong> {contract.termination_reason}
                    </div>
                  )}
                </div>
              )}

              <div className="p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-[#666668]">
                  <Clock className="w-4 h-4 text-[#9E9EA0]" />
                  <span>Última Atualização</span>
                </div>
                <div className="text-xs font-medium text-[#1D1D1D]">
                  {formatDateTime(contract.updated_at)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E8E9EA] bg-[#FAFAFA] flex justify-end">
          <button
            id="btn-close-contract-drawer-bottom"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg hover:bg-[#F7F7F8] hover:border-[#D1D2D4] transition-all cursor-pointer shadow-2xs"
          >
            Fechar Detalhes
          </button>
        </div>
      </div>

      {/* Status Reason Confirmation Modal (Cancelled / Terminated) */}
      {reasonModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#1D1D1D]/50 backdrop-blur-xs">
          <div
            id="contract-reason-modal"
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E8E9EA] overflow-hidden animate-in zoom-in-95 duration-150"
          >
            <div className="px-6 py-4 border-b border-[#E8E9EA] bg-[#FAFAFA] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#1D1D1D] font-bold text-sm">
                <AlertCircle
                  className={`w-4 h-4 ${
                    reasonModal.targetStatus === 'cancelled'
                      ? 'text-red-600'
                      : 'text-zinc-600'
                  }`}
                />
                <span>
                  {reasonModal.targetStatus === 'cancelled'
                    ? 'Confirmar Cancelamento do Contrato'
                    : 'Confirmar Encerramento do Contrato'}
                </span>
              </div>
              <button
                onClick={() =>
                  setReasonModal({ isOpen: false, targetStatus: 'cancelled', reason: '' })
                }
                className="p-1 text-[#666668] hover:text-[#1D1D1D] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-[#666668] leading-relaxed">
                {reasonModal.targetStatus === 'cancelled'
                  ? 'O cancelamento de contrato é uma operação com histórico permanente. O motivo é obrigatório.'
                  : 'O encerramento/rescisão do contrato finaliza sua vigência ativa. O motivo é obrigatório.'}
              </p>

              {reasonError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{reasonError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="transition-reason-textarea"
                  className="text-xs font-semibold text-[#1D1D1D]"
                >
                  Motivo da Operação <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="transition-reason-textarea"
                  rows={3}
                  value={reasonModal.reason}
                  onChange={(e) => {
                    setReasonModal((prev) => ({ ...prev, reason: e.target.value }));
                    setReasonError(null);
                  }}
                  placeholder="Descreva detalhadamente a justificativa para o registro..."
                  className="w-full bg-white border border-[#D1D2D4] rounded-lg p-3 text-xs text-[#1D1D1D] focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-[#E8E9EA] bg-[#FAFAFA] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() =>
                  setReasonModal({ isOpen: false, targetStatus: 'cancelled', reason: '' })
                }
                disabled={isTransitioning}
                className="px-3.5 py-2 text-xs font-medium text-[#666668] bg-white border border-[#E8E9EA] rounded-lg hover:bg-[#F2F3F3]"
              >
                Voltar
              </button>
              <button
                type="button"
                id="btn-confirm-reason-transition"
                onClick={handleConfirmReasonTransition}
                disabled={isTransitioning || !reasonModal.reason.trim()}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50 ${
                  reasonModal.targetStatus === 'cancelled'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-zinc-800 hover:bg-zinc-900'
                }`}
              >
                {isTransitioning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Gravando...</span>
                  </>
                ) : (
                  <span>
                    Confirmar{' '}
                    {reasonModal.targetStatus === 'cancelled'
                      ? 'Cancelamento'
                      : 'Encerramento'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
