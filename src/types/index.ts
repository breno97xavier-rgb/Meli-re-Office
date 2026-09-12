export type RoutePath =
  | '/'
  | '/login'
  | '/dashboard'
  | '/comercial'
  | '/comercial/leads'
  | '/comercial/oportunidades'
  | '/comercial/propostas'
  | '/comercial/contratos'
  | '/clientes'
  | '/planejamento'
  | '/conteudos'
  | '/apresentacoes'
  | '/calendario'
  | '/publicacoes'
  | '/trafego-pago'
  | '/relatorios'
  | '/arquivos'
  | '/tarefas'
  | '/financeiro'
  | '/inbox'
  | '/configuracoes'
  | '/apresentacao'
  | `/apresentacao/${string}`
  | `/clientes/${string}`
  | `/apresentacoes/${string}`;

export type UserRole = 'admin' | 'team' | 'client';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export type NavigationGroup =
  | 'Principal'
  | 'Comercial'
  | 'Operação'
  | 'Performance'
  | 'Gestão'
  | 'Sistema';

export interface NavigationItem {
  id: string;
  label: string;
  path: RoutePath;
  group: NavigationGroup;
  iconName: string;
  badge?: string;
}

export type BrandAssetType =
  | 'logo-dark'      // Logo A: Branco + Coral para fundo escuro
  | 'logo-coral'     // Logo B: Preto + Branco para fundo coral
  | 'logo-light'     // Logo C: Preto + Coral para fundo claro
  | 'symbol-light-a' // Símbolo A: Coral com detalhe preto
  | 'symbol-dark-b'  // Símbolo B: Branco com detalhe coral (sidebar recolhida)
  | 'symbol-light-c' // Símbolo C: Preto com detalhe coral
  | 'symbol-coral-d'; // Símbolo D: Preto com detalhe branco

export * from './leads';
export * from './opportunities';
export * from './proposals';
export * from './contracts';
export * from './clients';
export * from './contacts';
export * from './contents';
export * from './contentAssets';
export * from './presentations';
