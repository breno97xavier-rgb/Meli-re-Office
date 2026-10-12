import type { ContentAsset } from '../types/contentAssets';
import type { ContentFormat } from '../types/contents';

export function selectContentCover(assets: ContentAsset[], format: ContentFormat): ContentAsset | undefined {
  const priority = format === 'reels' ? ['thumbnail', 'video', 'image'] : ['image', 'video', 'thumbnail'];
  return assets.filter(asset => asset.is_current && asset.file_url && priority.includes(asset.asset_type))
    .sort((a, b) => priority.indexOf(a.asset_type) - priority.indexOf(b.asset_type)
      || a.display_order - b.display_order || b.version - a.version || a.id.localeCompare(b.id))[0];
}
