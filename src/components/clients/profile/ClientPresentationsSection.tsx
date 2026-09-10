import React, { useState } from 'react';
import {
  Presentation,
  Plus,
  RefreshCw,
  Layers,
  ArrowRight,
  Clock,
  Loader2,
} from 'lucide-react';
import { usePresentations } from '../../../hooks/usePresentations';
import { Client } from '../../../types/clients';
import { PresentationStatusBadge } from '../../presentations/PresentationStatusBadge';
import { CreatePresentationModal } from '../../presentations/CreatePresentationModal';

interface ClientPresentationsSectionProps {
  client: Client;
  onNavigate: (path: string) => void;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export const ClientPresentationsSection: React.FC<ClientPresentationsSectionProps> = ({
  client,
  onNavigate,
}) => {
  const {
    presentations,
    loading,
    error,
    loadData,
    handleCreatePresentation,
    isCreating,
    createError,
  } = usePresentations(client.id);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreateAndOpen = async (input: Parameters<typeof handleCreatePresentation>[0]) => {
    const created = await handleCreatePresentation({
      ...input,
      client_id: client.id,
    });
    setIsCreateModalOpen(false);
    onNavigate(`/apresentacoes/${created.id}`);
    return created;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#E8E9EA] p-5 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#1D1D1D] font-display">
            Apresentações de Conteúdo
          </h2>
          <p className="text-xs text-[#666668]">
            Rodadas de revisão e alinhamento visual de conteúdos para {client.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-2 text-[#666668] hover:text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#EDEEEE] rounded-xl transition-colors cursor-pointer"
            title="Atualizar apresentações"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#F15A3C]' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d9482b] rounded-xl transition-all shadow-2xs cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Apresentação</span>
          </button>
        </div>
      </div>

      {/* List */}
      {loading && presentations.length === 0 ? (
        <div className="bg-white border border-[#E8E9EA] rounded-2xl p-12 text-center space-y-3 shadow-2xs">
          <Loader2 className="w-6 h-6 animate-spin text-[#F15A3C] mx-auto" />
          <p className="text-xs font-semibold text-[#666668]">
            Carregando apresentações do cliente...
          </p>
        </div>
      ) : presentations.length === 0 ? (
        <div className="bg-white border border-[#E8E9EA] rounded-2xl p-10 text-center max-w-md mx-auto shadow-2xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#FDF1EE] text-[#F15A3C] flex items-center justify-center mx-auto">
            <Presentation className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-[#1D1D1D]">
              Nenhuma apresentação criada
            </h3>
            <p className="text-[11px] text-[#666668]">
              Crie uma rodada de apresentação para organizar e aprovar os conteúdos deste cliente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d9482b] rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar apresentação</span>
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#E8E9EA] rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E8E9EA] bg-[#FAFAFA] text-[11px] font-semibold text-[#666668] uppercase tracking-wider">
                  <th className="py-3 px-4">Título</th>
                  <th className="py-3 px-4 text-center">Rodada</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Conteúdos</th>
                  <th className="py-3 px-4">Criado em</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E9EA] text-xs">
                {presentations.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => onNavigate(`/apresentacoes/${p.id}`)}
                    className="hover:bg-[#FAFAFA] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-bold text-[#1D1D1D] group-hover:text-[#F15A3C] transition-colors">
                        {p.title}
                      </p>
                      {p.description && (
                        <p className="text-[11px] text-[#9E9EA0] truncate">
                          {p.description}
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F7F7F8] text-[#555557] border border-[#E8E9EA]">
                        Rodada {p.round_number || 1}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <PresentationStatusBadge status={p.status} size="sm" />
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#666668]">
                        <Layers className="w-3.5 h-3.5 text-[#9E9EA0]" />
                        <span>{p.items_count ?? 0}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[#666668] text-[11px] whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#9E9EA0]" />
                        <span>{formatDate(p.created_at)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate(`/apresentacoes/${p.id}`);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#FDF1EE] hover:text-[#F15A3C] border border-[#E8E9EA] hover:border-[#F15A3C]/30 rounded-xl transition-all cursor-pointer"
                      >
                        <span>Abrir Editor</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal create */}
      <CreatePresentationModal
        isOpen={isCreateModalOpen}
        clients={[client]}
        initialClientId={client.id}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateAndOpen}
        isSubmitting={isCreating}
        error={createError}
      />
    </div>
  );
};
