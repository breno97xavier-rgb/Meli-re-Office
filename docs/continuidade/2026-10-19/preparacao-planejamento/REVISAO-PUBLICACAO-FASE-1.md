# Revisão para publicação — Planejamento, primeira parte

Data: 22/10/2026. Estado: pacote local revisado; publicação NÃO autorizada nem executada neste marco.

## Destino verificado

Repositório breno97xavier-rgb/Meli-re-Office. Branch local chore/s3-reconciliation; HEAD e referências remotas main e chore/s3-reconciliation em 73f4028db501f87bd362430bfcf846f08553720f (git ls-remote desta rodada). Vercel meli-re-office, prj_Rv5KFlxDv8gSkszEJ16GIh39Jq4B, equipe team_78Y4mwHl4nJOf5Gm8RjLX4zU. Painel autenticado confirmou produção Ready em main/73f4028, deployment NzAXHXMoffEDzhA8rmHfNquWeZgu, domínio https://meli-re-office.vercel.app. O conector tem 403 para consultar deployments, mas o painel no navegador está acessível. Não é necessário alterar permissões do usuário para esta revisão.

## O que muda visualmente

Planejamento passa a ter abas Estratégia / Briefing / Pilares e séries / Ciclos editoriais / Campanhas. Briefing personalizável opcional com versões; estratégia com vigência, revisão prevista e histórico; séries com vários pilares/canais e arquivamento sem exclusão. Ciclos e campanhas atuais preservados. Não implementa grades reutilizáveis, execuções/geração de Conteúdos ou indicadores desta remodelagem. Não inclui e-mail, WhatsApp, Drive ou portal de cliente.

## Arquivos de aplicação desta entrega (lista explícita)

- src/components/planning/BrandStrategySection.tsx
- src/components/planning/BriefingSection.tsx
- src/components/planning/EditorialSeriesSection.tsx
- src/components/planning/StrategyHistory.tsx
- src/hooks/useClientStrategy.ts
- src/hooks/useRouter.ts
- src/pages/PlanningPage.tsx
- src/services/planningFoundationService.ts
- src/types/planning.ts
- src/types/planningFoundation.ts

Migrações já aplicadas, apenas para manter histórico local/Git coerente (NÃO reaplicar):

- supabase/migrations/20261020010158_scope_planning_authorization_to_workspace.sql
- supabase/migrations/20261022212647_planning_briefing_strategy_revisions_series.sql

Testes correspondentes para versionamento:

- tests/security/planning-authorization-lab.sql
- tests/security/planning-foundation-lab.sql
- tests/security/planning-foundation-concurrency.ps1
- tests/security/run-planning-authorization.ps1
- tests/security/planning-foundation.test.mjs
- tests/security/planning-strategy-state.test.mjs
- tests/security/planning-navigation.test.mjs
- tests/security/planning-preview.config.mjs
- tests/security/planning-preview.html
- tests/security/planning-preview.tsx
- tests/security/planning-preview-services.ts

Documentação específica de revisão/continuidade: este arquivo e preparacao-planejamento/IMPLEMENTACAO.md. O relatório principal pode ser incluído somente após revisão de seu conteúdo integral, pois é parte do pacote de continuidade anterior não rastreado. Não adicionar docs/ inteira por conveniência.

## Exclusões e preservação

Não incluir supabase/.temp, s4_1_public_schema.sql, arquivos .env, capturas externas, demais alterações dos README de auditoria, run-presentation-decisions.ps1 ou outros arquivos não rastreados sem revisão. Não usar git add -A. Preservar todo trabalho anterior. Nenhuma alteração em package.json/bun.lock, Auth/Storage/Google ou funções remotas nesta publicação. A publicação do frontend não exige db push nem nova migração.

## Verificações e limites

Rodada final: 158/158 testes Node aprovados; npm run build exit 0 (1918 módulos, aviso preexistente de pacote grande); git diff --check sem erros, apenas avisos CRLF de arquivos anteriores. npm run lint exit 1 com os mesmos 22 diagnósticos fora dos arquivos de Planejamento/navegação; comparação anterior com HEAD confirmou 22 na base. Não apresentar lint aprovado. Sem ajustes incidentais nesses módulos ou bibliotecas.

Dist contém somente index.html e dois assets compilados. Busca por TESTE LOCAL, fictional-a, Café Horizonte e planning-preview não encontrou ocorrências no artefato; cenário fictício não integra a aplicação de produção.

SQL: 60 verificações e concorrência passaram anteriormente em laboratório. Repetição posterior impedida por ausência do runtime PostgreSQL temporário; não reinstalado. Catálogo remoto confirmou migração exata, permissões e preservação de dados. Leitura remota com identidade simulada do autor e papel authenticated passou; sem identidade retorna zero linhas. Isso não equivale a JWT real nem gravação autenticada ponta a ponta.

UI local com serviços em memória: briefing/histórico, estratégia/revisões/datas, séries com dois pilares, arquivamento e troca de cliente conferidos. Layout 390x844 sem overflow horizontal observado. Diálogo nativo de descarte travou a automação; resultado manual ainda pendente. Navegação via menu tem evento cancelável testado em três regressões; voltar/avançar do navegador (popstate) não tem bloqueio. Avisar esse limite ao validar rascunhos; não homologar universalmente.

## Sequência proposta após autorização específica

1. Conferir novamente hashes/status/main remoto e revisar lista explícita de staged, preservando alterações externas.
2. Criar commit apenas do escopo listado/revisado e enviar à branch de trabalho e main sem force/reset, desde que ambas continuem compatíveis. Qualquer avanço remoto exige reconciliação antes de publicar.
3. A publicação de main pelo vínculo Git/Vercel altera a interface no domínio principal. Aguardar READY e confirmar que o deployment corresponde ao novo commit. Não desativar proteção, não reaplicar migrações.
4. Conferir carregamento autenticado e histórico no domínio principal, inicialmente somente leitura. Escrita de teste precisa de dados/recorte aprovado; não criar cliente, lead, oportunidade ou contrato fictício para isso. Até esse teste, persistência do frontend permanece pendente.
5. Se houver falha material após publicação, registrar evidências e propor recuperação usando a produção anterior identificada; não fazer alterações de banco para tentar mascarar defeito de UI.

A autorização pedida deve mencionar commit/push/publicação desta primeira parte, sem estender a novas alterações remotas de banco ou criação/limpeza de dados. A permissão de publicar não é homologação completa do Planejamento nem dos sete módulos.
