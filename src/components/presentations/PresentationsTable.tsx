import React from 'react';
import {
  Presentation,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  Plus,
  Loader2,
  Clock,
} from 'lucide-react';
import { Presentation as PresentationType } from '../../types/presentations';
import { PresentationStatusBadge } from './PresentationStatusBadge';

interface PresentationsTableProps {
  presentations: PresentationType[];
  loading: boolean;
  onOpenPresentation: (id: string) => void;
  onNewPresentation: () => void;
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

export const PresentationsTable: React.FC<PresentationsTableProps> = ({
  presentations,
  loading,
  onOpenPresentation,
  onNewPresentation,
}) => {
  if (loading && presentations.length === 0) {
    return (
      <div className="bg-white border border-[#E8E9EA] rounded-2xl p-12 text-center space-y-3 shadow-2xs">
        <Loader2 className="w-7 h-7 animate-spin text-[#F15A3C] mx-auto" />
        <p className="text-xs font-semibold text-[#666668]">
          Carregando apresentações...
        </p>
      </div>
    );
  }

  if (presentations.length === 0) {
    return (
      <div className="bg-white border border-[#E8E9EA] rounded-2xl p-12 text-center max-w-lg mx-auto shadow-2xs space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#FDF1EE] text-[#F15A3C] flex items-center justify-center mx-auto">
          <Presentation className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-[#1D1D1D]">
            Nenhuma apresentação encontrada
          </h3>
          <p className="text-xs text-[#666668]">
            Crie uma rodada de apresentação para organizar os conteúdos de um cliente e preparar a revisão visual.
          </p>
        </div>
        <button
          type="button"
          onClick={onNewPresentation}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d9482b] rounded-xl transition-colors cursor-pointer shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>Criar primeira apresentação</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E8E9EA] rounded-2xl shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E8E9EA] bg-[#FAFAFA] text-[11px] font-semibold text-[#666668] uppercase tracking-wider">
              <th className="py-3 px-4">Apresentação / Título</th>
              <th className="py-3 px-4">Cliente</th>
              <th className="py-3 px-4 text-center">Rodada</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-center">Conteúdos</th>
              <th className="py-3 px-4">Criado em</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E9EA] text-xs">
            {presentations.map((p) => {
              const clientName =
                p.client?.commercial_name || p.client?.name || 'Cliente';
              const itemsCount = p.items_count ?? 0;

              return (
                <tr
                  key={p.id}
                  onClick={() => onOpenPresentation(p.id)}
                  className="hover:bg-[#FAFAFA] transition-colors cursor-pointer group"
                >
                  {/* Title & Description */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="space-y-0.5">
                      <p className="font-bold text-[#1D1D1D] group-hover:text-[#F15A3C] transition-colors">
                        {p.title}
                      </p>
                      {p.description && (
                        <p className="text-[11px] text-[#9E9EA0] truncate">
                          {p.description}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Client */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      {p.client?.logo_url ? (
                        <img
                          src={p.client.logo_url}
                          alt={clientName}
                          className="w-6 h-6 rounded-lg object-contain bg-white border border-[#E8E9EA]"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-[#F2F3F3] text-[#1D1D1D] flex items-center justify-center font-bold text-[10px] border border-[#E8E9EA]">
                          {clientName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-semibold text-[#1D1D1D]">
                        {clientName}
                      </span>
                    </div>
                  </td>

                  {/* Round */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F7F7F8] text-[#555557] border border-[#E8E9EA]">
                      Rodada {p.round_number || 1}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <PresentationStatusBadge status={p.status} size="sm" />
                  </td>

                  {/* Items Count */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#666668]">
                      <Layers className="w-3.5 h-3.5 text-[#9E9EA0]" />
                      <span>{itemsCount}</span>
                    </span>
                  </td>

                  {/* Created At */}
                  <td className="py-3.5 px-4 text-[#666668] text-[11px] whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#9E9EA0]" />
                      <span>{formatDate(p.created_at)}</span>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPresentation(p.id);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#FDF1EE] hover:text-[#F15A3C] border border-[#E8E9EA] hover:border-[#F15A3C]/30 rounded-xl transition-all shadow-2xs cursor-pointer"
                    >
                      <span>Abrir Editor</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
