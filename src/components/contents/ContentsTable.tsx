import React from 'react';
import {
  FileText,
  Calendar,
  User,
  Plus,
  ArrowRight,
  Sparkles,
  Building2,
  Layers,
  Clock,
} from 'lucide-react';
import { Content, getFunnelStageLabel } from '../../types/contents';
import { ContentStatusBadge } from './ContentStatusBadge';
import { ContentFormatBadge } from './ContentFormatBadge';

interface ContentsTableProps {
  contents: Content[];
  loading: boolean;
  onSelectContent: (content: Content) => void;
  onNewContent: () => void;
  isFiltered: boolean;
  onResetFilters: () => void;
  hideClientColumn?: boolean;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR');
    }
    return dateStr;
  } catch {
    return dateStr || '—';
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  } catch {
    return '—';
  }
}

function getInitials(name?: string | null): string {
  if (!name) return 'ML';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const ContentsTable: React.FC<ContentsTableProps> = ({
  contents,
  loading,
  onSelectContent,
  onNewContent,
  isFiltered,
  onResetFilters,
  hideClientColumn = false,
}) => {
  if (loading) {
    return (
      <div className="bg-white border border-[#E8E9EA] rounded-2xl p-12 text-center shadow-2xs space-y-3">
        <div className="w-8 h-8 border-2 border-[#1D1D1D] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-[#666668]">
          Carregando acervo de conteúdos...
        </p>
      </div>
    );
  }

  if (contents.length === 0) {
    if (isFiltered) {
      return (
        <div className="bg-white border border-[#E8E9EA] rounded-2xl p-12 text-center shadow-2xs space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#F2F3F3] text-[#666668] flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#1D1D1D]">
              Nenhum conteúdo encontrado para estes filtros
            </h3>
            <p className="text-xs text-[#666668] max-w-sm mx-auto">
              Tente alterar os termos de busca, o cliente, formato ou status selecionados.
            </p>
          </div>
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#EDEEEE] rounded-lg transition-colors cursor-pointer"
          >
            <span>Limpar filtros aplicados</span>
          </button>
        </div>
      );
    }

    return (
      <div className="bg-white border border-[#E8E9EA] rounded-2xl p-12 text-center shadow-2xs space-y-4">
        <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#F15A3C] flex items-center justify-center mx-auto shadow-2xs">
          <FileText className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[#1D1D1D]">
            Nenhum conteúdo cadastrado.
          </h3>
          <p className="text-xs text-[#666668] max-w-sm mx-auto">
            Crie o primeiro conteúdo para iniciar o planejamento editorial.
          </p>
        </div>
        <button
          type="button"
          onClick={onNewContent}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d94a2e] rounded-lg transition-all cursor-pointer shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>Novo conteúdo</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E8E9EA] rounded-2xl overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E8E9EA] bg-[#FAFAFA] text-[11px] font-semibold text-[#666668] uppercase tracking-wider">
              <th className="py-3 px-4 min-w-[240px]">Conteúdo</th>
              {!hideClientColumn && (
                <th className="py-3 px-4 min-w-[160px]">Cliente</th>
              )}
              <th className="py-3 px-4 min-w-[120px]">Formato</th>
              <th className="py-3 px-4 min-w-[150px]">Estratégia</th>
              <th className="py-3 px-4 min-w-[130px]">Status</th>
              <th className="py-3 px-4 min-w-[120px]">Data Planejada</th>
              <th className="py-3 px-4 min-w-[130px]">Responsável</th>
              <th className="py-3 px-4 text-right min-w-[100px]">Atualizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F3F3] text-xs font-medium text-[#1D1D1D]">
            {contents.map((content) => {
              const clientName =
                content.client?.commercial_name || content.client?.name || 'Cliente';
              const secondaryPreview =
                content.goal ||
                content.caption ||
                content.script ||
                content.copy ||
                null;

              return (
                <tr
                  key={content.id}
                  onClick={() => onSelectContent(content)}
                  className="hover:bg-[#F9F9FB] transition-colors cursor-pointer group"
                >
                  {/* Conteúdo (Título interno + preview) */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-[#1D1D1D] group-hover:text-[#F15A3C] transition-colors">
                        <span>{content.internal_title}</span>
                      </div>
                      {secondaryPreview && (
                        <p className="text-[11px] text-[#8C8D8F] line-clamp-1 max-w-sm">
                          {secondaryPreview}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Cliente */}
                  {!hideClientColumn && (
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {content.client?.logo_url ? (
                          <img
                            src={content.client.logo_url}
                            alt={clientName}
                            className="w-6 h-6 rounded-md object-cover border border-[#E8E9EA]"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-[#F2F3F3] border border-[#E8E9EA] text-[10px] font-bold text-[#666668] flex items-center justify-center shrink-0">
                            {getInitials(clientName)}
                          </div>
                        )}
                        <span className="font-semibold text-[#1D1D1D] truncate max-w-[140px]">
                          {clientName}
                        </span>
                      </div>
                    </td>
                  )}

                  {/* Formato */}
                  <td className="py-3.5 px-4">
                    <ContentFormatBadge format={content.format} size="sm" />
                  </td>

                  {/* Estratégia (Pilar / Funil) */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap items-center gap-1.5 max-w-[180px]">
                      {(content.client_pillar?.name || content.pillar) && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F2F3F3] text-[#555557] border border-[#E0E1E2] truncate max-w-[120px]"
                          title={content.client_pillar?.name || content.pillar || ''}
                        >
                          {content.client_pillar?.name || content.pillar}
                        </span>
                      )}
                      {content.funnel_stage && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-600 truncate max-w-[120px]">
                          {getFunnelStageLabel(content.funnel_stage)}
                        </span>
                      )}
                      {!content.client_pillar?.name && !content.pillar && !content.funnel_stage && (
                        <span className="text-[11px] text-[#A0A0A2]">—</span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <ContentStatusBadge status={content.editorial_status} size="sm" />
                  </td>

                  {/* Data Planejada */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-xs text-[#666668]">
                      <Calendar className="w-3.5 h-3.5 text-[#8C8D8F] shrink-0" />
                      <span>{formatDate(content.planned_date)}</span>
                    </div>
                  </td>

                  {/* Responsável */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-xs text-[#666668]">
                      {content.assigned_profile ? (
                        <>
                          {content.assigned_profile.avatar_url ? (
                            <img
                              src={content.assigned_profile.avatar_url}
                              alt={content.assigned_profile.full_name}
                              className="w-5 h-5 rounded-full object-cover border border-[#E8E9EA]"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-[#E8E9EA] text-[9px] font-bold text-[#555557] flex items-center justify-center shrink-0">
                              {getInitials(content.assigned_profile.full_name)}
                            </div>
                          )}
                          <span className="truncate max-w-[100px] text-[#1D1D1D]">
                            {content.assigned_profile.display_name ||
                              content.assigned_profile.full_name}
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] text-[#A0A0A2]">
                          Não atribuído
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Atualizado */}
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-[11px] text-[#8C8D8F]">
                      {formatRelativeTime(content.updated_at)}
                    </span>
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
