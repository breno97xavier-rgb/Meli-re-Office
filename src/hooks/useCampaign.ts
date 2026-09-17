import { useState, useEffect, useCallback } from 'react';
import {
  Campaign,
  CampaignStatus,
  UpdateCampaignInput,
} from '../types/planning';
import {
  getCampaign,
  updateCampaign,
  setCampaignStatus,
  archiveCampaign,
  deleteCampaign,
  formatPlanningError,
} from '../services/planningService';

export interface UseCampaignReturn {
  campaign: Campaign | null;
  loading: boolean;
  error: string | null;
  mutating: boolean;
  mutationError: string | null;
  loadCampaign: () => Promise<void>;
  updateCampaign: (input: UpdateCampaignInput) => Promise<Campaign | null>;
  setStatus: (status: CampaignStatus) => Promise<boolean>;
  archiveCampaign: () => Promise<boolean>;
  deleteCampaign: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useCampaign(
  campaignId?: string | null,
  clientId?: string | null
): UseCampaignReturn {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(campaignId));
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState<boolean>(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const loadCampaign = useCallback(async () => {
    if (!campaignId) {
      setCampaign(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getCampaign(campaignId, clientId || undefined);
      if (!data) {
        setError('Campanha não encontrada.');
      } else {
        setCampaign(data);
      }
    } catch (err) {
      console.error('Erro ao carregar campanha individual:', err);
      setError(formatPlanningError(err));
    } finally {
      setLoading(false);
    }
  }, [campaignId, clientId]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  const handleUpdate = useCallback(
    async (input: UpdateCampaignInput): Promise<Campaign | null> => {
      if (!campaignId) {
        setMutationError('ID da campanha não informado.');
        return null;
      }

      setMutating(true);
      setMutationError(null);

      try {
        const updated = await updateCampaign(campaignId, input);
        setCampaign(updated);
        return updated;
      } catch (err) {
        console.error('Erro ao atualizar campanha:', err);
        setMutationError(formatPlanningError(err));
        return null;
      } finally {
        setMutating(false);
      }
    },
    [campaignId]
  );

  const handleSetStatus = useCallback(
    async (status: CampaignStatus): Promise<boolean> => {
      if (!campaignId) {
        setMutationError('ID da campanha não informado.');
        return false;
      }

      setMutating(true);
      setMutationError(null);

      try {
        const updated = await setCampaignStatus(campaignId, status);
        setCampaign(updated);
        return true;
      } catch (err) {
        console.error('Erro ao alterar status da campanha:', err);
        setMutationError(formatPlanningError(err));
        return false;
      } finally {
        setMutating(false);
      }
    },
    [campaignId]
  );

  const handleArchive = useCallback(async (): Promise<boolean> => {
    if (!campaignId) {
      setMutationError('ID da campanha não informado.');
      return false;
    }

    setMutating(true);
    setMutationError(null);

    try {
      const updated = await archiveCampaign(campaignId);
      setCampaign(updated);
      return true;
    } catch (err) {
      console.error('Erro ao arquivar campanha:', err);
      setMutationError(formatPlanningError(err));
      return false;
    } finally {
      setMutating(false);
    }
  }, [campaignId]);

  const handleDelete = useCallback(async (): Promise<boolean> => {
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
      setCampaign(null);
      return true;
    } catch (err) {
      console.error('Erro ao excluir campanha:', err);
      setMutationError(formatPlanningError(err));
      return false;
    } finally {
      setMutating(false);
    }
  }, [campaignId, clientId]);

  return {
    campaign,
    loading,
    error,
    mutating,
    mutationError,
    loadCampaign,
    updateCampaign: handleUpdate,
    setStatus: handleSetStatus,
    archiveCampaign: handleArchive,
    deleteCampaign: handleDelete,
    refresh: loadCampaign,
  };
}
