import React from 'react';
import {
  X,
  ArrowLeft,
  Edit3,
  FileText,
  Loader2,
  AlertCircle,
  Building2,
  User,
} from 'lucide-react';
import { Proposal } from '../../../types/proposals';
import { useProposalDocument } from '../../../hooks/useProposalDocument';
import { ProposalDocumentRenderer } from './ProposalDocumentRenderer';

interface ProposalDocumentPreviewModalProps {
  proposal: Proposal | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenEditor: () => void;
}

export const ProposalDocumentPreviewModal: React.FC<
  ProposalDocumentPreviewModalProps
> = ({ proposal, isOpen, onClose, onOpenEditor }) => {
  const { document, loading, error } = useProposalDocument(
    isOpen && proposal ? proposal.id : null
  );

  if (!isOpen || !proposal) return null;

  const clientName =
    proposal.opportunity?.lead?.business_name ||
    proposal.opportunity?.lead?.name ||
    'Cliente';

  const handleSwitchToEditor = () => {
    onClose();
    onOpenEditor();
  };

  return (
    <div
      id="proposal-document-preview-backdrop"
      className="fixed inset-0 bg-[#1D1D1D]/75 backdrop-blur-xs z-[70] flex flex-col justify-between overflow-hidden animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Modal Dialog Card (Fullscreen Document Studio) */}
      <div
        id="proposal-document-preview-dialog"
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full flex flex-col bg-[#EDEEEE] overflow-hidden"
      >
        {/* Top Control Bar */}
        <header className="px-4 sm:px-8 py-3.5 bg-white border-b border-[#E8E9EA] flex items-center justify-between gap-4 shrink-0 shadow-2xs">
          {/* Left info & Back */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              id="btn-preview-back"
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#666668] hover:text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#E8E9EA] border border-[#E8E9EA] rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voltar</span>
            </button>

            <div className="h-5 w-px bg-[#E8E9EA] hidden sm:block" />

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#1D1D1D] truncate max-w-xs sm:max-w-md">
                  {proposal.title}
                </span>
                <span className="font-mono text-[10px] font-bold bg-[#1D1D1D] text-white px-1.5 py-0.5 rounded">
                  v{proposal.version}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#666668]">
                <span className="inline-flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-[#9E9EA0]" />
                  <span>{clientName}</span>
                </span>
                <span className="text-[#9E9EA0]">•</span>
                <span>Visualização do Documento Comercial</span>
              </div>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2.5">
            <button
              id="btn-preview-edit-document"
              type="button"
              onClick={handleSwitchToEditor}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d94a2e] rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Voltar para edição</span>
            </button>

            <button
              id="btn-preview-close"
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#E8E9EA] rounded-lg transition-colors cursor-pointer"
              title="Fechar visualização"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Document Scroll Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 flex justify-center">
          {loading ? (
            <div className="m-auto py-20 flex flex-col items-center justify-center gap-3 text-[#666668]">
              <Loader2 className="w-8 h-8 animate-spin text-[#F15A3C]" />
              <span className="text-xs font-medium">
                Carregando documento da proposta...
              </span>
            </div>
          ) : error ? (
            <div className="m-auto max-w-md p-6 bg-white border border-red-200 rounded-2xl shadow-sm text-center space-y-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#1D1D1D]">
                  Não foi possível carregar o documento
                </h3>
                <p className="text-xs text-[#666668]">{error}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#E8E9EA] border border-[#E8E9EA] rounded-lg transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          ) : !document ? (
            /* Document does not exist yet */
            <div className="m-auto max-w-md p-8 bg-white border border-[#E8E9EA] rounded-2xl shadow-sm text-center space-y-5">
              <div className="w-12 h-12 rounded-xl bg-[#FDF1EE] text-[#F15A3C] flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-[#1D1D1D]">
                  Prepare o documento antes de visualizar a proposta
                </h3>
                <p className="text-xs text-[#666668] leading-relaxed">
                  Defina a introdução, o escopo geral e os entregáveis para gerar
                  o documento comercial formatado para o cliente.
                </p>
              </div>
              <button
                id="btn-preview-prepare-document"
                type="button"
                onClick={handleSwitchToEditor}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d94a2e] rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Preparar documento</span>
              </button>
            </div>
          ) : (
            /* Rendered Document Sheet */
            <div className="w-full flex justify-center pb-12">
              <ProposalDocumentRenderer
                proposal={proposal}
                document={document}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
