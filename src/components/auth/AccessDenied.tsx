import { ShieldAlert, LogOut } from 'lucide-react';
import { BrandAsset } from '@/src/components/brand/BrandAsset';

interface AccessDeniedProps {
  onSignOut: () => void;
  email?: string | null;
}

export function AccessDenied({ onSignOut, email }: AccessDeniedProps) {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen w-full flex-col items-center justify-center bg-[#F7F7F8] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#E8E9EA] bg-white p-8 shadow-sm text-center">
        {/* Institutional header */}
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FDF1EE] text-[#F15A3C]">
          <ShieldAlert className="h-6 w-6" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <BrandAsset
            type="logo-light"
            alt="Melière Marketing"
            className="h-6 w-auto object-contain"
          />
          <span className="rounded bg-[#2D2D2D] px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-white uppercase">
            Office
          </span>
        </div>

        <h1 className="mt-4 text-xl font-semibold tracking-tight text-[#1D1D1D]">
          Acesso ao Office não disponível
        </h1>

        <p className="mt-2 text-sm text-[#666668] leading-relaxed">
          Seu usuário foi autenticado, mas ainda não possui acesso ao Melière Office.
        </p>

        {email && (
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#F7F7F8] px-3 py-1.5 border border-[#E8E9EA] text-xs font-mono text-[#666668]">
            <span>{email}</span>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-[#F2F3F3]">
          <button
            onClick={onSignOut}
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1D1D1D] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#2E2E2E] focus:outline-none focus:ring-2 focus:ring-[#F15A3C] focus:ring-offset-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair da conta</span>
          </button>
        </div>
      </div>
    </div>
  );
}
