import React from 'react';
import {
  RefreshCw,
  Plus,
  Briefcase,
  DollarSign,
  FileCheck2,
  Trophy,
  XCircle,
} from 'lucide-react';
import { OpportunityMetrics } from '../../types/opportunities';
import { formatCurrency } from './OpportunityStageBadge';

interface OpportunitiesHeaderProps {
  metrics: OpportunityMetrics;
  loading: boolean;
  onRefresh: () => void;
  onNewOpportunity: () => void;
}

export const OpportunitiesHeader: React.FC<OpportunitiesHeaderProps> = ({
  metrics,
  loading,
  onRefresh,
  onNewOpportunity,
}) => {
  return (
    <div id="opportunities-header" className="space-y-6">
      {/* Top row: Title & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1D1D1D] tracking-tight">
            Comercial — Oportunidades
          </h1>
          <p className="text-sm text-[#666668] mt-1">
            Gestão e acompanhamento das negociações comerciais
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-refresh-opportunities"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg hover:bg-[#F7F7F8] hover:border-[#D1D2D4] transition-all disabled:opacity-60 shadow-xs cursor-pointer"
          >
            <RefreshCw
              className={`w-4 h-4 text-[#666668] ${
                loading ? 'animate-spin' : ''
              }`}
            />
            <span>Atualizar</span>
          </button>

          <button
            id="btn-new-opportunity"
            onClick={onNewOpportunity}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#F15A3C] hover:bg-[#d94a2e] rounded-lg transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Oportunidade</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Em Aberto */}
        <div
          id="metric-card-open"
          className="bg-white border border-[#E8E9EA] rounded-xl p-4 transition-all hover:border-[#D1D2D4] shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#666668] uppercase tracking-wider">
              Em Aberto
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#F7F7F8] flex items-center justify-center text-[#666668]">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-[#1D1D1D]">
              {loading ? '—' : metrics.openCount}
            </span>
          </div>
        </div>

        {/* 2. Pipeline Ativo */}
        <div
          id="metric-card-pipeline-value"
          className="bg-white border border-[#FBC3B8] rounded-xl p-4 transition-all hover:border-[#F15A3C] shadow-xs bg-gradient-to-br from-white to-[#FDF1EE]/30 col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#F15A3C] uppercase tracking-wider">
              Pipeline Ativo
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FDF1EE] flex items-center justify-center text-[#F15A3C]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-semibold text-[#F15A3C] truncate">
              {loading ? '—' : formatCurrency(metrics.activePipelineValue)}
            </span>
          </div>
        </div>

        {/* 3. Propostas / Negociação */}
        <div
          id="metric-card-proposals"
          className="bg-white border border-[#FDE68A] rounded-xl p-4 transition-all hover:border-[#D97706] shadow-xs bg-gradient-to-br from-white to-[#FEF8EC]/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#B45309] uppercase tracking-wider">
              Em Proposta
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FEF8EC] flex items-center justify-center text-[#B45309]">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-[#B45309]">
              {loading ? '—' : metrics.inProgressCount}
            </span>
          </div>
        </div>

        {/* 4. Ganhos */}
        <div
          id="metric-card-won"
          className="bg-white border border-[#A7F3D0] rounded-xl p-4 transition-all hover:border-[#059669] shadow-xs bg-gradient-to-br from-white to-[#ECFDF5]/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#047857] uppercase tracking-wider">
              Ganhos
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#ECFDF5] flex items-center justify-center text-[#047857]">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-[#047857]">
              {loading ? '—' : metrics.wonCount}
            </span>
          </div>
        </div>

        {/* 5. Perdidos */}
        <div
          id="metric-card-lost"
          className="bg-white border border-[#E8E9EA] rounded-xl p-4 transition-all hover:border-[#9E9EA0] shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#666668] uppercase tracking-wider">
              Perdidos
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#F7F7F8] flex items-center justify-center text-[#666668]">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-[#4B5563]">
              {loading ? '—' : metrics.lostCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
