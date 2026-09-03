import React from 'react';
import {
  FileText,
  Send,
  CheckCircle2,
  DollarSign,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { ProposalMetrics } from '../../types/proposals';
import { formatCurrency } from './ProposalStatusBadge';

interface ProposalsHeaderProps {
  metrics: ProposalMetrics;
  loading: boolean;
  onRefresh: () => void;
  onNewProposal: () => void;
}

export const ProposalsHeader: React.FC<ProposalsHeaderProps> = ({
  metrics,
  loading,
  onRefresh,
  onNewProposal,
}) => {
  return (
    <div className="space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1D]">
            Propostas
          </h1>
          <p className="text-sm text-[#666668] mt-0.5">
            Ofertas comerciais formais, escopos de serviço e versionamento por oportunidade.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            id="btn-refresh-proposals"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#666668] bg-white border border-[#E8E9EA] rounded-lg hover:bg-[#F7F7F8] hover:text-[#1D1D1D] hover:border-[#D1D2D4] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="Atualizar listagem"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            id="btn-new-proposal"
            onClick={onNewProposal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d94a2e] rounded-lg transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Proposta</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Rascunhos */}
        <div
          id="metric-card-drafts"
          className="p-4 bg-white border border-[#E8E9EA] rounded-xl shadow-xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-[#666668]">Rascunhos</span>
            <div className="text-2xl font-bold text-[#1D1D1D] tracking-tight">
              {metrics.draftCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#F2F3F3] text-[#666668] flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Enviadas */}
        <div
          id="metric-card-sent"
          className="p-4 bg-white border border-[#E8E9EA] rounded-xl shadow-xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-[#666668]">Enviadas</span>
            <div className="text-2xl font-bold text-[#1D1D1D] tracking-tight">
              {metrics.sentCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center">
            <Send className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Aceitas */}
        <div
          id="metric-card-accepted"
          className="p-4 bg-white border border-[#E8E9EA] rounded-xl shadow-xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-[#666668]">Aceitas</span>
            <div className="text-2xl font-bold text-[#047857] tracking-tight">
              {metrics.acceptedCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#ECFDF5] text-[#047857] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Receita Aceita (Mensal + Pontual Separados) */}
        <div
          id="metric-card-revenue"
          className="p-4 bg-white border border-[#E8E9EA] rounded-xl shadow-xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-[#666668]">Receita Aceita</span>
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold text-[#1D1D1D] tracking-tight leading-tight">
                {formatCurrency(metrics.totalAcceptedMonthly)}
                <span className="text-[11px] font-normal text-[#666668]"> /mês</span>
              </span>
              <span className="text-xs font-semibold text-[#666668] tracking-tight mt-0.5">
                + {formatCurrency(metrics.totalAcceptedOneTime)}
                <span className="text-[10px] font-normal text-[#9E9EA0]"> pontual</span>
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#FDF1EE] text-[#F15A3C] flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
};
