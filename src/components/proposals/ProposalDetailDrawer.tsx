import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Calendar,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  Loader2,
  Check,
  Sparkles,
  DollarSign,
  AlertTriangle,
  FileCheck,
  Plus,
  ArrowRight,
  Upload,
  Eye,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  History,
} from 'lucide-react';
import {
  Proposal,
  ProposalStatus,
} from '../../types/proposals';
import {
  ProposalStatusBadge,
  getStatusLabel,
  formatCurrency,
  formatDate,
  formatDateTime,
  isProposalExpired,
} from './ProposalStatusBadge';
import { ContractStatusBadge } from '../contracts/ContractStatusBadge';
import { CreateContractModal } from '../contracts/CreateContractModal';
import { createContractFromProposal } from '../../services/contractsService';
import { CreateContractInput, Contract } from '../../types/contracts';
import { useRouter } from '../../hooks/useRouter';
import { useProposalCommercialDocuments } from '../../hooks/useProposalCommercialDocuments';
import { formatBytes } from '../../services/commercialDocumentsService';

interface ProposalDetailDrawerProps {
  proposal: Proposal | null;
  isOpen: boolean;
  isUpdating: boolean;
  updateError: string | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: ProposalStatus) => Promise<boolean>;
  onProposalUpdated?: () => void;
}

const STATUS_OPTIONS: ProposalStatus[] = [
  'draft',
  'sent',
  'accepted',
  'rejected',
  'superseded',
];

export const ProposalDetailDrawer: React.FC<ProposalDetailDrawerProps> = ({
  proposal,
  isOpen,
  isUpdating,
  updateError,
  onClose,
  onUpdateStatus,
  onProposalUpdated,
}) => {
  const router = useRouter();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Hook for managing proposal commercial PDF documents
  const {
    activeDocument,
    historyDocuments,
    loading: loadingDocs,
    uploading,
    actionLoadingId,
    error: docError,
    uploadError,
    setUploadError,
    uploadDocument,
    viewDocument,
    downloadDocument,
  } = useProposalCommercialDocuments(proposal?.id);

  // Contract creation modal state
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isSubmittingContract, setIsSubmittingContract] = useState(false);
  const [contractSubmitError, setContractSubmitError] = useState<string | null>(null);

  if (!isOpen || !proposal) return null;

  const expired = isProposalExpired(proposal);

  // Find latest contract associated with this proposal
  const associatedContracts = proposal.contracts || [];
  const latestContract = associatedContracts.length > 0 ? associatedContracts[0] : null;
  const hasActiveContract = associatedContracts.some(
    (c) => c.status !== 'cancelled'
  );

  const handleStatusChange = async (newStatus: ProposalStatus) => {
    if (newStatus === proposal.status) return;

    // UX check: cannot change to 'sent' without active PDF
    if (newStatus === 'sent' && !activeDocument) {
      setUploadError('Anexe o PDF da proposta antes de marcá-la como enviada.');
      return;
    }

    const ok = await onUpdateStatus(proposal.id, newStatus);
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be selected again if needed
    e.target.value = '';

    // Frontend validation
    if (file.type !== 'application/pdf') {
      setUploadError('O arquivo deve ser obrigatoriamente do tipo PDF (application/pdf).');
      return;
    }

    if (file.size <= 0) {
      setUploadError('O arquivo selecionado está vazio (0 bytes).');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setUploadError('O arquivo excede o limite máximo permitido de 20 MB.');
      return;
    }

    await uploadDocument(file);
  };

  const handleTriggerUpload = () => {
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleCreateContract = async (
    input: CreateContractInput
  ): Promise<{ success: boolean; contract?: Contract; error?: string }> => {
    try {
      setIsSubmittingContract(true);
      setContractSubmitError(null);
      const contract = await createContractFromProposal(input);
      if (onProposalUpdated) {
        onProposalUpdated();
      }
      return { success: true, contract };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar contrato.';
      setContractSubmitError(msg);
      return { success: false, error: msg };
    } finally {
      setIsSubmittingContract(false);
    }
  };

  const handleContractCreated = () => {
    router.navigate('/comercial/contratos');
  };

  return (
    <>
      {/* Hidden File Input for PDF Upload & Replacement */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1D1D1D]/40 backdrop-blur-xs z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div
        id="proposal-detail-drawer"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl border-l border-[#E8E9EA] flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#E8E9EA] bg-[#FAFAFA] flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-semibold text-[#1D1D1D] truncate max-w-md">
                {proposal.title}
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#1D1D1D] text-white">
                v{proposal.version}
              </span>
              <ProposalStatusBadge status={proposal.status} size="md" />
              {expired && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Expirada</span>
                </span>
              )}
            </div>

            {proposal.opportunity && (
              <p className="text-sm font-medium text-[#666668] mt-1.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-[#1D1D1D] font-semibold">
                  {proposal.opportunity.title}
                </span>
                {proposal.opportunity.lead && (
                  <>
                    <span className="text-[#9E9EA0]">•</span>
                    <span className="flex items-center gap-1 text-[#666668]">
                      <User className="w-3.5 h-3.5 text-[#F15A3C]" />
                      <span>{proposal.opportunity.lead.name}</span>
                    </span>
                    {proposal.opportunity.lead.business_name && (
                      <span className="text-[#9E9EA0]">
                        ({proposal.opportunity.lead.business_name})
                      </span>
                    )}
                  </>
                )}
              </p>
            )}
          </div>

          <button
            id="btn-close-proposal-drawer"
            onClick={onClose}
            className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#E8E9EA]/60 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Alteration Control */}
          <div className="bg-[#F7F7F8] border border-[#E8E9EA] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="drawer-proposal-status-select"
                className="text-xs font-semibold text-[#666668] uppercase tracking-wider block"
              >
                Status da Proposta
              </label>
              {isUpdating && (
                <div className="flex items-center gap-1.5 text-xs text-[#F15A3C] font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Atualizando...</span>
                </div>
              )}
              {saveSuccess && (
                <div className="flex items-center gap-1.5 text-xs text-[#047857] font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span>Status atualizado com sucesso</span>
                </div>
              )}
            </div>

            <div className="relative">
              <select
                id="drawer-proposal-status-select"
                value={proposal.status}
                disabled={isUpdating}
                onChange={(e) =>
                  handleStatusChange(e.target.value as ProposalStatus)
                }
                className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3.5 py-2.5 text-sm font-medium text-[#1D1D1D] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C] disabled:opacity-60 cursor-pointer"
              >
                {STATUS_OPTIONS.map((st) => {
                  const isSentBlocked = st === 'sent' && !activeDocument;
                  return (
                    <option key={st} value={st} disabled={isSentBlocked}>
                      {getStatusLabel(st)}
                      {isSentBlocked ? ' (requer PDF anexado)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Hint when in draft and missing PDF */}
            {proposal.status === 'draft' && !activeDocument && (
              <p className="text-[11px] text-[#9E9EA0] flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-[#9E9EA0]" />
                <span>Anexe o PDF da proposta antes de marcá-la como enviada.</span>
              </p>
            )}

            {updateError && (
              <div className="flex items-center gap-2 p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{updateError}</span>
              </div>
            )}
          </div>

          {/* Section: Documento da Proposta (Gestão do PDF F1.5R5) */}
          <div className="bg-[#F7F7F8] border border-[#E8E9EA] rounded-xl p-4.5 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-[#E8E9EA] text-[#F15A3C] flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider">
                    Documento da Proposta
                  </h3>
                  <p className="text-[11px] text-[#666668]">
                    {activeDocument
                      ? 'Arquivo PDF ativo da proposta comercial.'
                      : 'Nenhum PDF anexado.'}
                  </p>
                </div>
              </div>

              {/* Botão de Anexar quando não há PDF ativo */}
              {!activeDocument && !loadingDocs && (
                <button
                  id="btn-attach-proposal-pdf"
                  type="button"
                  onClick={handleTriggerUpload}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d94a2e] rounded-lg transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Anexar PDF</span>
                </button>
              )}
            </div>

            {/* Feedback de erro de upload ou documento */}
            {(uploadError || docError) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span className="flex-1">{uploadError || docError}</span>
                <button
                  onClick={() => setUploadError(null)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Loading do documento */}
            {loadingDocs && (
              <div className="flex items-center gap-2 py-3 text-xs text-[#666668]">
                <Loader2 className="w-4 h-4 animate-spin text-[#F15A3C]" />
                <span>Carregando documento...</span>
              </div>
            )}

            {/* Estado durante Upload */}
            {uploading && (
              <div className="bg-white border border-[#E8E9EA] rounded-xl p-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FDF1EE] text-[#F15A3C] flex items-center justify-center shrink-0">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#1D1D1D]">
                    Enviando PDF da proposta...
                  </p>
                  <p className="text-[11px] text-[#666668]">
                    Armazenando e registrando documento comercial.
                  </p>
                </div>
              </div>
            )}

            {/* Estado Sem PDF Ativo */}
            {!activeDocument && !loadingDocs && !uploading && (
              <div className="bg-white border border-dashed border-[#D1D2D4] rounded-xl p-4 text-center space-y-1">
                <p className="text-xs font-medium text-[#1D1D1D]">
                  Nenhum arquivo PDF anexado a esta proposta.
                </p>
                <p className="text-[11px] text-[#9E9EA0]">
                  Somente PDF • máximo 20 MB
                </p>
              </div>
            )}

            {/* Estado Com PDF Ativo */}
            {activeDocument && !uploading && (
              <div className="bg-white border border-[#E8E9EA] rounded-xl p-3.5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#FDF1EE] text-[#F15A3C] flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1D1D1D] truncate max-w-xs sm:max-w-sm">
                        {activeDocument.original_filename}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-[#666668] mt-0.5">
                        <span>{formatBytes(activeDocument.file_size)}</span>
                        <span>•</span>
                        <span>
                          Enviado em {formatDateTime(activeDocument.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] shrink-0">
                    Ativo
                  </span>
                </div>

                {/* Ações do PDF Ativo */}
                <div className="pt-2 border-t border-[#E8E9EA] flex items-center gap-2 flex-wrap">
                  <button
                    id="btn-view-active-pdf"
                    type="button"
                    disabled={actionLoadingId === activeDocument.id}
                    onClick={() => viewDocument(activeDocument)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1D1D1D] hover:text-[#F15A3C] bg-[#F7F7F8] hover:bg-[#F2F3F3] border border-[#E8E9EA] rounded-lg transition-colors cursor-pointer"
                  >
                    {actionLoadingId === activeDocument.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                    <span>Visualizar</span>
                  </button>

                  <button
                    id="btn-download-active-pdf"
                    type="button"
                    disabled={actionLoadingId === activeDocument.id}
                    onClick={() => downloadDocument(activeDocument)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1D1D1D] hover:text-[#F15A3C] bg-[#F7F7F8] hover:bg-[#F2F3F3] border border-[#E8E9EA] rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar</span>
                  </button>

                  <button
                    id="btn-replace-active-pdf"
                    type="button"
                    onClick={handleTriggerUpload}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] border border-transparent rounded-lg transition-colors cursor-pointer ml-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Substituir PDF</span>
                  </button>
                </div>
              </div>
            )}

            {/* Histórico de Versões Anteriores */}
            {historyDocuments.length > 0 && (
              <div className="pt-2 border-t border-[#E8E9EA]">
                <button
                  type="button"
                  onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                  className="w-full flex items-center justify-between text-xs font-medium text-[#666668] hover:text-[#1D1D1D] transition-colors py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#9E9EA0]" />
                    <span>Versões anteriores ({historyDocuments.length})</span>
                  </span>
                  {isHistoryExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {isHistoryExpanded && (
                  <div className="mt-2 space-y-2">
                    {historyDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="bg-white border border-[#E8E9EA] rounded-lg p-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#1D1D1D] truncate max-w-xs">
                            {doc.original_filename}
                          </p>
                          <p className="text-[10px] text-[#9E9EA0]">
                            {formatDateTime(doc.created_at)} • {formatBytes(doc.file_size)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={actionLoadingId === doc.id}
                            onClick={() => viewDocument(doc)}
                            title="Visualizar versão anterior"
                            className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] rounded transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={actionLoadingId === doc.id}
                            onClick={() => downloadDocument(doc)}
                            title="Baixar versão anterior"
                            className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] rounded transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Contract Formalization (When Accepted) */}
          {proposal.status === 'accepted' && (
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-4.5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#DCFCE7] text-[#15803D] flex items-center justify-center">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#166534] uppercase tracking-wider">
                      Formalização Contratual
                    </h3>
                    <p className="text-[11px] text-[#15803D]">
                      Proposta aceita pelo cliente.
                    </p>
                  </div>
                </div>

                {!hasActiveContract && (
                  <button
                    id="btn-create-contract-from-drawer"
                    onClick={() => setIsContractModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d94a2e] rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Formalizar Contrato</span>
                  </button>
                )}
              </div>

              {latestContract ? (
                <div className="bg-white border border-[#BBF7D0] rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-[#1D1D1D] text-white px-2 py-0.5 rounded">
                        {latestContract.contract_number}
                      </span>
                      <span className="font-mono text-[10px] bg-[#F2F3F3] text-[#1D1D1D] px-1.5 py-0.5 rounded border border-[#E8E9EA]">
                        v{latestContract.version}
                      </span>
                      <ContractStatusBadge status={latestContract.status} size="sm" />
                    </div>

                    <button
                      onClick={() => router.navigate('/comercial/contratos')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:text-[#1E40AF] cursor-pointer"
                    >
                      <span>Ver em Contratos</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-xs font-semibold text-[#1D1D1D]">
                    {latestContract.title}
                  </div>

                  {latestContract.start_date && (
                    <div className="text-[11px] text-[#666668] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#9E9EA0]" />
                      <span>
                        Vigência: {formatDate(latestContract.start_date)}
                        {' → '}
                        {latestContract.end_date ? formatDate(latestContract.end_date) : 'Indeterminado'}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#15803D] leading-relaxed">
                  Nenhum instrumento formal foi gerado ainda para esta proposta. Clique em <strong>Formalizar Contrato</strong> para criar a minuta em rascunho.
                </p>
              )}
            </div>
          )}

          {/* Direct Commercial Totals Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="bg-white border border-[#E8E9EA] rounded-xl p-4 shadow-2xs space-y-1">
              <span className="text-xs font-medium text-[#666668] flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#F15A3C]" />
                <span>Valor Mensal Proposto</span>
              </span>
              <div className="text-xl font-bold text-[#1D1D1D]">
                {proposal.monthly_amount !== null && proposal.monthly_amount !== undefined ? (
                  <>
                    {formatCurrency(proposal.monthly_amount)}
                    <span className="text-xs font-normal text-[#666668]"> /mês</span>
                  </>
                ) : (
                  <span className="text-[#9E9EA0]">—</span>
                )}
              </div>
            </div>

            <div className="bg-white border border-[#E8E9EA] rounded-xl p-4 shadow-2xs space-y-1">
              <span className="text-xs font-medium text-[#666668] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>Valor Pontual Proposto</span>
              </span>
              <div className="text-xl font-bold text-[#1D1D1D]">
                {proposal.one_time_amount !== null && proposal.one_time_amount !== undefined ? (
                  formatCurrency(proposal.one_time_amount)
                ) : (
                  <span className="text-[#9E9EA0]">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Section: Condições Comerciais */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider">
              Condições e Observações
            </h3>
            <div className="bg-white border border-[#E8E9EA] rounded-xl divide-y divide-[#E8E9EA]">
              {/* Validade */}
              <div className="p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 text-xs text-[#666668]">
                  <Calendar className="w-4 h-4 text-[#9E9EA0]" />
                  <span>Validade da Proposta</span>
                </div>
                <div className="text-sm font-medium text-[#1D1D1D]">
                  {formatDate(proposal.valid_until)}
                </div>
              </div>

              {/* Notas */}
              {proposal.notes && (
                <div className="p-3.5 space-y-1">
                  <div className="text-xs text-[#666668] font-medium">
                    Observações Gerais
                  </div>
                  <div className="text-xs text-[#1D1D1D] whitespace-pre-wrap leading-relaxed bg-[#F9F9FA] p-3 rounded-lg border border-[#E8E9EA]">
                    {proposal.notes}
                  </div>
                </div>
              )}

              {/* Termos Legados (se existirem para o registro antigo) */}
              {proposal.terms && (
                <div className="p-3.5 space-y-1">
                  <div className="text-xs text-[#666668] font-medium">
                    Termos e Condições (Legado)
                  </div>
                  <div className="text-xs text-[#1D1D1D] whitespace-pre-wrap leading-relaxed bg-[#F9F9FA] p-3 rounded-lg border border-[#E8E9EA]">
                    {proposal.terms}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Histórico e Datas */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider">
              Histórico Operacional
            </h3>
            <div className="bg-white border border-[#E8E9EA] rounded-xl divide-y divide-[#E8E9EA]">
              <div className="p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-[#666668]">
                  <Calendar className="w-4 h-4 text-[#9E9EA0]" />
                  <span>Criada em</span>
                </div>
                <div className="text-xs font-medium text-[#1D1D1D]">
                  {formatDateTime(proposal.created_at)}
                </div>
              </div>

              {proposal.sent_at && (
                <div className="p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-[#1D4ED8]">
                    <Send className="w-4 h-4 text-[#3B82F6]" />
                    <span>Enviada ao cliente em</span>
                  </div>
                  <div className="text-xs font-medium text-[#1D1D1D]">
                    {formatDateTime(proposal.sent_at)}
                  </div>
                </div>
              )}

              {proposal.accepted_at && (
                <div className="p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-[#047857]">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    <span>Aceita em</span>
                  </div>
                  <div className="text-xs font-medium text-[#1D1D1D]">
                    {formatDateTime(proposal.accepted_at)}
                  </div>
                </div>
              )}

              {proposal.rejected_at && (
                <div className="p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-[#B91C1C]">
                    <XCircle className="w-4 h-4 text-[#EF4444]" />
                    <span>Recusada em</span>
                  </div>
                  <div className="text-xs font-medium text-[#1D1D1D]">
                    {formatDateTime(proposal.rejected_at)}
                  </div>
                </div>
              )}

              <div className="p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-[#666668]">
                  <Clock className="w-4 h-4 text-[#9E9EA0]" />
                  <span>Última Atualização</span>
                </div>
                <div className="text-xs font-medium text-[#1D1D1D]">
                  {formatDateTime(proposal.updated_at)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E8E9EA] bg-[#FAFAFA] flex justify-end">
          <button
            id="btn-close-proposal-drawer-bottom"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg hover:bg-[#F7F7F8] hover:border-[#D1D2D4] transition-all cursor-pointer shadow-2xs"
          >
            Fechar Detalhes
          </button>
        </div>
      </div>

      {/* Embedded Create Contract Modal */}
      <CreateContractModal
        isOpen={isContractModalOpen}
        initialProposal={proposal}
        isSubmitting={isSubmittingContract}
        submitError={contractSubmitError}
        onClose={() => setIsContractModalOpen(false)}
        onSubmit={handleCreateContract}
        onSuccess={handleContractCreated}
      />
    </>
  );
};
