import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Content,
  ContentFormatFilter,
  EditorialStatus,
  EditorialStatusFilter,
  CreateContentInput,
  UpdateContentInput,
  ContentMetrics,
  ContentProfileRelation,
} from '../types/contents';
import { Client } from '../types/clients';
import {
  fetchContents,
  createContent,
  updateContent,
  fetchTeamProfiles,
  formatContentError,
} from '../services/contentsService';
import { fetchClients } from '../services/clientsService';

interface UseContentsOptions {
  initialClientId?: string;
}

export function useContents(options?: UseContentsOptions) {
  const initialClientId = options?.initialClientId;

  const [allContents, setAllContents] = useState<Content[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<ContentProfileRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected content for Detail/Edit Drawer
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  // Mutation states
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Filters
  const [clientIdFilter, setClientIdFilter] = useState<string | 'all'>(
    initialClientId || 'all'
  );
  const [formatFilter, setFormatFilter] = useState<ContentFormatFilter>('all');
  const [statusFilter, setStatusFilter] = useState<EditorialStatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Synchronize initialClientId if prop changes
  useEffect(() => {
    if (initialClientId) {
      setClientIdFilter(initialClientId);
    }
  }, [initialClientId]);

  // Load all contents and related data
  const loadContents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [contentsData, clientsData, profilesData] = await Promise.all([
        fetchContents(initialClientId),
        fetchClients(),
        fetchTeamProfiles(),
      ]);
      setAllContents(contentsData);
      setClients(clientsData);
      setTeamProfiles(profilesData);
    } catch (err) {
      const formatted = formatContentError(err);
      setError(formatted);
      console.error('Error in useContents loadContents:', err);
    } finally {
      setLoading(false);
    }
  }, [initialClientId]);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  // Calculate Metrics from raw contents (scoped to initialClientId if applicable)
  const metrics: ContentMetrics = useMemo(() => {
    const targetList = initialClientId
      ? allContents.filter((c) => c.client_id === initialClientId)
      : allContents;

    return {
      totalCount: targetList.length,
      draftCount: targetList.filter((c) => c.editorial_status === 'draft').length,
      inProductionCount: targetList.filter((c) => c.editorial_status === 'in_production').length,
      inReviewCount: targetList.filter(
        (c) => c.editorial_status === 'review' || c.editorial_status === 'client_review'
      ).length,
      approvedCount: targetList.filter((c) => c.editorial_status === 'approved').length,
      cancelledCount: targetList.filter((c) => c.editorial_status === 'cancelled').length,
    };
  }, [allContents, initialClientId]);

  // Filtered contents list
  const filteredContents = useMemo(() => {
    return allContents.filter((content) => {
      // Client Filter
      if (clientIdFilter !== 'all' && content.client_id !== clientIdFilter) {
        return false;
      }

      // Format Filter
      if (formatFilter !== 'all' && content.format !== formatFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter !== 'all' && content.editorial_status !== statusFilter) {
        return false;
      }

      // Search Filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const titleMatch = content.internal_title?.toLowerCase().includes(query);
        const goalMatch = content.goal?.toLowerCase().includes(query);
        const pillarMatch = content.pillar?.toLowerCase().includes(query);
        const copyMatch = content.copy?.toLowerCase().includes(query);
        const captionMatch = content.caption?.toLowerCase().includes(query);
        const scriptMatch = content.script?.toLowerCase().includes(query);
        const notesMatch = content.notes?.toLowerCase().includes(query);
        const clientNameMatch =
          content.client?.commercial_name?.toLowerCase().includes(query) ||
          content.client?.name?.toLowerCase().includes(query);

        if (
          !titleMatch &&
          !goalMatch &&
          !pillarMatch &&
          !copyMatch &&
          !captionMatch &&
          !scriptMatch &&
          !notesMatch &&
          !clientNameMatch
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allContents, clientIdFilter, formatFilter, statusFilter, searchTerm]);

  // Handlers
  const handleCreateContent = async (input: CreateContentInput): Promise<Content> => {
    setIsCreating(true);
    setCreateError(null);
    try {
      const created = await createContent(input);
      setAllContents((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      const formatted = formatContentError(err);
      setCreateError(formatted);
      throw new Error(formatted);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateContent = async (
    contentId: string,
    input: UpdateContentInput
  ): Promise<Content> => {
    setIsUpdating(true);
    setUpdateError(null);
    try {
      const updated = await updateContent(contentId, input);
      setAllContents((prev) =>
        prev.map((item) => (item.id === contentId ? updated : item))
      );
      if (selectedContent?.id === contentId) {
        setSelectedContent(updated);
      }
      return updated;
    } catch (err) {
      const formatted = formatContentError(err);
      setUpdateError(formatted);
      throw new Error(formatted);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async (
    contentId: string,
    editorial_status: EditorialStatus
  ): Promise<Content> => {
    return handleUpdateContent(contentId, { editorial_status });
  };

  const handleSelectContent = (content: Content | null) => {
    setSelectedContent(content);
    setUpdateError(null);
  };

  const resetFilters = () => {
    setClientIdFilter(initialClientId || 'all');
    setFormatFilter('all');
    setStatusFilter('all');
    setSearchTerm('');
  };

  const isFilterActive =
    (clientIdFilter !== 'all' && clientIdFilter !== initialClientId) ||
    formatFilter !== 'all' ||
    statusFilter !== 'all' ||
    searchTerm.trim() !== '';

  return {
    contents: filteredContents,
    allContents,
    clients,
    teamProfiles,
    loading,
    error,
    metrics,
    selectedContent,
    // Filter states
    clientIdFilter,
    setClientIdFilter,
    formatFilter,
    setFormatFilter,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    isFilterActive,
    resetFilters,
    // Mutations
    isCreating,
    createError,
    setCreateError,
    isUpdating,
    updateError,
    setUpdateError,
    loadContents,
    handleCreateContent,
    handleUpdateContent,
    handleUpdateStatus,
    handleSelectContent,
  };
}
