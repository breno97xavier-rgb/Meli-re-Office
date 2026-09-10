import React, { useRef, useState } from 'react';
import {
  Upload,
  Film,
  Image as ImageIcon,
  RefreshCw,
  Download,
  Eye,
  History,
  Trash2,
  Loader2,
  AlertCircle,
  Video,
} from 'lucide-react';
import { ContentAsset } from '../../../types/contentAssets';
import { formatBytes } from '../../../services/contentAssetsService';
import { AssetVersionHistoryModal } from './AssetVersionHistoryModal';

interface ReelsAssetViewProps {
  currentAssets: ContentAsset[];
  allAssets: ContentAsset[];
  signedUrls: Record<string, string>;
  uploading: boolean;
  actionLoadingId: string | null;
  onUploadVideo: (file: File) => Promise<unknown>;
  onUploadThumbnail: (file: File) => Promise<unknown>;
  onReplaceAsset: (targetAssetId: string, file: File) => Promise<unknown>;
  onRemoveThumbnail: (assetId: string) => Promise<boolean>;
  onDownload: (asset: ContentAsset) => Promise<void>;
  uploadError: string | null;
  onClearUploadError: () => void;
}

export const ReelsAssetView: React.FC<ReelsAssetViewProps> = ({
  currentAssets,
  allAssets,
  signedUrls,
  uploading,
  actionLoadingId,
  onUploadVideo,
  onUploadThumbnail,
  onReplaceAsset,
  onRemoveThumbnail,
  onDownload,
  uploadError,
  onClearUploadError,
}) => {
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoReplaceRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const thumbReplaceRef = useRef<HTMLInputElement>(null);

  const [historyTarget, setHistoryTarget] = useState<'video' | 'thumbnail' | null>(null);
  const [isVideoDragOver, setIsVideoDragOver] = useState(false);
  const [isThumbDragOver, setIsThumbDragOver] = useState(false);

  const currentVideo = currentAssets.find((a) => a.asset_type === 'video');
  const currentThumb = currentAssets.find((a) => a.asset_type === 'thumbnail');

  const videoHistory = allAssets.filter((a) => !a.is_current && a.asset_type === 'video');
  const thumbHistory = allAssets.filter((a) => !a.is_current && a.asset_type === 'thumbnail');

  const videoSignedUrl = currentVideo ? signedUrls[currentVideo.file_url] : undefined;
  const thumbSignedUrl = currentThumb ? signedUrls[currentThumb.file_url] : undefined;

  const isVideoActing = currentVideo ? actionLoadingId === currentVideo.id : false;
  const isThumbActing = currentThumb ? actionLoadingId === currentThumb.id : false;

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onClearUploadError();
      onUploadVideo(file);
    }
    e.target.value = '';
  };

  const handleVideoReplace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentVideo) {
      onClearUploadError();
      onReplaceAsset(currentVideo.id, file);
    }
    e.target.value = '';
  };

  const handleThumbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onClearUploadError();
      onUploadThumbnail(file);
    }
    e.target.value = '';
  };

  const handleThumbReplace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentThumb) {
      onClearUploadError();
      onReplaceAsset(currentThumb.id, file);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={videoInputRef}
        onChange={handleVideoUpload}
        accept="video/mp4"
        className="hidden"
      />
      <input
        type="file"
        ref={videoReplaceRef}
        onChange={handleVideoReplace}
        accept="video/mp4"
        className="hidden"
      />
      <input
        type="file"
        ref={thumbInputRef}
        onChange={handleThumbUpload}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />
      <input
        type="file"
        ref={thumbReplaceRef}
        onChange={handleThumbReplace}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Erro no arquivo: </span>
            <span>{uploadError}</span>
          </div>
        </div>
      )}

      {/* 1. Main Video Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-[#F15A3C]" />
            <h4 className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider">
              Vídeo Principal (Reel)
            </h4>
          </div>

          {currentVideo && videoHistory.length > 0 && (
            <button
              type="button"
              onClick={() => setHistoryTarget('video')}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#666668] bg-white border border-[#E8E9EA] rounded-lg hover:bg-[#F2F3F3] hover:text-[#1D1D1D] transition-colors cursor-pointer shadow-2xs"
            >
              <History className="w-3.5 h-3.5 text-[#9E9EA0]" />
              <span>Histórico ({videoHistory.length})</span>
            </button>
          )}
        </div>

        {currentVideo ? (
          <div className="bg-[#F7F7F8] border border-[#E8E9EA] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#1D1D1D] text-white">
                  v{currentVideo.version}
                </span>
                <span className="text-xs font-bold text-[#1D1D1D] truncate max-w-xs" title={currentVideo.file_name}>
                  {currentVideo.file_name}
                </span>
                <span className="text-[11px] text-[#666668]">
                  ({formatBytes(currentVideo.file_size_bytes)})
                </span>
              </div>
            </div>

            {/* Video Player Box */}
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[420px] mx-auto flex items-center justify-center border border-[#333] shadow-md">
              {videoSignedUrl ? (
                <video
                  src={videoSignedUrl}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                  poster={thumbSignedUrl}
                >
                  Seu navegador não suporta reprodução de vídeos HTML5.
                </video>
              ) : (
                <div className="flex flex-col items-center gap-2 text-white/70">
                  <Loader2 className="w-6 h-6 animate-spin text-[#F15A3C]" />
                  <span className="text-xs font-medium">Carregando streaming seguro...</span>
                </div>
              )}
            </div>

            {/* Video Action Toolbar */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#E8E9EA] flex-wrap">
              <button
                type="button"
                onClick={() => videoReplaceRef.current?.click()}
                disabled={uploading || isVideoActing}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-xl hover:bg-[#F2F3F3] hover:border-[#D1D2D4] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {isVideoActing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F15A3C]" />
                    <span>Substituindo...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-[#F15A3C]" />
                    <span>Substituir Vídeo (Nova Versão)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onDownload(currentVideo)}
                disabled={isVideoActing}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1D1D1D] hover:bg-black rounded-xl transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {isVideoActing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Baixar Vídeo</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsVideoDragOver(true);
            }}
            onDragLeave={() => setIsVideoDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsVideoDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) {
                onClearUploadError();
                onUploadVideo(file);
              }
            }}
            onClick={() => videoInputRef.current?.click()}
            className={`p-10 border-2 border-dashed rounded-2xl text-center space-y-3 transition-all cursor-pointer ${
              isVideoDragOver
                ? 'border-[#F15A3C] bg-[#F15A3C]/5 scale-[0.99]'
                : 'border-[#D1D2D4] hover:border-[#1D1D1D] bg-[#F7F7F8] hover:bg-white'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-white border border-[#E8E9EA] shadow-xs flex items-center justify-center mx-auto text-[#F15A3C]">
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Video className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-bold text-[#1D1D1D]">
                {uploading ? 'Enviando vídeo...' : 'Clique ou arraste o vídeo do Reel (MP4)'}
              </p>
              <p className="text-xs text-[#666668]">
                Formato aceito: MP4 (máx. 50 MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Optional Thumbnail Section */}
      <div className="space-y-3 pt-4 border-t border-[#E8E9EA]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#666668]" />
            <h4 className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider">
              Thumbnail / Imagem de Capa (Opcional)
            </h4>
          </div>

          {currentThumb && thumbHistory.length > 0 && (
            <button
              type="button"
              onClick={() => setHistoryTarget('thumbnail')}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#666668] bg-white border border-[#E8E9EA] rounded-lg hover:bg-[#F2F3F3] hover:text-[#1D1D1D] transition-colors cursor-pointer shadow-2xs"
            >
              <History className="w-3.5 h-3.5 text-[#9E9EA0]" />
              <span>Histórico ({thumbHistory.length})</span>
            </button>
          )}
        </div>

        {currentThumb ? (
          <div className="bg-[#F7F7F8] border border-[#E8E9EA] rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-[#E8E9EA] border border-[#D1D2D4] shrink-0 flex items-center justify-center group shadow-xs">
                {thumbSignedUrl ? (
                  <img
                    src={thumbSignedUrl}
                    alt="Thumbnail do Reel"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin text-[#F15A3C]" />
                )}
                {thumbSignedUrl && (
                  <a
                    href={thumbSignedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                    title="Ver thumbnail original"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#1D1D1D] text-white">
                    v{currentThumb.version}
                  </span>
                  <span className="text-xs font-semibold text-[#1D1D1D] truncate max-w-xs" title={currentThumb.file_name}>
                    {currentThumb.file_name}
                  </span>
                </div>
                <p className="text-[11px] text-[#666668]">
                  {formatBytes(currentThumb.file_size_bytes)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => thumbReplaceRef.current?.click()}
                disabled={isThumbActing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg hover:bg-[#F2F3F3] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {isThumbActing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F15A3C]" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-[#F15A3C]" />
                )}
                <span>Substituir</span>
              </button>

              <button
                type="button"
                onClick={() => onDownload(currentThumb)}
                disabled={isThumbActing}
                className="p-2 text-[#666668] hover:text-[#1D1D1D] hover:bg-white rounded-lg transition-colors cursor-pointer border border-[#E8E9EA]"
                title="Baixar thumbnail"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onRemoveThumbnail(currentThumb.id)}
                disabled={isThumbActing}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-red-200"
                title="Remover thumbnail"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsThumbDragOver(true);
            }}
            onDragLeave={() => setIsThumbDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsThumbDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) {
                onClearUploadError();
                onUploadThumbnail(file);
              }
            }}
            onClick={() => thumbInputRef.current?.click()}
            className={`p-5 border border-dashed rounded-xl text-center space-y-2 transition-all cursor-pointer ${
              isThumbDragOver
                ? 'border-[#F15A3C] bg-[#F15A3C]/5'
                : 'border-[#D1D2D4] hover:border-[#1D1D1D] bg-[#F7F7F8] hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#1D1D1D]">
              <Upload className="w-4 h-4 text-[#F15A3C]" />
              <span>Adicionar Imagem de Capa / Thumbnail (JPG, PNG ou WebP)</span>
            </div>
            <p className="text-[11px] text-[#666668]">
              Opcional. Se não enviada, o player usará o próprio vídeo como referência.
            </p>
          </div>
        )}
      </div>

      {/* Version History Modal */}
      {historyTarget && (
        <AssetVersionHistoryModal
          isOpen={Boolean(historyTarget)}
          onClose={() => setHistoryTarget(null)}
          title={`Reel — ${historyTarget === 'video' ? 'Vídeo Principal' : 'Thumbnail'}`}
          historyAssets={historyTarget === 'video' ? videoHistory : thumbHistory}
          signedUrls={signedUrls}
          onDownload={onDownload}
          actionLoadingId={actionLoadingId}
        />
      )}
    </div>
  );
};
