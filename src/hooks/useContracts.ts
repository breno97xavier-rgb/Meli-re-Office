import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Contract,
  ContractStatus,
  ContractStatusFilter,
  ContractMetrics,
  CreateContractInput,
  UpdateContractOperationalInput,
} from '../types/contracts';
import {
  fetchContracts,
  createContractFromProposal,
  transitionContractStatus,
  updateContractOperational,
} from '../services/contractsService';
import { convertSignedContractToClient } from '../services/clientsService';
import { Client } from '../types/clients';

export function useContracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [statusFilter, setStatusFilter] = useState<ContractStatusFilter>('all');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const loadContracts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchContracts();
      setContracts(data);

      // Keep selectedContract in sync if updated
      setSelectedContract((curr) => {
        if (!curr) return null;
        return data.find((c) => c.id === curr.id) || null;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar contratos.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const filteredContracts = useMemo(() => {
    if (statusFilter === 'all') return contracts;
    return contracts.filter((c) => c.status === statusFilter);
  }, [contracts, statusFilter]);

  const metrics = useMemo<ContractMetrics>(() => {
    let totalCount = contracts.length;
    let pendingSignatureCount = 0;
    let signedCount = 0;
    let expiringSoonCount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    in30Days.setHours(23, 59, 59, 999);

    for (const c of contracts) {
      if (c.status === 'pending_signature') {
        pendingSignatureCount++;
      } else if (c.status === 'signed') {
        signedCount++;
        if (c.end_date) {
          try {
            const endDate = new Date(c.end_date + 'T00:00:00');
            if (!isNaN(endDate.getTime()) && endDate >= today && endDate <= in30Days) {
              expiringSoonCount++;
            }
          } catch {
            // Ignore invalid date format
          }
        }
      }
    }

    return {
      totalCount,
      pendingSignatureCount,
      signedCount,
      expiringSoonCount,
    };
  }, [contracts]);

  const handleCreateContract = useCallback(
    async (input: CreateContractInput): Promise<{ success: boolean; contract?: Contract; error?: string }> => {
      try {
        setIsSubmitting(true);
        setSubmitError(null);
        const created = await createContractFromProposal(input);
        await loadContracts();
        return { success: true, contract: created };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao criar contrato.';
        setSubmitError(msg);
        return { success: false, error: msg };
      } finally {
        setIsSubmitting(false);
      }
    },
    [loadContracts]
  );

  const handleTransitionStatus = useCallback(
    async (
      contractId: string,
      targetStatus: ContractStatus,
      reason?: string | null
    ): Promise<boolean> => {
      try {
        setIsTransitioning(true);
        setTransitionError(null);
        const updated = await transitionContractStatus(contractId, targetStatus, reason);
        setContracts((prev) => prev.map((c) => (c.id === contractId ? updated : c)));
        setSelectedContract((curr) => (curr && curr.id === contractId ? updated : curr));
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao alterar status do contrato.';
        setTransitionError(msg);
        return false;
      } finally {
        setIsTransitioning(false);
      }
    },
    []
  );

  const handleUpdateContract = useCallback(
    async (
      id: string,
      updates: UpdateContractOperationalInput
    ): Promise<boolean> => {
      try {
        setIsUpdating(true);
        setUpdateError(null);
        const updated = await updateContractOperational(id, updates);
        setContracts((prev) => prev.map((c) => (c.id === id ? updated : c)));
        setSelectedContract((curr) => (curr && curr.id === id ? updated : curr));
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao atualizar dados do contrato.';
        setUpdateError(msg);
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  const handleSelectContract = useCallback((contract: Contract | null) => {
    setSelectedContract(contract);
    setTransitionError(null);
    setUpdateError(null);
  }, []);

  const handleConvertToClient = useCallback(
    async (
      contractId: string
    ): Promise<{ success: boolean; client?: Client; error?: string }> => {
      try {
        const client = await convertSignedContractToClient(contractId);

        // Update local state: link opportunity to the newly created client
        setContracts((prev) =>
          prev.map((c) => {
            if (c.id === contractId && c.opportunity) {
              return {
                ...c,
                opportunity: {
                  ...c.opportunity,
                  client_id: client.id,
                },
              };
            }
            return c;
          })
        );

        setSelectedContract((curr) => {
          if (curr && curr.id === contractId && curr.opportunity) {
            return {
              ...curr,
              opportunity: {
                ...curr.opportunity,
                client_id: client.id,
              },
            };
          }
          return curr;
        });

        return { success: true, client };
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Erro ao converter contrato em cliente.';
        return { success: false, error: msg };
      }
    },
    []
  );

  return {
    contracts: filteredContracts,
    allContracts: contracts,
    loading,
    error,
    selectedContract,
    statusFilter,
    setStatusFilter,
    metrics,
    isSubmitting,
    submitError,
    isTransitioning,
    transitionError,
    isUpdating,
    updateError,
    loadContracts,
    handleCreateContract,
    handleTransitionStatus,
    handleUpdateContract,
    handleConvertToClient,
    handleSelectContract,
  };
}
