import { DashboardHeader } from '@/src/components/common/DashboardHeader';
import { EmptyState } from '@/src/components/common/EmptyState';
import { useAuth } from '@/src/hooks/useAuth';
import {
  CalendarDays,
  AlertCircle,
  Activity,
  Layers,
  TrendingUp,
  Clock,
} from 'lucide-react';

export function DashboardPage() {
  const { profile } = useAuth();

  // Compute greeting name from profile (display_name or first name of full_name)
  const userName = profile?.display_name || profile?.full_name?.trim().split(/\s+/)[0] || '';
  const timeZone = profile?.timezone || 'America/Sao_Paulo';

  return (
    <div className="min-h-full pb-12">
      {/* 1. Executive Dashboard Header */}
      <DashboardHeader userName={userName} timeZone={timeZone} />

      {/* 2. Structured Executive Grid */}
      <div className="p-6 md:p-8 space-y-6">
        
        {/* Section Row 1: HOJE & ATENÇÃO */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          
          {/* HOJE (Primary executive view: 8 columns) */}
          <section
            aria-labelledby="section-hoje-title"
            className="lg:col-span-8 rounded-xl border border-[#E8E9EA] bg-white p-6 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-[#F2F3F3] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FDF1EE] text-[#F15A3C]">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div>
                    <h2
                      id="section-hoje-title"
                      className="text-sm font-semibold tracking-tight text-[#1D1D1D]"
                    >
                      Hoje
                    </h2>
                    <p className="text-[11px] text-[#9E9EA0]">
                      Atividades, compromissos e prioridades do dia
                    </p>
                  </div>
                </div>
                <span className="rounded bg-[#F7F7F8] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-[#666668] border border-[#E8E9EA]">
                  Em tempo real
                </span>
              </div>

              {/* Sub-areas of Hoje */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-[#F0F1F2] bg-[#FAFAFB] p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9E9EA0]">
                    Tarefas do Dia
                  </span>
                  <div className="mt-2">
                    <EmptyState message="Nenhuma tarefa prioritária listada para hoje." />
                  </div>
                </div>

                <div className="rounded-lg border border-[#F0F1F2] bg-[#FAFAFB] p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9E9EA0]">
                    Publicações & Prazos
                  </span>
                  <div className="mt-2">
                    <EmptyState message="Nenhuma publicação agendada para hoje." />
                  </div>
                </div>

                <div className="rounded-lg border border-[#F0F1F2] bg-[#FAFAFB] p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9E9EA0]">
                    Reuniões & Vencimentos
                  </span>
                  <div className="mt-2">
                    <EmptyState message="Nenhum compromisso ou vencimento hoje." />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#F2F3F3] flex items-center justify-between text-[11px] text-[#9E9EA0]">
              <span>Módulo operacional central</span>
              <span>0 registros ativos</span>
            </div>
          </section>

          {/* ATENÇÃO (Critical alerts: 4 columns) */}
          <section
            aria-labelledby="section-atencao-title"
            className="lg:col-span-4 rounded-xl border border-[#FBC3B8]/60 bg-[#FFFFFF] p-6 shadow-sm flex flex-col justify-between relative overflow-hidden"
          >
            {/* Subtle top indicator bar */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#F15A3C]" />

            <div>
              <div className="flex items-center justify-between border-b border-[#F2F3F3] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FDF1EE] text-[#F15A3C]">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <h2
                      id="section-atencao-title"
                      className="text-sm font-semibold tracking-tight text-[#1D1D1D]"
                    >
                      Atenção
                    </h2>
                    <p className="text-[11px] text-[#9E9EA0]">
                      Alertas, atrasos e pontos críticos
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-2.5">
                <EmptyState
                  message="Nenhum pagamento em atraso ou pendência financeira."
                  className="bg-[#FAFAFB]"
                />
                <EmptyState
                  message="Nenhum contrato próximo do término ou renovação pendente."
                  className="bg-[#FAFAFB]"
                />
                <EmptyState
                  message="Nenhuma aprovação de conteúdo demorada."
                  className="bg-[#FAFAFB]"
                />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#F2F3F3] flex items-center justify-between text-[11px] text-[#9E9EA0]">
              <span>Monitoramento de integridade</span>
              <span className="text-[#666668] font-medium">Regular</span>
            </div>
          </section>
        </div>

        {/* Section Row 2: OPERAÇÃO & CONTEÚDOS */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          
          {/* OPERAÇÃO (Executive workflow overview: 6 columns) */}
          <section
            aria-labelledby="section-operacao-title"
            className="lg:col-span-6 rounded-xl border border-[#E8E9EA] bg-white p-6 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-[#F2F3F3] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#F2F3F3] text-[#1D1D1D]">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <h2
                      id="section-operacao-title"
                      className="text-sm font-semibold tracking-tight text-[#1D1D1D]"
                    >
                      Operação
                    </h2>
                    <p className="text-[11px] text-[#9E9EA0]">
                      Status executivo dos fluxos da agência
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-[#F0F1F2] bg-[#FAFAFB]">
                  <div>
                    <div className="text-xs font-medium text-[#1D1D1D]">Projetos & Campanhas</div>
                    <div className="text-[11px] text-[#9E9EA0]">Planejamento e tráfego pago</div>
                  </div>
                  <span className="text-xs font-mono text-[#9E9EA0]">—</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-[#F0F1F2] bg-[#FAFAFB]">
                  <div>
                    <div className="text-xs font-medium text-[#1D1D1D]">Contratos & Clientes Ativos</div>
                    <div className="text-[11px] text-[#9E9EA0]">Carteira comercial</div>
                  </div>
                  <span className="text-xs font-mono text-[#9E9EA0]">—</span>
                </div>

                <EmptyState message="Nenhuma pendência operacional registrada no momento." />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#F2F3F3] flex items-center justify-between text-[11px] text-[#9E9EA0]">
              <span>Fluxo operacional integrado</span>
              <span>Fase 0.1</span>
            </div>
          </section>

          {/* CONTEÚDOS (Creation & approval pipeline: 6 columns) */}
          <section
            aria-labelledby="section-conteudos-title"
            className="lg:col-span-6 rounded-xl border border-[#E8E9EA] bg-white p-6 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-[#F2F3F3] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#F2F3F3] text-[#1D1D1D]">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <h2
                      id="section-conteudos-title"
                      className="text-sm font-semibold tracking-tight text-[#1D1D1D]"
                    >
                      Conteúdos
                    </h2>
                    <p className="text-[11px] text-[#9E9EA0]">
                      Pipeline de produção, aprovação e postagem
                    </p>
                  </div>
                </div>
              </div>

              {/* 4 Pipeline Stages */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-lg border border-[#F0F1F2] bg-[#FAFAFB] p-2.5 text-center">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9E9EA0]">
                    Em Produção
                  </div>
                  <div className="mt-2 text-sm font-mono font-medium text-[#666668]">—</div>
                </div>

                <div className="rounded-lg border border-[#F0F1F2] bg-[#FAFAFB] p-2.5 text-center">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9E9EA0]">
                    Aprovação
                  </div>
                  <div className="mt-2 text-sm font-mono font-medium text-[#666668]">—</div>
                </div>

                <div className="rounded-lg border border-[#F0F1F2] bg-[#FAFAFB] p-2.5 text-center">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9E9EA0]">
                    Programados
                  </div>
                  <div className="mt-2 text-sm font-mono font-medium text-[#666668]">—</div>
                </div>

                <div className="rounded-lg border border-[#F0F1F2] bg-[#FAFAFB] p-2.5 text-center">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9E9EA0]">
                    Publicados
                  </div>
                  <div className="mt-2 text-sm font-mono font-medium text-[#666668]">—</div>
                </div>
              </div>

              <div className="mt-3">
                <EmptyState message="Nenhum conteúdo ativo na esteira de produção." />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#F2F3F3] flex items-center justify-between text-[11px] text-[#9E9EA0]">
              <span>Esteira editorial</span>
              <span>0 peças em trânsito</span>
            </div>
          </section>
        </div>

        {/* Section Row 3: FINANCEIRO (Dark Grafite Surface) & PRÓXIMOS DIAS */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          
          {/* FINANCEIRO (Featured dark surface for visual hierarchy & contrast: 7 columns) */}
          <section
            aria-labelledby="section-financeiro-title"
            className="lg:col-span-7 rounded-xl border border-[#333333] bg-[#1D1D1D] text-white p-6 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-[#2D2D2D] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#282828] text-[#F15A3C]">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h2
                      id="section-financeiro-title"
                      className="text-sm font-semibold tracking-tight text-white"
                    >
                      Financeiro
                    </h2>
                    <p className="text-[11px] text-[#A0A0A2]">
                      Fluxo de caixa, recebimentos e previsibilidade
                    </p>
                  </div>
                </div>
                <span className="rounded bg-[#282828] px-2 py-0.5 text-[10px] font-medium tracking-wider text-[#A0A0A2] uppercase border border-[#333333]">
                  Consolidado
                </span>
              </div>

              {/* Financial pillars */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-lg border border-[#2D2D2D] bg-[#242424] p-2.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#A0A0A2]">
                    Receita
                  </span>
                  <div className="mt-1 font-mono text-sm font-medium text-white">—</div>
                </div>

                <div className="rounded-lg border border-[#2D2D2D] bg-[#242424] p-2.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#A0A0A2]">
                    Recebido
                  </span>
                  <div className="mt-1 font-mono text-sm font-medium text-white">—</div>
                </div>

                <div className="rounded-lg border border-[#2D2D2D] bg-[#242424] p-2.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#A0A0A2]">
                    A Receber
                  </span>
                  <div className="mt-1 font-mono text-sm font-medium text-white">—</div>
                </div>

                <div className="rounded-lg border border-[#2D2D2D] bg-[#242424] p-2.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#A0A0A2]">
                    Despesas
                  </span>
                  <div className="mt-1 font-mono text-sm font-medium text-white">—</div>
                </div>
              </div>

              <div className="mt-3">
                <EmptyState
                  variant="dark"
                  message="Nenhuma movimentação financeira registrada para o período."
                />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#2D2D2D] flex items-center justify-between text-[11px] text-[#A0A0A2]">
              <span>Controle financeiro da agência</span>
              <span className="text-white">BRL</span>
            </div>
          </section>

          {/* PRÓXIMOS DIAS (Horizon schedule: 5 columns) */}
          <section
            aria-labelledby="section-proximos-dias-title"
            className="lg:col-span-5 rounded-xl border border-[#E8E9EA] bg-white p-6 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-[#F2F3F3] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#F2F3F3] text-[#1D1D1D]">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <h2
                      id="section-proximos-dias-title"
                      className="text-sm font-semibold tracking-tight text-[#1D1D1D]"
                    >
                      Próximos dias
                    </h2>
                    <p className="text-[11px] text-[#9E9EA0]">
                      Visão consolidada da agenda e prazos
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-lg border border-[#F0F1F2] bg-[#FAFAFB] p-3 space-y-1">
                  <div className="text-xs font-semibold text-[#1D1D1D]">Horizonte Semanal</div>
                  <p className="text-[11px] text-[#666668]">
                    Reúne entregas de conteúdo, pagamentos de clientes e reuniões executivas.
                  </p>
                </div>

                <EmptyState message="Nenhum evento ou entrega agendada para os próximos dias." />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#F2F3F3] flex items-center justify-between text-[11px] text-[#9E9EA0]">
              <span>Agenda integrada</span>
              <span>7 dias</span>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
