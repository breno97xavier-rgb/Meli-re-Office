import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarRange,
  Plus,
  Loader2,
  AlertCircle,
  Archive,
  Eye,
  EyeOff,
  Layers,
} from 'lucide-react';
import {
  EditorialPlan,
  EditorialPlanStatus,
  ClientPillar,
  EditorialPlanPillarAllocationInput,
  CreateEditorialPlanInput,
  UpdateEditorialPlanInput,
} from '../../types/planning';
import { useEditorialPlans } from '../../hooks/useEditorialPlans';
import { setEditorialPlanPillars } from '../../services/planningService';
import { EditorialPlanCard } from './EditorialPlanCard';
import { EditorialPlanFormModal } from './EditorialPlanFormModal';
import { EditorialPlanDetailModal } from './EditorialPlanDetailModal';
import { ArchivePlanConfirmModal } from './ArchivePlanConfirmModal';

interface EditorialCyclesSectionProps {
  clientId: string;
  clientPillars: ClientPillar[];
}

export const EditorialCyclesSection: React.FC<EditorialCyclesSectionProps> = ({
  clientId,
  clientPillars,
}) => {
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);

  // Core hook
  const {
    plans,
    loading,
    error,
    mutating,
    mutationError,
    loadPlans,
    createPlan,
    updatePlan,
    setStatus,
    archivePlan,
  } = useEditorialPlans(clientId, { includeArchived });

  // Modals & Selection States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedPlanForDetail, setSelectedPlanForDetail] = useState<EditorialPlan | null>(null);
  const [planToEdit, setPlanToEdit] = useState<EditorialPlan | null>(null);
  const [planToArchive, setPlanToArchive] = useState<EditorialPlan | null>(null);
  const [isArchiving, setIsArchiving] = useState<boolean>(false);

  // Close open modals when client changes
  useEffect(() => {
    setIsCreateModalOpen(false);
    setSelectedPlanForDetail(null);
    setPlanToEdit(null);
    setPlanToArchive(null);
  }, [clientId]);

  // Keep selectedPlanForDetail updated with the latest data in plans array
  useEffect(() => {
    if (selectedPlanForDetail) {
      const refreshed = plans.find((p) => p.id === selectedPlanForDetail.id);
      if (refreshed) {
        setSelectedPlanForDetail(refreshed);
      }
    }
  }, [plans, selectedPlanForDetail?.id]);

  // Handlers
  const handleOpenCreate = () => {
    setPlanToEdit(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (plan: EditorialPlan) => {
    setPlanToEdit(plan);
    setIsCreateModalOpen(true);
  };

  const handleSavePlanForm = async (
    input: Omit<CreateEditorialPlanInput, 'client_id'> | UpdateEditorialPlanInput
  ): Promise<EditorialPlan | null> => {
    if (planToEdit) {
      const updated = await updatePlan(planToEdit.id, input);
      if (updated && selectedPlanForDetail?.id === planToEdit.id) {
        setSelectedPlanForDetail(updated);
      }
      return updated;
    } else {
      const created = await createPlan(input as Omit<CreateEditorialPlanInput, 'client_id'>);
      return created;
    }
  };

  const handleSetStatus = async (
    planId: string,
    newStatus: EditorialPlanStatus
  ): Promise<boolean> => {
    const ok = await setStatus(planId, newStatus);
    return ok;
  };

  const handleConfirmArchive = async () => {
    if (!planToArchive) return;
    setIsArchiving(true);
    try {
      const ok = await archivePlan(planToArchive.id);
      if (ok) {
        if (selectedPlanForDetail?.id === planToArchive.id) {
          if (!includeArchived) {
            setSelectedPlanForDetail(null);
          } else {
            setSelectedPlanForDetail((prev) => (prev ? { ...prev, status: 'archived' } : null));
          }
        }
        setPlanToArchive(null);
      }
    } finally {
      setIsArchiving(false);
    }
  };

  const handleSavePillarAllocations = async (
    planId: string,
    allocations: EditorialPlanPillarAllocationInput[]
  ): Promise<boolean> => {
    if (!clientId) return false;
    try {
      const updatedPillars = await setEditorialPlanPillars(planId, clientId, allocations);
      // Reload plans to ensure all components and cards reflect updated relations
      await loadPlans();
      return true;
    } catch (err) {
      console.error('Erro ao salvar alocações na seção:', err);
      throw err;
    }
  };

  return (
    <section
      id="editorial-cycles-section"
      className="bg-white border border-[#E8E9EA] rounded-xl p-5 md:p-6 shadow-2xs space-y-6"
    >
      {/* 1. Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#F7F7F8] border border-[#E8E9EA] text-[#1D1D1D]">
            <CalendarRange className="w-5 h-5 text-[#1D1D1D]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[#1D1D1D]">
                Ciclos de Planejamento
              </h2>
              <span className="text-xs text-[#8C8D8F] font-normal">
                ({plans.length} {plans.length === 1 ? 'ciclo' : 'ciclos'})
              </span>
            </div>
            <p className="text-xs text-[#666668] mt-0.5">
              Organize períodos, objetivos e a distribuição editorial do cliente.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Toggle Archived */}
          <button
            type="button"
            onClick={() => setIncludeArchived((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              includeArchived
                ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/70'
                : 'bg-[#F7F7F8] text-[#666668] border-[#E8E9EA] hover:bg-[#E8E9EA] hover:text-[#1D1D1D]'
            }`}
          >
            {includeArchived ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{includeArchived ? 'Ocultar arquivados' : 'Mostrar arquivados'}</span>
          </button>

          {/* New Cycle Button */}
          <button
            type="button"
            onClick={handleOpenCreate}
            disabled={loading || mutating}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#1D1D1D] hover:bg-[#2E2E2E] rounded-lg transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#F3705A]" />
            <span>Novo ciclo</span>
          </button>
        </div>
      </div>

      {/* 2. Error States */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">Erro ao carregar ciclos de planejamento</span>
            <p className="leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {mutationError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{mutationError}</span>
        </div>
      )}

      {/* 3. Loading State */}
      {loading && !error && (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#8C8D8F]" />
          <p className="text-xs text-[#666668]">Carregando ciclos de planejamento...</p>
        </div>
      )}

      {/* 4. Empty State */}
      {!loading && !error && plans.length === 0 && (
        <div
          id="editorial-cycles-empty-state"
          className="p-8 md:p-10 text-center rounded-xl border border-dashed border-[#E8E9EA] bg-[#FBFBFC] space-y-3.5"
        >
          <div className="w-10 h-10 mx-auto rounded-full bg-[#F7F7F8] border border-[#E8E9EA] flex items-center justify-center text-[#8C8D8F]">
            <CalendarRange className="w-5 h-5 text-[#8C8D8F]" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-xs font-semibold text-[#1D1D1D]">
              Nenhum ciclo de planejamento criado
            </h3>
            <p className="text-xs text-[#666668] leading-relaxed">
              Crie um período para organizar objetivos, pilares e metas de conteúdo deste cliente.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#1D1D1D] hover:bg-[#2E2E2E] rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#F3705A]" />
              <span>Criar primeiro ciclo</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Plans Grid */}
      {!loading && !error && plans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <EditorialPlanCard
              key={plan.id}
              plan={plan}
              onClick={() => setSelectedPlanForDetail(plan)}
            />
          ))}
        </div>
      )}

      {/* 6. Form Modal (Create / Edit) */}
      <EditorialPlanFormModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setPlanToEdit(null);
        }}
        planToEdit={planToEdit}
        onSave={handleSavePlanForm}
        isSaving={mutating}
      />

      {/* 7. Detail Modal */}
      <EditorialPlanDetailModal
        isOpen={Boolean(selectedPlanForDetail)}
        onClose={() => setSelectedPlanForDetail(null)}
        plan={selectedPlanForDetail}
        clientPillars={clientPillars}
        onEdit={(p) => {
          setSelectedPlanForDetail(p);
          handleOpenEdit(p);
        }}
        onSetStatus={handleSetStatus}
        onArchive={(p) => setPlanToArchive(p)}
        onSavePillarAllocations={handleSavePillarAllocations}
        isMutating={mutating}
      />

      {/* 8. Archive Confirm Modal */}
      <ArchivePlanConfirmModal
        isOpen={Boolean(planToArchive)}
        onClose={() => setPlanToArchive(null)}
        planTitle={planToArchive?.title || ''}
        onConfirm={handleConfirmArchive}
        isArchiving={isArchiving}
      />
    </section>
  );
};
