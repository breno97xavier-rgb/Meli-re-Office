import { useState, useEffect, useCallback, useRef } from 'react';
import { CommercialDocument } from '../types/commercialDocuments';
import {
  fetchProposalDocuments,
  uploadProposalDocument,
  getSignedDocumentUrl,
  downloadCommercialDocument,
} from '../services/commercialDocumentsService';

export function useProposalCommercialDocuments(
  proposalId: string | null | undefined
) {
  const [documents, setDocuments] = useState<CommercialDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Ref to track the current proposalId and avoid race conditions
  const currentProposalIdRef = useRef<string | null | undefined>(proposalId);
  currentProposalIdRef.current = proposalId;

  const loadDocuments = useCallback(async () => {
    if (!proposalId) {
      setDocuments([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchProposalDocuments(proposalId);
      // Check if proposalId hasn't changed while request was in flight
      if (currentProposalIdRef.current === proposalId) {
        setDocuments(data);
      }
    } catch (err: unknown) {
      if (currentProposalIdRef.current === proposalId) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erro ao carregar documentos da proposta.';
        setError(message);
      }
    } finally {
      if (currentProposalIdRef.current === proposalId) {
        setLoading(false);
      }
    }
  }, [proposalId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const activeDocument = documents.find((doc) => doc.is_active) || null;
  const historyDocuments = documents.filter((doc) => !doc.is_active);

  const handleUploadDocument = async (file: File): Promise<CommercialDocument | null> => {
    if (!proposalId) return null;

    setUploading(true);
    setUploadError(null);

    try {
      const newDoc = await uploadProposalDocument(proposalId, file);
      // Refresh documents list after successful upload
      await loadDocuments();
      return newDoc;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Falha no envio do PDF.';
      setUploadError(message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleViewDocument = async (doc: CommercialDocument): Promise<void> => {
    if (!doc.storage_path) return;

    setActionLoadingId(doc.id);
    setError(null);

    try {
      const signedUrl = await getSignedDocumentUrl(doc.storage_path, 3600);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erro ao abrir visualização do PDF.';
      setError(message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownloadDocument = async (
    doc: CommercialDocument
  ): Promise<void> => {
    if (!doc.storage_path) return;

    setActionLoadingId(doc.id);
    setError(null);

    try {
      await downloadCommercialDocument(
        doc.storage_path,
        doc.original_filename || 'proposta.pdf'
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao baixar o PDF.';
      setError(message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return {
    documents,
    activeDocument,
    historyDocuments,
    loading,
    uploading,
    actionLoadingId,
    error,
    uploadError,
    setUploadError,
    refresh: loadDocuments,
    uploadDocument: handleUploadDocument,
    viewDocument: handleViewDocument,
    downloadDocument: handleDownloadDocument,
  };
}
