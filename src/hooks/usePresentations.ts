import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Presentation,
  PresentationFilters,
  PresentationMetrics,
  CreatePresentationInput,
} from '../types/presentations';
import { Client } from '../types/clients';
import {
  fetchPresentations,
  createPresentation as createPresentationService,
} from '../services/presentationsService';
import { fetchClients } from '../services/clientsService';

export function usePresentations(initialClientId?: string) {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [clientIdFilter, setClientIdFilter] = useState<string | 'all'>(
    initialClientId || 'all'
  );
  const [statusFilter, setStatusFilter] = useState<string | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Creation state
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [presentationsData, clientsData] = await Promise.all([
        fetchPresentations(),
        fetchClients(),
      ]);
      setPresentations(presentationsData);
      setClients(clientsData);
    } catch (err: unknown) {
      console.error('Error loading presentations data:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao carregar apresentações.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // If initialClientId changed, sync filter
  useEffect(() => {
    if (initialClientId) {
      setClientIdFilter(initialClientId);
    }
  }, [initialClientId]);

  // Metrics computation
  const metrics: PresentationMetrics = useMemo(() => {
    let draftCount = 0;
    let sentCount = 0;
    let approvedCount = 0;
    let changesRequestedCount = 0;

    for (const p of presentations) {
      const st = (p.status || '').toLowerCase();
      if (st === 'draft') {
        draftCount++;
      } else if (st === 'sent' || st === 'in_review' || st === 'client_review') {
        sentCount++;
      } else if (st === 'approved' || st === 'completed') {
        approvedCount++;
      } else if (st === 'changes_requested' || st === 'rejected') {
        changesRequestedCount++;
      }
    }

    return {
      totalCount: presentations.length,
      draftCount,
      sentCount,
      approvedCount,
      changesRequestedCount,
    };
  }, [presentations]);

  // Filtered list
  const filteredPresentations = useMemo(() => {
    return presentations.filter((p) => {
      // 1. Client filter
      if (clientIdFilter !== 'all' && p.client_id !== clientIdFilter) {
        return false;
      }

      // 2. Status filter
      if (statusFilter !== 'all') {
        const pStatus = (p.status || '').toLowerCase();
        const fStatus = statusFilter.toLowerCase();
        if (pStatus !== fStatus) return false;
      }

      // 3. Search term filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const titleMatch = p.title.toLowerCase().includes(query);
        const descMatch = (p.description || '').toLowerCase().includes(query);
        const clientNameMatch = (p.client?.name || '').toLowerCase().includes(query);
        const commercialNameMatch = (p.client?.commercial_name || '').toLowerCase().includes(query);

        if (!titleMatch && !descMatch && !clientNameMatch && !commercialNameMatch) {
          return false;
        }
      }

      return true;
    });
  }, [presentations, clientIdFilter, statusFilter, searchTerm]);

  const isFilterActive = useMemo(() => {
    return (
      (initialClientId ? clientIdFilter !== initialClientId : clientIdFilter !== 'all') ||
      statusFilter !== 'all' ||
      searchTerm.trim().length > 0
    );
  }, [clientIdFilter, statusFilter, searchTerm, initialClientId]);

  const resetFilters = useCallback(() => {
    setClientIdFilter(initialClientId || 'all');
    setStatusFilter('all');
    setSearchTerm('');
  }, [initialClientId]);

  const handleCreatePresentation = async (
    input: CreatePresentationInput
  ): Promise<Presentation> => {
    setIsCreating(true);
    setCreateError(null);
    try {
      const created = await createPresentationService(input);
      setPresentations((prev) => [created, ...prev]);
      return created;
    } catch (err: unknown) {
      console.error('Error creating presentation:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao criar apresentação.';
      setCreateError(msg);
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    presentations: filteredPresentations,
    allPresentations: presentations,
    clients,
    loading,
    error,
    metrics,
    // Filters
    clientIdFilter,
    setClientIdFilter,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    isFilterActive,
    resetFilters,
    // Creation
    isCreating,
    createError,
    setCreateError,
    loadData,
    handleCreatePresentation,
  };
}
