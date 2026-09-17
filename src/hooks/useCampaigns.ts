import { useState, useEffect, useCallback } from 'react';
import {
  Campaign,
  CampaignStatus,
  CreateCampaignInput,
  UpdateCampaignInput,
  GetCampaignsOptions,
} from '../types/planning';
import {
  getCampaigns,
  createCampaign,
  updateCampaign,
  setCampaignStatus,
  archiveCampaign,
  deleteCampaign,
  formatPlanningError,
} from '../services/planningService';

export interface UseCampaignsOptions extends GetCampaignsOptions {}

export interface UseCampaignsReturn {
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;
  mutating: boolean;
  mutationError: string | null;
  loadCampaigns: () => Promise<void>;
  createCampaign: (input: Omit<CreateCampaignInput, 'client_id'>) => Promise<Campaign | null>;
  updateCampaign: (campaignId: string, input: UpdateCampaignInput) => Promise<Campaign | null>;
  setStatus: (campaignId: string, status: CampaignStatus) => Promise<boolean>;
  archiveCampaign: (campaignId: string) => Promise<boolean>;
  deleteCampaign: (campaignId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useCampaigns(
  clientId?: string,
  options?: UseCampaignsOptions
): UseCampaignsReturn {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(clientId));
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState<boolean>(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const statusFilter = options?.status;
  const includeArchived = options?.includeArchived;

  const loadCampaigns = useCallback(async () => {
    if (!clientId) {
      setCampaigns([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getCampaigns(clientId, {
        status: statusFilter,
        includeArchived,
      });
      setCampaigns(data);
    } catch (err) {
      console.error('Erro ao carregar campanhas:', err);
      setError(formatPlanningError(err));
    } finally {
      setLoading(false);
    }
  }, [clientId, statusFilter, includeArchived]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleCreateCampaign = useCallback(
    async (input: Omit<CreateCampaignInput, 'client_id'>): Promise<Campaign | null> => {
      if (!clientId) {
        setMutationError('ID do cliente não informado.');
        return null;
      }

      setMutating(true);
      setMutationError(null);

      try {
        const created = await createCampaign(clientId, input);

        setCampaigns((prev) => {
          // Insere respeitando a ordenação: start_date DESC (nulls last), depois created_at DESC
          const next = [created, ...prev];
          return next.sort((a, b) => {
            if (a.start_date && b.start_date) {
              const dateCmp = b.start_date.localeCompare(a.start_date);
              if (dateCmp !== 0) return dateCmp;
            } else if (a.start_date && !b.start_date) {
              return -1;
            } else if (!a.start_date && b.start_date) {
              return 1;
            }
            return (b.created_at || '').localeCompare(a.created_at || '');
          });
        });

        return created;
      } catch (err) {
        console.error('Erro ao criar campanha:', err);
        const errorMsg = formatPlanningError(err);
        setMutationError(errorMsg);
        return null;
      } finally {
        setMutating(false);
      }
    },
    [clientId]
  );

  const handleUpdateCampaign = useCallback(
    async (campaignId: string, input: UpdateCampaignInput): Promise<Campaign | null> => {
      if (!campaignId) {
        setMutationError('ID da campanha não informado.');
        return null;
      }

      setMutating(true);
      setMutationError(null);

      try {
        const updated = await updateCampaign(campaignId, input);

        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaignId ? { ...c, ...updated } : c))
        );

        return updated;
      } catch (err) {
        console.error('Erro ao atualizar campanha:', err);
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
    async (campaignId: string, status: CampaignStatus): Promise<boolean> => {
      if (!campaignId) {
        setMutationError('ID da campanha não informado.');
        return false;
      }

      setMutating(true);
      setMutationError(null);

      try {
        const updated = await setCampaignStatus(campaignId, status);

        setCampaigns((prev) => {
          if (status === 'archived' && !includeArchived) {
            return prev.filter((c) => c.id !== campaignId);
          }
          return prev.map((c) => (c.id === campaignId ? { ...c, ...updated } : c));
        });

        return true;
      } catch (err) {
        console.error('Erro ao alterar status da campanha:', err);
        const errorMsg = formatPlanningError(err);
        setMutationError(errorMsg);
        return false;
      } finally {
        setMutating(false);
      }
    },
    [includeArchived]
  );

  const handleArchiveCampaign = useCallback(
    async (campaignId: string): Promise<boolean> => {
      if (!campaignId) {
        setMutationError('ID da campanha não informado.');
        return false;
      }

      setMutating(true);
      setMutationError(null);

      try {
        const updated = await archiveCampaign(campaignId);

        setCampaigns((prev) => {
          if (!includeArchived) {
            return prev.filter((c) => c.id !== campaignId);
          }
          return prev.map((c) => (c.id === campaignId ? { ...c, ...updated } : c));
        });

        return true;
      } catch (err) {
        console.error('Erro ao arquivar campanha:', err);
        const errorMsg = formatPlanningError(err);
        setMutationError(errorMsg);
        return false;
      } finally {
        setMutating(false);
      }
    },
    [includeArchived]
  );

  const handleDeleteCampaign = useCallback(
    async (campaignId: string): Promise<boolean> => {
      if (!campaignId) {
        setMutationError('ID da campanha não informado.');
        return false;
      }
      if (!clientId) {
        setMutationError('ID do cliente não informado.');
        return false;
      }

      setMutating(true);
      setMutationError(null);

      try {
        await deleteCampaign(campaignId, clientId);

        setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
        return true;
      } catch (err) {
        console.error('Erro ao excluir campanha:', err);
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
    campaigns,
    loading,
    error,
    mutating,
    mutationError,
    loadCampaigns,
    createCampaign: handleCreateCampaign,
    updateCampaign: handleUpdateCampaign,
    setStatus,
    archiveCampaign: handleArchiveCampaign,
    deleteCampaign: handleDeleteCampaign,
    refresh: loadCampaigns,
  };
}
