import { useState, useEffect, useCallback, useRef } from 'react';
import { CommercialDocument } from '../types/commercialDocuments';
import {
  fetchContractDocuments,
  uploadContractDocument,
  getSignedDocumentUrl,
  downloadCommercialDocument,
} from '../services/commercialDocumentsService';

export function useContractCommercialDocuments(
  contractId: string | null | undefined
) {
  const [documents, setDocuments] = useState<CommercialDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Ref to track the current contractId and avoid race conditions
  const currentContractIdRef = useRef<string | null | undefined>(contractId);
  currentContractIdRef.current = contractId;

  const loadDocuments = useCallback(async () => {
    if (!contractId) {
      setDocuments([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchContractDocuments(contractId);
      // Check if contractId hasn't changed while request was in flight
      if (currentContractIdRef.current === contractId) {
        setDocuments(data);
      }
    } catch (err: unknown) {
      if (currentContractIdRef.current === contractId) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erro ao carregar documentos do contrato.';
        setError(message);
      }
    } finally {
      if (currentContractIdRef.current === contractId) {
        setLoading(false);
      }
    }
  }, [contractId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const activeDocument = documents.find((doc) => doc.is_active) || null;
  const historyDocuments = documents.filter((doc) => !doc.is_active);

  const handleUploadDocument = async (file: File): Promise<CommercialDocument | null> => {
    if (!contractId) return null;

    setUploading(true);
    setUploadError(null);

    try {
      const newDoc = await uploadContractDocument(contractId, file);
      // Refresh documents list after successful upload
      await loadDocuments();
      return newDoc;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Falha no envio do PDF do contrato.';
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
        doc.original_filename || 'contrato.pdf'
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
