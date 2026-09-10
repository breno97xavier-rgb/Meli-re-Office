import React from 'react';
import {
  Layers,
  FileText,
  TrendingUp,
  DollarSign,
  Folder,
  CheckSquare,
  StickyNote,
  Sparkles,
} from 'lucide-react';
import { ClientTabKey } from './ClientProfileTabs';

interface PlaceholderConfig {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
}

const PLACEHOLDER_CONFIGS: Record<
  Exclude<ClientTabKey, 'overview' | 'contacts' | 'commercial' | 'contents' | 'presentations'>,
  PlaceholderConfig
> = {
  services: {
    title: 'Serviços Operacionais e Escopo Contratado',
    subtitle: 'Módulo de Gestão de Serviços',
    description:
      'A estruturação detalhada dos serviços contratados, entregáveis recorrentes e matriz de responsabilidade será integrada neste módulo nas próximas etapas da plataforma.',
    icon: Layers,
  },
  paid_traffic: {
    title: 'Gestão de Tráfego Pago e Performance',
    subtitle: 'Módulo de Mídia & Campanhas',
    description:
      'Acompanhamento de orçamento investido, campanhas no Meta Ads / Google Ads, métricas de conversão e relatórios de ROAS serão centralizados nesta aba.',
    icon: TrendingUp,
  },
  financial: {
    title: 'Gestão Financeira & Cobranças',
    subtitle: 'Módulo de Faturamento',
    description:
      'Histórico de faturas geradas, conciliação de pagamentos de mensalidades/setup e controle de inadimplência para este cliente serão geridos nesta seção.',
    icon: DollarSign,
  },
  files: {
    title: 'Repositório de Arquivos e Assets',
    subtitle: 'Módulo de Arquivos e Mídia',
    description:
      'Armazenamento seguro de identidades visuais, logos vetorizados, manuais de marca, fotos em alta resolução e documentos institucionais do cliente.',
    icon: Folder,
  },
  tasks: {
    title: 'Quadro Operacional de Tarefas',
    subtitle: 'Módulo de Demandas e Sprints',
    description:
      'Quadro kanban e lista de tarefas operacionais da equipe dedicadas ao atendimento e entregas recorrentes deste cliente.',
    icon: CheckSquare,
  },
  notes: {
    title: 'Caderno de Notas & Atas de Reuniões',
    subtitle: 'Módulo de Alinhamentos',
    description:
      'Registro contínuo de atas de alinhamento quinzenal/mensal, histórico de decisões estratégicas e anotações internas da equipe da agência.',
    icon: StickyNote,
  },
};

interface ClientPlaceholderSectionProps {
  tabKey: Exclude<ClientTabKey, 'overview' | 'contacts' | 'commercial' | 'contents'>;
}

export const ClientPlaceholderSection: React.FC<ClientPlaceholderSectionProps> = ({
  tabKey,
}) => {
  const config = PLACEHOLDER_CONFIGS[tabKey];
  const Icon = config.icon;

  return (
    <div className="p-8 md:p-12 bg-white rounded-b-2xl border-x border-b border-[#E8E9EA]">
      <div className="bg-[#FAFAFA] border border-dashed border-[#E8E9EA] rounded-2xl p-10 md:p-14 text-center max-w-xl mx-auto space-y-5 shadow-2xs">
        <div className="w-14 h-14 rounded-2xl bg-white border border-[#E8E9EA] text-[#1D1D1D] flex items-center justify-center mx-auto shadow-xs">
          <Icon className="w-7 h-7 text-[#F15A3C]" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F2F3F3] text-[#666668]">
            <Sparkles className="w-3 h-3 text-[#F15A3C]" />
            {config.subtitle}
          </span>
          <h3 className="text-base font-bold text-[#1D1D1D]">
            {config.title}
          </h3>
          <p className="text-xs text-[#666668] leading-relaxed pt-1">
            {config.description}
          </p>
        </div>

        <div className="pt-2">
          <span className="text-[11px] font-medium text-[#9E9EA0] bg-white border border-[#E8E9EA] rounded-lg px-3 py-1.5 inline-block shadow-2xs">
            Estrutura reservada para expansão operacional
          </span>
        </div>
      </div>
    </div>
  );
};
