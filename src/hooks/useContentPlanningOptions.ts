import { useState, useEffect, useCallback, useMemo } from 'react';
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

  const loadOptions = useCallback(async () => {
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
      setPlans(data.editorialPlans);
      setPillars(data.pillars);
      setCampaigns(data.campaigns);
    } catch (err) {
      const msg = formatPlanningError(err);
      setError(msg);
      console.error('[useContentPlanningOptions] Erro ao carregar opções de planejamento:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

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
    plans,
    activePlans,
    pillars,
    activePillars,
    campaigns,
    activeCampaigns,
    loading,
    error,
    reload: loadOptions,
  };
}
