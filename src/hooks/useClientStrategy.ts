import { useState, useEffect, useCallback } from 'react';
import { ClientStrategy, UpdateClientStrategyInput } from '../types/planning';
import {
  getClientStrategy,
  upsertClientStrategy,
  formatPlanningError,
} from '../services/planningService';

export interface UseClientStrategyReturn {
  strategy: ClientStrategy | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  saveError: string | null;
  loadStrategy: () => Promise<void>;
  saveStrategy: (input: UpdateClientStrategyInput) => Promise<ClientStrategy | null>;
}

export function useClientStrategy(clientId?: string): UseClientStrategyReturn {
  const [strategy, setStrategy] = useState<ClientStrategy | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(clientId));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadStrategy = useCallback(async () => {
    if (!clientId) {
      setStrategy(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getClientStrategy(clientId);
      setStrategy(data);
    } catch (err) {
      console.error('Erro ao carregar estratégia do cliente:', err);
      setError(formatPlanningError(err));
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadStrategy();
  }, [loadStrategy]);

  const saveStrategy = useCallback(
    async (input: UpdateClientStrategyInput): Promise<ClientStrategy | null> => {
      if (!clientId) {
        setSaveError('ID do cliente não informado.');
        return null;
      }

      setSaving(true);
      setSaveError(null);

      try {
        const updated = await upsertClientStrategy(clientId, input);
        setStrategy(updated);
        return updated;
      } catch (err) {
        console.error('Erro ao salvar estratégia do cliente:', err);
        const errorMsg = formatPlanningError(err);
        setSaveError(errorMsg);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [clientId]
  );

  return {
    strategy,
    loading,
    error,
    saving,
    saveError,
    loadStrategy,
    saveStrategy,
  };
}
