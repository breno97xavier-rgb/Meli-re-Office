import React, { useRef, useState } from 'react';
import {
  Upload,
  Plus,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Trash2,
  Download,
  Eye,
  History,
  Loader2,
  AlertCircle,
  FileImage,
  Layers,
} from 'lucide-react';
import { ContentAsset } from '../../../types/contentAssets';
import { formatBytes } from '../../../services/contentAssetsService';
import { AssetVersionHistoryModal } from './AssetVersionHistoryModal';

interface CarouselAssetViewProps {
  currentAssets: ContentAsset[]; // All current assets of type 'image', sorted by display_order
  allAssets: ContentAsset[]; // Includes non-current ones for history
  signedUrls: Record<string, string>;
  uploading: boolean;
  actionLoadingId: string | null;
  onUploadSlide: (file: File) => Promise<unknown>;
  onReplaceSlide: (targetAssetId: string, file: File) => Promise<unknown>;
  onReorderSlides: (orderedAssetIds: string[]) => Promise<boolean>;
  onRemoveSlide: (assetId: string) => Promise<boolean>;
  onDownload: (asset: ContentAsset) => Promise<void>;
  uploadError: string | null;
  onClearUploadError: () => void;
}

export const CarouselAssetView: React.FC<CarouselAssetViewProps> = ({
  currentAssets,
  allAssets,
  signedUrls,
  uploading,
  actionLoadingId,
  onUploadSlide,
  onReplaceSlide,
  onReorderSlides,
  onRemoveSlide,
  onDownload,
  uploadError,
  onClearUploadError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [selectedSlideForReplace, setSelectedSlideForReplace] = useState<ContentAsset | null>(null);
  const [selectedSlideForHistory, setSelectedSlideForHistory] = useState<ContentAsset | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Filter image assets only
  const currentSlides = currentAssets
    .filter((a) => a.asset_type === 'image')
    .sort((a, b) => a.display_order - b.display_order);

  const handleAddSlideChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onClearUploadError();
      onUploadSlide(file);
    }
    e.target.value = '';
  };

  const handleReplaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedSlideForReplace) {
      onClearUploadError();
      onReplaceSlide(selectedSlideForReplace.id, file);
      setSelectedSlideForReplace(null);
    }
    e.target.value = '';
  };

  const handleTriggerReplace = (slide: ContentAsset) => {
    setSelectedSlideForReplace(slide);
    onClearUploadError();
    replaceInputRef.current?.click();
  };

  const handleMoveSlide = async (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentSlides.length) return;

    const newOrder = [...currentSlides];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    const orderedIds = newOrder.map((slide) => slide.id);
    await onReorderSlides(orderedIds);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onClearUploadError();
      // Upload the first file as a new slide
      onUploadSlide(files[0]);
    }
  };

  // Get history for selected slide position or all historical slides
  const slideHistoryAssets = selectedSlideForHistory
    ? allAssets.filter(
        (a) =>
          !a.is_current &&
          a.asset_type === 'image' &&
          a.display_order === selectedSlideForHistory.display_order
      )
    : allAssets.filter((a) => !a.is_current && a.asset_type === 'image');

  return (
    <div className="space-y-5">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAddSlideChange}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />
      <input
        type="file"
        ref={replaceInputRef}
        onChange={handleReplaceChange}
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

      {/* Header bar: Count & Add Slide */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#F15A3C]" />
          <h4 className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider">
            Slides do Carrossel ({currentSlides.length})
          </h4>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1D1D1D] hover:bg-black rounded-xl transition-all cursor-pointer shadow-2xs active:scale-[0.98] disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Enviando...</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5 text-[#F15A3C]" />
              <span>Adicionar Slide</span>
            </>
          )}
        </button>
      </div>

      {/* Carousel Slides List */}
      {currentSlides.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-10 border-2 border-dashed rounded-2xl text-center space-y-3 transition-all cursor-pointer ${
            isDragOver
              ? 'border-[#F15A3C] bg-[#F15A3C]/5 scale-[0.99]'
              : 'border-[#D1D2D4] hover:border-[#1D1D1D] bg-[#F7F7F8] hover:bg-white'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-white border border-[#E8E9EA] shadow-xs flex items-center justify-center mx-auto text-[#F15A3C]">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-bold text-[#1D1D1D]">
              {uploading ? 'Enviando slide...' : 'Adicionar primeiro slide do carrossel'}
            </p>
            <p className="text-xs text-[#666668]">
              Formatos aceitos: JPG, PNG ou WebP (máx. 50 MB por slide)
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {currentSlides.map((slide, index) => {
            const previewUrl = signedUrls[slide.file_url];
            const isActing = actionLoadingId === slide.id;
            const slideHistory = allAssets.filter(
              (a) =>
                !a.is_current &&
                a.asset_type === 'image' &&
                a.display_order === slide.display_order
            );

            return (
              <div
                key={slide.id}
                className="bg-[#F7F7F8] border border-[#E8E9EA] rounded-2xl p-4 flex flex-col justify-between space-y-3 relative group hover:border-[#D1D2D4] transition-all hover:shadow-xs"
              >
                {/* Slide Top Details */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#F15A3C] text-white">
                      Slide {index + 1}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#1D1D1D] text-white">
                      v{slide.version}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Reordering Controls */}
                    <button
                      type="button"
                      onClick={() => handleMoveSlide(index, 'left')}
                      disabled={index === 0 || isActing}
                      className="p-1 text-[#666668] hover:text-[#1D1D1D] rounded-md hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Mover para esquerda/cima"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveSlide(index, 'right')}
                      disabled={index === currentSlides.length - 1 || isActing}
                      className="p-1 text-[#666668] hover:text-[#1D1D1D] rounded-md hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Mover para direita/baixo"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Preview Image */}
                <div className="relative rounded-xl overflow-hidden bg-[#E8E9EA] border border-[#D1D2D4] aspect-square flex items-center justify-center group/img">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={`Slide ${index + 1}`}
                      className="w-full h-full object-contain bg-black/5"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-[#666668]">
                      <Loader2 className="w-5 h-5 animate-spin text-[#F15A3C]" />
                      <span className="text-[10px]">Carregando...</span>
                    </div>
                  )}

                  {/* Quick actions overlay */}
                  {previewUrl && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-white/90 hover:bg-white text-[#1D1D1D] rounded-lg shadow-sm"
                        title="Visualizar original"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => onDownload(slide)}
                        disabled={isActing}
                        className="p-2 bg-white/90 hover:bg-white text-[#1D1D1D] rounded-lg shadow-sm"
                        title="Baixar imagem"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* File info */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#1D1D1D] truncate" title={slide.file_name}>
                    {slide.file_name}
                  </p>
                  <p className="text-[11px] text-[#666668]">
                    {formatBytes(slide.file_size_bytes)}
                  </p>
                </div>

                {/* Slide Toolbar */}
                <div className="pt-2 border-t border-[#E8E9EA] flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleTriggerReplace(slide)}
                      disabled={isActing}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg hover:bg-[#F2F3F3] hover:border-[#D1D2D4] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                      title="Substituir por nova versão deste slide"
                    >
                      <RefreshCw className="w-3 h-3 text-[#F15A3C]" />
                      <span>Substituir</span>
                    </button>

                    {slideHistory.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedSlideForHistory(slide)}
                        className="p-1 text-[#666668] hover:text-[#1D1D1D] hover:bg-white rounded-lg transition-colors cursor-pointer"
                        title={`Ver histórico (${slideHistory.length} versões anteriores)`}
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveSlide(slide.id)}
                    disabled={isActing}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Remover slide do carrossel"
                  >
                    {isActing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Version History Modal */}
      {selectedSlideForHistory && (
        <AssetVersionHistoryModal
          isOpen={Boolean(selectedSlideForHistory)}
          onClose={() => setSelectedSlideForHistory(null)}
          title={`Carrossel — Slide ${selectedSlideForHistory.display_order + 1}`}
          historyAssets={slideHistoryAssets}
          signedUrls={signedUrls}
          onDownload={onDownload}
          actionLoadingId={actionLoadingId}
        />
      )}
    </div>
  );
};
