import React from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { ContentMetrics } from '../../types/contents';
import { ContentMetricsCards } from './ContentMetricsCards';

interface ContentsHeaderProps {
  metrics: ContentMetrics;
  loading: boolean;
  onRefresh: () => void;
  onNewContent: () => void;
}

export const ContentsHeader: React.FC<ContentsHeaderProps> = ({
  metrics,
  loading,
  onRefresh,
  onNewContent,
}) => {
  return (
    <div className="space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1D]">
            Conteúdos
          </h1>
          <p className="text-sm text-[#666668] mt-0.5">
            Gestão editorial, ideação, redação, formatos e aprovação de peças por cliente.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            id="btn-refresh-contents"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#666668] bg-white border border-[#E8E9EA] rounded-lg hover:bg-[#F7F7F8] hover:text-[#1D1D1D] hover:border-[#D1D2D4] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="Atualizar listagem"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            id="btn-new-content"
            onClick={onNewContent}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d94a2e] rounded-lg transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Conteúdo</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <ContentMetricsCards metrics={metrics} />
    </div>
  );
};
