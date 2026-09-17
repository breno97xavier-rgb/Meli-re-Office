import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Layers,
  Target,
  Edit3,
  Play,
  CheckCircle2,
  Archive,
  AlertTriangle,
  Info,
  Loader2,
  Check,
  Plus,
  Trash2,
  MessageSquare,
  FileText,
} from 'lucide-react';
import {
  EditorialPlan,
  EditorialPlanStatus,
  ClientPillar,
  EditorialPlanPillarAllocationInput,
} from '../../types/planning';
import { calculateEditorialPlanMetrics } from '../../services/planningService';
import {
  formatCyclePeriod,
  getEditorialPlanStatusLabel,
  getEditorialPlanStatusBadgeClass,
} from '../../utils/planningFormatters';

interface EditorialPlanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: EditorialPlan | null;
  clientPillars: ClientPillar[];
  onEdit: (plan: EditorialPlan) => void;
  onSetStatus: (planId: string, status: EditorialPlanStatus) => Promise<boolean>;
  onArchive: (plan: EditorialPlan) => void;
  onSavePillarAllocations: (
    planId: string,
    allocations: EditorialPlanPillarAllocationInput[]
  ) => Promise<boolean>;
  isMutating: boolean;
}

interface PillarRowState {
  pillar_id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  isSelected: boolean;
  target_count: number;
}

export const EditorialPlanDetailModal: React.FC<EditorialPlanDetailModalProps> = ({
  isOpen,
  onClose,
  plan,
  clientPillars,
  onEdit,
  onSetStatus,
  onArchive,
  onSavePillarAllocations,
  isMutating,
}) => {
  const [allocationRows, setAllocationRows] = useState<PillarRowState[]>([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [isSavingAllocations, setIsSavingAllocations] = useState<boolean>(false);

  // Sync allocation rows whenever plan or clientPillars changes
  useEffect(() => {
    if (!plan || !isOpen) return;

    const existingAllocationsMap = new Map<string, number>();
    (plan.pillars || []).forEach((p) => {
      existingAllocationsMap.set(p.pillar_id, p.target_count);
    });

    // 1. Consider all active client pillars
    // 2. ALSO include inactive client pillars that are currently allocated in this plan
    const eligiblePillars = clientPillars.filter(
      (pillar) => pillar.is_active || existingAllocationsMap.has(pillar.id)
    );

    const rows: PillarRowState[] = eligiblePillars.map((pillar) => {
      const hasAllocation = existingAllocationsMap.has(pillar.id);
      const targetCount = hasAllocation ? existingAllocationsMap.get(pillar.id)! : 1;

      return {
        pillar_id: pillar.id,
        name: pillar.name,
        description: pillar.description,
        is_active: pillar.is_active,
        isSelected: hasAllocation,
        target_count: targetCount,
      };
    });

    setAllocationRows(rows);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);
  }, [plan, clientPillars, isOpen]);

  // Derived metrics from current edited rows
  const currentAllocations = useMemo(() => {
    return allocationRows
      .filter((r) => r.isSelected)
      .map((r) => ({
        pillar_id: r.pillar_id,
        target_count: r.target_count,
      }));
  }, [allocationRows]);

  const liveMetrics = useMemo(() => {
    if (!plan) {
      return {
        target_posts_count: 0,
        allocated_posts_count: 0,
        unallocated_posts_count: 0,
        overallocated: false,
        pillar_count: 0,
      };
    }
    return calculateEditorialPlanMetrics(plan.target_posts_count, currentAllocations);
  }, [plan, currentAllocations]);

  if (!isOpen || !plan) return null;

  const handleToggleSelectPillar = (pillarId: string) => {
    setAllocationRows((prev) =>
      prev.map((r) => {
        if (r.pillar_id === pillarId) {
          return {
            ...r,
            isSelected: !r.isSelected,
            target_count: !r.isSelected && r.target_count <= 0 ? 1 : r.target_count,
          };
        }
        return r;
      })
    );
    setSaveSuccessMsg(null);
  };

  const handleUpdateTargetCount = (pillarId: string, deltaOrValue: number | string) => {
    setAllocationRows((prev) =>
      prev.map((r) => {
        if (r.pillar_id === pillarId) {
          let nextVal = typeof deltaOrValue === 'string' ? parseInt(deltaOrValue, 10) : deltaOrValue;
          if (isNaN(nextVal)) nextVal = 0;
          return {
            ...r,
            target_count: Math.max(0, nextVal),
          };
        }
        return r;
      })
    );
    setSaveSuccessMsg(null);
  };

  const handleSaveAllocations = async () => {
    setIsSavingAllocations(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    const payload: EditorialPlanPillarAllocationInput[] = allocationRows
      .filter((r) => r.isSelected)
      .map((r) => ({
        pillar_id: r.pillar_id,
        target_count: r.target_count,
      }));

    try {
      const ok = await onSavePillarAllocations(plan.id, payload);
      if (ok) {
        setSaveSuccessMsg('Distribuição por pilares salva com sucesso.');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar alocações dos pilares.';
      setSaveErrorMsg(msg);
    } finally {
      setIsSavingAllocations(false);
    }
  };

  const isArchived = plan.status === 'archived';

  return (
    <div
      id="editorial-plan-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white border border-[#E8E9EA] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-5 md:p-6 border-b border-[#E8E9EA] bg-[#FDFDFE] flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${getEditorialPlanStatusBadgeClass(
                  plan.status
                )}`}
              >
                {getEditorialPlanStatusLabel(plan.status)}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-[#666668]">
                <Calendar className="w-3.5 h-3.5 text-[#8C8D8F]" />
                <span className="font-medium">{formatCyclePeriod(plan.start_date, plan.end_date)}</span>
              </div>
            </div>

            <h2 className="text-base md:text-lg font-bold text-[#1D1D1D] leading-tight">
              {plan.title}
            </h2>
          </div>

          {/* Quick Contextual Actions */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
            {/* Status Transition Actions */}
            {plan.status === 'draft' && (
              <button
                type="button"
                onClick={() => onSetStatus(plan.id, 'active')}
                disabled={isMutating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Ativar ciclo</span>
              </button>
            )}

            {plan.status === 'active' && (
              <button
                type="button"
                onClick={() => onSetStatus(plan.id, 'completed')}
                disabled={isMutating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Concluir ciclo</span>
              </button>
            )}

            {/* Archive button */}
            {!isArchived && (
              <button
                type="button"
                onClick={() => onArchive(plan)}
                disabled={isMutating}
                title="Arquivar ciclo"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#666668] hover:text-amber-700 bg-white hover:bg-amber-50 border border-[#E8E9EA] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <Archive className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Arquivar</span>
              </button>
            )}

            {/* Edit button */}
            <button
              type="button"
              onClick={() => onEdit(plan)}
              disabled={isMutating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#E8E9EA] border border-[#E8E9EA] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#666668]" />
              <span>Editar dados</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#8C8D8F] hover:text-[#1D1D1D] rounded-lg hover:bg-[#F2F3F3] transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1 bg-white">
          {/* 1. Derived Metrics Dashboard Cards */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#FBFBFC] border border-[#E8E9EA] rounded-xl">
                <span className="text-[11px] font-medium text-[#666668] block">Meta Total</span>
                <div className="text-lg font-bold text-[#1D1D1D] mt-0.5">
                  {liveMetrics.target_posts_count}{' '}
                  <span className="text-xs font-normal text-[#8C8D8F]">posts</span>
                </div>
              </div>

              <div className="p-3 bg-[#FBFBFC] border border-[#E8E9EA] rounded-xl">
                <span className="text-[11px] font-medium text-[#666668] block">Alocados</span>
                <div
                  className={`text-lg font-bold mt-0.5 ${
                    liveMetrics.overallocated ? 'text-amber-700' : 'text-[#1D1D1D]'
                  }`}
                >
                  {liveMetrics.allocated_posts_count}{' '}
                  <span className="text-xs font-normal text-[#8C8D8F]">posts</span>
                </div>
              </div>

              <div className="p-3 bg-[#FBFBFC] border border-[#E8E9EA] rounded-xl">
                <span className="text-[11px] font-medium text-[#666668] block">Restantes</span>
                <div
                  className={`text-lg font-bold mt-0.5 ${
                    liveMetrics.unallocated_posts_count < 0
                      ? 'text-amber-700'
                      : liveMetrics.unallocated_posts_count === 0 && liveMetrics.target_posts_count > 0
                      ? 'text-emerald-700'
                      : 'text-[#1D1D1D]'
                  }`}
                >
                  {liveMetrics.unallocated_posts_count}{' '}
                  <span className="text-xs font-normal text-[#8C8D8F]">posts</span>
                </div>
              </div>

              <div className="p-3 bg-[#FBFBFC] border border-[#E8E9EA] rounded-xl">
                <span className="text-[11px] font-medium text-[#666668] block">Pilares no Ciclo</span>
                <div className="text-lg font-bold text-[#1D1D1D] mt-0.5">
                  {liveMetrics.pillar_count}{' '}
                  <span className="text-xs font-normal text-[#8C8D8F]">ativos</span>
                </div>
              </div>
            </div>

            {/* Overallocated Warning Banner */}
            {liveMetrics.overallocated && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <strong className="font-semibold">Atenção na distribuição: </strong>
                  A soma das metas dos pilares ultrapassa a meta total do ciclo em{' '}
                  <strong className="font-semibold">
                    {Math.abs(liveMetrics.unallocated_posts_count)} conteúdos
                  </strong>
                  .
                </div>
              </div>
            )}

            {/* Unallocated Informational Note */}
            {!liveMetrics.overallocated &&
              liveMetrics.unallocated_posts_count > 0 &&
              liveMetrics.target_posts_count > 0 && (
                <div className="p-2.5 bg-blue-50/70 border border-blue-200/70 rounded-lg flex items-center gap-2 text-xs text-blue-800">
                  <Info className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                  <span>
                    {liveMetrics.unallocated_posts_count}{' '}
                    {liveMetrics.unallocated_posts_count === 1 ? 'conteúdo ainda não foi distribuído' : 'conteúdos ainda não foram distribuídos'}{' '}
                    entre os pilares.
                  </span>
                </div>
              )}
          </div>

          {/* 2. Editorial Strategy & Goals */}
          <div className="space-y-3 p-4 bg-[#FBFBFC] border border-[#E8E9EA] rounded-xl text-xs">
            <div className="flex items-center gap-2 font-semibold text-[#1D1D1D] border-b border-[#F0F0F1] pb-2">
              <Target className="w-3.5 h-3.5 text-[#F3705A]" />
              <span>Diretrizes Estratégicas do Ciclo</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="font-semibold text-[#666668] block">Objetivo Principal</span>
                <p className="text-[#1D1D1D] leading-relaxed">
                  {plan.primary_goal || <span className="text-[#8C8D8F] italic">Não informado</span>}
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-[#666668] block">Mensagem Central</span>
                <p className="text-[#1D1D1D] leading-relaxed">
                  {plan.core_message || <span className="text-[#8C8D8F] italic">Não informado</span>}
                </p>
              </div>
            </div>

            {/* Secondary Goals */}
            {plan.secondary_goals && plan.secondary_goals.length > 0 && (
              <div className="pt-2 border-t border-[#F0F0F1] space-y-1.5">
                <span className="font-semibold text-[#666668] block">Objetivos Secundários</span>
                <div className="flex flex-wrap gap-1.5">
                  {plan.secondary_goals.map((goal, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white text-[#1D1D1D] border border-[#E8E9EA] shadow-2xs"
                    >
                      {goal}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {plan.notes && (
              <div className="pt-2 border-t border-[#F0F0F1] space-y-1">
                <span className="font-semibold text-[#666668] block">Observações & Instruções</span>
                <p className="text-[#1D1D1D] leading-relaxed whitespace-pre-line">{plan.notes}</p>
              </div>
            )}
          </div>

          {/* 3. Distribution by Pillars (Interactive Allocation Matrix) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E9EA] pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-[#F7F7F8] border border-[#E8E9EA]">
                    <Layers className="w-4 h-4 text-[#1D1D1D]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#1D1D1D]">
                    Distribuição por Pilares Editoriais
                  </h3>
                </div>
                <p className="text-xs text-[#666668]">
                  Selecione os pilares que compõem este ciclo e defina a meta quantitativa de cada um.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveAllocations}
                  disabled={isSavingAllocations || isMutating}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#1D1D1D] hover:bg-[#2E2E2E] rounded-lg transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {isSavingAllocations && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSavingAllocations ? 'Salvando...' : 'Salvar Distribuição'}</span>
                </button>
              </div>
            </div>

            {/* Notification messages for pillar saving */}
            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {saveErrorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-800">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{saveErrorMsg}</span>
              </div>
            )}

            {/* Pillars Selection List */}
            {allocationRows.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-[#FBFBFC] border border-dashed border-[#E8E9EA] space-y-2">
                <p className="text-xs font-medium text-[#1D1D1D]">
                  Nenhum pilar editorial disponível para este cliente.
                </p>
                <p className="text-xs text-[#8C8D8F]">
                  Crie os pilares temáticos na seção anterior para distribuí-los neste ciclo.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {allocationRows.map((row) => (
                  <div
                    key={row.pillar_id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      row.isSelected
                        ? 'bg-[#FBFBFC] border-[#1D1D1D]/30 shadow-2xs'
                        : 'bg-white border-[#E8E9EA] opacity-75 hover:opacity-100'
                    }`}
                  >
                    {/* Left: Checkbox + Name + Description */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <label className="flex items-center gap-2 cursor-pointer mt-0.5">
                        <input
                          type="checkbox"
                          checked={row.isSelected}
                          onChange={() => handleToggleSelectPillar(row.pillar_id)}
                          disabled={isSavingAllocations}
                          className="w-4 h-4 rounded border-[#E8E9EA] text-[#1D1D1D] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#1D1D1D]"
                        />
                      </label>

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            onClick={() => handleToggleSelectPillar(row.pillar_id)}
                            className={`text-xs font-semibold cursor-pointer ${
                              row.isSelected ? 'text-[#1D1D1D]' : 'text-[#666668]'
                            }`}
                          >
                            {row.name}
                          </span>

                          {!row.is_active && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-500 border border-gray-200">
                              Inativo
                            </span>
                          )}
                        </div>

                        {row.description && (
                          <p className="text-xs text-[#8C8D8F] line-clamp-1 leading-relaxed">
                            {row.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Meta Target Count Input */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {row.isSelected ? (
                        <div className="flex items-center gap-1.5 bg-white border border-[#E8E9EA] rounded-lg p-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateTargetCount(row.pillar_id, row.target_count - 1)}
                            disabled={isSavingAllocations || row.target_count <= 0}
                            className="w-6 h-6 flex items-center justify-center rounded text-xs font-bold text-[#666668] hover:bg-[#F2F3F3] hover:text-[#1D1D1D] disabled:opacity-30 transition-colors"
                          >
                            -
                          </button>

                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={row.target_count}
                            onChange={(e) => handleUpdateTargetCount(row.pillar_id, e.target.value)}
                            disabled={isSavingAllocations}
                            className="w-12 text-center text-xs font-bold text-[#1D1D1D] focus:outline-none py-0.5"
                          />

                          <button
                            type="button"
                            onClick={() => handleUpdateTargetCount(row.pillar_id, row.target_count + 1)}
                            disabled={isSavingAllocations}
                            className="w-6 h-6 flex items-center justify-center rounded text-xs font-bold text-[#666668] hover:bg-[#F2F3F3] hover:text-[#1D1D1D] transition-colors"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleSelectPillar(row.pillar_id)}
                          disabled={isSavingAllocations}
                          className="px-3 py-1.5 text-xs font-medium text-[#666668] hover:text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#E8E9EA] rounded-lg transition-colors border border-[#E8E9EA] cursor-pointer"
                        >
                          Incluir no ciclo
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 border-t border-[#E8E9EA] bg-[#FDFDFE] flex items-center justify-between text-xs text-[#666668] shrink-0">
          <div className="flex items-center gap-2">
            <span>Total Distribuído:</span>
            <strong className="text-[#1D1D1D]">
              {liveMetrics.allocated_posts_count} de {liveMetrics.target_posts_count} posts
            </strong>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#E8E9EA] border border-[#E8E9EA] rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
