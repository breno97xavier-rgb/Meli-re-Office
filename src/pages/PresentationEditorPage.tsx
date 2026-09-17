import React, { useState } from 'react';
import { usePresentationEditor } from '../hooks/usePresentationEditor';
import { useRouter } from '../hooks/useRouter';
import type { RoutePath } from '../types';
import { PresentationEditorHeader } from '../components/presentations/PresentationEditorHeader';
import { PresentationItemCard } from '../components/presentations/PresentationItemCard';
import { AddContentsToPresentationModal } from '../components/presentations/AddContentsToPresentationModal';
import { EditPresentationModal } from '../components/presentations/EditPresentationModal';
import { SharePresentationModal } from '../components/presentations/SharePresentationModal';
import { CreateNextRoundModal } from '../components/presentations/CreateNextRoundModal';
import {
  Layers,
  Plus,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';

interface PresentationEditorPageProps {
  presentationId: string;
}

export const PresentationEditorPage: React.FC<PresentationEditorPageProps> = ({
  presentationId,
}) => {
  const { navigate } = useRouter();
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
          /* List of Presentation Item Cards */
          <div className="space-y-4">
            {items.map((item, index) => (
              <PresentationItemCard
                key={item.id}
                item={item}
                index={index}
                totalItems={items.length}
                signedUrls={signedUrls}
                isSavingNotes={savingItemId === item.id}
                onMoveUp={(id) => handleMoveItem(id, 'up')}
                onMoveDown={(id) => handleMoveItem(id, 'down')}
                onRemove={handleRemoveItem}
                onUpdateNotes={handleUpdateItemNotes}
                onUpdateStatus={handleUpdateItemApprovalStatus}
              />
            ))}
          </div>
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

