# Revisão de publicação — Grade → Ciclo → Conteúdos

Data: 23/10/2026. Visual aprovado pelo usuário; banco autorizado e aplicado separadamente. Este documento prepara o pacote local. Commit, push e publicação ainda aguardam autorização específica.

## Estado conferido

HEAD local, main remota e chore/s3-reconciliation remota coincidem em 7a4cf0f39b2edc8729fc2c6e4dabd56b8fa9113a, por git ls-remote nesta revisão. Nenhum arquivo está staged. As alterações locais e os arquivos não rastreados de outras etapas permanecem preservados.

Banco meliere-assets / ycagvwsvccgdjzpbhrfi já tem a migração 20261024015103_planning_cycle_content_execution, com SQL comparado fielmente ao arquivo local. SHA256 E7B19C485F88188FD06F2DF5D1DCADEFA3354CB5596E196EBEA6F5CF35DCA5BB. Não reaplicar banco como parte da publicação Git/Vercel.

## Resultado para o usuário

Dentro do detalhe do ciclo, aplicar um modelo salvo preserva sua versão e abre as vagas de execução. Cada unidade pode criar um Content em rascunho ou vincular uma peça existente do mesmo cliente, com abertura do editor atual. Peças não são duplicadas por destino nem por repetição simultânea do pedido. Posições não geram datas. Ciclos podem ficar sem período; peças sem data continuam no backlog existente.

Modelo e execução permanecem separados. Meta/alocação legada não é somada automaticamente às vagas. Arquivamento preserva histórico. Uma peça já vinculada não pode mudar silenciosamente de cliente/ciclo nem ser excluída; não há nesta entrega ação de desfazer vínculo. Não há publicação em redes sociais.

## Pacote exato — 24 arquivos

1. src/components/contents/ContentDetailDrawer.tsx
2. src/components/planning/EditorialCyclesSection.tsx
3. src/components/planning/EditorialPlanDetailModal.tsx
4. src/components/planning/EditorialPlanFormModal.tsx
5. src/components/planning/EditorialExecutionSection.tsx
6. src/pages/PlanningPage.tsx
7. src/services/contentsService.ts
8. src/services/planningService.ts
9. src/services/editorialExecutionService.ts
10. src/types/planning.ts
11. src/types/editorialExecution.ts
12. supabase/migrations/20261024015103_planning_cycle_content_execution.sql
13. tests/security/planning-mvp.test.mjs
14. tests/security/editorial-execution.test.mjs
15. tests/security/planning-preview-services.ts
16. tests/security/planning-preview.config.mjs
17. tests/security/execution-preview-services.ts
18. tests/security/planning-cycle-concurrency.ps1
19. tests/security/planning-cycle-contents-lab.sql
20. tests/security/run-planning-authorization.ps1
21. docs/continuidade/2026-10-19/preparacao-planejamento/DIAGNOSTICO-INTEGRACAO-CICLOS.md
22. docs/continuidade/2026-10-19/preparacao-planejamento/IMPLEMENTACAO-CICLOS-CONTEUDOS.md
23. docs/continuidade/2026-10-19/preparacao-planejamento/REVISAO-BANCO-CICLOS-CONTEUDOS.md
24. docs/continuidade/2026-10-19/preparacao-planejamento/REVISAO-PUBLICACAO-CICLOS-CONTEUDOS.md

A migração entra para versionamento, pois já foi aplicada. Não incluir .env, supabase/.temp, dump avulso, ZIP, inventário, pacote de fontes originais, propostas SQL avulsas ou alterações antigas de README/relatórios/scripts de outras etapas. RELATORIO-DE-CONTINUIDADE.md permanece local. Não usar git add -A ou adicionar docs/ inteira.

## Evidências e limitações

- 180 testes automatizados aprovados; 141 verificações SQL/concorrência locais aprovadas para o mesmo SQL da migração.
- Build posterior ao último ajuste do editor aprovado. Aviso de bundle acima de 500 kB persiste. Typecheck tem os 22 diagnósticos preexistentes, sem novos diagnósticos desta entrega. Não foram reinstaladas dependências.
- git diff --check no escopo passou; a entrada de produção foi examinada e não contém o simulador de QA.
- QA com doubles fictícios: aplicação, criação, edição no drawer, preservação de pilar, vínculo existente, troca de cliente e mobile sem rolagem horizontal. Detalhes e imagens em IMPLEMENTACAO-CICLOS-CONTEUDOS.md.
- Banco remoto: SQL fiel, RLS/grants/trigger/negações verificados. Cinco Contents e um ciclo com fingerprints integrais inalterados. Novas tabelas vazias. Leitura autenticada de Conteúdos/Planejamento no domínio principal sem erros de console.
- Não houve criação/vínculo real pela interface nova, upload ou aprovação real nesta entrega. Os seletores legados de clientes/perfis para membros restritos e a segurança integral de outros domínios continuam pendentes. Não declarar MVP ou SaaS homologado por esta publicação.
- Relatórios, integrações de mensagens/Drive, portal e demais fases não fazem parte deste pacote. Relatórios comparando resultados à estratégia permanece direção registrada.

## Execução autorizável

Após autorização específica: adicionar somente a lista acima, conferir o staged, criar commit e fazer push sem force para chore/s3-reconciliation e main. Acompanhar a publicação automática Vercel até Production/Current Ready no novo commit, no domínio https://meli-re-office.vercel.app. Conferir leitura autenticada de Planejamento/Conteúdos, sem criar dados operacionais, reaplicar migração ou enfraquecer proteção de previews.

O registro da conclusão poderá ser acrescentado localmente depois do commit, sem um novo commit apenas para acionar outra publicação. Se main mudar antes do push, parar e avaliar o delta; não sobrescrever trabalho remoto.
