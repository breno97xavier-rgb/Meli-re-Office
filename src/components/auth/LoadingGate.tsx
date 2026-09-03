import { BrandAsset } from '@/src/components/brand/BrandAsset';

interface LoadingGateProps {
  message?: string;
}

export function LoadingGate({ message = 'Iniciando central executiva...' }: LoadingGateProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex min-h-screen w-full flex-col items-center justify-center bg-[#F7F7F8] px-4"
      role="status"
      aria-label="Carregando Melière Office"
    >
      <div className="flex flex-col items-center text-center">
        {/* Institutional Symbol */}
        <div className="relative mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-3 shadow-sm border border-[#E8E9EA]">
          <BrandAsset
            type="symbol-light-a"
            alt="Melière Marketing"
            className="h-8 w-8 object-contain"
          />
        </div>

        {/* Brand typography */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-widest text-[#1D1D1D] uppercase">
            Melière
          </span>
          <span className="rounded bg-[#1D1D1D] px-1.5 py-0.5 text-[9px] font-medium tracking-wider text-white uppercase">
            Office
          </span>
        </div>

        {/* Minimal Progress indicator */}
        <div className="mt-6 h-1 w-32 overflow-hidden rounded-full bg-[#E8E9EA]">
          <div className="h-full w-1/2 rounded-full bg-[#F15A3C] animate-[pulse_1.5s_ease-in-out_infinite]" />
        </div>

        <p className="mt-3 text-xs font-normal text-[#9E9EA0] tracking-wide">
          {message}
        </p>
      </div>
    </div>
  );
}
