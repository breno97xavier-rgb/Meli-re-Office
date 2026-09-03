import { useState, ReactNode } from 'react';
import { Sidebar } from '@/src/components/layout/Sidebar';
import { Topbar } from '@/src/components/layout/Topbar';
import type { RoutePath } from '@/src/types';

interface OfficeLayoutProps {
  currentPath: RoutePath;
  onNavigate: (path: RoutePath) => void;
  children: ReactNode;
}

export function OfficeLayout({ currentPath, onNavigate, children }: OfficeLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7F7F8] text-[#1D1D1D] antialiased flex">
      {/* Sidebar */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={onNavigate}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Body Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        }`}
      >
        {/* Topbar */}
        <Topbar
          currentPath={currentPath}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          isCollapsed={isCollapsed}
        />

        {/* Page Main Content Area */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
