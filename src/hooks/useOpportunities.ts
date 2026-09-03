import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Opportunity,
  OpportunityMetrics,
  OpportunityStage,
  OpportunityStageFilter,
  CreateOpportunityInput,
  UpdateOpportunityInput,
} from '../types/opportunities';
import {
  fetchOpportunities,
  createOpportunity,
  updateOpportunity,
} from '../services/opportunitiesService';

const OPEN_STAGES: OpportunityStage[] = [
  'discovery',
  'briefing',
  'proposal',
  'negotiation',
];

export function useOpportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<OpportunityStageFilter>('all');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const loadOpportunities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchOpportunities();
      setOpportunities(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Falha ao carregar oportunidades.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOpportunities();
  }, [loadOpportunities]);

  const selectedOpportunity = useMemo(() => {
    if (!selectedOpportunityId) return null;
    return opportunities.find((o) => o.id === selectedOpportunityId) || null;
  }, [opportunities, selectedOpportunityId]);

  const metrics: OpportunityMetrics = useMemo(() => {
    let openCount = 0;
    let activePipelineValue = 0;
    let inProgressCount = 0;
    let wonCount = 0;
    let lostCount = 0;

    for (const opp of opportunities) {
      if (OPEN_STAGES.includes(opp.stage)) {
        openCount += 1;
        const val = Number(opp.estimated_value);
        if (!isNaN(val) && val > 0) {
          activePipelineValue += val;
        }
      }
      if (opp.stage === 'proposal' || opp.stage === 'negotiation') {
        inProgressCount += 1;
      }
      if (opp.stage === 'won') {
        wonCount += 1;
      }
      if (opp.stage === 'lost') {
        lostCount += 1;
      }
    }

    return {
      openCount,
      activePipelineValue,
      inProgressCount,
      wonCount,
      lostCount,
      totalCount: opportunities.length,
    };
  }, [opportunities]);

  const filteredOpportunities = useMemo(() => {
    if (stageFilter === 'all') return opportunities;
    if (stageFilter === 'open') {
      return opportunities.filter((o) => OPEN_STAGES.includes(o.stage));
    }
    return opportunities.filter((o) => o.stage === stageFilter);
  }, [opportunities, stageFilter]);

  const handleCreateOpportunity = useCallback(
    async (input: CreateOpportunityInput): Promise<Opportunity | null> => {
      try {
        setIsSubmitting(true);
        setSubmitError(null);
        const created = await createOpportunity(input);
        setOpportunities((prev) => [created, ...prev]);
        return created;
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Falha ao criar oportunidade.';
        setSubmitError(msg);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const handleUpdateOpportunity = useCallback(
    async (id: string, updates: UpdateOpportunityInput): Promise<boolean> => {
      try {
        setIsUpdating(true);
        setUpdateError(null);

        // Stage transition rules
        const finalUpdates: UpdateOpportunityInput = { ...updates };
        if (updates.stage) {
          if (updates.stage === 'won') {
            finalUpdates.closed_at = new Date().toISOString();
            finalUpdates.lost_reason = null;
          } else if (updates.stage === 'lost') {
            finalUpdates.closed_at = new Date().toISOString();
          } else if (OPEN_STAGES.includes(updates.stage)) {
            finalUpdates.closed_at = null;
            finalUpdates.lost_reason = null;
          }
        }

        const updated = await updateOpportunity(id, finalUpdates);
        setOpportunities((prev) =>
          prev.map((o) => (o.id === id ? updated : o))
        );
        return true;
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Falha ao atualizar oportunidade.';
        setUpdateError(msg);
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  const handleSelectOpportunity = useCallback((opp: Opportunity | null) => {
    setSelectedOpportunityId(opp ? opp.id : null);
    setUpdateError(null);
  }, []);

  return {
    opportunities: filteredOpportunities,
    allOpportunities: opportunities,
    loading,
    error,
    selectedOpportunity,
    metrics,
    stageFilter,
    setStageFilter,
    isSubmitting,
    submitError,
    setSubmitError,
    isUpdating,
    updateError,
    loadOpportunities,
    handleCreateOpportunity,
    handleUpdateOpportunity,
    handleSelectOpportunity,
  };
}
