export type CommercialDocumentType = 'proposal' | 'contract';

export interface CommercialDocument {
  id: string;
  document_type: CommercialDocumentType;
  proposal_id: string | null;
  contract_id: string | null;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size: number | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
