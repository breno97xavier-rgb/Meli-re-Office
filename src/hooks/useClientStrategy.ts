import { useState, useEffect, useCallback, useRef } from 'react';
import { saveStrategyRevision } from '../services/planningFoundationService';
import { ClientStrategy, UpdateClientStrategyInput } from '../types/planning';
import {
  getClientStrategy,
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
  const epoch = useRef(0);
  const locked = useRef(false);

  const loadStrategy = useCallback(async () => {
    const request = ++epoch.current;
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
      if (request === epoch.current) setStrategy(data);
    } catch (err) {
      console.error('Erro ao carregar estratégia do cliente:', err);
      if (request === epoch.current) setError(formatPlanningError(err));
    } finally {
      if (request === epoch.current) setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadStrategy();
    return () => { epoch.current++; };
  }, [loadStrategy]);

  const saveStrategy = useCallback(
    async (input: UpdateClientStrategyInput): Promise<ClientStrategy | null> => {
      if (!clientId) {
        setSaveError('ID do cliente não informado.');
        return null;
      }

      if (locked.current) return null;
      locked.current = true;
      setSaving(true);
      setSaveError(null);

      try {
        const updated = await saveStrategyRevision(clientId, strategy?.revision || 0, input);
        setStrategy(updated);
        return updated;
      } catch (err) {
        console.error('Erro ao salvar estratégia do cliente:', err);
        const errorMsg = formatPlanningError(err);
        setSaveError(errorMsg);
        return null;
      } finally {
        locked.current = false;
        setSaving(false);
      }
    },
    [clientId, strategy?.revision]
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
