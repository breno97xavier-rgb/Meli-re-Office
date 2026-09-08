import React from 'react';
import {
  Users,
  UserCheck,
  Clock,
  PauseCircle,
  CheckCircle2,
  DollarSign,
  RefreshCw,
} from 'lucide-react';
import { ClientMetrics } from '../../types/clients';
import { formatCurrency } from './ClientStatusBadge';

interface ClientsHeaderProps {
  metrics: ClientMetrics;
  loading: boolean;
  onRefresh: () => void;
}

export const ClientsHeader: React.FC<ClientsHeaderProps> = ({
  metrics,
  loading,
  onRefresh,
}) => {
  return (
    <div id="clients-header" className="space-y-6">
      {/* Title & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1D]">
            Clientes
          </h1>
          <p className="text-sm text-[#666668] mt-0.5">
            Carteira de clientes, acompanhamento de contratos vigentes e ciclo de atendimento.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            id="btn-refresh-clients"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#666668] bg-white border border-[#E8E9EA] rounded-lg hover:bg-[#F7F7F8] hover:text-[#1D1D1D] hover:border-[#D1D2D4] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="Atualizar carteira de clientes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Total */}
        <div
          id="metric-card-total-clients"
          className="p-4 bg-white border border-[#E8E9EA] rounded-xl shadow-xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-[#666668]">Total</span>
            <div className="text-2xl font-bold text-[#1D1D1D] tracking-tight">
              {loading ? '—' : metrics.totalCount}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#F2F3F3] text-[#666668] flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>

        {/* Card 2: Onboarding */}
        <div
          id="metric-card-onboarding"
          className="p-4 bg-white border border-[#BFDBFE] rounded-xl shadow-xs flex items-center justify-between bg-gradient-to-br from-white to-[#EFF6FF]/40"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-blue-700">Onboarding</span>
            <div className="text-2xl font-bold text-blue-700 tracking-tight">
              {loading ? '—' : metrics.onboardingCount}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {/* Card 3: Ativos */}
        <div
          id="metric-card-active"
          className="p-4 bg-white border border-[#A7F3D0] rounded-xl shadow-xs flex items-center justify-between bg-gradient-to-br from-white to-[#ECFDF5]/40"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-emerald-700">Ativos</span>
            <div className="text-2xl font-bold text-emerald-700 tracking-tight">
              {loading ? '—' : metrics.activeCount}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        {/* Card 4: Pausados */}
        <div
          id="metric-card-paused"
          className="p-4 bg-white border border-[#FDE68A] rounded-xl shadow-xs flex items-center justify-between bg-gradient-to-br from-white to-[#FFFBEB]/40"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-amber-700">Pausados</span>
            <div className="text-2xl font-bold text-amber-700 tracking-tight">
              {loading ? '—' : metrics.pausedCount}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
            <PauseCircle className="w-4 h-4" />
          </div>
        </div>

        {/* Card 5: Encerrados */}
        <div
          id="metric-card-ended"
          className="p-4 bg-white border border-[#E8E9EA] rounded-xl shadow-xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-[#666668]">Encerrados</span>
            <div className="text-2xl font-bold text-[#666668] tracking-tight">
              {loading ? '—' : metrics.endedCount}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#F2F3F3] text-[#9E9EA0] flex items-center justify-center">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Card 6: Receita Mensal Contratada (Ativa) */}
        <div
          id="metric-card-monthly-revenue"
          className="p-4 bg-white border border-[#FBC3B8] rounded-xl shadow-xs flex items-center justify-between bg-gradient-to-br from-white to-[#FDF1EE]/30 col-span-2 sm:col-span-1 lg:col-span-1"
        >
          <div className="space-y-1 min-w-0">
            <span className="text-xs font-medium text-[#F15A3C] block truncate">
              MRR Carteira
            </span>
            <div className="text-base sm:text-lg font-bold text-[#F15A3C] tracking-tight truncate">
              {loading ? '—' : formatCurrency(metrics.monthlyRevenueActive)}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FDF1EE] text-[#F15A3C] flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
