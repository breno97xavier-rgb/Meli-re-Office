import React, { useState } from 'react';
import { usePresentationEditor } from '../hooks/usePresentationEditor';
import { useRouter } from '../hooks/useRouter';
import { preparePresentationReview } from '../services/presentationsService';
import type { RoutePath } from '../types';
import { PresentationEditorHeader } from '../components/presentations/PresentationEditorHeader';
import { PresentationItemsFeed } from '../components/presentations/PresentationItemsFeed';
import { AddContentsToPresentationModal } from '../components/presentations/AddContentsToPresentationModal';
import { EditPresentationModal } from '../components/presentations/EditPresentationModal';
import { SharePresentationModal } from '../components/presentations/SharePresentationModal';
import { CreateNextRoundModal } from '../components/presentations/CreateNextRoundModal';
import { OfficeConfirmProvider, useOfficeConfirm } from '../components/shared/OfficeConfirmProvider';
import {
  Layers,
  Plus,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

interface PresentationEditorPageProps {
  presentationId: string;
}

export const PresentationEditorPage: React.FC<PresentationEditorPageProps> = props => (
  <OfficeConfirmProvider title="Preparar versão para avaliação?" cancelLabel="Cancelar" confirmLabel="Preparar versão">
    <PresentationEditorContent {...props} />
  </OfficeConfirmProvider>
);

const PresentationEditorContent: React.FC<PresentationEditorPageProps> = ({
  presentationId,
}) => {
  const { navigate } = useRouter();
  const confirm = useOfficeConfirm();
  const {
    presentation,
    items,
    signedUrls,
    availableContents,
    clientContents,
    loading,
    error,
    actionLoading,
    savingItemId,
    isUpdatingPresentation,
    loadData,
    handleAddContents,
    handleRemoveItem,
    handleUpdateItemNotes,
    handleUpdateItemApprovalStatus,
    handleMoveItem,
    handleUpdatePresentation,
  } = usePresentationEditor(presentationId);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isNextRoundModalOpen, setIsNextRoundModalOpen] = useState(false);
  const [preparingReview, setPreparingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  async function prepareReview() {
    if (preparingReview || !await confirm('Os textos e arquivos atuais ficarão preservados nesta rodada para avaliação do cliente. Para avaliar alterações posteriores, será necessário criar uma nova rodada.')) return;
    setPreparingReview(true); setReviewError('');
    try { await preparePresentationReview(presentationId); await loadData(); }
    catch (failure) { setReviewError(failure instanceof Error ? failure.message : 'Não foi possível preparar a versão.'); }
    finally { setPreparingReview(false); }
  }

  const handleBack = () => {
    navigate('/apresentacoes');
  };

  const handleNavigateToRound = (targetId: string) => {
    if (targetId && targetId !== presentationId) {
      navigate(`/apresentacoes/${targetId}` as RoutePath);
    }
  };

  const handleNextRoundSuccess = (newPresentationId: string) => {
    setIsNextRoundModalOpen(false);
    navigate(`/apresentacoes/${newPresentationId}` as RoutePath);
  };

  if (loading && !presentation) {
    return (
      <div className="p-12 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#F15A3C] mx-auto" />
        <p className="text-xs font-semibold text-[#666668]">
          Carregando apresentação...
        </p>
      </div>
    );
  }

  if (error || !presentation) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-4">
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <h2 className="text-sm font-bold text-red-900">
            Apresentação não encontrada
          </h2>
          <p className="text-xs text-red-700">
            {error || 'Não foi possível carregar a apresentação solicitada.'}
          </p>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-xl hover:bg-[#F2F3F3] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Apresentações</span>
          </button>
        </div>
      </div>
    );
  }

  const clientName =
    presentation.client?.commercial_name ||
    presentation.client?.name ||
    'Cliente';

  const alreadyIncludedContentIds = new Set(items.map((i) => i.content_id));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Editor Header */}
      <PresentationEditorHeader
        presentation={presentation}
        itemsCount={items.length}
        loading={loading}
        onBack={handleBack}
        onPresent={() => navigate(`/apresentacoes/${presentation.id}/apresentar` as RoutePath)}
        onOpenAddContents={() => setIsAddModalOpen(true)}
        onOpenEditMetadata={() => setIsEditModalOpen(true)}
        onOpenShare={() => setIsShareModalOpen(true)}
        onOpenNextRoundModal={() => setIsNextRoundModalOpen(true)}
        onNavigateToRound={handleNavigateToRound}
        onRefresh={loadData}
      />

      <section aria-label="Versão para avaliação" className="rounded-xl border border-[#E8E9EA] bg-white p-4 space-y-2 text-sm">
        <h2 className="flex items-center gap-2 font-bold text-[#1D1D1D]"><ShieldCheck aria-hidden="true" className="h-5 w-5 text-[#F15A3C]" />Versão para avaliação</h2>
        <p>Prepare a versão quando os textos e arquivos estiverem prontos. A rodada preservará esses materiais para avaliação.</p>
        {reviewError && <p role="alert" className="text-red-700">{reviewError}</p>}
        <button type="button" onClick={() => void prepareReview()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#1D1D1D] bg-[#1D1D1D] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#333333] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F15A3C] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          disabled={preparingReview || !items.length || items.some(item => item.review_id || item.client_approval_status !== 'pending')}>
          {preparingReview ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ShieldCheck aria-hidden="true" className="h-4 w-4" />}
          {preparingReview ? 'Preparando…' : items.some(item => item.review_id) ? 'Versão desta rodada preservada' : 'Preparar versão para avaliação'}
        </button>
        {items.some(item => !item.review_id && item.client_approval_status !== 'pending') && <p>Parecer histórico sem versão registrada. Use Nova Rodada para avaliar novos materiais.</p>}
      </section>

      {/* Main Items Flow */}
      <div className="space-y-4">
        {items.length === 0 ? (
          /* Empty presentation items state */
          <div className="bg-white border border-[#E8E9EA] rounded-2xl p-12 text-center max-w-lg mx-auto shadow-2xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FDF1EE] text-[#F15A3C] flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#1D1D1D]">
                Nenhum conteúdo nesta apresentação
              </h3>
              <p className="text-xs text-[#666668]">
                Adicione os conteúdos de {clientName} que farão parte desta rodada de apresentação editorial.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d9482b] rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Conteúdos</span>
            </button>
          </div>
        ) : (
          <PresentationItemsFeed
            items={items}
            signedUrls={signedUrls}
            savingItemId={savingItemId}
            actionLoading={actionLoading}
            onMoveUp={(id) => handleMoveItem(id, 'up')}
            onMoveDown={(id) => handleMoveItem(id, 'down')}
            onRemove={handleRemoveItem}
            onUpdateNotes={handleUpdateItemNotes}
            onUpdateStatus={handleUpdateItemApprovalStatus}
          />
        )}
      </div>

      {/* Modal: Add Contents */}
      <AddContentsToPresentationModal
        isOpen={isAddModalOpen}
        clientName={clientName}
        availableContents={availableContents}
        alreadyIncludedContentIds={alreadyIncludedContentIds}
        onClose={() => setIsAddModalOpen(false)}
        onAddContents={handleAddContents}
        isAdding={actionLoading}
      />

      {/* Modal: Edit Presentation Metadata */}
      <EditPresentationModal
        isOpen={isEditModalOpen}
        presentation={presentation}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdatePresentation}
        isSaving={isUpdatingPresentation}
      />

      {/* Modal: Create Next Round */}
      {isNextRoundModalOpen && (
        <CreateNextRoundModal
          isOpen={isNextRoundModalOpen}
          presentation={presentation}
          currentItems={items}
          availableClientContents={clientContents}
          onClose={() => setIsNextRoundModalOpen(false)}
          onSuccess={handleNextRoundSuccess}
        />
      )}

      {/* Modal: Share Presentation / Access Link Management */}
      {isShareModalOpen && (
        <SharePresentationModal
          isOpen={isShareModalOpen}
          presentation={presentation}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  );
};

