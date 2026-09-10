import React from 'react';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  Image as ImageIcon,
  ShieldCheck,
} from 'lucide-react';
import { ContentFormat } from '../../../types/contents';
import { useContentAssets } from '../../../hooks/useContentAssets';
import { FeedSingleAssetView } from './FeedSingleAssetView';
import { CarouselAssetView } from './CarouselAssetView';
import { ReelsAssetView } from './ReelsAssetView';
import { StoryAssetView } from './StoryAssetView';

interface ContentAssetsSectionProps {
  clientId?: string;
  contentId?: string;
  format: ContentFormat;
}

export const ContentAssetsSection: React.FC<ContentAssetsSectionProps> = ({
  clientId,
  contentId,
  format,
}) => {
  const {
    assets,
    currentAssets,
    historyAssets,
    signedUrls,
    loading,
    uploading,
    actionLoadingId,
    error,
    uploadError,
    setUploadError,
    refreshAssets,
    uploadAsset,
    replaceAsset,
    reorderSlides,
    removeSlide,
    downloadAsset,
  } = useContentAssets(clientId, contentId);

  // Handlers for specific formats
  const handleUploadImage = async (file: File) => {
    return uploadAsset(file, 'image');
  };

  const handleUploadVideo = async (file: File) => {
    return uploadAsset(file, 'video');
  };

  const handleUploadThumbnail = async (file: File) => {
    return uploadAsset(file, 'thumbnail');
  };

  const handleReplaceAsset = async (targetAssetId: string, file: File) => {
    return replaceAsset(targetAssetId, file);
  };

  const currentSingleImage = currentAssets.find(
    (a) => a.asset_type === 'image' || a.asset_type === 'thumbnail'
  );
  const singleImageHistory = historyAssets.filter(
    (a) => a.asset_type === 'image' || a.asset_type === 'thumbnail'
  );

  const currentStoryAsset = currentAssets[0]; // First current asset (image or video)

  return (
    <div className="space-y-6">
      {/* Top Banner / Privacy notice & Refresh */}
      <div className="flex items-center justify-between gap-3 p-3.5 bg-[#FAFAFA] border border-[#E8E9EA] rounded-2xl flex-wrap">
        <div className="flex items-center gap-2 text-xs text-[#666668]">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Storage Seguro: assets protegidos em bucket privado com signed URLs sob demanda.
          </span>
        </div>

        <button
          type="button"
          onClick={() => refreshAssets()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#666668] bg-white border border-[#E8E9EA] rounded-xl hover:bg-[#F2F3F3] hover:text-[#1D1D1D] transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
          title="Recarregar assets"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#F15A3C]' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Main Global Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-bold">Erro ao carregar ou processar assets</p>
            <p>{error}</p>
          </div>
          <button
            type="button"
            onClick={() => refreshAssets()}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-semibold transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Format-specific View */}
      {loading && assets.length === 0 ? (
        <div className="p-12 text-center bg-[#F7F7F8] rounded-2xl border border-[#E8E9EA] space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#F15A3C] mx-auto" />
          <p className="text-xs font-semibold text-[#666668]">
            Carregando galeria e gerando assinaturas de segurança...
          </p>
        </div>
      ) : (
        <>
          {format === 'feed_single' && (
            <FeedSingleAssetView
              currentAsset={currentSingleImage}
              historyAssets={singleImageHistory}
              signedUrls={signedUrls}
              uploading={uploading}
              actionLoadingId={actionLoadingId}
              onUpload={handleUploadImage}
              onReplace={handleReplaceAsset}
              onDownload={downloadAsset}
              uploadError={uploadError}
              onClearUploadError={() => setUploadError(null)}
            />
          )}

          {format === 'carousel' && (
            <CarouselAssetView
              currentAssets={currentAssets}
              allAssets={assets}
              signedUrls={signedUrls}
              uploading={uploading}
              actionLoadingId={actionLoadingId}
              onUploadSlide={handleUploadImage}
              onReplaceSlide={handleReplaceAsset}
              onReorderSlides={reorderSlides}
              onRemoveSlide={removeSlide}
              onDownload={downloadAsset}
              uploadError={uploadError}
              onClearUploadError={() => setUploadError(null)}
            />
          )}

          {format === 'reels' && (
            <ReelsAssetView
              currentAssets={currentAssets}
              allAssets={assets}
              signedUrls={signedUrls}
              uploading={uploading}
              actionLoadingId={actionLoadingId}
              onUploadVideo={handleUploadVideo}
              onUploadThumbnail={handleUploadThumbnail}
              onReplaceAsset={handleReplaceAsset}
              onRemoveThumbnail={removeSlide}
              onDownload={downloadAsset}
              uploadError={uploadError}
              onClearUploadError={() => setUploadError(null)}
            />
          )}

          {format === 'story' && (
            <StoryAssetView
              currentAsset={currentStoryAsset}
              historyAssets={historyAssets}
              signedUrls={signedUrls}
              uploading={uploading}
              actionLoadingId={actionLoadingId}
              onUploadImage={handleUploadImage}
              onUploadVideo={handleUploadVideo}
              onReplaceAsset={handleReplaceAsset}
              onDownload={downloadAsset}
              uploadError={uploadError}
              onClearUploadError={() => setUploadError(null)}
            />
          )}
        </>
      )}
    </div>
  );
};
