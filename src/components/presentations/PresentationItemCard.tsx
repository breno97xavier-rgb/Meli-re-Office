import React, { useState, useEffect } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Calendar,
  Layers,
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Film,
  Sparkles,
  MessageSquare,
  AlertCircle,
  Save,
  Loader2,
  Eye,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { PresentationItem } from '../../types/presentations';
import { ContentFormatBadge } from '../contents/ContentFormatBadge';
import { ContentStatusBadge } from '../contents/ContentStatusBadge';
import {
  PresentationItemApprovalBadge,
  ITEM_APPROVAL_STATUS_LABELS,
} from './PresentationStatusBadge';

interface PresentationItemCardProps {
  item: PresentationItem;
  index: number;
  totalItems: number;
  signedUrls: Record<string, string>;
  isSavingNotes: boolean;
  onMoveUp: (itemId: string) => void;
  onMoveDown: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onUpdateNotes: (itemId: string, notes: string) => Promise<void>;
  onUpdateStatus: (itemId: string, status: string) => Promise<void>;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'Sem data';
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

export const PresentationItemCard: React.FC<PresentationItemCardProps> = ({
  item,
  index,
  totalItems,
  signedUrls,
  isSavingNotes,
  onMoveUp,
  onMoveDown,
  onRemove,
  onUpdateNotes,
  onUpdateStatus,
}) => {
  const content = item.content;
  const assets = item.assets || [];

  // Local state for presentation_notes
  const [notes, setNotes] = useState(item.presentation_notes || '');
  const [hasNotesChanged, setHasNotesChanged] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Active slide index for carousel
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Update notes if prop changes from outside
  useEffect(() => {
    setNotes(item.presentation_notes || '');
    setHasNotesChanged(false);
  }, [item.presentation_notes]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    setHasNotesChanged(e.target.value !== (item.presentation_notes || ''));
  };

  const handleSaveNotes = async () => {
    if (!hasNotesChanged) return;
    try {
      await onUpdateNotes(item.id, notes);
      setHasNotesChanged(false);
    } catch {
      // Error handled by parent
    }
  };

  const handleCopyCaption = () => {
    const textToCopy = content?.caption || content?.copy || '';
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!content) {
    return (
      <div className="bg-white border border-red-200 rounded-2xl p-4 flex items-center justify-between text-xs text-red-700">
        <span>Conteúdo vinculado não encontrado (ID: {item.content_id})</span>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="text-red-700 hover:text-red-900 font-semibold cursor-pointer"
        >
          Remover
        </button>
      </div>
    );
  }

  // Find images/videos for the asset viewer
  const sortedAssets = [...assets].sort((a, b) => a.display_order - b.display_order);
  const currentAsset = sortedAssets[activeSlideIndex] || sortedAssets[0] || null;
  const currentSignedUrl = currentAsset?.file_url ? signedUrls[currentAsset.file_url] : null;

  return (
    <div className="bg-white border border-[#E8E9EA] rounded-2xl shadow-2xs overflow-hidden transition-all duration-150">
      {/* Top action bar: Order, Position, Controls */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#FAFAFA] border-b border-[#E8E9EA]">
        {/* Left: Sequence badge and title */}
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#1D1D1D] text-white font-bold text-xs shadow-2xs">
            #{index + 1}
          </span>
          <span className="text-xs font-bold text-[#1D1D1D] truncate max-w-sm sm:max-w-md font-display">
            {content.internal_title}
          </span>
        </div>

        {/* Right: Reorder and Remove actions */}
        <div className="flex items-center gap-1.5">
          {/* Move Up */}
          <button
            type="button"
            onClick={() => onMoveUp(item.id)}
            disabled={index === 0}
            title="Subir posição"
            className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#E8E9EA] rounded-lg transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          {/* Move Down */}
          <button
            type="button"
            onClick={() => onMoveDown(item.id)}
            disabled={index === totalItems - 1}
            title="Descer posição"
            className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#E8E9EA] rounded-lg transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-[#E8E9EA] mx-1" />

          {/* Remove item from presentation */}
          {confirmRemove ? (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-100">
              <span className="text-[11px] text-red-600 font-medium">Remover?</span>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-md hover:bg-red-700 cursor-pointer"
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemove(false)}
                className="px-2 py-0.5 bg-[#E8E9EA] text-[#555557] text-[10px] font-bold rounded-md hover:bg-[#D1D2D4] cursor-pointer"
              >
                Não
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              title="Remover da apresentação (não exclui o conteúdo original)"
              className="p-1.5 text-[#9E9EA0] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Visual Piece Preview + Editorial Details */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Asset Preview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          <div className="flex items-center justify-between text-xs text-[#666668]">
            <span className="font-bold text-[#1D1D1D] flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#F15A3C]" />
              <span>Peça Visual Atual</span>
            </span>
            {assets.length > 0 && (
              <span className="text-[11px] text-[#9E9EA0]">
                {assets.length} {assets.length === 1 ? 'arquivo' : 'arquivos'}
              </span>
            )}
          </div>

          {/* Asset Display Frame */}
          <div className="bg-[#FAFAFA] border border-[#E8E9EA] rounded-2xl overflow-hidden flex flex-col items-center justify-center min-h-[260px] relative">
            {assets.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#F2F3F3] text-[#9E9EA0] flex items-center justify-center mx-auto">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-[#666668]">
                  Nenhum asset visual enviado
                </p>
                <p className="text-[11px] text-[#9E9EA0]">
                  Faça o upload do criativo na área de Conteúdos para visualizá-lo aqui.
                </p>
              </div>
            ) : currentAsset?.asset_type === 'video' || currentAsset?.mime_type?.startsWith('video/') ? (
              /* Video asset */
              <div className="w-full flex flex-col items-center justify-center p-3">
                {currentSignedUrl ? (
                  <video
                    src={currentSignedUrl}
                    controls
                    className="max-h-[360px] w-auto max-w-full rounded-xl shadow-xs"
                  />
                ) : (
                  <div className="p-6 text-center space-y-2">
                    <Film className="w-8 h-8 text-[#F15A3C] mx-auto animate-pulse" />
                    <p className="text-xs font-semibold text-[#1D1D1D]">Vídeo MP4</p>
                    <span className="text-[10px] text-[#9E9EA0]">{currentAsset.file_name}</span>
                  </div>
                )}
              </div>
            ) : (
              /* Image asset */
              <div className="w-full flex flex-col items-center justify-center p-2 relative group">
                {currentSignedUrl ? (
                  <img
                    src={currentSignedUrl}
                    alt={currentAsset?.file_name || 'Asset'}
                    className="max-h-[360px] w-auto max-w-full rounded-xl object-contain shadow-xs bg-white"
                  />
                ) : (
                  <div className="p-6 text-center space-y-1">
                    <Loader2 className="w-6 h-6 animate-spin text-[#F15A3C] mx-auto" />
                    <p className="text-[11px] text-[#9E9EA0]">Carregando visualização...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Carousel Thumbnail strip if multiple slides */}
          {sortedAssets.length > 1 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-[#9E9EA0] uppercase tracking-wider">
                Lâminas do Carrossel ({sortedAssets.length})
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {sortedAssets.map((asset, sIdx) => {
                  const sUrl = asset.file_url ? signedUrls[asset.file_url] : null;
                  const isActive = sIdx === activeSlideIndex;

                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => setActiveSlideIndex(sIdx)}
                      className={`relative shrink-0 w-12 h-12 rounded-lg border overflow-hidden transition-all cursor-pointer ${
                        isActive
                          ? 'border-[#F15A3C] ring-2 ring-[#F15A3C]/20 scale-105'
                          : 'border-[#E8E9EA] opacity-70 hover:opacity-100'
                      }`}
                    >
                      {sUrl ? (
                        <img
                          src={sUrl}
                          alt={`Slide ${sIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#F2F3F3] flex items-center justify-center text-[10px] font-bold text-[#666668]">
                          #{sIdx + 1}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 px-1 text-[8px] font-bold bg-black/60 text-white rounded-tl">
                        {sIdx + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Content Data, Copy, Notes, Approval (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <ContentFormatBadge format={content.format} size="sm" />
            <ContentStatusBadge status={content.editorial_status} size="sm" />
            
            <div className="flex items-center gap-1 text-[11px] font-medium text-[#666668] bg-[#F2F3F3] px-2.5 py-1 rounded-full border border-[#E8E9EA]">
              <Calendar className="w-3 h-3 text-[#9E9EA0]" />
              <span>Planejado: {formatDate(content.planned_date)}</span>
            </div>

            {content.primary_channel && (
              <span className="text-[11px] text-[#555557] bg-[#FAFAFA] px-2 py-0.5 rounded-md border border-[#E8E9EA]">
                {content.primary_channel}
              </span>
            )}
          </div>

          {/* Strategy tags (Pillar, Goal, Stage) */}
          {(content.pillar || content.goal || content.funnel_stage) && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#666668] pt-1">
              {content.pillar && (
                <div className="flex items-center gap-1 bg-amber-50/70 border border-amber-200/70 text-amber-800 px-2 py-0.5 rounded-lg">
                  <span className="font-bold">Pilar:</span>
                  <span>{content.pillar}</span>
                </div>
              )}
              {content.goal && (
                <div className="flex items-center gap-1 bg-blue-50/70 border border-blue-200/70 text-blue-800 px-2 py-0.5 rounded-lg">
                  <span className="font-bold">Objetivo:</span>
                  <span>{content.goal}</span>
                </div>
              )}
            </div>
          )}

          {/* Caption / Copy Section */}
          <div className="bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1D1D1D] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#F15A3C]" />
                <span>Legenda / Copy do Post</span>
              </span>
              <button
                type="button"
                onClick={handleCopyCaption}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#666668] hover:text-[#1D1D1D] transition-colors cursor-pointer"
                title="Copiar texto para área de transferência"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            {content.caption || content.copy ? (
              <div className="space-y-1.5">
                <p
                  className={`text-xs text-[#1D1D1D] leading-relaxed whitespace-pre-wrap ${
                    !showFullCaption ? 'line-clamp-4' : ''
                  }`}
                >
                  {content.caption || content.copy}
                </p>
                {(content.caption || content.copy || '').length > 200 && (
                  <button
                    type="button"
                    onClick={() => setShowFullCaption(!showFullCaption)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F15A3C] hover:underline cursor-pointer"
                  >
                    {showFullCaption ? (
                      <>
                        <span>Ver menos</span>
                        <ChevronUp className="w-3 h-3" />
                      </>
                    ) : (
                      <>
                        <span>Ver legenda completa</span>
                        <ChevronDown className="w-3 h-3" />
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-[#9E9EA0] italic">
                Nenhuma legenda ou copy cadastrada para este conteúdo.
              </p>
            )}
          </div>

          {/* Presentation Notes (Round-specific contextual notes) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1D1D1D] flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#F15A3C]" />
                <span>Observações da Rodada de Apresentação</span>
              </label>
              <span className="text-[10px] text-[#9E9EA0]">
                Específico desta apresentação (não altera o conteúdo original)
              </span>
            </div>

            <div className="relative">
              <textarea
                rows={2}
                value={notes}
                onChange={handleNotesChange}
                onBlur={handleSaveNotes}
                placeholder="Insira orientações específicas para o cliente nesta rodada..."
                className="w-full px-3 py-2 text-xs bg-white border border-[#E8E9EA] rounded-xl text-[#1D1D1D] placeholder-[#9E9EA0] focus:outline-hidden focus:border-[#F15A3C] transition-all resize-none shadow-2xs"
              />
              {hasNotesChanged && (
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="absolute right-2.5 bottom-2.5 inline-flex items-center gap-1 px-2.5 py-1 bg-[#1D1D1D] text-white text-[11px] font-semibold rounded-lg hover:bg-black transition-all cursor-pointer shadow-2xs"
                >
                  {isSavingNotes ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                  <span>Salvar nota</span>
                </button>
              )}
            </div>
          </div>

          {/* Client Approval Status & Review Feedback */}
          <div className="pt-2 border-t border-[#F2F3F3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#666668] block">
                Status de Aprovação do Cliente
              </span>
              <div className="flex items-center gap-2">
                <PresentationItemApprovalBadge status={item.client_approval_status} />
                
                {/* Admin Status Quick Select */}
                <select
                  value={item.client_approval_status || 'pending'}
                  onChange={(e) => onUpdateStatus(item.id, e.target.value)}
                  className="text-[11px] px-2 py-1 bg-[#FAFAFA] border border-[#E8E9EA] rounded-lg text-[#1D1D1D] cursor-pointer"
                >
                  {Object.entries(ITEM_APPROVAL_STATUS_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {item.reviewed_at && (
              <div className="text-[11px] text-[#9E9EA0] flex items-center gap-1 self-start sm:self-auto">
                <Clock className="w-3 h-3" />
                <span>Revisado em {formatDate(item.reviewed_at)}</span>
              </div>
            )}
          </div>

          {/* Client Feedback box if present */}
          {item.client_feedback && (
            <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                <span>Feedback do Cliente:</span>
              </span>
              <p className="text-xs text-amber-800 leading-relaxed">
                {item.client_feedback}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
