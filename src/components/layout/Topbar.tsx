import { Search, Bell, Plus, Menu, LogOut } from 'lucide-react';
import { NAVIGATION_ITEMS } from '@/src/navigation/navigationConfig';
import type { RoutePath, UserRole } from '@/src/types';
import { useAuth } from '@/src/hooks/useAuth';

interface TopbarProps {
  currentPath: RoutePath;
  onOpenMobileMenu: () => void;
  isCollapsed: boolean;
}

const ROLE_LABEL_MAP: Record<UserRole, string> = {
  admin: 'Administração',
  team: 'Equipe',
  client: 'Cliente',
};

export function Topbar({ currentPath, onOpenMobileMenu, isCollapsed: _isCollapsed }: TopbarProps) {
  const { profile, signOut } = useAuth();

  const currentItem = (() => {
    if (currentPath === '/comercial/contratos') {
      return { label: 'Contratos', group: 'Comercial' };
    }
    if (currentPath === '/comercial/propostas') {
      return { label: 'Propostas', group: 'Comercial' };
    }
    if (currentPath === '/comercial/oportunidades') {
      return { label: 'Oportunidades', group: 'Comercial' };
    }
    if (currentPath === '/comercial/leads' || currentPath === '/comercial') {
      return { label: 'Leads', group: 'Comercial' };
    }
    if (currentPath.startsWith('/apresentacoes/')) {
      return { label: 'Editor de Apresentação', group: 'Operação' };
    }
    if (currentPath.startsWith('/clientes/')) {
      return { label: 'Perfil do Cliente', group: 'Comercial' };
    }
    return (
      NAVIGATION_ITEMS.find((item) => item.path === currentPath) || {
        label: 'Dashboard',
        group: 'Principal',
      }
    );
  })();

  // Derive display initials
  const initials = (() => {
    if (!profile) return 'MO';
    const name = profile.display_name || profile.full_name || '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1 && parts[0]) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return 'MO';
  })();

  const displayName = profile?.display_name || profile?.full_name || 'Usuário';
  const roleLabel = profile?.role ? ROLE_LABEL_MAP[profile.role] || profile.role : 'Acesso Office';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#E8E9EA] bg-white/95 px-4 backdrop-blur-sm md:px-8">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onOpenMobileMenu}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-[#E8E9EA] text-[#1D1D1D] hover:bg-[#F2F3F3] lg:hidden"
          aria-label="Abrir navegação"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Breadcrumb / Location Indicator */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-[#9E9EA0]">{currentItem.group}</span>
          <span className="text-[#DCDDDE]">/</span>
          <span className="font-semibold text-[#1D1D1D] tracking-tight">
            {currentItem.label}
          </span>
        </div>
      </div>

      {/* Center/Right Actions */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Global Search Placeholder (Neutral / Accessible) */}
        <div className="relative hidden md:block">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#9E9EA0]">
            <Search className="h-3.5 w-3.5" />
          </div>
          <input
            type="text"
            readOnly
            disabled
            placeholder="Buscar no Office... (Cmd+K)"
            className="h-8 w-56 lg:w-72 rounded-md border border-[#E8E9EA] bg-[#F9F9FA] pl-8 pr-3 text-xs text-[#666668] placeholder-[#9E9EA0] cursor-not-allowed opacity-80 transition-all focus:outline-none"
            aria-label="Buscar no Office (desabilitado na Fase 0.1)"
          />
        </div>

        {/* Quick Action Button (Neutral / Future placeholder) */}
        <button
          type="button"
          disabled
          className="hidden sm:inline-flex h-8 items-center gap-1.5 rounded-md border border-[#E8E9EA] bg-white px-2.5 text-xs font-medium text-[#9E9EA0] opacity-70 cursor-not-allowed"
          title="Ação rápida (disponível em fases futuras)"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Novo</span>
        </button>

        {/* Notifications Icon (Disabled / Neutral) */}
        <div
          className="relative flex h-8 w-8 items-center justify-center rounded-md border border-[#E8E9EA] bg-white text-[#9E9EA0] opacity-70"
          title="Notificações (sem eventos nesta fase)"
        >
          <Bell className="h-3.5 w-3.5" />
        </div>

        {/* User Profile Capsule with Dynamic Profile & SignOut */}
        <div className="flex items-center gap-3 border-l border-[#E8E9EA] pl-3 sm:pl-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1D1D1D] text-white text-xs font-semibold tracking-wider">
              {initials}
            </div>
            <div className="hidden text-left xl:block">
              <div className="text-xs font-semibold text-[#1D1D1D] leading-none">
                {displayName}
              </div>
              <div className="text-[10px] text-[#9E9EA0] leading-none mt-1">
                {roleLabel}
              </div>
            </div>
          </div>

          {/* Logout Action */}
          <button
            onClick={() => signOut()}
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[#E8E9EA] text-[#666668] transition-colors hover:border-[#FBC3B8] hover:bg-[#FDF1EE] hover:text-[#F15A3C]"
            title="Sair do Office"
            aria-label="Sair do Office"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
