import React from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Layers,
  FileText,
  TrendingUp,
  DollarSign,
  Folder,
  CheckSquare,
  StickyNote,
  Presentation,
} from 'lucide-react';

export type ClientTabKey =
  | 'overview'
  | 'contacts'
  | 'commercial'
  | 'services'
  | 'contents'
  | 'presentations'
  | 'paid_traffic'
  | 'financial'
  | 'files'
  | 'tasks'
  | 'notes';

interface TabConfig {
  key: ClientTabKey;
  label: string;
  icon: React.ElementType;
  badgeCount?: number;
  isFunctional?: boolean;
}

interface ClientProfileTabsProps {
  activeTab: ClientTabKey;
  onSelectTab: (tab: ClientTabKey) => void;
  contactsCount: number;
  commercialCount: number;
  contentsCount?: number;
}

export const ClientProfileTabs: React.FC<ClientProfileTabsProps> = ({
  activeTab,
  onSelectTab,
  contactsCount,
  commercialCount,
  contentsCount,
}) => {
  const tabs: TabConfig[] = [
    {
      key: 'overview',
      label: 'Visão Geral',
      icon: LayoutDashboard,
      isFunctional: true,
    },
    {
      key: 'contacts',
      label: 'Contatos',
      icon: Users,
      badgeCount: contactsCount,
      isFunctional: true,
    },
    {
      key: 'commercial',
      label: 'Comercial',
      icon: Briefcase,
      badgeCount: commercialCount,
      isFunctional: true,
    },
    {
      key: 'contents',
      label: 'Conteúdos',
      icon: FileText,
      badgeCount: contentsCount,
      isFunctional: true,
    },
    {
      key: 'presentations',
      label: 'Apresentações',
      icon: Presentation,
      isFunctional: true,
    },
    {
      key: 'services',
      label: 'Serviços',
      icon: Layers,
      isFunctional: false,
    },
    {
      key: 'paid_traffic',
      label: 'Tráfego Pago',
      icon: TrendingUp,
      isFunctional: false,
    },
    {
      key: 'financial',
      label: 'Financeiro',
      icon: DollarSign,
      isFunctional: false,
    },
    {
      key: 'files',
      label: 'Arquivos',
      icon: Folder,
      isFunctional: false,
    },
    {
      key: 'tasks',
      label: 'Tarefas',
      icon: CheckSquare,
      isFunctional: false,
    },
    {
      key: 'notes',
      label: 'Notas',
      icon: StickyNote,
      isFunctional: false,
    },
  ];

  return (
    <div className="border-b border-[#E8E9EA] bg-white rounded-t-2xl px-2 pt-2">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              id={`tab-client-${tab.key}`}
              type="button"
              onClick={() => onSelectTab(tab.key)}
              className={`group flex items-center gap-2 px-3.5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-[#1D1D1D] text-[#1D1D1D]'
                  : 'border-transparent text-[#666668] hover:text-[#1D1D1D] hover:border-[#D1D2D4]'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-colors ${
                  isActive
                    ? 'text-[#F15A3C]'
                    : 'text-[#9E9EA0] group-hover:text-[#666668]'
                }`}
              />
              <span>{tab.label}</span>

              {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-[#1D1D1D] text-white'
                      : 'bg-[#F2F3F3] text-[#666668]'
                  }`}
                >
                  {tab.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
