import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  FileText,
  FileCheck,
  Calendar,
  DollarSign,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Tag,
  Loader2,
  XCircle,
  Send,
} from 'lucide-react';
import {
  ClientCommercialHistory,
  ClientOpportunityItem,
  ClientProposalItem,
  ClientContractItem,
} from '../../../types/clients';
import { CommercialDocument } from '../../../types/commercialDocuments';
import {
  fetchProposalDocuments,
  fetchContractDocuments,
  getSignedDocumentUrl,
  downloadCommercialDocument,
  formatBytes,
} from '../../../services/commercialDocumentsService';
import { formatCurrency, formatDate } from '../ClientStatusBadge';

interface ClientCommercialSectionProps {
  commercialHistory: ClientCommercialHistory;
}

export const ClientCommercialSection: React.FC<ClientCommercialSectionProps> = ({
  commercialHistory,
}) => {
  const { opportunities, proposals, contracts } = commercialHistory;

  // Documents state keyed by proposal_id and contract_id
  const [proposalDocs, setProposalDocs] = useState<Record<string, CommercialDocument[]>>({});
  const [contractDocs, setContractDocs] = useState<Record<string, CommercialDocument[]>>({});
  const [docsLoading, setDocsLoading] = useState(true);

  // Download / View action feedback
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Load documents for all proposals and contracts
  useEffect(() => {
    let isMounted = true;

    async function loadAllDocuments() {
      setDocsLoading(true);
      try {
        const propDocsMap: Record<string, CommercialDocument[]> = {};
        const contDocsMap: Record<string, CommercialDocument[]> = {};

        // Fetch proposals documents
        await Promise.all(
          proposals.map(async (prop) => {
            try {
              const docs = await fetchProposalDocuments(prop.id);
              propDocsMap[prop.id] = docs;
            } catch (err) {
              console.warn(`Error loading docs for proposal ${prop.id}:`, err);
              propDocsMap[prop.id] = [];
            }
          })
        );

        // Fetch contracts documents
        await Promise.all(
          contracts.map(async (cont) => {
            try {
              const docs = await fetchContractDocuments(cont.id);
              contDocsMap[cont.id] = docs;
            } catch (err) {
              console.warn(`Error loading docs for contract ${cont.id}:`, err);
              contDocsMap[cont.id] = [];
            }
          })
        );

        if (isMounted) {
          setProposalDocs(propDocsMap);
          setContractDocs(contDocsMap);
        }
      } catch (err) {
        console.warn('Error fetching commercial documents:', err);
      } finally {
        if (isMounted) {
          setDocsLoading(false);
        }
      }
    }

    loadAllDocuments();

    return () => {
      isMounted = false;
    };
  }, [proposals, contracts]);

  const handleViewDocument = async (doc: CommercialDocument) => {
    setActionInProgress(`view-${doc.id}`);
    setActionError(null);
    try {
      const signedUrl = await getSignedDocumentUrl(doc.storage_path, 3600);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Error viewing document:', err);
      setActionError(
        err instanceof Error ? err.message : 'Falha ao abrir documento para visualização.'
      );
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDownloadDocument = async (doc: CommercialDocument) => {
    setActionInProgress(`download-${doc.id}`);
    setActionError(null);
    try {
      await downloadCommercialDocument(doc.storage_path, doc.original_filename);
    } catch (err) {
      console.error('Error downloading document:', err);
      setActionError(
        err instanceof Error ? err.message : 'Falha ao baixar arquivo do servidor.'
      );
    } finally {
      setActionInProgress(null);
    }
  };

  const hasAnyCommercialHistory =
    opportunities.length > 0 || proposals.length > 0 || contracts.length > 0;

  if (!hasAnyCommercialHistory) {
    return (
      <div className="p-8 bg-white rounded-b-2xl border-x border-b border-[#E8E9EA]">
        <div className="bg-[#FAFAFA] border border-dashed border-[#E8E9EA] rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-white border border-[#E8E9EA] text-[#666668] flex items-center justify-center mx-auto shadow-2xs">
            <Briefcase className="w-6 h-6 text-[#9E9EA0]" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-bold text-[#1D1D1D]">
              Sem histórico comercial vinculado
            </h3>
            <p className="text-xs text-[#666668]">
              Este cliente não possui oportunidades, propostas ou contratos vinculados diretamente no momento.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 bg-white rounded-b-2xl border-x border-b border-[#E8E9EA]">
      {/* Action Error Banner */}
      {actionError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* 1. Contratos Vinculados */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E9EA]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D1D1D] flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-[#F15A3C]" />
            <span>Contratos ({contracts.length})</span>
          </h3>
        </div>

        {contracts.length === 0 ? (
          <div className="bg-[#FAFAFA] border border-dashed border-[#E8E9EA] rounded-xl p-6 text-center text-xs text-[#9E9EA0] italic">
            Nenhum contrato cadastrado para este cliente.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contracts.map((cont) => {
              const docs = contractDocs[cont.id] || [];
              const activeDoc = docs[0] || null;

              return (
                <div
                  key={cont.id}
                  className="bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl p-5 space-y-4 shadow-2xs flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: Contract Number + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-[#F15A3C] uppercase tracking-wider block">
                          v{cont.version}
                        </span>
                        <h4 className="text-sm font-bold text-[#1D1D1D] truncate mt-0.5">
                          {cont.contract_number}
                        </h4>
                        <p className="text-xs text-[#666668] truncate mt-0.5">
                          {cont.title}
                        </p>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize shrink-0 ${
                          cont.status === 'signed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : cont.status === 'pending_signature'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : cont.status === 'cancelled'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                        }`}
                      >
                        {cont.status === 'signed'
                          ? 'Assinado'
                          : cont.status === 'pending_signature'
                          ? 'Pendente de Assinatura'
                          : cont.status === 'cancelled'
                          ? 'Cancelado'
                          : 'Rascunho'}
                      </span>
                    </div>

                    {/* Vigência & Valores */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E8E9EA] text-xs">
                      <div>
                        <span className="text-[10px] text-[#666668] block">Vigência</span>
                        <span className="font-semibold text-[#1D1D1D] block mt-0.5">
                          {cont.start_date ? formatDate(cont.start_date) : '—'}
                          {cont.end_date && ` → ${formatDate(cont.end_date)}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#666668] block">Mensalidade</span>
                        <span className="font-bold text-[#1D1D1D] block mt-0.5">
                          {cont.monthly_amount !== null && cont.monthly_amount !== undefined
                            ? `${formatCurrency(cont.monthly_amount)}/mês`
                            : '—'}
                        </span>
                      </div>
                    </div>

                    {cont.signed_at && (
                      <div className="flex items-center gap-1 text-[11px] text-[#666668] pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Assinado em {formatDate(cont.signed_at)}</span>
                      </div>
                    )}
                  </div>

                  {/* Documento Comercial Vinculado */}
                  <div className="pt-3 border-t border-[#E8E9EA]">
                    {docsLoading ? (
                      <div className="flex items-center gap-2 text-xs text-[#9E9EA0]">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Carregando documento...</span>
                      </div>
                    ) : activeDoc ? (
                      <div className="bg-white border border-[#E8E9EA] rounded-lg p-2.5 flex items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-[#F15A3C] shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-[#1D1D1D] block truncate">
                              {activeDoc.original_filename}
                            </span>
                            <span className="text-[10px] text-[#9E9EA0] block">
                              PDF • {formatBytes(activeDoc.file_size)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleViewDocument(activeDoc)}
                            disabled={actionInProgress === `view-${activeDoc.id}`}
                            className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            title="Visualizar documento em nova aba"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(activeDoc)}
                            disabled={actionInProgress === `download-${activeDoc.id}`}
                            className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            title="Baixar arquivo PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#9E9EA0] italic block">
                        Nenhum PDF de contrato anexado.
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Propostas Comerciais */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E9EA]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D1D1D] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#F15A3C]" />
            <span>Propostas Comerciais ({proposals.length})</span>
          </h3>
        </div>

        {proposals.length === 0 ? (
          <div className="bg-[#FAFAFA] border border-dashed border-[#E8E9EA] rounded-xl p-6 text-center text-xs text-[#9E9EA0] italic">
            Nenhuma proposta comercial vinculada a este cliente.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {proposals.map((prop) => {
              const docs = proposalDocs[prop.id] || [];
              const activeDoc = docs[0] || null;

              return (
                <div
                  key={prop.id}
                  className="bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl p-5 space-y-4 shadow-2xs flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: Title + Version + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-[#F15A3C] uppercase tracking-wider block">
                          v{prop.version}
                        </span>
                        <h4 className="text-sm font-bold text-[#1D1D1D] truncate mt-0.5">
                          {prop.title}
                        </h4>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize shrink-0 ${
                          prop.status === 'accepted'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : prop.status === 'sent'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : prop.status === 'rejected'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                        }`}
                      >
                        {prop.status === 'accepted'
                          ? 'Aceita'
                          : prop.status === 'sent'
                          ? 'Enviada'
                          : prop.status === 'rejected'
                          ? 'Recusada'
                          : 'Rascunho'}
                      </span>
                    </div>

                    {/* Valores & Validade */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E8E9EA] text-xs">
                      <div>
                        <span className="text-[10px] text-[#666668] block">Validade</span>
                        <span className="font-semibold text-[#1D1D1D] block mt-0.5">
                          {prop.valid_until ? formatDate(prop.valid_until) : 'Indeterminada'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#666668] block">Mensalidade</span>
                        <span className="font-bold text-[#1D1D1D] block mt-0.5">
                          {prop.monthly_amount !== null && prop.monthly_amount !== undefined
                            ? `${formatCurrency(prop.monthly_amount)}/mês`
                            : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Event Dates */}
                    <div className="space-y-1 pt-1 text-[11px] text-[#666668]">
                      {prop.sent_at && (
                        <div className="flex items-center gap-1.5">
                          <Send className="w-3 h-3 text-[#9E9EA0]" />
                          <span>Enviada em {formatDate(prop.sent_at)}</span>
                        </div>
                      )}
                      {prop.accepted_at && (
                        <div className="flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Aceita em {formatDate(prop.accepted_at)}</span>
                        </div>
                      )}
                      {prop.rejected_at && (
                        <div className="flex items-center gap-1.5 text-red-700">
                          <XCircle className="w-3 h-3 text-red-600" />
                          <span>Recusada em {formatDate(prop.rejected_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Documento Comercial Vinculado */}
                  <div className="pt-3 border-t border-[#E8E9EA]">
                    {docsLoading ? (
                      <div className="flex items-center gap-2 text-xs text-[#9E9EA0]">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Carregando documento...</span>
                      </div>
                    ) : activeDoc ? (
                      <div className="bg-white border border-[#E8E9EA] rounded-lg p-2.5 flex items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-[#F15A3C] shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-[#1D1D1D] block truncate">
                              {activeDoc.original_filename}
                            </span>
                            <span className="text-[10px] text-[#9E9EA0] block">
                              PDF • {formatBytes(activeDoc.file_size)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleViewDocument(activeDoc)}
                            disabled={actionInProgress === `view-${activeDoc.id}`}
                            className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            title="Visualizar documento em nova aba"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(activeDoc)}
                            disabled={actionInProgress === `download-${activeDoc.id}`}
                            className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            title="Baixar arquivo PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#9E9EA0] italic block">
                        Nenhum PDF de proposta anexado.
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Oportunidades Comerciais */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E9EA]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D1D1D] flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#F15A3C]" />
            <span>Oportunidades Comerciais ({opportunities.length})</span>
          </h3>
        </div>

        {opportunities.length === 0 ? (
          <div className="bg-[#FAFAFA] border border-dashed border-[#E8E9EA] rounded-xl p-6 text-center text-xs text-[#9E9EA0] italic">
            Nenhuma oportunidade registrada.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {opportunities.map((opp) => (
              <div
                key={opp.id}
                className="bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl p-5 space-y-3.5 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-[#1D1D1D] truncate">
                      {opp.title}
                    </h4>
                    {opp.closed_at && (
                      <span className="text-[11px] text-[#666668] block mt-0.5">
                        Fechada em {formatDate(opp.closed_at)}
                      </span>
                    )}
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#1D1D1D] text-white shrink-0">
                    {opp.stage}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E8E9EA] text-xs">
                  <div>
                    <span className="text-[10px] text-[#666668] block">Valor Estimado</span>
                    <span className="font-bold text-[#1D1D1D] block mt-0.5">
                      {opp.estimated_value !== null && opp.estimated_value !== undefined
                        ? formatCurrency(opp.estimated_value)
                        : '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#666668] block">Probabilidade</span>
                    <span className="font-semibold text-[#1D1D1D] block mt-0.5">
                      {opp.probability !== null && opp.probability !== undefined
                        ? `${opp.probability}%`
                        : '—'}
                    </span>
                  </div>
                </div>

                {opp.services_of_interest && opp.services_of_interest.length > 0 && (
                  <div className="pt-2 border-t border-[#E8E9EA] space-y-1.5">
                    <span className="text-[10px] font-semibold text-[#666668] block">
                      Serviços de Interesse
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {opp.services_of_interest.map((srv, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-white border border-[#E8E9EA] rounded-md text-[10px] text-[#1D1D1D] font-medium"
                        >
                          {srv}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
