import { useState } from 'react';
import { BrandAsset } from '@/src/components/brand/BrandAsset';
import { NavIcon } from '@/src/navigation/NavIcon';
import { NAVIGATION_GROUPS, NAVIGATION_ITEMS } from '@/src/navigation/navigationConfig';
import type { RoutePath } from '@/src/types';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface SidebarProps {
  currentPath: RoutePath;
  onNavigate: (path: RoutePath) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  currentPath,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const handleItemClick = (path: RoutePath) => {
    onNavigate(path);
    if (isMobileOpen) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="meliere-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#1D1D1D] text-[#EDEDED] border-r border-[#2D2D2D] transition-all duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}
        `}
        aria-label="Navegação Principal Melière Office"
      >
        {/* Sidebar Header / Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#2D2D2D] px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            {isCollapsed ? (
              <div className="flex w-full items-center justify-center py-1">
                <BrandAsset
                  type="symbol-dark-b"
                  alt="Melière Símbolo"
                  className="h-7 w-7 object-contain"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-1">
                <BrandAsset
                  type="logo-dark"
                  alt="Melière Marketing"
                  className="h-7 w-auto object-contain"
                />
                <span className="rounded bg-[#2D2D2D] px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-[#A0A0A2] uppercase">
                  Office
                </span>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="flex h-8 w-8 items-center justify-center rounded text-[#A0A0A2] hover:bg-[#2D2D2D] hover:text-white lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Groups List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {NAVIGATION_GROUPS.map((group) => {
            const groupItems = NAVIGATION_ITEMS.filter((item) => item.group === group);
            if (groupItems.length === 0) return null;

            return (
              <div key={group} className="space-y-1">
                {/* Group Title (only when expanded) */}
                {!isCollapsed ? (
                  <div className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6A6B6D]">
                    {group}
                  </div>
                ) : (
                  <div className="my-2 border-t border-[#262626]" />
                )}

                {/* Items in Group */}
                <div className="space-y-0.5">
                  {groupItems.map((item) => {
                    const isActive =
                      currentPath === item.path ||
                      (item.path === '/dashboard' && currentPath === '/') ||
                      (item.path === '/comercial' && currentPath.startsWith('/comercial')) ||
                      (item.path === '/clientes' && currentPath.startsWith('/clientes')) ||
                      (item.path === '/conteudos' && currentPath.startsWith('/conteudos')) ||
                      (item.path === '/apresentacoes' && currentPath.startsWith('/apresentacoes'));

                    return (
                      <div key={item.id} className="relative">
                        <button
                          onClick={() => handleItemClick(item.path)}
                          onMouseEnter={() => setHoveredItemId(item.id)}
                          onMouseLeave={() => setHoveredItemId(null)}
                          className={`group relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-all duration-150
                            ${
                              isActive
                                ? 'bg-[#282828] text-white font-semibold'
                                : 'text-[#A0A0A2] hover:bg-[#242424] hover:text-[#EDEDED]'
                            }
                            ${isCollapsed ? 'justify-center px-0' : ''}
                          `}
                          aria-current={isActive ? 'page' : undefined}
                          title={isCollapsed ? item.label : undefined}
                        >
                          {/* Active Coral Indicator Bar */}
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#F15A3C]" />
                          )}

                          {/* Linear Icon */}
                          <NavIcon
                            name={item.iconName}
                            className={`h-4 w-4 shrink-0 transition-colors ${
                              isActive ? 'text-[#F15A3C]' : 'text-[#858688] group-hover:text-white'
                            }`}
                          />

                          {/* Label (Expanded) */}
                          {!isCollapsed && (
                            <span className="truncate tracking-wide">{item.label}</span>
                          )}
                        </button>

                        {/* Collapsed Mode Floating Tooltip */}
                        {isCollapsed && hoveredItemId === item.id && (
                          <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 rounded bg-[#111111] px-2.5 py-1 text-[11px] font-medium tracking-wide text-white shadow-xl border border-[#333333] whitespace-nowrap">
                            {item.label}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer / Collapse Toggle (Desktop only) */}
        <div className="hidden lg:flex shrink-0 items-center justify-between border-t border-[#2D2D2D] p-3">
          {!isCollapsed && (
            <div className="flex items-center gap-2 pl-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F15A3C]" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#6A6B6D]">
                v0.1 Fundação
              </span>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className={`flex h-8 w-8 items-center justify-center rounded-md border border-[#333333] bg-[#242424] text-[#A0A0A2] transition-colors hover:bg-[#2E2E2E] hover:text-white ${
              isCollapsed ? 'mx-auto' : ''
            }`}
            aria-label={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
