import React from 'react';
import { Calendar, Layers, Target, CheckCircle, AlertTriangle, ChevronRight, Archive } from 'lucide-react';
import { EditorialPlan } from '../../types/planning';
import { calculateEditorialPlanMetrics } from '../../services/planningService';
import {
  formatCyclePeriod,
  getEditorialPlanStatusLabel,
  getEditorialPlanStatusBadgeClass,
} from '../../utils/planningFormatters';

interface EditorialPlanCardProps {
  plan: EditorialPlan;
  onClick: () => void;
}

export const EditorialPlanCard: React.FC<EditorialPlanCardProps> = ({ plan, onClick }) => {
  const metrics = calculateEditorialPlanMetrics(plan.target_posts_count, plan.pillars || []);
  const isArchived = plan.status === 'archived';

  return (
    <div
      id={`editorial-plan-card-${plan.id}`}
      onClick={onClick}
      className={`group relative bg-white border rounded-xl p-4 md:p-5 transition-all duration-150 cursor-pointer flex flex-col justify-between gap-4 ${
        isArchived
          ? 'border-[#E8E9EA] bg-[#FAFAFA]/80 opacity-80 hover:border-[#D0D1D2] hover:opacity-100'
          : 'border-[#E8E9EA] hover:border-[#1D1D1D] hover:shadow-xs'
      }`}
    >
      {/* Header: Title, Period & Status */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2.5">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-[#8C8D8F]">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium text-[#666668] truncate">
                {formatCyclePeriod(plan.start_date, plan.end_date)}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-[#1D1D1D] group-hover:text-[#F3705A] transition-colors leading-snug line-clamp-2">
              {plan.title}
            </h3>
          </div>

          <div className="shrink-0 flex items-center gap-1.5">
            <span
              className={`px-2 py-0.5 text-[10px] font-medium rounded-md border ${getEditorialPlanStatusBadgeClass(
                plan.status
              )}`}
            >
              {getEditorialPlanStatusLabel(plan.status)}
            </span>
            <div className="text-[#8C8D8F] group-hover:text-[#1D1D1D] transition-transform group-hover:translate-x-0.5">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Primary Goal */}
        {plan.primary_goal ? (
          <p className="text-xs text-[#666668] line-clamp-2 leading-relaxed pt-0.5">
            <strong className="font-medium text-[#4D4D4F]">Objetivo: </strong>
            {plan.primary_goal}
          </p>
        ) : (
          <p className="text-xs text-[#8C8D8F] italic pt-0.5">Sem objetivo principal definido</p>
        )}
      </div>

      {/* Footer: Metrics & Progress */}
      <div className="pt-3 border-t border-[#F2F3F3] space-y-2">
        <div className="flex items-center justify-between text-xs text-[#666668]">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-[#8C8D8F]" />
            <span className="font-medium text-[#1D1D1D]">
              {plan.target_posts_count} {plan.target_posts_count === 1 ? 'conteúdo' : 'conteúdos'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#8C8D8F]" />
            <span>
              {metrics.pillar_count} {metrics.pillar_count === 1 ? 'pilar' : 'pilares'}
            </span>
          </div>
        </div>

        {/* Allocation status bar/chip */}
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-[#666668]">
            <span>Distribuição:</span>
            <span
              className={`font-semibold ${
                metrics.overallocated
                  ? 'text-amber-700'
                  : metrics.unallocated_posts_count === 0 && metrics.target_posts_count > 0
                  ? 'text-emerald-700'
                  : 'text-[#1D1D1D]'
              }`}
            >
              {metrics.allocated_posts_count} / {metrics.target_posts_count} alocados
            </span>
          </div>

          {metrics.overallocated && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              <AlertTriangle className="w-3 h-3" />
              Sobrealocado
            </span>
          )}

          {!metrics.overallocated &&
            metrics.unallocated_posts_count === 0 &&
            metrics.target_posts_count > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                <CheckCircle className="w-3 h-3" />
                Completo
              </span>
            )}
        </div>
      </div>
    </div>
  );
};
