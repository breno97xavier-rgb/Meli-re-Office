import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  EditorialPlan,
  EditorialPlanStatus,
  EditorialPlanMetrics,
  EditorialPlanPillarAllocationInput,
  UpdateEditorialPlanInput,
} from '../types/planning';
import {
  getEditorialPlan,
  updateEditorialPlan,
  setEditorialPlanStatus,
  archiveEditorialPlan,
  setEditorialPlanPillars,
  calculateEditorialPlanMetrics,
  formatPlanningError,
} from '../services/planningService';

export interface UseEditorialPlanReturn {
  plan: EditorialPlan | null;
  metrics: EditorialPlanMetrics;
  loading: boolean;
  error: string | null;
  mutating: boolean;
  mutationError: string | null;
  loadPlan: () => Promise<void>;
  updatePlan: (input: UpdateEditorialPlanInput) => Promise<EditorialPlan | null>;
  setStatus: (status: EditorialPlanStatus) => Promise<boolean>;
  archivePlan: () => Promise<boolean>;
  savePillarAllocations: (allocations: EditorialPlanPillarAllocationInput[]) => Promise<boolean>;
}

export function useEditorialPlan(planId?: string): UseEditorialPlanReturn {
  const [plan, setPlan] = useState<EditorialPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(planId));
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState<boolean>(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const loadPlan = useCallback(async () => {
    if (!planId) {
      setPlan(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getEditorialPlan(planId);
      setPlan(data);
    } catch (err) {
      console.error('Erro ao carregar ciclo de planejamento:', err);
      setError(formatPlanningError(err));
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const metrics = useMemo<EditorialPlanMetrics>(() => {
    if (!plan) {
      return {
        target_posts_count: 0,
        allocated_posts_count: 0,
        unallocated_posts_count: 0,
        overallocated: false,
        pillar_count: 0,
      };
    }
    return calculateEditorialPlanMetrics(plan.target_posts_count, plan.pillars || []);
  }, [plan]);

  const updatePlanHandler = useCallback(
    async (input: UpdateEditorialPlanInput): Promise<EditorialPlan | null> => {
      if (!planId) {
        setMutationError('ID do plano editorial não informado.');
        return null;
      }

      setMutating(true);
      setMutationError(null);

      try {
        const updated = await updateEditorialPlan(planId, input);
        setPlan(updated);
        return updated;
      } catch (err) {
        console.error('Erro ao atualizar plano editorial:', err);
        const errorMsg = formatPlanningError(err);
        setMutationError(errorMsg);
        return null;
      } finally {
        setMutating(false);
      }
    },
    [planId]
  );

  const setStatusHandler = useCallback(
    async (status: EditorialPlanStatus): Promise<boolean> => {
      if (!planId) {
        setMutationError('ID do plano editorial não informado.');
        return false;
      }

      setMutating(true);
      setMutationError(null);

      try {
        const updated = await setEditorialPlanStatus(planId, status);
        setPlan(updated);
        return true;
      } catch (err) {
        console.error('Erro ao alterar status do plano editorial:', err);
        const errorMsg = formatPlanningError(err);
        setMutationError(errorMsg);
        return false;
      } finally {
        setMutating(false);
      }
    },
    [planId]
  );

  const archivePlanHandler = useCallback(async (): Promise<boolean> => {
    if (!planId) {
      setMutationError('ID do plano editorial não informado.');
      return false;
    }

    setMutating(true);
    setMutationError(null);

    try {
      const updated = await archiveEditorialPlan(planId);
      setPlan(updated);
      return true;
    } catch (err) {
      console.error('Erro ao arquivar plano editorial:', err);
      const errorMsg = formatPlanningError(err);
      setMutationError(errorMsg);
      return false;
    } finally {
      setMutating(false);
    }
  }, [planId]);

  const savePillarAllocations = useCallback(
    async (allocations: EditorialPlanPillarAllocationInput[]): Promise<boolean> => {
      if (!planId || !plan?.client_id) {
        setMutationError('Plano ou cliente não identificado.');
        return false;
      }

      setMutating(true);
      setMutationError(null);

      try {
        const updatedPillars = await setEditorialPlanPillars(
          planId,
          plan.client_id,
          allocations
        );

        setPlan((prev) => (prev ? { ...prev, pillars: updatedPillars } : null));
        return true;
      } catch (err) {
        console.error('Erro ao salvar alocações de pilares do plano:', err);
        const errorMsg = formatPlanningError(err);
        setMutationError(errorMsg);
        return false;
      } finally {
        setMutating(false);
      }
    },
    [planId, plan?.client_id]
  );

  return {
    plan,
    metrics,
    loading,
    error,
    mutating,
    mutationError,
    loadPlan,
    updatePlan: updatePlanHandler,
    setStatus: setStatusHandler,
    archivePlan: archivePlanHandler,
    savePillarAllocations,
  };
}
