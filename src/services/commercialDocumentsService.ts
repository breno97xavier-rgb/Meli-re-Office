import { supabase } from '../lib/supabase';
import { CommercialDocument } from '../types/commercialDocuments';

const COMMERCIAL_DOCUMENTS_BUCKET = 'commercial-documents';
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Formats byte size into human readable string (e.g. "2.4 MB")
 */
export function formatBytes(bytes?: number | null): string {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${val} ${sizes[i] || 'B'}`;
}

/**
 * Fetches all commercial documents associated with a proposal, ordered by creation date DESC.
 */
export async function fetchProposalDocuments(
  proposalId: string
): Promise<CommercialDocument[]> {
  if (!proposalId) return [];

  const { data, error } = await supabase
    .from('commercial_documents')
    .select('*')
    .eq('document_type', 'proposal')
    .eq('proposal_id', proposalId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching proposal documents:', error);
    throw new Error(error.message || 'Erro ao carregar documentos da proposta.');
  }

  return (data || []) as CommercialDocument[];
}

/**
 * Fetches all commercial documents associated with a contract, ordered by creation date DESC.
 */
export async function fetchContractDocuments(
  contractId: string
): Promise<CommercialDocument[]> {
  if (!contractId) return [];

  const { data, error } = await supabase
    .from('commercial_documents')
    .select('*')
    .eq('document_type', 'contract')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching contract documents:', error);
    throw new Error(error.message || 'Erro ao carregar documentos do contrato.');
  }

  return (data || []) as CommercialDocument[];
}

/**
 * Uploads a proposal PDF to Supabase Storage and calls register_proposal_document RPC.
 * If RPC fails after upload, compensating transaction removes the uploaded file from storage.
 */
export async function uploadProposalDocument(
  proposalId: string,
  file: File
): Promise<CommercialDocument> {
  if (!proposalId) {
    throw new Error('Identificador da proposta inválido.');
  }

  if (!file) {
    throw new Error('Selecione um arquivo PDF para envio.');
  }

  if (file.type !== 'application/pdf') {
    throw new Error('O arquivo deve ser obrigatoriamente do tipo PDF (application/pdf).');
  }

  if (file.size <= 0) {
    throw new Error('O arquivo selecionado está vazio (0 bytes).');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('O arquivo excede o limite máximo permitido de 20 MB.');
  }

  // Generate unique file path in bucket: proposals/<proposal_id>/<uuid>.pdf
  const fileUuid = crypto.randomUUID();
  const storagePath = `proposals/${proposalId}/${fileUuid}.pdf`;

  // 1. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(COMMERCIAL_DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    throw new Error(uploadError.message || 'Falha no upload do arquivo PDF para o Storage.');
  }

  // 2. Call register_proposal_document RPC
  try {
    const { data, error: rpcError } = await supabase.rpc(
      'register_proposal_document',
      {
        p_proposal_id: proposalId,
        p_storage_path: storagePath,
        p_original_filename: file.name,
        p_mime_type: 'application/pdf',
        p_file_size: file.size,
      }
    );

    if (rpcError) {
      throw rpcError;
    }

    return data as CommercialDocument;
  } catch (rpcErr: unknown) {
    console.error('Error registering proposal document in RPC:', rpcErr);

    // Compensation: Remove the newly uploaded file to avoid orphaned storage objects
    try {
      await supabase.storage
        .from(COMMERCIAL_DOCUMENTS_BUCKET)
        .remove([storagePath]);
    } catch (cleanupErr) {
      console.error(
        'Compensation cleanup failed for path:',
        storagePath,
        cleanupErr
      );
    }

    const message =
      rpcErr instanceof Error
        ? rpcErr.message
        : 'Falha ao registrar documento comercial no banco de dados.';
    throw new Error(message);
  }
}

/**
 * Uploads a contract PDF to Supabase Storage and calls register_contract_document RPC.
 * If RPC fails after upload, compensating transaction removes the uploaded file from storage.
 */
export async function uploadContractDocument(
  contractId: string,
  file: File
): Promise<CommercialDocument> {
  if (!contractId) {
    throw new Error('Identificador do contrato inválido.');
  }

  if (!file) {
    throw new Error('Selecione um arquivo PDF para envio.');
  }

  if (file.type !== 'application/pdf') {
    throw new Error('O arquivo deve ser obrigatoriamente do tipo PDF (application/pdf).');
  }

  if (file.size <= 0) {
    throw new Error('O arquivo selecionado está vazio (0 bytes).');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('O arquivo excede o limite máximo permitido de 20 MB.');
  }

  // Generate unique file path in bucket: contracts/<contract_id>/<uuid>.pdf
  const fileUuid = crypto.randomUUID();
  const storagePath = `contracts/${contractId}/${fileUuid}.pdf`;

  // 1. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(COMMERCIAL_DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    throw new Error(uploadError.message || 'Falha no upload do arquivo PDF para o Storage.');
  }

  // 2. Call register_contract_document RPC
  try {
    const { data, error: rpcError } = await supabase.rpc(
      'register_contract_document',
      {
        p_contract_id: contractId,
        p_storage_path: storagePath,
        p_original_filename: file.name,
        p_mime_type: 'application/pdf',
        p_file_size: file.size,
      }
    );

    if (rpcError) {
      throw rpcError;
    }

    return data as CommercialDocument;
  } catch (rpcErr: unknown) {
    console.error('Error registering contract document in RPC:', rpcErr);

    // Compensation: Remove the newly uploaded file to avoid orphaned storage objects
    try {
      await supabase.storage
        .from(COMMERCIAL_DOCUMENTS_BUCKET)
        .remove([storagePath]);
    } catch (cleanupErr) {
      console.error(
        'Compensation cleanup failed for path:',
        storagePath,
        cleanupErr
      );
    }

    const message =
      rpcErr instanceof Error
        ? rpcErr.message
        : 'Falha ao registrar documento comercial no banco de dados.';
    throw new Error(message);
  }
}

/**
 * Creates a short-lived signed URL for safely previewing the PDF document in a new tab.
 */
export async function getSignedDocumentUrl(
  storagePath: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  if (!storagePath) {
    throw new Error('Caminho do documento não informado.');
  }

  const { data, error } = await supabase.storage
    .from(COMMERCIAL_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    console.error('Error creating signed URL:', error);
    throw new Error(
      error?.message || 'Erro ao gerar link de visualização segura do documento.'
    );
  }

  return data.signedUrl;
}

/**
 * Downloads the PDF directly from private Supabase Storage and triggers browser download.
 */
export async function downloadCommercialDocument(
  storagePath: string,
  originalFilename: string
): Promise<void> {
  if (!storagePath) {
    throw new Error('Caminho do documento não informado.');
  }

  const { data, error } = await supabase.storage
    .from(COMMERCIAL_DOCUMENTS_BUCKET)
    .download(storagePath);

  if (error || !data) {
    console.error('Error downloading document blob:', error);
    throw new Error(error?.message || 'Erro ao baixar o arquivo PDF do servidor.');
  }

  const blobUrl = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = originalFilename || 'proposta.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}
