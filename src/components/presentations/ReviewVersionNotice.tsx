import type { PresentationItem } from '../../types/presentations';
import { reviewLabel } from '../../services/presentationReviewContracts';
import { ITEM_APPROVAL_STATUS_LABELS } from './PresentationStatusBadge';

export function ReviewVersionNotice({ item, publicMode = false }: { item: PresentationItem; publicMode?: boolean }) {
  return <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" role="note">
    <p className="font-semibold">{reviewLabel(item)}</p>
    <p>{item.review_id
      ? 'Textos e arquivos desta rodada estão preservados. Novos materiais precisam de uma nova rodada para avaliação.'
      : item.client_approval_status === 'pending'
        ? publicMode ? 'Solicite à agência uma versão preparada para avaliação.' : 'Confira os textos e arquivos e prepare a versão quando estiverem prontos para avaliação.'
        : publicMode ? 'O parecer antigo foi preservado. Solicite uma nova rodada à agência para avaliar novos materiais.' : 'O parecer antigo não comprova aprovação dos arquivos atuais. Crie uma nova rodada para avaliar novos materiais.'}</p>
    {!item.review_id && item.client_approval_status !== 'pending' && <p>Parecer preservado: {ITEM_APPROVAL_STATUS_LABELS[item.client_approval_status] || 'Não identificado'}. {item.client_feedback || ''}</p>}
  </div>;
}
