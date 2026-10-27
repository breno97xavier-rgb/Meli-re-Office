# Calendário: dia, semana e mês — 27/10/2026

## Decisão autorizada

Usuário pediu abertura inicial nos eventos do dia, acesso a semana/mês e controles de filtros/conexão recolhidos para priorizar as atividades sem rolagem inicial. Implementação local autorizada, mudança visual anunciada. Sem alteração de entidades, permissões, banco ou compromissos.

## Implementação local

- CalendarPage começa em Dia/data local atual em cada montagem. Botões Dia/Semana/Mês, setas por período, Hoje e seletor de data civil compartilham uma data de referência. Troca de mês mantém dia válido (31 para último dia disponível); semana de segunda a domingo atravessa meses/anos corretamente.
- Painel superior nativo details/summary inicia recolhido: conexão Google, filtros existentes, conteúdos sem data e tarefas concluídas. Indicação de filtros ativos fica no resumo. Erros de carga/movimentação permanecem visíveis fora do painel.
- CalendarAgenda renderiza as mesmas entidades/fontes: compromissos Google ordenados pela projeção existente (dia inteiro e horários), tarefas e conteúdos em grupos identificados. Sem inventar horários para itens que só possuem data civil. Mantém os cartões/editores existentes e as cores Google. Semana responsiva lista os sete dias; não é uma grade horária de arraste.
- Mês preserva MonthGrid, overflow e arraste editorial. Dia/semana abrem os editores existentes por clique, com criação contextual de compromisso Google (se autorizado) ou conteúdo. Não implementa tarefa como evento Google nem agenda interna duplicada.
- useGoogleCalendar recebe o intervalo visível do dia/semana ou grade mensal; não altera backend nem escopos. Projeções internas continuam derivadas de seus registros existentes; sem copiar eventos Google ao banco.

## Arquivos do recorte

src/pages/CalendarPage.tsx; src/components/calendar/CalendarAgenda.tsx; src/services/calendarPeriod.ts; tests/security/calendar-period.test.mjs; tests/security/calendar-agenda-preview.cjs; este documento.

## Verificações

202 testes Node aprovados, incluindo semana entre anos, domingo, bissexto, fim de mês, navegação e rótulos civis. Build Vite aprovado, aviso anterior de bundle grande mantido. Lint com os mesmos 22 diagnósticos do HEAD ce12d2f; comparação TypeScript por arquivo/código/mensagem idêntica após correção dos dois avisos novos de key no fixture/componente (wrappers com chaves estáveis). Nenhuma dependência instalada.

Prévia isolada compilou a CalendarPage real com hooks substituídos por dados inteiramente fictícios, três compromissos coloridos e zero dados operacionais; servidor loopback 3012 encerrado ao final. Script de reprodução local: node tests/security/calendar-agenda-preview.cjs (usa esbuild já existente e CSS de dist após build; não modifica serviços remotos). Dados artificiais não provam sincronização real. Primeiro servidor sandbox sem conectividade de socket foi encerrado e reaberto com permissão da ferramenta. Primeiro teste automatizado do seletor de data não atualizou estado via onChange; ajustado para onInput do campo nativo, repetido com sucesso: 31/10 → próximo período → 01/11, Hoje → 27/10. Dia padrão/recolhimento inicial, sete dias da semana incluindo 01/11 e grade mensal de outubro conferidos via DOM; abrir controles mostrou GooglePanel. Console sem warnings/errors na prévia.

Evidência agenda-dia-local-20261027.jpg na pasta de visualizações deste chat, somente dados fictícios. Revisão React: hooks no topo, datas derivadas sem efeitos de sincronização, chaves estáveis, ações em handlers, botões com rótulos/aria-pressed, disclosure nativo acessível. Escrita e isolamentos remotos não retestados por essa prévia. Não homologar criação/edição no novo layout real apenas por build ou fixture.

## Estado e próxima ação

Implementado e testado localmente; ainda não commitado/publicado/homologado pelo usuário. Próximo: autorização específica para commit/push/deploy somente deste recorte de frontend, preservando arquivos sujos anteriores; depois conferir no domínio principal. Sem nova publicação da função Google ou migração necessária. Pendências anteriores de cor específica real e três casos Google continuam válidas, não substituídas por este ajuste.
