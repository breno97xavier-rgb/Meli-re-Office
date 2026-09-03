import React from 'react';
import { RefreshCw, Users, Sparkles, PhoneCall, CheckCircle2 } from 'lucide-react';
import { LeadCounters } from '../../types/leads';

interface LeadsHeaderProps {
  counters: LeadCounters;
  loading: boolean;
  onRefresh: () => void;
}

export const LeadsHeader: React.FC<LeadsHeaderProps> = ({ counters, loading, onRefresh }) => {
  return (
    <div id="leads-header" className="space-y-6">
      {/* Top row: Title + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#1D1D1D] tracking-tight">
              Comercial — Leads
            </h1>
          </div>
          <p className="text-sm text-[#666668] mt-1">
            Gestão e qualificação de contatos e briefings recebidos
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-refresh-leads"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg hover:bg-[#F7F7F8] hover:border-[#D1D2D4] transition-all disabled:opacity-60 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-[#666668] ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Counters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total */}
        <div
          id="counter-card-total"
          className="bg-white border border-[#E8E9EA] rounded-xl p-4 transition-all hover:border-[#D1D2D4] shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#666668] uppercase tracking-wider">
              Total de Leads
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#F7F7F8] flex items-center justify-center text-[#666668]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-[#1D1D1D]">
              {loading ? '—' : counters.total}
            </span>
          </div>
        </div>

        {/* Novos */}
        <div
          id="counter-card-new"
          className="bg-white border border-[#FBC3B8] rounded-xl p-4 transition-all hover:border-[#F15A3C] shadow-xs bg-gradient-to-br from-white to-[#FDF1EE]/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#F15A3C] uppercase tracking-wider">
              Novos
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FDF1EE] flex items-center justify-center text-[#F15A3C]">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-[#F15A3C]">
              {loading ? '—' : counters.newCount}
            </span>
          </div>
        </div>

        {/* Em Contato */}
        <div
          id="counter-card-contacted"
          className="bg-white border border-[#FDE68A] rounded-xl p-4 transition-all hover:border-[#D97706] shadow-xs bg-gradient-to-br from-white to-[#FEF8EC]/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#B45309] uppercase tracking-wider">
              Em Contato
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FEF8EC] flex items-center justify-center text-[#B45309]">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-[#B45309]">
              {loading ? '—' : counters.contactedCount}
            </span>
          </div>
        </div>

        {/* Qualificados */}
        <div
          id="counter-card-qualified"
          className="bg-white border border-[#A7F3D0] rounded-xl p-4 transition-all hover:border-[#059669] shadow-xs bg-gradient-to-br from-white to-[#ECFDF5]/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#047857] uppercase tracking-wider">
              Qualificados
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#ECFDF5] flex items-center justify-center text-[#047857]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-[#047857]">
              {loading ? '—' : counters.qualifiedCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
