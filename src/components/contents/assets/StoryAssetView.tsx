import React, { useRef, useState } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Film,
  RefreshCw,
  Download,
  Eye,
  History,
  Loader2,
  AlertCircle,
  Smartphone,
} from 'lucide-react';
import { ContentAsset } from '../../../types/contentAssets';
import { formatBytes } from '../../../services/contentAssetsService';
import { AssetVersionHistoryModal } from './AssetVersionHistoryModal';

interface StoryAssetViewProps {
  currentAsset?: ContentAsset;
  historyAssets: ContentAsset[];
  signedUrls: Record<string, string>;
  uploading: boolean;
  actionLoadingId: string | null;
  onUploadImage: (file: File) => Promise<unknown>;
  onUploadVideo: (file: File) => Promise<unknown>;
  onReplaceAsset: (targetAssetId: string, file: File) => Promise<unknown>;
  onDownload: (asset: ContentAsset) => Promise<void>;
  uploadError: string | null;
  onClearUploadError: () => void;
}

export const StoryAssetView: React.FC<StoryAssetViewProps> = ({
  currentAsset,
  historyAssets,
  signedUrls,
  uploading,
  actionLoadingId,
  onUploadImage,
  onUploadVideo,
  onReplaceAsset,
  onDownload,
  uploadError,
  onClearUploadError,
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const previewUrl = currentAsset ? signedUrls[currentAsset.file_url] : undefined;
  const isVideo = currentAsset
    ? currentAsset.asset_type === 'video' || currentAsset.mime_type?.startsWith('video/')
    : false;
  const isActing = currentAsset ? actionLoadingId === currentAsset.id : false;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onClearUploadError();
      onUploadImage(file);
    }
    e.target.value = '';
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onClearUploadError();
      onUploadVideo(file);
    }
    e.target.value = '';
  };

  const handleReplaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentAsset) {
      onClearUploadError();
      onReplaceAsset(currentAsset.id, file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onClearUploadError();
      if (file.type.startsWith('video/')) {
        if (currentAsset) {
          onReplaceAsset(currentAsset.id, file);
        } else {
          onUploadVideo(file);
        }
      } else {
        if (currentAsset) {
          onReplaceAsset(currentAsset.id, file);
        } else {
          onUploadImage(file);
        }
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImageUpload}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />
      <input
        type="file"
        ref={videoInputRef}
        onChange={handleVideoUpload}
        accept="video/mp4"
        className="hidden"
      />
      <input
        type="file"
        ref={replaceInputRef}
        onChange={handleReplaceUpload}
        accept="image/jpeg,image/png,image/webp,video/mp4"
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

      {/* Main Asset View */}
      {currentAsset ? (
        <div className="bg-[#F7F7F8] border border-[#E8E9EA] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#1D1D1D] text-white">
                v{currentAsset.version}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#E8E9EA] text-[#1D1D1D]">
                {isVideo ? 'Vídeo (9:16)' : 'Imagem (9:16)'}
              </span>
              <span className="text-xs font-bold text-[#1D1D1D] truncate max-w-xs" title={currentAsset.file_name}>
                {currentAsset.file_name}
              </span>
              <span className="text-[11px] text-[#666668]">
                ({formatBytes(currentAsset.file_size_bytes)})
              </span>
            </div>

            <div className="flex items-center gap-2">
              {historyAssets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#666668] bg-white border border-[#E8E9EA] rounded-lg hover:bg-[#F2F3F3] hover:text-[#1D1D1D] transition-colors cursor-pointer shadow-2xs"
                >
                  <History className="w-3.5 h-3.5 text-[#9E9EA0]" />
                  <span>Histórico ({historyAssets.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Vertical 9:16 Preview Container */}
          <div className="relative rounded-2xl overflow-hidden bg-black/90 aspect-[9/16] max-h-[460px] mx-auto flex items-center justify-center border border-[#D1D2D4] shadow-md group">
            {previewUrl ? (
              isVideo ? (
                <video
                  src={previewUrl}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                >
                  Seu navegador não suporta vídeos HTML5.
                </video>
              ) : (
                <img
                  src={previewUrl}
                  alt={currentAsset.file_name}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              )
            ) : (
              <div className="flex flex-col items-center gap-2 text-white/70">
                <Loader2 className="w-6 h-6 animate-spin text-[#F15A3C]" />
                <span className="text-xs font-medium">Carregando visualização...</span>
              </div>
            )}

            {/* Hover Actions for Images */}
            {!isVideo && previewUrl && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 bg-white/90 hover:bg-white text-[#1D1D1D] rounded-xl shadow-lg transition-transform hover:scale-105"
                  title="Abrir original"
                >
                  <Eye className="w-5 h-5" />
                </a>
                <button
                  type="button"
                  onClick={() => onDownload(currentAsset)}
                  disabled={isActing}
                  className="p-2.5 bg-white/90 hover:bg-white text-[#1D1D1D] rounded-xl shadow-lg transition-transform hover:scale-105"
                  title="Baixar arquivo"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Story Toolbar */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#E8E9EA] flex-wrap">
            <button
              type="button"
              onClick={() => replaceInputRef.current?.click()}
              disabled={uploading || isActing}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-xl hover:bg-[#F2F3F3] hover:border-[#D1D2D4] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isActing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F15A3C]" />
                  <span>Substituindo...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-[#F15A3C]" />
                  <span>Substituir Peça (Nova Versão)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onDownload(currentAsset)}
              disabled={isActing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1D1D1D] hover:bg-black rounded-xl transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isActing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Baixar Arquivo</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`p-8 border-2 border-dashed rounded-2xl text-center space-y-4 transition-all ${
            isDragOver
              ? 'border-[#F15A3C] bg-[#F15A3C]/5 scale-[0.99]'
              : 'border-[#D1D2D4] bg-[#F7F7F8]'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-white border border-[#E8E9EA] shadow-xs flex items-center justify-center mx-auto text-[#F15A3C]">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Smartphone className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-bold text-[#1D1D1D]">
              {uploading ? 'Enviando asset do Story...' : 'Enviar Peça Vertical do Story (9:16)'}
            </p>
            <p className="text-xs text-[#666668]">
              Você pode enviar uma imagem estática (JPG, PNG, WebP) ou um vídeo (MP4) até 50 MB
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-xl hover:bg-[#F2F3F3] hover:border-[#D1D2D4] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <ImageIcon className="w-4 h-4 text-[#F15A3C]" />
              <span>Enviar Imagem (JPG/PNG/WebP)</span>
            </button>

            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1D1D1D] hover:bg-black rounded-xl transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <Film className="w-4 h-4 text-[#F15A3C]" />
              <span>Enviar Vídeo (MP4)</span>
            </button>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      <AssetVersionHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title="Story Vertical"
        historyAssets={historyAssets}
        signedUrls={signedUrls}
        onDownload={onDownload}
        actionLoadingId={actionLoadingId}
      />
    </div>
  );
};
