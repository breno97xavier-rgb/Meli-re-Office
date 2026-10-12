import { supabase } from '../lib/supabase';
import type { ContentAsset } from '../types/contentAssets';
import { CONTENT_ASSETS_BUCKET } from './contentAssetsService';

export async function fetchContentMedia(contentIds: string[]): Promise<{ assets: ContentAsset[]; urls: Record<string, string> }> {
  const ids = [...new Set(contentIds.filter(Boolean))];
  if (!ids.length) return { assets: [], urls: {} };
  const { data, error } = await supabase.from('content_assets').select('*')
    .in('content_id', ids).eq('is_current', true).order('display_order', { ascending: true });
  if (error) throw new Error('Não foi possível carregar as mídias.');
  const assets = (data || []) as ContentAsset[];
  const paths = [...new Set(assets.map(asset => asset.file_url).filter(Boolean))];
  if (!paths.length) return { assets, urls: {} };
  const { data: signed, error: signedError } = await supabase.storage.from(CONTENT_ASSETS_BUCKET).createSignedUrls(paths, 3600);
  if (signedError) throw new Error('Não foi possível carregar as prévias protegidas.');
  const urls: Record<string, string> = {};
  for (const entry of signed || []) if (entry.path && entry.signedUrl && !entry.error) urls[entry.path] = entry.signedUrl;
  return { assets, urls };
}
