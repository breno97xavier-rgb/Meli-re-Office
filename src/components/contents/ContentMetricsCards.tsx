import React from 'react';
import {
  FileText,
  FileEdit,
  PenTool,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { ContentMetrics } from '../../types/contents';

interface ContentMetricsCardsProps {
  metrics: ContentMetrics;
}

export const ContentMetricsCards: React.FC<ContentMetricsCardsProps> = ({
  metrics,
}) => {
  const cards = [
    {
      id: 'metric-total',
      label: 'Total',
      count: metrics.totalCount,
      icon: FileText,
      iconBg: 'bg-[#F2F3F3]',
      iconColor: 'text-[#1D1D1D]',
    },
    {
      id: 'metric-drafts',
      label: 'Rascunhos',
      count: metrics.draftCount,
      icon: FileEdit,
      iconBg: 'bg-[#F7F7F8]',
      iconColor: 'text-[#666668]',
    },
    {
      id: 'metric-in-production',
      label: 'Em Produção',
      count: metrics.inProductionCount,
      icon: PenTool,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      id: 'metric-in-review',
      label: 'Em Revisão',
      count: metrics.inReviewCount,
      icon: Clock,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      id: 'metric-approved',
      label: 'Aprovados',
      count: metrics.approvedCount,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            id={card.id}
            className="p-4 bg-white border border-[#E8E9EA] rounded-xl shadow-2xs flex items-center justify-between"
          >
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-[#666668] tracking-tight uppercase">
                {card.label}
              </span>
              <div className="text-2xl font-bold text-[#1D1D1D] tracking-tight">
                {card.count}
              </div>
            </div>
            <div
              className={`w-9 h-9 rounded-lg ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0 shadow-2xs`}
            >
              <Icon className="w-4.5 h-4.5" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
