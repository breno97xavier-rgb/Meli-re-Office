import { NAVIGATION_ITEMS } from '@/src/navigation/navigationConfig';
import { NavIcon } from '@/src/navigation/NavIcon';
import type { RoutePath } from '@/src/types';

interface PlaceholderModulePageProps {
  path: RoutePath;
}

export function PlaceholderModulePage({ path }: PlaceholderModulePageProps) {
  const item = NAVIGATION_ITEMS.find((nav) => nav.path === path) || {
    label: 'Módulo',
    group: 'Sistema',
    iconName: 'FolderArchive',
  };

  return (
    <div className="p-6 md:p-10">
      {/* Module Title Section */}
      <div className="border-b border-[#E8E9EA] pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-[#E8E9EA] text-[#F15A3C] shadow-sm">
            <NavIcon name={item.iconName} className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9E9EA0]">
              {item.group}
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-[#1D1D1D]">
              {item.label}
            </h1>
          </div>
        </div>
      </div>

      {/* Structured Placeholder Notice Container */}
      <div className="mt-8 rounded-xl border border-[#E8E9EA] bg-white p-8 md:p-12 text-center max-w-2xl mx-auto shadow-sm">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#FDF1EE] text-[#F15A3C] mb-4">
          <NavIcon name={item.iconName} className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-[#1D1D1D] tracking-tight">
          {item.label}
        </h2>
        <p className="mt-2 text-sm text-[#666668] leading-relaxed max-w-md mx-auto">
          Este módulo será implementado em uma próxima fase.
        </p>

        <div className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#F7F7F8] px-3 py-1.5 border border-[#E8E9EA] text-xs text-[#9E9EA0]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#9E9EA0]" />
          <span>Fase 0.1 — Fundação e Arquitetura</span>
        </div>
      </div>
    </div>
  );
}
