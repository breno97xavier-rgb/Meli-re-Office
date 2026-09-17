import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  Campaign,
  CampaignStatus,
  CreateCampaignInput,
  UpdateCampaignInput,
} from '../../types/planning';
import { useCampaigns } from '../../hooks/useCampaigns';
import { CampaignCard } from './CampaignCard';
import { CampaignFormModal } from './CampaignFormModal';
import { CampaignDetailModal } from './CampaignDetailModal';
import { ArchiveCampaignConfirmModal } from './ArchiveCampaignConfirmModal';
import { DeleteCampaignConfirmModal } from './DeleteCampaignConfirmModal';

interface CampaignsSectionProps {
  clientId: string;
}

export const CampaignsSection: React.FC<CampaignsSectionProps> = ({ clientId }) => {
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);

  // Core hook
  const {
    campaigns,
    loading,
    error,
    mutating,
    mutationError,
    createCampaign,
    updateCampaign,
    setStatus,
    archiveCampaign,
    deleteCampaign,
  } = useCampaigns(clientId, { includeArchived });

  // Modals & Selection States
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [selectedCampaignForDetail, setSelectedCampaignForDetail] = useState<Campaign | null>(null);
  const [campaignToEdit, setCampaignToEdit] = useState<Campaign | null>(null);
  const [campaignToArchive, setCampaignToArchive] = useState<Campaign | null>(null);
  const [isArchiving, setIsArchiving] = useState<boolean>(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Close open modals and clear selection when client changes
  useEffect(() => {
    setIsFormModalOpen(false);
    setSelectedCampaignForDetail(null);
    setCampaignToEdit(null);
    setCampaignToArchive(null);
    setCampaignToDelete(null);
    setDeleteError(null);
  }, [clientId]);

  // Keep selectedCampaignForDetail synchronized with latest array data
  useEffect(() => {
    if (selectedCampaignForDetail) {
      const refreshed = campaigns.find((c) => c.id === selectedCampaignForDetail.id);
      if (refreshed) {
        setSelectedCampaignForDetail(refreshed);
      }
    }
  }, [campaigns, selectedCampaignForDetail?.id]);

  // Handlers
  const handleOpenCreate = () => {
    setCampaignToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (campaign: Campaign) => {
    setCampaignToEdit(campaign);
    setIsFormModalOpen(true);
  };

  const handleSaveCampaignForm = async (
    input: Omit<CreateCampaignInput, 'client_id'> | UpdateCampaignInput
  ): Promise<Campaign | null> => {
    if (campaignToEdit) {
      const updated = await updateCampaign(campaignToEdit.id, input);
      if (updated && selectedCampaignForDetail?.id === campaignToEdit.id) {
        setSelectedCampaignForDetail(updated);
      }
      return updated;
    } else {
      const created = await createCampaign(input as Omit<CreateCampaignInput, 'client_id'>);
      return created;
    }
  };

  const handleSetStatus = async (
    campaignId: string,
    newStatus: CampaignStatus
  ): Promise<boolean> => {
    const ok = await setStatus(campaignId, newStatus);
    return ok;
  };

  const handleConfirmArchive = async () => {
    if (!campaignToArchive) return;
    setIsArchiving(true);
    try {
      const ok = await archiveCampaign(campaignToArchive.id);
      if (ok) {
        if (selectedCampaignForDetail?.id === campaignToArchive.id) {
          if (!includeArchived) {
            setSelectedCampaignForDetail(null);
          } else {
            setSelectedCampaignForDetail((prev) =>
              prev ? { ...prev, status: 'archived' } : null
            );
          }
        }
        setCampaignToArchive(null);
      }
    } finally {
      setIsArchiving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!campaignToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const ok = await deleteCampaign(campaignToDelete.id);
      if (ok) {
        if (selectedCampaignForDetail?.id === campaignToDelete.id) {
          setSelectedCampaignForDetail(null);
        }
        setCampaignToDelete(null);
      } else {
        setDeleteError(mutationError || 'Não foi possível excluir a campanha.');
      }
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Erro ao excluir campanha.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section
      id="campaigns-section"
      className="bg-white border border-[#E8E9EA] rounded-xl p-5 md:p-6 shadow-2xs space-y-6"
    >
      {/* 1. Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#F7F7F8] border border-[#E8E9EA] text-[#1D1D1D]">
            <Megaphone className="w-5 h-5 text-[#1D1D1D]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[#1D1D1D]">
                Campanhas
              </h2>
              <span className="text-xs text-[#8C8D8F] font-normal">
                ({campaigns.length} {campaigns.length === 1 ? 'campanha' : 'campanhas'})
              </span>
            </div>
            <p className="text-xs text-[#666668] mt-0.5">
              Iniciativas específicas que organizam objetivos e ações ao longo do planejamento.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Toggle Archived */}
          <button
            type="button"
            onClick={() => setIncludeArchived((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              includeArchived
                ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/70'
                : 'bg-[#F7F7F8] text-[#666668] border-[#E8E9EA] hover:bg-[#E8E9EA] hover:text-[#1D1D1D]'
            }`}
          >
            {includeArchived ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{includeArchived ? 'Ocultar arquivadas' : 'Mostrar arquivadas'}</span>
          </button>

          {/* New Campaign Button */}
          <button
            type="button"
            onClick={handleOpenCreate}
            disabled={loading || mutating}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#1D1D1D] hover:bg-[#2E2E2E] rounded-lg transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#F3705A]" />
            <span>Nova campanha</span>
          </button>
        </div>
      </div>

      {/* 2. Error States */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">Erro ao carregar campanhas</span>
            <p className="leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {mutationError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{mutationError}</span>
        </div>
      )}

      {/* 3. Loading State */}
      {loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-5 border border-[#E8E9EA] rounded-xl bg-[#FAFAFA] animate-pulse space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="h-4 bg-[#E8E9EA] rounded w-24" />
                <div className="h-4 bg-[#E8E9EA] rounded w-16" />
              </div>
              <div className="h-5 bg-[#E8E9EA] rounded w-3/4" />
              <div className="h-10 bg-[#E8E9EA] rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {/* 4. Empty State */}
      {!loading && !error && campaigns.length === 0 && (
        <div
          id="campaigns-empty-state"
          className="p-10 border border-dashed border-[#E8E9EA] rounded-xl text-center space-y-3 bg-[#FAFAFA]"
        >
          <div className="w-10 h-10 mx-auto rounded-full bg-white border border-[#E8E9EA] flex items-center justify-center text-[#8C8D8F]">
            <Megaphone className="w-5 h-5 text-[#8C8D8F]" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-sm font-semibold text-[#1D1D1D]">Nenhuma campanha criada</h3>
            <p className="text-xs text-[#666668]">
              Crie iniciativas específicas para organizar objetivos e ações do cliente.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1D1D1D] hover:bg-[#2E2E2E] rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#F3705A]" />
            <span>Criar primeira campanha</span>
          </button>
        </div>
      )}

      {/* 5. Campaigns Grid */}
      {!loading && !error && campaigns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onClick={() => setSelectedCampaignForDetail(campaign)}
            />
          ))}
        </div>
      )}

      {/* 6. Modals */}
      {/* Create / Edit Form Modal */}
      <CampaignFormModal
        isOpen={isFormModalOpen}
        campaignToEdit={campaignToEdit}
        onClose={() => {
          setIsFormModalOpen(false);
          setCampaignToEdit(null);
        }}
        onSave={handleSaveCampaignForm}
      />

      {/* Detail Modal */}
      <CampaignDetailModal
        isOpen={Boolean(selectedCampaignForDetail)}
        campaign={selectedCampaignForDetail}
        onClose={() => setSelectedCampaignForDetail(null)}
        onEdit={(campaign) => {
          handleOpenEdit(campaign);
        }}
        onSetStatus={handleSetStatus}
        onRequestArchive={(campaign) => setCampaignToArchive(campaign)}
        onRequestDelete={(campaign) => {
          setDeleteError(null);
          setCampaignToDelete(campaign);
        }}
        mutating={mutating}
      />

      {/* Archive Confirmation Modal */}
      <ArchiveCampaignConfirmModal
        isOpen={Boolean(campaignToArchive)}
        campaign={campaignToArchive}
        onClose={() => setCampaignToArchive(null)}
        onConfirm={handleConfirmArchive}
        isArchiving={isArchiving}
      />

      {/* Delete Confirmation Modal */}
      <DeleteCampaignConfirmModal
        isOpen={Boolean(campaignToDelete)}
        campaign={campaignToDelete}
        onClose={() => {
          setCampaignToDelete(null);
          setDeleteError(null);
        }}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        errorMessage={deleteError || mutationError}
      />
    </section>
  );
};
