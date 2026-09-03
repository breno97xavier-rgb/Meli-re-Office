import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Proposal,
  ProposalStatus,
  ProposalMetrics,
  CreateProposalInput,
} from '../types/proposals';
import {
  fetchProposals,
  createProposalWithItems,
  updateProposalStatus,
} from '../services/proposalsService';

export function useProposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ProposalStatus>('all');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const loadProposals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProposals();
      setProposals(data);

      // Keep selectedProposal in sync if updated
      setSelectedProposal((curr) => {
        if (!curr) return null;
        return data.find((p) => p.id === curr.id) || null;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar propostas.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const filteredProposals = useMemo(() => {
    if (statusFilter === 'all') return proposals;
    return proposals.filter((p) => p.status === statusFilter);
  }, [proposals, statusFilter]);

  const metrics = useMemo<ProposalMetrics>(() => {
    let draftCount = 0;
    let sentCount = 0;
    let acceptedCount = 0;
    let totalAcceptedMonthly = 0;
    let totalAcceptedOneTime = 0;

    for (const p of proposals) {
      if (p.status === 'draft') draftCount++;
      if (p.status === 'sent') sentCount++;
      if (p.status === 'accepted') {
        acceptedCount++;
        if (p.items && Array.isArray(p.items)) {
          for (const item of p.items) {
            const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
            if (item.billing_type === 'monthly') {
              totalAcceptedMonthly += lineTotal;
            } else if (item.billing_type === 'one_time') {
              totalAcceptedOneTime += lineTotal;
            }
          }
        }
      }
    }

    return {
      draftCount,
      sentCount,
      acceptedCount,
      totalAcceptedMonthly,
      totalAcceptedOneTime,
    };
  }, [proposals]);

  const handleCreateProposal = useCallback(
    async (input: CreateProposalInput): Promise<boolean> => {
      try {
        setIsSubmitting(true);
        setSubmitError(null);
        const { proposal } = await createProposalWithItems(input);
        // Reload full proposals to have all joins (opportunity, lead, items) in sync
        await loadProposals();
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao criar proposta.';
        setSubmitError(msg);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [loadProposals]
  );

  const handleUpdateStatus = useCallback(
    async (id: string, newStatus: ProposalStatus): Promise<boolean> => {
      try {
        setIsUpdating(true);
        setUpdateError(null);
        const updated = await updateProposalStatus(id, newStatus);
        setProposals((prev) => prev.map((p) => (p.id === id ? updated : p)));
        setSelectedProposal((curr) => (curr && curr.id === id ? updated : curr));
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao atualizar status.';
        setUpdateError(msg);
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  const handleSelectProposal = useCallback((proposal: Proposal | null) => {
    setSelectedProposal(proposal);
    setUpdateError(null);
  }, []);

  return {
    proposals: filteredProposals,
    allProposals: proposals,
    loading,
    error,
    selectedProposal,
    statusFilter,
    setStatusFilter,
    metrics,
    isSubmitting,
    submitError,
    isUpdating,
    updateError,
    loadProposals,
    handleCreateProposal,
    handleUpdateStatus,
    handleSelectProposal,
  };
}
