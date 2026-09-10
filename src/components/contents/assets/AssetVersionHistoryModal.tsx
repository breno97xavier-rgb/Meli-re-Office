import React from 'react';
import {
  X,
  History,
  Download,
  Eye,
  FileImage,
  Film,
  Calendar,
  Clock,
  Loader2,
} from 'lucide-react';
import { ContentAsset } from '../../../types/contentAssets';
import { formatBytes } from '../../../services/contentAssetsService';

interface AssetVersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  historyAssets: ContentAsset[];
  signedUrls: Record<string, string>;
  onDownload: (asset: ContentAsset) => Promise<void>;
  actionLoadingId: string | null;
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr || '—';
  }
}

export const AssetVersionHistoryModal: React.FC<AssetVersionHistoryModalProps> = ({
  isOpen,
  onClose,
  title,
  historyAssets,
  signedUrls,
  onDownload,
  actionLoadingId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-[#E8E9EA] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8E9EA] bg-[#FAFAFA] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[#1D1D1D]">
            <History className="w-5 h-5 text-[#F15A3C]" />
            <div>
              <h3 className="text-sm font-bold text-[#1D1D1D]">
                Histórico de Versões
              </h3>
              <p className="text-xs text-[#666668]">{title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#666668] hover:text-[#1D1D1D] rounded-lg hover:bg-[#F2F3F3] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {historyAssets.length === 0 ? (
            <div className="p-8 text-center bg-[#F7F7F8] rounded-xl border border-dashed border-[#D1D2D4] space-y-2">
              <History className="w-8 h-8 text-[#9E9EA0] mx-auto" />
              <p className="text-xs font-semibold text-[#1D1D1D]">
                Nenhuma versão anterior registrada
              </p>
              <p className="text-[11px] text-[#666668]">
                Quando você substituir um arquivo, as versões anteriores aparecerão aqui.
              </p>
            </div>
          ) : (
            historyAssets.map((asset) => {
              const url = signedUrls[asset.file_url];
              const isVideo = asset.mime_type?.startsWith('video/') || asset.asset_type === 'video';
              const isDownloading = actionLoadingId === asset.id;

              return (
                <div
                  key={asset.id}
                  className="p-4 bg-[#F7F7F8] border border-[#E8E9EA] rounded-xl flex items-start gap-4 transition-all hover:bg-white hover:shadow-xs"
                >
                  {/* Thumbnail / Icon */}
                  <div className="w-16 h-16 rounded-lg bg-[#E8E9EA] flex items-center justify-center overflow-hidden shrink-0 border border-[#D1D2D4]">
                    {url ? (
                      isVideo ? (
                        <video
                          src={url}
                          className="w-full h-full object-cover"
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={url}
                          alt={asset.file_name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      )
                    ) : isVideo ? (
                      <Film className="w-6 h-6 text-[#666668]" />
                    ) : (
                      <FileImage className="w-6 h-6 text-[#666668]" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#1D1D1D] text-white">
                        v{asset.version}
                      </span>
                      {asset.display_order !== undefined && asset.display_order > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#E8E9EA] text-[#666668]">
                          Slide {asset.display_order + 1}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-[#1D1D1D] truncate max-w-[200px]" title={asset.file_name}>
                        {asset.file_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-[#666668] flex-wrap">
                      <span>{formatBytes(asset.file_size_bytes)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#9E9EA0]" />
                        <span>{formatDateTime(asset.created_at)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 self-center">
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-[#666668] hover:text-[#1D1D1D] hover:bg-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-[#E8E9EA]"
                        title="Visualizar em nova aba"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onDownload(asset)}
                      disabled={isDownloading}
                      className="p-2 text-[#666668] hover:text-[#1D1D1D] hover:bg-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-[#E8E9EA] disabled:opacity-50"
                      title="Baixar esta versão"
                    >
                      {isDownloading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#F15A3C]" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#E8E9EA] bg-[#FAFAFA] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg hover:bg-[#F2F3F3] transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
