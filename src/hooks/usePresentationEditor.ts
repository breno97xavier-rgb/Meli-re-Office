import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Presentation,
  PresentationItem,
  UpdatePresentationInput,
} from '../types/presentations';
import { Content } from '../types/contents';
import {
  fetchPresentationById,
  fetchPresentationItems,
  addMultipleContentsToPresentation,
  removeContentFromPresentation,
  updatePresentationItem,
  reorderPresentationItems,
  updatePresentation as updatePresentationService,
} from '../services/presentationsService';
import { fetchContents } from '../services/contentsService';
import { getContentAssetsSignedUrls } from '../services/contentAssetsService';

export function usePresentationEditor(presentationId: string) {
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [items, setItems] = useState<PresentationItem[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [clientContents, setClientContents] = useState<Content[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [isUpdatingPresentation, setIsUpdatingPresentation] = useState(false);

  // Load presentation and items
  const loadData = useCallback(async () => {
    if (!presentationId) return;
    setLoading(true);
    setError(null);
    try {
      const [presentationData, itemsData] = await Promise.all([
        fetchPresentationById(presentationId),
        fetchPresentationItems(presentationId),
      ]);

      if (!presentationData) {
        throw new Error('Apresentação não encontrada.');
      }

      setPresentation(presentationData);
      setItems(itemsData);

      // Fetch all client contents for the selector
      if (presentationData.client_id) {
        try {
          const contents = await fetchContents(presentationData.client_id);
          setClientContents(contents);
        } catch (cErr) {
          console.warn('Could not fetch client contents:', cErr);
        }
      }

      // Collect all storage paths from all assets of all items to generate signed URLs
      const pathsToSign: string[] = [];
      for (const item of itemsData) {
        if (item.assets && item.assets.length > 0) {
          for (const asset of item.assets) {
            if (asset.file_url) {
              pathsToSign.push(asset.file_url);
            }
          }
        }
      }

      if (pathsToSign.length > 0) {
        try {
          const urlMap = await getContentAssetsSignedUrls(pathsToSign);
          setSignedUrls((prev) => ({ ...prev, ...urlMap }));
        } catch (signErr) {
          console.warn('Could not generate signed URLs for items:', signErr);
        }
      }
    } catch (err: unknown) {
      console.error('Error loading presentation editor data:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao carregar apresentação.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [presentationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Contents of this client that are NOT yet in this presentation
  const availableContents = useMemo(() => {
    const includedContentIds = new Set(items.map((i) => i.content_id));
    return clientContents.filter((c) => !includedContentIds.has(c.id));
  }, [clientContents, items]);

  // Add multiple contents
  const handleAddContents = async (contentIds: string[]): Promise<void> => {
    if (!presentationId || !contentIds || contentIds.length === 0) return;
    setActionLoading(true);
    try {
      const newItems = await addMultipleContentsToPresentation(presentationId, contentIds);
      
      // Update items state
      setItems((prev) => [...prev, ...newItems]);

      // Collect storage paths of new items to fetch signed URLs
      const newPaths: string[] = [];
      for (const item of newItems) {
        if (item.assets && item.assets.length > 0) {
          for (const a of item.assets) {
            if (a.file_url) newPaths.push(a.file_url);
          }
        }
      }
      if (newPaths.length > 0) {
        try {
          const urlMap = await getContentAssetsSignedUrls(newPaths);
          setSignedUrls((prev) => ({ ...prev, ...urlMap }));
        } catch (signErr) {
          console.warn('Error signing new item assets:', signErr);
        }
      }
    } catch (err: unknown) {
      console.error('Error adding contents to presentation:', err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // Remove item from presentation (doesn't touch Content)
  const handleRemoveItem = async (itemId: string): Promise<void> => {
    if (!itemId) return;
    setActionLoading(true);
    try {
      await removeContentFromPresentation(itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err: unknown) {
      console.error('Error removing item from presentation:', err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // Update presentation notes for a specific item
  const handleUpdateItemNotes = async (itemId: string, notes: string): Promise<void> => {
    if (!itemId) return;
    setSavingItemId(itemId);
    try {
      const updated = await updatePresentationItem(itemId, { presentation_notes: notes });
      setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, presentation_notes: updated.presentation_notes } : item)));
    } catch (err: unknown) {
      console.error('Error updating presentation notes:', err);
      throw err;
    } finally {
      setSavingItemId(null);
    }
  };

  // Update item client approval status (internal admin adjustment)
  const handleUpdateItemApprovalStatus = async (
    itemId: string,
    status: string
  ): Promise<void> => {
    if (!itemId) return;
    setSavingItemId(itemId);
    try {
      const updated = await updatePresentationItem(itemId, { client_approval_status: status });
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, client_approval_status: updated.client_approval_status }
            : item
        )
      );
    } catch (err: unknown) {
      console.error('Error updating approval status:', err);
      throw err;
    } finally {
      setSavingItemId(null);
    }
  };

  // Move item up or down
  const handleMoveItem = async (itemId: string, direction: 'up' | 'down'): Promise<void> => {
    const currentIndex = items.findIndex((i) => i.id === itemId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    // Create new reordered array
    const newItems = [...items];
    const [movedItem] = newItems.splice(currentIndex, 1);
    newItems.splice(targetIndex, 0, movedItem);

    // Optimistically update display_order
    const updatedWithOrder = newItems.map((item, idx) => ({
      ...item,
      display_order: idx,
    }));
    setItems(updatedWithOrder);

    // Persist to database
    try {
      const orderedIds = updatedWithOrder.map((i) => i.id);
      await reorderPresentationItems(presentationId, orderedIds);
    } catch (err) {
      console.error('Error persisting item reordering:', err);
      // Rollback on failure
      setItems(items);
    }
  };

  // Update presentation metadata (title, round_number, status, description)
  const handleUpdatePresentation = async (
    input: UpdatePresentationInput
  ): Promise<Presentation> => {
    if (!presentationId) throw new Error('ID da apresentação ausente.');
    setIsUpdatingPresentation(true);
    try {
      const updated = await updatePresentationService(presentationId, input);
      setPresentation(updated);
      return updated;
    } catch (err: unknown) {
      console.error('Error updating presentation metadata:', err);
      throw err;
    } finally {
      setIsUpdatingPresentation(false);
    }
  };

  return {
    presentation,
    items,
    signedUrls,
    clientContents,
    availableContents,
    loading,
    error,
    actionLoading,
    savingItemId,
    isUpdatingPresentation,
    loadData,
    handleAddContents,
    handleRemoveItem,
    handleUpdateItemNotes,
    handleUpdateItemApprovalStatus,
    handleMoveItem,
    handleUpdatePresentation,
  };
}
