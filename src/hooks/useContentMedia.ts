import { useEffect, useState, useCallback } from 'react';
import type { ContentAsset } from '../types/contentAssets';
import { fetchContentMedia } from '../services/contentMediaService';

export function useContentMedia(contentIds: string[], revision = 0) {
  const key = [...new Set(contentIds)].sort().join(',');
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const refresh = useCallback(() => setRefreshCount(count => count + 1), []);
  useEffect(() => {
    let active = true;
    setAssets([]); setUrls({}); setError(null); setLoading(Boolean(key));
    if (!key) return;
    fetchContentMedia(key.split(',')).then(result => {
      if (active) { setAssets(result.assets); setUrls(result.urls); }
    }).catch(failure => {
      if (active) setError(failure instanceof Error ? failure.message : 'Não foi possível carregar as mídias.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [key, revision, refreshCount]);
  // Renew private previews while the page remains open; no public bucket or persisted URL.
  useEffect(() => {
    if (!key) return;
    const timer = setInterval(refresh, 50 * 60 * 1000);
    return () => clearInterval(timer);
  }, [key, refresh]);
  return { assets, urls, loading, error, refresh };
}
