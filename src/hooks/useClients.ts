import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Client,
  ClientStatus,
  ClientStatusFilter,
  ClientMetrics,
  UpdateClientInput,
} from '../types/clients';
import { fetchClients, updateClient } from '../services/clientsService';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [statusFilter, setStatusFilter] = useState<ClientStatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchClients();
      setClients(data);

      // Keep selectedClient synchronized if it was updated
      setSelectedClient((curr) => {
        if (!curr) return null;
        return data.find((c) => c.id === curr.id) || null;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar clientes.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Derived metrics from the full clients list
  const metrics = useMemo<ClientMetrics>(() => {
    let totalCount = clients.length;
    let onboardingCount = 0;
    let activeCount = 0;
    let pausedCount = 0;
    let endedCount = 0;
    let monthlyRevenueActive = 0;

    for (const c of clients) {
      if (c.status === 'onboarding') {
        onboardingCount++;
        if (typeof c.monthly_amount === 'number' && !isNaN(c.monthly_amount)) {
          monthlyRevenueActive += c.monthly_amount;
        }
      } else if (c.status === 'active') {
        activeCount++;
        if (typeof c.monthly_amount === 'number' && !isNaN(c.monthly_amount)) {
          monthlyRevenueActive += c.monthly_amount;
        }
      } else if (c.status === 'paused') {
        pausedCount++;
      } else if (c.status === 'ended') {
        endedCount++;
      }
    }

    return {
      totalCount,
      onboardingCount,
      activeCount,
      pausedCount,
      endedCount,
      monthlyRevenueActive,
    };
  }, [clients]);

  // Filtered clients list by status filter and search term
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // 1. Status Filter
      if (statusFilter !== 'all' && client.status !== statusFilter) {
        return false;
      }

      // 2. Search Text Filter (name, commercial_name, email, phone, segment)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const nameMatch = client.name?.toLowerCase().includes(query) ?? false;
        const commMatch = client.commercial_name?.toLowerCase().includes(query) ?? false;
        const emailMatch = client.email?.toLowerCase().includes(query) ?? false;
        const phoneMatch = client.phone?.toLowerCase().includes(query) ?? false;
        const segmentMatch = client.segment?.toLowerCase().includes(query) ?? false;

        if (!nameMatch && !commMatch && !emailMatch && !phoneMatch && !segmentMatch) {
          return false;
        }
      }

      return true;
    });
  }, [clients, statusFilter, searchTerm]);

  const handleSelectClient = useCallback((client: Client | null) => {
    setSelectedClient(client);
    setUpdateError(null);
  }, []);

  const handleUpdateClient = useCallback(
    async (clientId: string, input: UpdateClientInput): Promise<boolean> => {
      try {
        setIsUpdating(true);
        setUpdateError(null);
        const updated = await updateClient(clientId, input);
        setClients((prev) => prev.map((c) => (c.id === clientId ? updated : c)));
        setSelectedClient((curr) => (curr && curr.id === clientId ? updated : curr));
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao atualizar dados do cliente.';
        setUpdateError(msg);
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  const handleStatusTransition = useCallback(
    async (clientId: string, newStatus: ClientStatus): Promise<boolean> => {
      return handleUpdateClient(clientId, { status: newStatus });
    },
    [handleUpdateClient]
  );

  return {
    clients: filteredClients,
    allClients: clients,
    loading,
    error,
    selectedClient,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    metrics,
    isUpdating,
    updateError,
    loadClients,
    handleSelectClient,
    handleUpdateClient,
    handleStatusTransition,
  };
}
