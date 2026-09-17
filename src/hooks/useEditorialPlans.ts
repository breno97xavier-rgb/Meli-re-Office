import { useState, useEffect, useCallback } from 'react';
import {
  EditorialPlan,
  EditorialPlanStatus,
  CreateEditorialPlanInput,
  UpdateEditorialPlanInput,
  GetEditorialPlansOptions,
} from '../types/planning';
import {
  getEditorialPlans,
  createEditorialPlan,
  updateEditorialPlan,
  setEditorialPlanStatus,
  archiveEditorialPlan,
  formatPlanningError,
} from '../services/planningService';

export interface UseEditorialPlansOptions extends GetEditorialPlansOptions {}

export interface UseEditorialPlansReturn {
  plans: EditorialPlan[];
  loading: boolean;
  error: string | null;
  mutating: boolean;
  mutationError: string | null;
  loadPlans: () => Promise<void>;
  createPlan: (input: Omit<CreateEditorialPlanInput, 'client_id'>) => Promise<EditorialPlan | null>;
  updatePlan: (planId: string, input: UpdateEditorialPlanInput) => Promise<EditorialPlan | null>;
  setStatus: (planId: string, status: EditorialPlanStatus) => Promise<boolean>;
  archivePlan: (planId: string) => Promise<boolean>;
}

export function useEditorialPlans(
  clientId?: string,
  options?: UseEditorialPlansOptions
): UseEditorialPlansReturn {
  const [plans, setPlans] = useState<EditorialPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(clientId));
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState<boolean>(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const statusFilter = options?.status;
  const includeArchived = options?.includeArchived;

  const loadPlans = useCallback(async () => {
    if (!clientId) {
      setPlans([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getEditorialPlans(clientId, {
        status: statusFilter,
        includeArchived,
      });
      setPlans(data);
    } catch (err) {
      console.error('Erro ao carregar ciclos de planejamento:', err);
      setError(formatPlanningError(err));
    } finally {
      setLoading(false);
    }
  }, [clientId, statusFilter, includeArchived]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const createPlan = useCallback(
    async (input: Omit<CreateEditorialPlanInput, 'client_id'>): Promise<EditorialPlan | null> => {
      if (!clientId) {
        setMutationError('ID do cliente não informado.');
        return null;
      }

      setMutating(true);
      setMutationError(null);

      try {
        const created = await createEditorialPlan(clientId, {
          ...input,
          client_id: clientId,
        });

        setPlans((prev) => {
          // Insere respeitando a ordenação: start_date DESC, created_at DESC
          const next = [created, ...prev];
          return next.sort((a, b) => {
            const dateCmp = (b.start_date || '').localeCompare(a.start_date || '');
            if (dateCmp !== 0) return dateCmp;
            return (b.created_at || '').localeCompare(a.created_at || '');
          });
        });

        return created;
      } catch (err) {
        console.error('Erro ao criar plano editorial:', err);
        const errorMsg = formatPlanningError(err);
        setMutationError(errorMsg);
        return null;
      } finally {
        setMutating(false);
      }
    },
    [clientId]
  );

  const updatePlan = useCallback(
    async (planId: string, input: UpdateEditorialPlanInput): Promise<EditorialPlan | null> => {
      if (!planId) {
        setMutationError('ID do plano editorial não informado.');
        return null;
      }

      setMutating(true);
      setMutationError(null);

      try {
        const updated = await updateEditorialPlan(planId, input);

        setPlans((prev) =>
          prev.map((p) => (p.id === planId ? { ...p, ...updated } : p))
        );

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
    []
  );

  const setStatus = useCallback(
    async (planId: string, status: EditorialPlanStatus): Promise<boolean> => {
      if (!planId) {
        setMutationError('ID do plano editorial não informado.');
        return false;
      }

      setMutating(true);
      setMutationError(null);

      try {
        const updated = await setEditorialPlanStatus(planId, status);

        setPlans((prev) => {
          // Se o novo status for archived e includeArchived for falso, remove da listagem
          if (status === 'archived' && !includeArchived && statusFilter !== 'archived') {
            return prev.filter((p) => p.id !== planId);
          }
          return prev.map((p) => (p.id === planId ? { ...p, ...updated } : p));
        });

        return true;
      } catch (err) {
        console.error('Erro ao alterar status do plano:', err);
        const errorMsg = formatPlanningError(err);
        setMutationError(errorMsg);
        return false;
      } finally {
        setMutating(false);
      }
    },
    [includeArchived, statusFilter]
  );

  const archivePlan = useCallback(
    async (planId: string): Promise<boolean> => {
      if (!planId) {
        setMutationError('ID do plano editorial não informado.');
        return false;
      }

      setMutating(true);
      setMutationError(null);

      try {
        await archiveEditorialPlan(planId);

        setPlans((prev) => {
          if (!includeArchived && statusFilter !== 'archived') {
            return prev.filter((p) => p.id !== planId);
          }
          return prev.map((p) => (p.id === planId ? { ...p, status: 'archived' } : p));
        });

        return true;
      } catch (err) {
        console.error('Erro ao arquivar plano editorial:', err);
        const errorMsg = formatPlanningError(err);
        setMutationError(errorMsg);
        return false;
      } finally {
        setMutating(false);
      }
    },
    [includeArchived, statusFilter]
  );

  return {
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
  };
}
