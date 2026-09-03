import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ProposalDocument,
  SaveProposalDocumentInput,
} from '../types/proposals';
import {
  fetchProposalDocument,
  saveProposalDocument,
} from '../services/proposalDocumentsService';

export interface UseProposalDocumentReturn {
  document: ProposalDocument | null;
  loading: boolean;
  error: string | null;
  isSaving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  reload: () => Promise<void>;
  save: (
    input: Omit<SaveProposalDocumentInput, 'proposal_id'>
  ) => Promise<boolean>;
}

export function useProposalDocument(
  proposalId: string | null | undefined
): UseProposalDocumentReturn {
  const [document, setDocument] = useState<ProposalDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Active request tracking to avoid race conditions
  const activeProposalIdRef = useRef<string | null | undefined>(proposalId);
  activeProposalIdRef.current = proposalId;

  const loadDocument = useCallback(async () => {
    const currentProposalId = proposalId;
    if (!currentProposalId) {
      if (activeProposalIdRef.current === currentProposalId) {
        setDocument(null);
        setLoading(false);
        setError(null);
      }
      return;
    }

    try {
      if (activeProposalIdRef.current === currentProposalId) {
        setLoading(true);
        setError(null);
      }
      const doc = await fetchProposalDocument(currentProposalId);
      // Check if currentProposalId is still active
      if (activeProposalIdRef.current === currentProposalId) {
        setDocument(doc);
      }
    } catch (err: unknown) {
      if (activeProposalIdRef.current === currentProposalId) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erro ao carregar documento da proposta.';
        setError(message);
      }
    } finally {
      if (activeProposalIdRef.current === currentProposalId) {
        setLoading(false);
      }
    }
  }, [proposalId]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const save = useCallback(
    async (
      input: Omit<SaveProposalDocumentInput, 'proposal_id'>
    ): Promise<boolean> => {
      const currentProposalId = proposalId;
      if (!currentProposalId) {
        if (activeProposalIdRef.current === currentProposalId) {
          setSaveError('Proposta não identificada.');
        }
        return false;
      }

      try {
        if (activeProposalIdRef.current === currentProposalId) {
          setIsSaving(true);
          setSaveError(null);
          setSaveSuccess(false);
        }

        const savedDoc = await saveProposalDocument({
          ...input,
          proposal_id: currentProposalId,
        });

        if (activeProposalIdRef.current === currentProposalId) {
          setDocument(savedDoc);
          setSaveSuccess(true);
          setTimeout(() => {
            if (activeProposalIdRef.current === currentProposalId) {
              setSaveSuccess(false);
            }
          }, 3000);
        }
        return true;
      } catch (err: unknown) {
        if (activeProposalIdRef.current === currentProposalId) {
          const message =
            err instanceof Error
              ? err.message
              : 'Erro ao salvar documento da proposta.';
          setSaveError(message);
        }
        return false;
      } finally {
        if (activeProposalIdRef.current === currentProposalId) {
          setIsSaving(false);
        }
      }
    },
    [proposalId]
  );

  return {
    document,
    loading,
    error,
    isSaving,
    saveError,
    saveSuccess,
    reload: loadDocument,
    save,
  };
}
