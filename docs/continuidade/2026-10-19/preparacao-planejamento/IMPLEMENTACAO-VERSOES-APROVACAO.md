# Versão dos materiais e parecer — pacote local para revisão

23/10/2026. Base: 71416fbd3ce465401277d2de6d8fd606c859170a / chore/s3-reconciliation. Preparação e testes expressamente autorizados. Nenhuma escrita remota, commit, push ou publicação nesta etapa. Trabalho anterior preservado fora do escopo abaixo.

## Comportamento implementado localmente

- Preparar versão para avaliação é uma ação explícita no editor, com confirmação. Preserva textos apresentados, instruções da rodada e referências exatas das mídias visuais (imagem, vídeo e thumbnail), incluindo ordem e versão. Arquivos-fonte e anexos não apresentáveis não são compartilhados por essa ação.
- A cópia preparada é imutável. Rodada preparada não aceita novos itens, exclusão, reordenação ou alteração das instruções. Para corrigir ou substituir materiais enviados, usar Nova Rodada; aproveita a linhagem existente, sem duplicar a entidade central do conteúdo.
- Pedido de ajustes e aprovação informam o identificador da versão exibida. Telas antigas/sem versão são recusadas; o primeiro parecer é preservado. Nova rodada começa pendente, sem herdar snapshot ou aprovação.
- Alterações materiais de texto/arquivos incrementam revisão interna. Peça aprovada e ainda não publicada volta a produção. Aprovar snapshot antigo não aprova material atual nem sobrescreve estado de revisão mais recente. Conteúdos publicados/cancelados seguem preservados pelos fluxos existentes.
- Pareceres antigos permanecem intactos, sem reconstrução de versão por timestamp ou pela mídia atual. São identificados como históricos, sem versão comprovada; seus arquivos/textos atuais não são apresentados como material avaliado. Nova rodada permite revalidação.
- Substituir, remover da visão atual e reordenar mídia usam RPC transacional com validação de workspace/cliente/permissão e alvo atual. Histórico de arquivo referenciado não é apagado. Resposta de rede indeterminada não dispara exclusão do arquivo possivelmente já registrado; falha SQL confirmada compensa somente o upload desta tentativa.
- Cópias preparadas também protegem contra exclusão da peça e transferência para outro cliente. Sem limpezas de dados.
- Correções locais anteriores de datas opcionais e normalização storage_path → file_url fazem parte deste pacote.

## Servidor de mídia pública

Função nova: presentation-review-media. Não recebe lista de caminhos: recebe somente token opaco. O banco valida hash, expiração, revogação, workspace ativo e apresentação. O servidor assina apenas caminhos canônicos da versão dessa rodada, confere cliente/conteúdo, valida novamente o token após assinar e não devolve erros internos/credenciais.

Bucket content-assets permanece privado. Nenhuma policy de Storage ou root RLS é ampliada. Chave de serviço fica só no servidor. URL emitida dura no máximo 300 segundos, limitada ao prazo restante calculado na emissão; uma URL já emitida pode continuar acessível durante seu curto prazo após a revogação. A página renova mídia a cada 240 segundos sem fechar o formulário de feedback. Respostas não podem ser armazenadas em cache.

Limites explícitos deste recorte: até 200 itens e 100 arquivos apresentáveis por rodada, corpo de 2 KiB no endpoint; caminhos antigos fora do padrão exigem revisão, sem migração/movimentação automática. Não implementa integrações sociais, notificações, Drive ou portal.

## Banco e preflight de leitura

Migração local criada pelo CLI instalado: 20261024023931_presentation_review_versions.sql. SHA256: 9B1EB9F52573BA042B20824C55D851A377213E664C0AFA525BFC3A4A7A75C1E5. A proposta presentation-review-versions.sql tem os mesmos bytes; permanece fora do pacote de commit, como rascunho de trabalho.

- Acrescenta material_revision em contents e cinco campos de versão em presentation_items; não altera textos/pareceres operacionais existentes nem preenche snapshots antigos.
- Instala proteções de versão/histórico e três RPCs de operação. Reescreve o getter público para usar a cópia preservada. RPCs antigas de decisão recusam chamadas sem versão; reconciliador existente continua privado. Helpers têm search_path fixo e execução direta revogada para anon/authenticated. Nenhuma tabela nova ou policy global permissiva. O trigger de arquivos confere operação em Conteúdos no workspace do cliente, impedindo que a policy antiga de administrador global cause uma mudança indireta de status em outro workspace.
- Projeto remoto meliere-assets / ycagvwsvccgdjzpbhrfi reconfirmado ACTIVE_HEALTHY. Leitura: 7 Contents, 4 itens de apresentação, 3 pareceres decididos, 0 links ativos; coluna review_id ainda ausente e bucket privado confirmado. SQL original das três RPCs substituídas salvo fielmente em baseline-review-rpcs-20261023.sql, somente para auditoria/contingência, não executar automaticamente.
- Permissões globais antigas de Storage/Clientes e dependências de seletores continuam fora deste recorte. Não afirmar segurança integral do SaaS; usuários restritos e infraestrutura real ainda exigem conferência.

## Testado

- 195/195 testes Node aprovados, incluindo acesso anônimo por token em doubles, falhas de assinatura parcial, caminhos de outro cliente/conteúdo, revogação durante assinatura, expiração, CORS, tamanho da entrada, preservação de versão e compensação segura. Adapter Edge avaliado em VM com SDK e Deno simulados, sem instalar runtime/dependências ou acessar serviço real.
- 39 verificações PostgreSQL/concorrência locais aprovadas contra a migração final: snapshot imutável, nova rodada pendente, alterações posteriores preservadas, substituição v2, rollback em falhas, aprovação antiga não aprova versão nova, revisão mais recente preservada, escopo de workspace e negações anônimas. Duas sessões reais: preparar/substituir concorrentes; decisões simultâneas registram um único parecer. Cluster fictício isolado em loopback, encerrado em finally; nada no Supabase remoto.
- Build final aprovado (18,89 s). Typecheck mantém 22 diagnósticos preexistentes, sem novo diagnóstico nos arquivos alterados desta entrega. Aviso conhecido de bundle >500 kB. Diff check aprovado.
- QA Chrome local com componentes reais e dados fictícios: preparar → pedir ajustes → alterar texto atual sem alterar o texto preservado → nova rodada pendente → preparar nova versão → aprovar. Parecer legado mostra aviso e não oferece novos botões de aprovação. Um aviso de createRoot durante HMR do harness foi corrigido com dispose; nova aba sem erro de console. Esse harness não representa teste completo do editor nem integração remota.
- Imagens em C:/Users/breno/.codex/visualizations/2026/10/19/01a15685-735f-7f10-a987-a91a3d345d8f/: revisao-versao-ajustes-local.png, revisao-versao-aprovada-local.png, revisao-parecer-historico-local.png.

## Ordem proposta de aplicação — ainda exige autorização

1. Reconfirmar projeto/branch/estado remoto e comparar definições atuais com o baseline; conferir que a migração não foi aplicada, Storage continua privado e não surgiram dados/links conflitantes. Revisar a execução transacional do SQL e preservar baseline antes de escrever.
2. Aplicar somente a migração acima no projeto confirmado, sem db push indiscriminado, repair ou reaplicação de histórico. Conferir ledger/SQL efetivo, grants, triggers, contagens e preservação dos registros existentes. Nenhuma cópia retroativa de pareceres.
3. Publicar somente a função nova presentation-review-media, com checagem JWT de plataforma desabilitada exclusivamente nela, pois a autenticação é pelo token restrito da apresentação no corpo. Isso não muda Google Calendar ou outra função. Configurar PRESENTATION_REVIEW_ORIGINS exatamente como https://meli-re-office.vercel.app. Essa exposição pública nova faz parte da aprovação de implantação; não é bucket público. Usar credenciais de servidor já gerenciadas, sem imprimir valores.
4. Commit/push de somente os 31 arquivos abaixo e publicação coordenada da interface no domínio principal; preservar todas as alterações antigas. Banco e UI são dependentes: clientes antigos falham de modo fechado para avaliar/substituir até a nova interface. Não operar apresentações nesse intervalo. Não enfraquecer proteção de preview.
5. Conferência real, em registros TESTE QA: nova rodada, upload, preparo da versão, link em contexto realmente sem sessão administrativa, pedir ajustes, nova versão/nova rodada, aprovar, conferir conteúdos e retorno interno. Encerrar links temporários e preservar dados. Não declarar homologação só por testes/build.

Se algo falhar na implantação: interromper o fluxo e preservar dados/colunas/arquivos. O baseline SQL não é autorização para rollback: restaurar getter antigo depois de versões novas poderia novamente associar parecer antigo a mídia atual. Não apagar snapshots, não reparar ledger e não fazer downgrade automático; preparar recuperação compatível e obter autorização se necessária.

## Arquivos delimitados (31)

- src/components/planning/EditorialPlanFormModal.tsx
- src/components/presentations/PresentationItemCard.tsx
- src/components/presentations/PresentationItemsFeed.tsx
- src/components/presentations/ReviewVersionNotice.tsx
- src/components/presentations/renderer/panels/PresentationItemDecisionPanel.tsx
- src/hooks/usePresentationEditor.ts
- src/hooks/usePublicDecision.ts
- src/hooks/usePublicPresentation.ts
- src/pages/PresentationEditorPage.tsx
- src/pages/PublicPresentationPage.tsx
- src/services/contentAssetsService.ts
- src/services/presentationAccessService.ts
- src/services/presentationDecisionContracts.ts
- src/services/presentationsService.ts
- src/services/presentationReviewContracts.ts
- src/services/publicDecisionService.ts
- src/types/presentations.ts
- supabase/functions/_shared/presentation-review-media-core.ts
- supabase/functions/presentation-review-media/index.ts
- supabase/migrations/20261024141424_presentation_review_versions.sql
- tests/security/content-assets-mvp.test.mjs
- tests/security/presentation-decision-contracts.test.mjs
- tests/security/presentation-review-media.test.mjs
- tests/security/presentation-review-runtime.test.mjs
- tests/security/presentation-review-preview.html
- tests/security/presentation-review-preview.tsx
- tests/security/presentation-review-versions-lab.sql
- tests/security/run-presentation-review-versions.ps1
- docs/continuidade/2026-10-19/preparacao-planejamento/REVISAO-VERSAO-MATERIAIS-APROVACAO.md
- docs/continuidade/2026-10-19/preparacao-planejamento/baseline-review-rpcs-20261023.sql
- docs/continuidade/2026-10-19/preparacao-planejamento/IMPLEMENTACAO-VERSOES-APROVACAO.md

Ficam fora: proposta SQL duplicada, continuidade geral local, pacotes/evidências originais, ajustes antigos de documentação/testes, supabase/.temp e arquivos não relacionados. Não foi feito git add.

Referências oficiais consultadas: https://supabase.com/docs/reference/javascript/storage-from-createsignedurls e https://supabase.com/docs/guides/functions/auth. O changelog.md não pôde ser lido pelo navegador de pesquisa por formato de conteúdo; não foi presumida alteração de API nem atualizado SDK. Padrão de adapter segue a versão 2.112.4 já usada no repositório.

Servidores locais PostgreSQL e Vite encerrados. Verificação do bundle final não encontrou o harness de teste nem referências à chave de serviço. Nenhum staged, commit ou publicação realizado.

Conclusão em 24/10/2026 (iniciado em 23/10): 39 verificações SQL/concorrência finais. Proteção de remoção/identidade inclui pareceres legados, não só versões novas. Nenhum dado antigo foi reescrito.


## Aplicação autorizada e confirmação interna — 24/10/2026

Usuário autorizou o pacote de banco/servidor/interface, commit e envio, e pediu que confirmações de descarte do Planejamento sejam feitas dentro do Office. Acrescentados dez arquivos ao escopo, total de 41, listados abaixo. Troca de aba, cliente, saída para outra página do Office e confirmações internas dos editores usam diálogo acessível com Continuar preenchendo / Descartar e continuar. Cancelar mantém o rascunho; confirmar executa somente a ação pedida. Não há botão genérico de salvar formulários distintos. Ao fechar/recarregar a aba, beforeunload continua nativo por restrição do navegador.

QA local confirmou cancelamento preservando texto, descarte trocando aba e ausência de erro de console. Novo teste de navegação assíncrona incluído: 196 testes aprovados. Typecheck mantém 22 diagnósticos anteriores. Evidência: confirmacao-office-local.png na pasta de visualizações deste chat.

Supabase confirmou baseline e hash idênticos antes da aplicação. Migração presentation_review_versions aplicada uma vez, versão efetiva 20261024141424; arquivo local e fixture reconciliados apenas no nome, SQL/hash inalterados. Sem repair/reaplicação. Contagens 7 Contents/4 itens preservadas, zero versões preparadas. Fingerprints dos campos operacionais antes/depois iguais: Contents 7dba8f9a4644d2fca9d62bbea703420e; itens 10e6e5f59083c928e9b40188a057a0ff. Bucket privado; anon sem execução de preparo/mutação.

Função presentation-review-media publicada ACTIVE v1, ID 9899af61-b29f-4e37-8bcd-c3ff188b77f6. Origem permitida configurada via CLI como https://meli-re-office.vercel.app, sem leitura/exposição de credenciais. Demais funções não foram substituídas. Interface e conferência integrada em andamento neste registro.

### Arquivos adicionais autorizados

- src/components/shared/OfficeConfirmProvider.tsx
- src/pages/PlanningPage.tsx
- src/hooks/useRouter.ts
- src/components/planning/BrandStrategySection.tsx
- src/components/planning/BriefingSection.tsx
- src/components/planning/EditorialCyclesSection.tsx
- src/components/planning/EditorialExecutionSection.tsx
- src/components/planning/EditorialSeriesSection.tsx
- src/components/planning/EditorialTemplatesSection.tsx
- tests/security/planning-navigation.test.mjs

## Conferência publicada — 25/10/2026

Commit 37b08ac publicado em main e chore/s3-reconciliation em 24/10; Vercel confirmou Production/Ready para main. Confirmação de descarte dentro do Planejamento validada no domínio principal: continuar preserva texto; descartar troca aba sem gravar. Evidência confirmacao-office-publicada.png. Build passou, 196 testes Node e 39 verificações SQL/concorrência locais anteriores; permanecem 22 diagnósticos de tipos preexistentes.

Em 25/10, leitura remota confirmou preparação feita pelo usuário na Rodada 2 (0acb8472-702b-4e60-99ac-36c0b3533d65), em 24/10 às 18:04 UTC. Teste pelo Office criou um link temporário somente para essa apresentação fictícia. Sessão separada no navegador interno abriu sem login administrativo, imagem 600px carregada, pedido de ajustes fictício enviado e confirmado por leitura no banco: rodada 2 approved_with_adjustments, item adjustments_requested, versão preservada. Rodada 1 9acc7235-ccc6-4617-b336-328309c253af segue approved, sem versão retrospectiva inventada.

Link temporário revogado pela interface; recarregamento público exibiu Link de acesso revogado. Nenhum registro removido. Não foram feitas novas migrações, publicação, commit ou mudanças de código nesta conferência. Evidência avaliacao-ajustes-publicada-20261025.png na pasta de visualizações deste chat, sem registrar tokens ou URLs assinadas.

Pendências: testar próxima rodada com material alterado e aprovação final em produção; melhorar destaque visual de Preparar versão para avaliação (usuário não reconheceu como botão); confirmar recuperação/backup e demais critérios do MVP. O teste deste recorte não homologa todo o SaaS. Falhas de controle da aba antiga foram contornadas com nova aba, sem pedir nova intervenção do usuário.

### Retorno de ajustes — 25/10/2026
Pela interface do Office, alterada somente a legenda da peça fictícia b8975a15-aa1f-4f34-b3ce-779866a18881 para TESTE QA 25/10 — legenda revisada após solicitação de ajustes. Material fictício, sem publicação social. Revisão do material passou a 2. Criada pela interface a Rodada 3 fc7c3424-8cc5-47c1-a558-89762e4a69fe, com uma peça, seleção automática por ajustes solicitados e comentário anterior mostrado como contexto. Leitura remota confirmou item novo pending/sem snapshot e Rodada 2 com adjustments_requested, snapshot original e legenda original nula, apesar da legenda atual preenchida. Confirmação nativa de preparação não foi acionada novamente pela automação devido ao bloqueio já conhecido. Rodada 3 deixada aberta para preparação manual antes da conferência pública final. Nenhum novo link foi criado. Evidência rodada-3-rascunho-20261025.png. Sem mudança de código, commit ou deploy.

### Correção local de clareza e confirmação — 25/10/2026
Usuário relatou novamente botão discreto e confirmação do Chrome em Apresentações. Corrigidos localmente src/pages/PresentationEditorPage.tsx e src/components/shared/OfficeConfirmProvider.tsx: botão escuro, ícone, título da seção e confirmação interna com Cancelar/Preparar versão. Defaults do Planejamento preservados. Sem alteração de banco ou lógica de versionamento. Harness tests/security/review-confirm-preview.{html,tsx,config.mjs} usa página real com serviços em memória e bloqueia acesso ao Supabase; fora do bundle de produção.
Build passou; 196 testes existentes passaram; typecheck mantém 22 diagnósticos preexistentes. QA visual local: Cancelar é foco inicial, cancelamento retorna foco ao botão sem preparar; confirmar altera somente o estado fictício para versão preservada e desabilita nova preparação. Erro inicial de export ausente no double do harness foi corrigido antes da conferência. Revisão React: hooks incondicionais, efeitos com cleanup existente, diálogo nativo com nomes/descrição, ícones decorativos e foco visível. Evidências preparar-versao-botao-local.png e preparar-versao-confirmacao-local.png. Pendente publicação específica desta correção; nenhum commit/push/deploy executado nesta etapa. Rodada 3 remota não foi preparada novamente pela automação.
