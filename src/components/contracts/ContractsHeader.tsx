import React from 'react';
import {
  FileCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { ContractMetrics } from '../../types/contracts';

interface ContractsHeaderProps {
  metrics: ContractMetrics;
  loading: boolean;
  onRefresh: () => void;
  onNewContract: () => void;
}

export const ContractsHeader: React.FC<ContractsHeaderProps> = ({
  metrics,
  loading,
  onRefresh,
  onNewContract,
}) => {
  return (
    <div className="space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1D]">
            Contratos
          </h1>
          <p className="text-sm text-[#666668] mt-0.5">
            Instrumentos contratuais formalizados a partir de propostas aceitas, controle de vigência e ciclo de assinaturas.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            id="btn-refresh-contracts"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#666668] bg-white border border-[#E8E9EA] rounded-lg hover:bg-[#F7F7F8] hover:text-[#1D1D1D] hover:border-[#D1D2D4] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="Atualizar listagem"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            id="btn-new-contract"
            onClick={onNewContract}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d94a2e] rounded-lg transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Contrato</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total */}
        <div
          id="metric-card-total-contracts"
          className="p-4 bg-white border border-[#E8E9EA] rounded-xl shadow-xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-[#666668]">Total de Contratos</span>
            <div className="text-2xl font-bold text-[#1D1D1D] tracking-tight">
              {metrics.totalCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#F2F3F3] text-[#666668] flex items-center justify-center">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Aguardando Assinatura */}
        <div
          id="metric-card-pending-signature"
          className="p-4 bg-white border border-[#E8E9EA] rounded-xl shadow-xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-[#666668]">Aguardando Assinatura</span>
            <div className="text-2xl font-bold text-[#1D4ED8] tracking-tight">
              {metrics.pendingSignatureCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Assinados */}
        <div
          id="metric-card-signed-contracts"
          className="p-4 bg-white border border-[#E8E9EA] rounded-xl shadow-xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-[#666668]">Assinados / Ativos</span>
            <div className="text-2xl font-bold text-[#047857] tracking-tight">
              {metrics.signedCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#ECFDF5] text-[#047857] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Vencendo em Breve */}
        <div
          id="metric-card-expiring-contracts"
          className="p-4 bg-white border border-[#E8E9EA] rounded-xl shadow-xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-[#666668]">Vencendo em Breve (30d)</span>
            <div
              className={`text-2xl font-bold tracking-tight ${
                metrics.expiringSoonCount > 0 ? 'text-amber-600' : 'text-[#1D1D1D]'
              }`}
            >
              {metrics.expiringSoonCount}
            </div>
          </div>
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              metrics.expiringSoonCount > 0
                ? 'bg-amber-50 text-amber-600'
                : 'bg-[#F2F3F3] text-[#9E9EA0]'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
};
