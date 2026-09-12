import { useState, useEffect, useCallback } from 'react';
import { PresentationAccessLink } from '../types/presentations';
import {
  fetchPresentationAccessLink,
  createPresentationAccessLink,
  revokePresentationAccessLink,
  buildPublicPresentationUrl,
} from '../services/presentationAccessService';

export function usePresentationAccessLink(presentationId: string, enabled: boolean = true) {
  const [accessLink, setAccessLink] = useState<PresentationAccessLink | null>(null);
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const loadAccessLink = useCallback(async () => {
    if (!presentationId || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const link = await fetchPresentationAccessLink(presentationId);
      setAccessLink(link);
      if (!link) {
        // Clear active token and public url if no active link exists in DB
        setActiveToken(null);
        setPublicUrl(null);
      }
    } catch (err: unknown) {
      console.error('Error in usePresentationAccessLink loadAccessLink:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao consultar link de acesso.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [presentationId, enabled]);

  useEffect(() => {
    if (enabled && presentationId) {
      loadAccessLink();
    }
  }, [enabled, presentationId, loadAccessLink]);

  // Generate a new access link
  const handleGenerateLink = async (expiresAt?: string | null): Promise<void> => {
    if (!presentationId) return;
    setActionLoading(true);
    setError(null);
    try {
      const result = await createPresentationAccessLink(presentationId, expiresAt);
      setActiveToken(result.token);
      setPublicUrl(result.public_url);
      setAccessLink(
        result.link || {
          id: result.id || '',
          presentation_id: presentationId,
          token_hash: '',
          created_at: result.created_at || new Date().toISOString(),
          created_by: null,
          updated_at: new Date().toISOString(),
          expires_at: result.expires_at || null,
          revoked_at: null,
          revoked_by: null,
          token: result.token,
          public_url: result.public_url,
          is_active: true,
        }
      );
    } catch (err: unknown) {
      console.error('Error in handleGenerateLink:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao gerar link de acesso.';
      setError(msg);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // Revoke the current access link
  const handleRevokeLink = async (): Promise<void> => {
    if (!accessLink?.id) {
      // If we don't have a record ID, reload to see if there is one
      const current = await fetchPresentationAccessLink(presentationId);
      if (!current?.id) {
        setAccessLink(null);
        setActiveToken(null);
        setPublicUrl(null);
        return;
      }
    }

    const targetLinkId = accessLink?.id;
    if (!targetLinkId) return;

    setActionLoading(true);
    setError(null);
    try {
      await revokePresentationAccessLink(targetLinkId);
      // Immediately reset active link state in UI
      setAccessLink(null);
      setActiveToken(null);
      setPublicUrl(null);
    } catch (err: unknown) {
      console.error('Error in handleRevokeLink:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao revogar link de acesso.';
      setError(msg);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // Copy URL to clipboard
  const handleCopyUrl = async (urlToCopy?: string): Promise<boolean> => {
    const url = urlToCopy || publicUrl;
    if (!url) return false;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for non-secure contexts or legacy browsers
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return true;
    } catch (copyErr) {
      console.error('Failed to copy URL to clipboard:', copyErr);
      return false;
    }
  };

  return {
    accessLink,
    activeToken,
    publicUrl,
    hasActiveLink: Boolean(accessLink && accessLink.is_active !== false),
    loading,
    actionLoading,
    error,
    copied,
    loadAccessLink,
    handleGenerateLink,
    handleRevokeLink,
    handleCopyUrl,
  };
}
