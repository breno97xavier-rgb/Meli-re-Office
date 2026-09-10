import React from 'react';
import {
  Presentation,
  Plus,
  RefreshCw,
  FileEdit,
  Send,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { PresentationMetrics } from '../../types/presentations';

interface PresentationsHeaderProps {
  metrics: PresentationMetrics;
  loading: boolean;
  onRefresh: () => void;
  onNewPresentation: () => void;
}

export const PresentationsHeader: React.FC<PresentationsHeaderProps> = ({
  metrics,
  loading,
  onRefresh,
  onNewPresentation,
}) => {
  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1D] font-display">
            Apresentações de Conteúdo
          </h1>
          <p className="text-xs text-[#666668] mt-1">
            Organize rodadas editoriais, ordene publicações e gerencie a revisão visual por cliente.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#666668] bg-white border border-[#E8E9EA] rounded-xl hover:bg-[#F2F3F3] hover:text-[#1D1D1D] transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#F15A3C]' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            type="button"
            onClick={onNewPresentation}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d9482b] rounded-xl transition-all shadow-2xs cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Apresentação</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Total */}
        <div className="bg-white border border-[#E8E9EA] p-4 rounded-2xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#666668]">
            <span>Total de Apresentações</span>
            <Presentation className="w-4 h-4 text-[#9E9EA0]" />
          </div>
          <p className="text-xl font-bold text-[#1D1D1D] tracking-tight">
            {metrics.totalCount}
          </p>
        </div>

        {/* Drafts */}
        <div className="bg-white border border-[#E8E9EA] p-4 rounded-2xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#666668]">
            <span>Rascunhos</span>
            <FileEdit className="w-4 h-4 text-[#555557]" />
          </div>
          <p className="text-xl font-bold text-[#1D1D1D] tracking-tight">
            {metrics.draftCount}
          </p>
        </div>

        {/* Sent / In Review */}
        <div className="bg-white border border-[#E8E9EA] p-4 rounded-2xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-blue-700">
            <span>Enviadas / Em Revisão</span>
            <Send className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-blue-900 tracking-tight">
            {metrics.sentCount}
          </p>
        </div>

        {/* Approved */}
        <div className="bg-white border border-[#E8E9EA] p-4 rounded-2xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-700">
            <span>Aprovadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-emerald-900 tracking-tight">
            {metrics.approvedCount}
          </p>
        </div>
      </div>
    </div>
  );
};
