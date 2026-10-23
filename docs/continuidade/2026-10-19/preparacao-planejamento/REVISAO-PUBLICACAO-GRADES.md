# Revisão de publicação — modelos de grade editorial

Data: 22/10/2026. Pacote LOCAL; commit/push/deploy deste incremento ainda não autorizados ou executados.

## Destino e base

Repositório breno97xavier-rgb/Meli-re-Office. Branch local chore/s3-reconciliation, base b34aec01d915ea6aa283b8808bc53263c63e365d. git ls-remote desta rodada confirmou main e branch de trabalho nesse mesmo commit. Domínio https://meli-re-office.vercel.app, Vercel meli-re-office (prj_Rv5KFlxDv8gSkszEJ16GIh39Jq4B), equipe team_78Y4mwHl4nJOf5Gm8RjLX4zU. Última publicação verificada: Production/Current Ready 4X44R6neHgbNVgLAPnWqytzFL71t, b34aec0. Conferir novamente antes de enviar.

## Entrega e impacto visual

Nova aba Grade editorial com modelos independentes de datas: presets7/14/28 e quantidade personalizada, semanas/posições, várias vagas, campos opcionais de tema/pilar/série/campanha/objetivo/funil/formato/prioridade/recorrência/quantidade/destinos, filtros, edição, movimento de posição/ordem, duplicação, arquivamento, versões e resumo do rascunho. Duas semanas agora ocupam duas colunas em desktop; até quatro colunas quando há mais semanas. Em largura390, campos/semana em lista, sem overflow horizontal no cenário testado. Contagens singular/plural corrigidas e botões das vagas com área mínima44px para toque.

Não inclui aplicação do modelo em ciclo, geração/vínculo de Content, calendário novo, destinos de publicação efetiva ou integrações externas. Ciclos editoriais, dados reais e fluxo existente preservados. Recorrência não agenda automaticamente. Gráficos/visão geral completos continuam posteriores; resumo desta entrega conta vagas/peças/destinos previstos, nunca produção/publicação real.

## Lista explícita de arquivos para commit

1. src/pages/PlanningPage.tsx
2. src/components/planning/EditorialTemplatesSection.tsx
3. src/components/planning/EditorialSlotEditor.tsx
4. src/services/editorialTemplateService.ts
5. src/types/editorialTemplates.ts
6. src/utils/editorialTemplates.ts
7. supabase/migrations/20261023003335_planning_reusable_editorial_templates.sql
8. tests/security/editorial-templates.test.mjs
9. tests/security/editorial-templates-lab.sql
10. tests/security/planning-foundation-concurrency.ps1
11. tests/security/run-planning-authorization.ps1
12. tests/security/planning-preview-services.ts
13. tests/security/planning-preview.config.mjs
14. docs/continuidade/2026-10-19/preparacao-planejamento/IMPLEMENTACAO-GRADES.md
15. docs/continuidade/2026-10-19/preparacao-planejamento/REVISAO-PUBLICACAO-GRADES.md

Não incluir por conveniência docs/ inteira, relatórios/arquivos de outras etapas, supabase/.temp, SQL de schema, alterações anteriores dos README ou run-presentation-decisions.ps1. Não usar git add -A. Arquivos de continuidade da fase1 modificados após sua publicação ficam locais neste pacote. Sem mudança de dependências, Auth/Google/Storage.

## Banco

Migração20261023003335 já autorizada e APLICADA ao meliere-assets; apenas versionar no Git, não reaplicar. Catálogo/permissões e bloqueio sem identidade verificados. Tabelas de modelos/versões vazias; não criar registros de teste em produção nesta publicação. Hash da migração igual à proposta testada: 0889E9C39996D1BC7708E9CFCAD8947A4FAA2E56D72757279F8BA7EF3C4FE04E. Modelos mantêm vagas JSON ordenadas; refs são validadas por cliente, sem FK física individual, e exclusões futuras de catálogos exigem tratamento explícito. Histórico não editável por authenticated diretamente.

## Evidências e limites

Suite consolidada repetida após ajustes:170/170 testes aprovados. Build e TypeScript repetidos; resultado final registrado em IMPLEMENTACAO-GRADES.md. TypeScript tem22 erros anteriores em outros módulos, sem novos diagnósticos de grades; não declarar lint aprovado. Laboratório anterior:89 verificaçõesSQL + concorrência real de briefing/modelos,91PASS, cluster encerrado. Nenhuma mudançaSQL após sua aplicação.

UI desta rodada com serviços em memória e bloqueio de acesso real ao Supabase: criação/salvamento14posições; edição mobile de quantidade/formato/destino; versão2 e histórico1/2; contagens1vaga/2peças/2destinos; filtroTikTok sem resultados zerou contagens; cópia independente salva com versão1; segundo cliente fictício sem modelos. Console sem erros capturados. Ao final, override de viewport removido. Isso não equivale a persistência remota, JWT/CRUD real nem isolamento de toda a aplicação.

Capturas em C:/Users/breno/.codex/visualizations/2026/10/19/01a15685-735f-7f10-a987-a91a3d345d8f/ : grade-editorial-posicoes-desktop.png, grade-editorial-editor-mobile.png, grade-editorial-posicoes-mobile.png. Capturas contêm somente cenário fictício. Não incluir na publicação de código.

Diálogo nativo de descarte e voltar/avançar do navegador continuam limites registrados anteriormente; não foram homologados manualmente. Não aprovar dados reais globais só por testes/build. Após publicação, conferir estado vazio e leituras pela sessão real inicialmente sem gravar; teste de escrita operacional requer recorte/dados autorizados.

## Sequência após autorização específica

Conferir status/hash/main remoto; stage somente a lista; revisar staged; commit e push atômico sem force para chore/s3-reconciliation e main, se compatíveis com a base. Vercel Git publica main; aguardarReady, conferir commit/domínio. Não alterar proteções ou banco. Validar nova aba em leitura autenticada. Produção anterior identificada para eventual plano de recuperação; não apagar dados nem reparar migrações para resolver problemas de UI.
