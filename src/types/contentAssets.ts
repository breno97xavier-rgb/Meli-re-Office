export type ContentAssetType = 'image' | 'video' | 'thumbnail';

export interface ContentAsset {
  id: string;
  content_id: string;
  asset_type: ContentAssetType;
  file_url: string; // Storage path within 'content-assets' bucket (legacy field name)
  file_name: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  version: number;
  display_order: number;
  is_current: boolean;
  created_by: string | null;
  created_at: string;
}

export interface UploadContentAssetInput {
  clientId: string;
  contentId: string;
  file: File;
  assetType: ContentAssetType;
  displayOrder?: number;
}

export interface ReplaceContentAssetInput {
  clientId: string;
  contentId: string;
  targetAssetId: string;
  file: File;
}

export interface ContentAssetSignedUrlMap {
  [assetId: string]: string;
}
