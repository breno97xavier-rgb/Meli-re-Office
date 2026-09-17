import { useState, useCallback } from 'react';
import {
  submitPublicPresentationDecision,
  parsePublicDecisionError,
  PublicDecisionError,
} from '../services/publicDecisionService';
import { PublicDecisionResponse } from '../types/presentations';

interface UsePublicDecisionProps {
  token?: string;
  onDecisionSuccess?: (result: PublicDecisionResponse) => void;
  onReloadNeeded?: () => void;
}

export function usePublicDecision({
  token,
  onDecisionSuccess,
  onReloadNeeded,
}: UsePublicDecisionProps) {
  const [submittingItemId, setSubmittingItemId] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<PublicDecisionError | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  const clearDecisionError = useCallback(() => {
    setDecisionError(null);
  }, []);

  const clearToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  const handleDecisionSubmit = useCallback(
    async (
      itemId: string,
      status: 'approved' | 'changes_requested' | 'rejected',
      feedback?: string | null
    ) => {
      if (!token || !token.trim()) {
        const err: PublicDecisionError = {
          code: 'INVALID_ACCESS_TOKEN',
          title: 'Link inválido',
          message: 'Não foi possível autenticar sua sessão para registrar a decisão.',
          actionHint: 'Recarregue a página ou solicite um novo link à equipe da Melière.',
        };
        setDecisionError(err);
        return;
      }

      if (submittingItemId) {
        return; // Prevent simultaneous / double clicks
      }

      setSubmittingItemId(itemId);
      setDecisionError(null);

      try {
        const response = await submitPublicPresentationDecision({
          token: token.trim(),
          itemId,
          status,
          feedback,
        });

        // Notify parent state for instant local update
        onDecisionSuccess?.(response);

        // Feedback toast / indicator
        if (status === 'approved') {
          setToastMessage({
            type: 'success',
            text: 'Conteúdo aprovado com sucesso!',
          });
        } else if (status === 'changes_requested') {
          setToastMessage({
            type: 'info',
            text: 'Solicitação de ajustes enviada à equipe!',
          });
        } else if (status === 'rejected') {
          setToastMessage({
            type: 'info',
            text: 'Recusa de conteúdo registrada.',
          });
        }

        setTimeout(() => {
          setToastMessage(null);
        }, 4000);
      } catch (err: unknown) {
        console.error('[usePublicDecision] Error submitting decision:', err);
        const parsed = parsePublicDecisionError(err);
        setDecisionError(parsed);

        // If the item was already reviewed by another session, trigger data reload
        if (parsed.code === 'ITEM_ALREADY_REVIEWED') {
          onReloadNeeded?.();
        }
      } finally {
        setSubmittingItemId(null);
      }
    },
    [token, submittingItemId, onDecisionSuccess, onReloadNeeded]
  );

  return {
    submittingItemId,
    isSubmitting: Boolean(submittingItemId),
    decisionError,
    toastMessage,
    clearDecisionError,
    clearToast,
    submitDecision: handleDecisionSubmit,
  };
}
