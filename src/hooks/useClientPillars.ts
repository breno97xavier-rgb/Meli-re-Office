import { useState, useEffect, useCallback } from 'react';
import {
  ClientPillar,
  CreateClientPillarInput,
  UpdateClientPillarInput,
} from '../types/planning';
import {
  getClientPillars,
  createClientPillar,
  updateClientPillar,
  setClientPillarActive,
  reorderClientPillars,
  formatPlanningError,
} from '../services/planningService';

export interface UseClientPillarsOptions {
  includeInactive?: boolean;
}

export interface UseClientPillarsReturn {
  pillars: ClientPillar[];
  loading: boolean;
  error: string | null;
  mutating: boolean;
  mutationError: string | null;
  loadPillars: () => Promise<void>;
  createPillar: (input: Omit<CreateClientPillarInput, 'client_id'>) => Promise<ClientPillar | null>;
  updatePillar: (pillarId: string, input: UpdateClientPillarInput) => Promise<ClientPillar | null>;
  togglePillarActive: (pillarId: string, isActive: boolean) => Promise<boolean>;
  reorderPillars: (orderedIds: string[]) => Promise<boolean>;
}

export function useClientPillars(
  clientId?: string,
  options?: UseClientPillarsOptions
): UseClientPillarsReturn {
  const [pillars, setPillars] = useState<ClientPillar[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(clientId));
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState<boolean>(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const includeInactive = Boolean(options?.includeInactive);

  const loadPillars = useCallback(async () => {
    if (!clientId) {
      setPillars([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getClientPillars(clientId, { includeInactive });
      setPillars(data);
    } catch (err) {
      console.error('Erro ao carregar pilares do cliente:', err);
      setError(formatPlanningError(err));
    } finally {
      setLoading(false);
    }
  }, [clientId, includeInactive]);

  useEffect(() => {
    loadPillars();
  }, [loadPillars]);

  const createPillar = useCallback(
    async (input: Omit<CreateClientPillarInput, 'client_id'>): Promise<ClientPillar | null> => {
      if (!clientId) {
        setMutationError('ID do cliente não informado.');
        return null;
      }

      setMutating(true);
      setMutationError(null);

      try {
        const created = await createClientPillar(clientId, {
          ...input,
          client_id: clientId,
        });
        setPillars((prev) => [...prev, created]);
        return created;
      } catch (err) {
        console.error('Erro ao criar pilar:', err);
        const errorMsg = formatPlanningError(err);
        setMutationError(errorMsg);
        return null;
      } finally {
        setMutating(false);
      }
    },
    [clientId]
  );

  const updatePillar = useCallback(
    async (pillarId: string, input: UpdateClientPillarInput): Promise<ClientPillar | null> => {
      if (!pillarId) {
        setMutationError('ID do pilar não informado.');
        return null;
      }

      setMutating(true);
      setMutationError(null);

      try {
        const updated = await updateClientPillar(pillarId, input);
        setPillars((prev) =>
          prev.map((item) => (item.id === pillarId ? updated : item))
        );
        return updated;
      } catch (err) {
        console.error('Erro ao atualizar pilar:', err);
        const errorMsg = formatPlanningError(err);
        setMutationError(errorMsg);
        return null;
      } finally {
        setMutating(false);
      }
    },
    []
  );

  const togglePillarActive = useCallback(
    async (pillarId: string, isActive: boolean): Promise<boolean> => {
      if (!pillarId) {
        setMutationError('ID do pilar não informado.');
        return false;
      }

      setMutating(true);
      setMutationError(null);

      try {
        const updated = await setClientPillarActive(pillarId, isActive);
        if (!includeInactive && !isActive) {
          // Se não estamos exibindo inativos, remove do estado local
          setPillars((prev) => prev.filter((item) => item.id !== pillarId));
        } else {
          setPillars((prev) =>
            prev.map((item) => (item.id === pillarId ? updated : item))
          );
        }
        return true;
      } catch (err) {
        console.error('Erro ao alternar status do pilar:', err);
        const errorMsg = formatPlanningError(err);
        setMutationError(errorMsg);
        return false;
      } finally {
        setMutating(false);
      }
    },
    [includeInactive]
  );

  const reorderPillars = useCallback(
    async (orderedIds: string[]): Promise<boolean> => {
      if (!clientId) {
        setMutationError('ID do cliente não informado.');
        return false;
      }

      setMutating(true);
      setMutationError(null);

      try {
        const updatedList = await reorderClientPillars(clientId, orderedIds);
        setPillars(updatedList);
        return true;
      } catch (err) {
        console.error('Erro ao reordenar pilares:', err);
        const errorMsg = formatPlanningError(err);
        setMutationError(errorMsg);
        return false;
      } finally {
        setMutating(false);
      }
    },
    [clientId]
  );

  return {
    pillars,
    loading,
    error,
    mutating,
    mutationError,
    loadPillars,
    createPillar,
    updatePillar,
    togglePillarActive,
    reorderPillars,
  };
}
