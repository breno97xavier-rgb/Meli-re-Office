import React, { useState } from 'react';
import {
  Layers,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit3,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { ClientPillar } from '../../types/planning';
import { PillarFormModal } from './PillarFormModal';

interface EditorialPillarsSectionProps {
  pillars: ClientPillar[];
  loading: boolean;
  error: string | null;
  mutating: boolean;
  mutationError: string | null;
  onCreatePillar: (data: { name: string; description?: string }) => Promise<ClientPillar | null>;
  onUpdatePillar: (pillarId: string, data: { name?: string; description?: string }) => Promise<ClientPillar | null>;
  onToggleActive: (pillarId: string, isActive: boolean) => Promise<boolean>;
  onReorderPillars: (orderedIds: string[]) => Promise<boolean>;
}

export const EditorialPillarsSection: React.FC<EditorialPillarsSectionProps> = ({
  pillars,
  loading,
  error,
  mutating,
  mutationError,
  onCreatePillar,
  onUpdatePillar,
  onToggleActive,
  onReorderPillars,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pillarToEdit, setPillarToEdit] = useState<ClientPillar | null>(null);
  const [confirmTogglePillar, setConfirmTogglePillar] = useState<ClientPillar | null>(null);

  const handleOpenCreate = () => {
    setPillarToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pillar: ClientPillar) => {
    setPillarToEdit(pillar);
    setIsModalOpen(true);
  };

  const handleModalSave = async (data: { name: string; description?: string }) => {
    if (pillarToEdit) {
      await onUpdatePillar(pillarToEdit.id, data);
    } else {
      await onCreatePillar(data);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (mutating) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pillars.length) return;

    const newOrder = [...pillars];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    await onReorderPillars(newOrder.map((p) => p.id));
  };

  const activeCount = pillars.filter((p) => p.is_active).length;
  const inactiveCount = pillars.length - activeCount;

  return (
    <div
      id="editorial-pillars-section"
      className="bg-white border border-[#E8E9EA] rounded-xl p-5 md:p-6 shadow-2xs space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F2F3F3]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#F7F7F8] border border-[#E8E9EA]">
            <Layers className="w-4 h-4 text-[#1D1D1D]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#1D1D1D]">
                Pilares Editoriais
              </h2>
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#F2F3F3] text-[#666668]">
                {error ? '—' : `${pillars.length} ${pillars.length === 1 ? 'pilar' : 'pilares'}`}
              </span>
            </div>
            <p className="text-xs text-[#666668]">
              Linhas temáticas mestres para distribuição e equilíbrio de conteúdo.
            </p>
          </div>
        </div>

        <button
          id="new-pillar-btn"
          onClick={handleOpenCreate}
          disabled={loading || mutating || Boolean(error)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-white bg-[#1D1D1D] hover:bg-[#2E2E2E] rounded-lg transition-colors shadow-2xs cursor-pointer self-start sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5 text-[#F3705A]" />
          <span>Novo pilar</span>
        </button>
      </div>

      {/* Errors */}
      {(error || mutationError) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{mutationError || error}</span>
        </div>
      )}

      {/* Loading & Content States */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-[#8C8D8F]">
          <Loader2 className="w-5 h-5 animate-spin text-[#1D1D1D]" />
          <p className="text-xs">Carregando catálogo de pilares...</p>
        </div>
      ) : error ? (
        /* Quando ocorre erro no carregamento dos pilares, não renderizar empty state simultâneo */
        null
      ) : pillars.length === 0 ? (
        /* Empty State */
        <div className="py-10 px-4 text-center rounded-xl bg-[#FBFBFC] border border-dashed border-[#E8E9EA] space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full bg-[#F2F3F3] flex items-center justify-center text-[#8C8D8F]">
            <Layers className="w-5 h-5 text-[#8C8D8F]" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#1D1D1D]">
              Nenhum pilar editorial definido.
            </p>
            <p className="text-xs text-[#8C8D8F] max-w-sm mx-auto mt-0.5">
              Crie os pilares temáticos para classificar e orientar os conteúdos desta marca.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#1D1D1D] hover:bg-[#2E2E2E] rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#F3705A]" />
            <span>Adicionar primeiro pilar</span>
          </button>
        </div>
      ) : (
        /* Pillars List */
        <div className="space-y-2.5">
          {pillars.map((pillar, index) => {
            const isFirst = index === 0;
            const isLast = index === pillars.length - 1;

            return (
              <div
                key={pillar.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  pillar.is_active
                    ? 'bg-[#FBFBFC] border-[#E8E9EA] hover:border-[#DCDDDE]'
                    : 'bg-[#F7F7F8]/60 border-[#E8E9EA]/60 opacity-70'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  {/* Order Controls */}
                  <div className="flex sm:flex-col items-center gap-0.5 shrink-0 bg-white border border-[#E8E9EA] rounded-md p-0.5">
                    <button
                      type="button"
                      onClick={() => handleMove(index, 'up')}
                      disabled={isFirst || mutating}
                      title="Mover para cima"
                      className="p-1 text-[#8C8D8F] hover:text-[#1D1D1D] disabled:opacity-30 transition-colors"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(index, 'down')}
                      disabled={isLast || mutating}
                      title="Mover para baixo"
                      className="p-1 text-[#8C8D8F] hover:text-[#1D1D1D] disabled:opacity-30 transition-colors"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Pillar Info */}
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#1D1D1D] truncate">
                        {pillar.name}
                      </span>
                      {pillar.is_active ? (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Ativo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-gray-100 text-gray-500 border border-gray-200">
                          Inativo
                        </span>
                      )}
                    </div>
                    {pillar.description && (
                      <p className="text-xs text-[#666668] line-clamp-2 leading-relaxed">
                        {pillar.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(pillar)}
                    disabled={mutating}
                    className="p-1.5 text-xs text-[#666668] hover:text-[#1D1D1D] bg-white hover:bg-[#F2F3F3] border border-[#E8E9EA] rounded-lg transition-colors"
                    title="Editar pilar"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmTogglePillar(pillar)}
                    disabled={mutating}
                    className={`p-1.5 text-xs rounded-lg border transition-colors ${
                      pillar.is_active
                        ? 'text-[#666668] hover:text-amber-700 bg-white hover:bg-amber-50 border-[#E8E9EA]'
                        : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                    }`}
                    title={pillar.is_active ? 'Desativar pilar' : 'Reativar pilar'}
                  >
                    {pillar.is_active ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Active/Inactive Toggle */}
      {confirmTogglePillar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white border border-[#E8E9EA] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
                <Info className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-[#1D1D1D]">
                {confirmTogglePillar.is_active
                  ? 'Desativar Pilar Editorial?'
                  : 'Reativar Pilar Editorial?'}
              </h3>
            </div>

            <p className="text-xs text-[#666668] leading-relaxed">
              {confirmTogglePillar.is_active ? (
                <>
                  Ao desativar o pilar{' '}
                  <strong className="text-[#1D1D1D]">{confirmTogglePillar.name}</strong>,
                  ele deixará de aparecer como opção para novos conteúdos.
                  <br />
                  <br />
                  <span className="text-[#8C8D8F]">
                    Pilares desativados permanecem vinculados aos conteúdos históricos.
                  </span>
                </>
              ) : (
                <>
                  Deseja reativar o pilar{' '}
                  <strong className="text-[#1D1D1D]">{confirmTogglePillar.name}</strong>?
                  Ele voltará a ser exibido para criação e planejamento.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F2F3F3]">
              <button
                type="button"
                onClick={() => setConfirmTogglePillar(null)}
                className="px-3 py-1.5 text-xs font-medium text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetPillar = confirmTogglePillar;
                  setConfirmTogglePillar(null);
                  await onToggleActive(targetPillar.id, !targetPillar.is_active);
                }}
                className={`px-3.5 py-1.5 text-xs font-medium text-white rounded-lg transition-colors shadow-2xs ${
                  confirmTogglePillar.is_active
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-[#1D1D1D] hover:bg-[#2E2E2E]'
                }`}
              >
                {confirmTogglePillar.is_active ? 'Desativar pilar' : 'Reativar pilar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Create/Edit */}
      <PillarFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pillarToEdit={pillarToEdit}
        onSave={handleModalSave}
        isSaving={mutating}
      />
    </div>
  );
};
