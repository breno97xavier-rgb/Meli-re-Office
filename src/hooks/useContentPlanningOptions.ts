import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { EditorialPlan, ClientPillar, Campaign } from '../types/planning';
import {
  fetchContentPlanningOptions,
  formatPlanningError,
} from '../services/planningService';

export interface UseContentPlanningOptionsResult {
  plans: EditorialPlan[];
  activePlans: EditorialPlan[];
  pillars: ClientPillar[];
  activePillars: ClientPillar[];
  campaigns: Campaign[];
  activeCampaigns: Campaign[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Hook para carregar e gerenciar opções de planejamento (ciclos, pilares e campanhas)
 * contextualizadas para um determinado cliente.
 *
 * Fornece listas completas (para resolução de vínculos históricos) e listas ativas
 * (para seleção de novos vínculos).
 */
export function useContentPlanningOptions(
  clientId?: string | null
): UseContentPlanningOptionsResult {
  const [plans, setPlans] = useState<EditorialPlan[]>([]);
  const [pillars, setPillars] = useState<ClientPillar[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const [loadedClientId, setLoadedClientId] = useState<string | null | undefined>(undefined);

  const loadOptions = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setPlans([]);
    setPillars([]);
    setCampaigns([]);
    setLoadedClientId(clientId);
    if (!clientId) {
      setPlans([]);
      setPillars([]);
      setCampaigns([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchContentPlanningOptions(clientId);
      if (sequence !== requestSequence.current) return;
      setPlans(data.editorialPlans);
      setPillars(data.pillars);
      setCampaigns(data.campaigns);
    } catch (err) {
      if (sequence !== requestSequence.current) return;
      const msg = formatPlanningError(err);
      setError(msg);
      console.error('[useContentPlanningOptions] Erro ao carregar opções de planejamento:', err);
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadOptions();
    return () => { requestSequence.current += 1; };
  }, [loadOptions]);

  const matchesClient = loadedClientId === clientId;

  // Listas ativas para novos cadastros e seleções operacionais
  const activePlans = useMemo(
    () => plans.filter((p) => p.status === 'active' || p.status === 'draft'),
    [plans]
  );

  const activePillars = useMemo(
    () => pillars.filter((p) => p.is_active),
    [pillars]
  );

  const activeCampaigns = useMemo(
    () => campaigns.filter((c) => c.status === 'active' || c.status === 'draft'),
    [campaigns]
  );

  return {
    plans: matchesClient ? plans : [],
    activePlans: matchesClient ? activePlans : [],
    pillars: matchesClient ? pillars : [],
    activePillars: matchesClient ? activePillars : [],
    campaigns: matchesClient ? campaigns : [],
    activeCampaigns: matchesClient ? activeCampaigns : [],
    loading: matchesClient ? loading : Boolean(clientId),
    error: matchesClient ? error : null,
    reload: loadOptions,
  };
}
