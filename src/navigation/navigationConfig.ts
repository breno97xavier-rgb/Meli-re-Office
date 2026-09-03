import type { NavigationItem, NavigationGroup } from '@/src/types';

export const NAVIGATION_GROUPS: NavigationGroup[] = [
  'Principal',
  'Comercial',
  'Operação',
  'Performance',
  'Gestão',
  'Sistema',
];

export const NAVIGATION_ITEMS: NavigationItem[] = [
  // Principal
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    group: 'Principal',
    iconName: 'LayoutDashboard',
  },
  
  // Comercial
  {
    id: 'comercial',
    label: 'Comercial',
    path: '/comercial',
    group: 'Comercial',
    iconName: 'Briefcase',
  },
  {
    id: 'clientes',
    label: 'Clientes',
    path: '/clientes',
    group: 'Comercial',
    iconName: 'Users',
  },

  // Operação
  {
    id: 'planejamento',
    label: 'Planejamento',
    path: '/planejamento',
    group: 'Operação',
    iconName: 'Compass',
  },
  {
    id: 'conteudos',
    label: 'Conteúdos',
    path: '/conteudos',
    group: 'Operação',
    iconName: 'FileText',
  },
  {
    id: 'apresentacoes',
    label: 'Apresentações',
    path: '/apresentacoes',
    group: 'Operação',
    iconName: 'Presentation',
  },
  {
    id: 'calendario',
    label: 'Calendário',
    path: '/calendario',
    group: 'Operação',
    iconName: 'Calendar',
  },
  {
    id: 'publicacoes',
    label: 'Publicações',
    path: '/publicacoes',
    group: 'Operação',
    iconName: 'Share2',
  },

  // Performance
  {
    id: 'trafego-pago',
    label: 'Tráfego Pago',
    path: '/trafego-pago',
    group: 'Performance',
    iconName: 'TrendingUp',
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    path: '/relatorios',
    group: 'Performance',
    iconName: 'BarChart3',
  },

  // Gestão
  {
    id: 'arquivos',
    label: 'Arquivos',
    path: '/arquivos',
    group: 'Gestão',
    iconName: 'FolderArchive',
  },
  {
    id: 'tarefas',
    label: 'Tarefas',
    path: '/tarefas',
    group: 'Gestão',
    iconName: 'CheckSquare',
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    path: '/financeiro',
    group: 'Gestão',
    iconName: 'Wallet',
  },
  {
    id: 'inbox',
    label: 'Inbox',
    path: '/inbox',
    group: 'Gestão',
    iconName: 'Inbox',
  },

  // Sistema
  {
    id: 'configuracoes',
    label: 'Configurações',
    path: '/configuracoes',
    group: 'Sistema',
    iconName: 'Settings',
  },
];
