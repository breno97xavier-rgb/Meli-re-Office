import type { PresentationItem } from '../types/presentations';

/** Frozen review data is authoritative. Never infer a legacy version from current files. */
export function resolveReviewMaterial(item: PresentationItem): PresentationItem {
  if (item.review_id && item.review_content && Array.isArray(item.review_assets)) {
    return { ...item, content: item.review_content, assets: item.review_assets };
  }
  if (item.client_approval_status !== 'pending') {
    return { ...item, content: item.content ? {
      ...item.content, caption: null, copy: null, script: null, visual_copy: null,
      goal: null, pillar: null, primary_channel: null, funnel_stage: null,
    } : null, assets: [] };
  }
  return item;
}

export function reviewLabel(item: PresentationItem): string {
  if (item.review_id) return 'Versão preparada para esta rodada';
  return item.client_approval_status === 'pending'
    ? 'Rascunho — prepare a versão antes da avaliação'
    : 'Parecer histórico — versão dos materiais não registrada';
}
