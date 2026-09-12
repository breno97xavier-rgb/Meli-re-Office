import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Home,
  LogOut,
} from 'lucide-react';
import { BrandAsset } from '../../brand/BrandAsset';

interface PresentationNavigationProps {
  currentIndex: number;
  totalSlides: number; // total content slides (excluding cover)
  isCover: boolean;
  isFullscreen: boolean;
  onPrev: () => void;
  onNext: () => void;
  onGoToCover: () => void;
  onToggleFullscreen: () => void;
  onExit?: () => void;
  mode?: 'internal' | 'public';
}

export const PresentationNavigation: React.FC<PresentationNavigationProps> = ({
  currentIndex,
  totalSlides,
  isCover,
  isFullscreen,
  onPrev,
  onNext,
  onGoToCover,
  onToggleFullscreen,
  onExit,
  mode = 'internal',
}) => {
  return (
    <>
      {/* Top Floating Bar: Minimal Exit & Fullscreen */}
      <header className="fixed top-4 inset-x-4 z-40 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {!isCover && (
            <button
              type="button"
              onClick={onGoToCover}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-[#1D1D1D] text-xs font-semibold border border-[#E8E9EA] shadow-md backdrop-blur-md transition-all cursor-pointer hover:border-[#F15A3C]/40"
              title="Voltar para a capa"
            >
              <Home className="w-3.5 h-3.5 text-[#F15A3C]" />
              <span className="hidden sm:inline">Capa</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {mode === 'public' && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 border border-[#E8E9EA] shadow-md backdrop-blur-md">
              <BrandAsset type="symbol-light-a" className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold text-[#1D1D1D] tracking-wider uppercase">
                Melière
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={onToggleFullscreen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-[#1D1D1D] text-xs font-semibold border border-[#E8E9EA] shadow-md backdrop-blur-md transition-all cursor-pointer"
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-[#666668]" />
                <span className="hidden sm:inline">Minimizar</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-[#666668]" />
                <span className="hidden sm:inline">Tela cheia</span>
              </>
            )}
          </button>

          {mode === 'internal' && onExit && (
            <button
              type="button"
              onClick={onExit}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1D1D1D] hover:bg-[#333333] text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
              title="Sair do modo de apresentação e voltar ao editor"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair da apresentação</span>
            </button>
          )}
        </div>
      </header>

      {/* Bottom Floating Bar: Slide Counter & Nav arrows */}
      <footer className="fixed bottom-5 inset-x-0 z-40 flex justify-center pointer-events-none px-4">
        <div className="flex items-center gap-3 p-1.5 bg-white/95 border border-[#E8E9EA] shadow-2xl rounded-2xl backdrop-blur-md pointer-events-auto transition-all">
          <button
            type="button"
            onClick={onPrev}
            disabled={isCover}
            aria-label="Slide anterior"
            className="p-2 rounded-xl text-[#1D1D1D] hover:bg-[#F2F3F3] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Slide Indicator */}
          <div className="px-3 py-1 bg-[#F7F7F8] border border-[#E8E9EA] rounded-xl text-xs font-bold text-[#1D1D1D] flex items-center gap-2 select-none min-w-[90px] justify-center">
            {isCover ? (
              <span className="text-[#F15A3C] uppercase tracking-wider text-[11px]">
                Capa
              </span>
            ) : (
              <span>
                {currentIndex} / {totalSlides}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onNext}
            disabled={currentIndex >= totalSlides}
            aria-label="Próximo slide"
            className="p-2 rounded-xl text-[#1D1D1D] hover:bg-[#F2F3F3] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </>
  );
};
