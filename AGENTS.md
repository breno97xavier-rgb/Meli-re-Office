# Office — instruções permanentes para agentes de desenvolvimento

> Projeto: **Office** (nome provisório do SaaS; Melière Marketing é o primeiro workspace/usuário interno). Estas instruções se aplicam ao repositório inteiro. Não confundir com documentação de uma funcionalidade específica.

## 1. Fontes de verdade e precedência

1. **Estado efetivo do código, banco e infraestrutura**: verificar por inspeção; documentos históricos não comprovam que uma implementação está ativa ou homologada.
2. **Fonte Mestre — Office (26/09/2026)**, fornecida pelo usuário: arquitetura, histórico, decisões aprovadas, fases F/INT/S e roadmap SaaS. A Fonte Mestre de 26/09 substitui as versões anteriores.
3. **Diretriz Complementar — MVP Operacional (09/10/2026)**: complementa a Fonte Mestre e prevalece **somente na prioridade imediata de execução**, sem revogar segurança, arquitetura ou dependências obrigatórias.
4. **Decisões expressas do usuário na conversa atual**: registrar novas decisões importantes, com data, no relatório de continuidade; não reinterpretar silêncio como autorização.

Se documentos e implementação divergirem, investigar, apresentar evidências e pedir decisão quando houver impacto técnico. Não declarar etapas concluídas com base apenas em registros históricos.

## 2. Objetivo e escopo

- Entregar primeiro um **MVP operacional interno** para a Melière Marketing, testado com dados fictícios antes do uso de dados reais.
- Preservar a arquitetura **multi-tenant** por `workspace_id`, autorização e isolamento entre workspaces; objetivo posterior é SaaS por assinatura para freelancers, profissionais e agências.
- Não tratar a Melière como exceção arquitetural, nem "Melière Office" como marca SaaS definitiva.
- Evitar reconstruir módulos, duplicar entidades ou ampliar escopo sem necessidade comprovada.
- Site institucional e Office deverão ser aplicações independentes no futuro; não migrar bancos, autenticação, Storage ou integrações sem plano e autorização.

## 3. Ordem prioritária do MVP (trilha M0–M6)

- **M0**: fechar pendências técnicas atuais, verificar lint, migrações e segurança; registrar o que está efetivamente validado.
- **M1**: auditar telas, rotas, código, tabelas, RLS, RPCs, Storage e testes dos sete módulos.
- **M2**: requisitos mínimos de autenticação, autorização, isolamento por workspace, persistência e recuperação de dados.
- **M3**: núcleo Clientes → Planejamento → Conteúdos, utilizável de ponta a ponta.
- **M4**: Apresentações → Tarefas → Calendário → Financeiro, com ordem ajustável após análise de dependências.
- **M5**: testes e regressões com dados fictícios, depois entrada controlada de dados reais.
- **M6**: evolução SaaS e fases S4–S10 restantes, sem presumir homologação.

Sete módulos: **Clientes, Planejamento, Conteúdos, Apresentações, Tarefas, Calendário, Financeiro**. A trilha M0–M6 é uma prioridade operacional, não substitui a numeração histórica F/INT/S.

Regras de produto: cadastro manual de cliente sem criar lead/oportunidade/contrato fictícios; preservar a entidade central de clientes e `workspace_id`; calendário sem duplicar fontes de verdade; apresentações com histórico/linhagem; financeiro operacional mínimo, não suíte contábil completa.

## 4. Procedimento obrigatório antes de modificar

1. Identificar pasta, branch, `git status`, alterações locais, ambiente e projeto Supabase alvo. Nunca descartar trabalho não commitado ou arquivos não rastreados.
2. Inspecionar código e schema existentes antes de propor nova implementação; preferir consultas somente de leitura.
3. Explicar de modo acessível: diagnóstico, evidências, alternativas quando relevantes, risco, escopo exato e plano de validação.
4. **Pedir autorização expressa antes de**: qualquer alteração no banco remoto, aplicação/reparo de migrações, DDL/DML de escrita, mudança de grants/RLS, deploy, push, reset, exclusão, reestruturação importante, movimentação de dados ou operações potencialmente destrutivas. Não interpretar autorização para um arquivo local como autorização para deploy ou banco.
5. Em alterações locais não destrutivas, cumprir apenas o escopo autorizado; não incluir melhorias incidentais sem consentimento.
6. Executar testes e verificações adequados ao escopo, respeitando limites de permissão; reportar o que foi efetivamente executado, o que falhou e o que não foi testado.
7. Distinguir sempre **proposto / implementado / testado / homologado**. Não declarar homologação de segurança por lint ou por sucesso de migration.

## 5. Banco, migrações e segurança

- Supabase remoto conhecido: projeto **`meliere-assets`**, ID **`ycagvwsvccgdjzpbhrfi`**. **Confirmar** ambiente, vínculo e permissões antes de operar; identificador não é autorização para escrever.
- Nunca executar `db push`, `db pull`, `db reset`, `migration repair`, SQL de escrita ou deploy sem autorização específica e análise de impacto.
- Não editar migrações históricas já aplicadas para ocultar correções posteriores. Preferir migrações incrementais, versionadas e auditáveis.
- Auditar RLS, SECURITY DEFINER, grants, autenticação, validação de escopo por workspace, Storage e acesso público. Funções públicas podem ser intencionais; não revogar indiscriminadamente.
- Não expor segredos, tokens, arquivos `.env` ou dados pessoais em logs, respostas ou commits. Não registrar credenciais em documentos.
- Não cadastrar clientes reais nem dados reais enquanto não houver critérios mínimos de segurança, testes e estratégia verificada de backup/recuperação.

## 6. Estado técnico observado em 09/10/2026 — verificar novamente

- Pasta local Windows: `C:\Users\breno\Meli-re-Office`; React + TypeScript + Vite; `src`, `supabase/migrations`, Git.
- Branch local observada: `chore/s3-reconciliation`, commit `dab0fa8`; havia alterações locais e arquivos não rastreados. Não presumir sincronização com GitHub.
- Remoto GitHub: `breno97xavier-rgb/Meli-re-Office`, `main` observada em `64c9ff4`; referências locais não provam atualização em tempo real.
- Remoto Supabase registrava **16 migrações**, local possuía **15 arquivos**, apenas **13 rastreados no HEAD**. As migrações de 28/09 e 29/09 estavam presentes, mas não rastreadas.
- Migrações S4.1 remotas: `20260928221857_s4_1_membership_auth_foundation`, `20260929000511_fix_create_next_presentation_round_view_mode`.
- Migração corretiva remota **`20261009132955_fix_create_next_presentation_round_item_timestamp`** aplicada em 09/10, ainda ausente dos arquivos locais no diagnóstico. Ela remove `updated_at` do INSERT em `public.presentation_items` na função `public.create_next_presentation_round`, preservando o `updated_at` válido em `public.presentations`.
- `npx.cmd supabase db lint --linked` retornou **`No schema errors found`** após essa correção. Isso não atesta segurança ou funcionalidade integral.
- Supabase Security Advisor sinalizou: 3 tabelas com RLS habilitada sem políticas, 5 funções com `search_path` mutável, 6 funções SECURITY DEFINER executáveis por `anon` e 15 por `authenticated`. Investigar finalidade, risco e dependências antes de qualquer mudança.
- O Supabase armazenou o SQL original da correção no campo `statements` de `supabase_migrations.schema_migrations`, versão `20261009132955`. Recuperar fielmente, sem reconstruir por aproximação.
- Supabase CLI não estava no PATH global, mas o pacote 2.120.0 foi encontrado no cache do npx. `npx.cmd` já funcionou anteriormente; não instalar nada sem necessidade e autorização.

**Esses são registros de diagnóstico, não garantias de estado atual.** Verificar antes de agir.

## 7. Primeira tarefa autorizada na transição

O usuário autorizou **somente a criação local** de `supabase/migrations/20261009132955_fix_create_next_presentation_round_item_timestamp.sql`, com o SQL **original** da migração remota correspondente. Consultar o registro `supabase_migrations.schema_migrations` por meio autenticado de leitura, extrair `statements`, gravar exatamente o SQL, comparar com a origem e verificar `git status --short`. Se não houver acesso autenticado, parar e solicitar o conteúdo ou o meio de consulta; **não inventar SQL**. Não modificar arquivos históricos, não fazer `git add`, commit, push, deploy ou operação de escrita no Supabase. Esta autorização não se estende a outras tarefas.

## 8. Comunicação e continuidade

- Responder em **português brasileiro**, de forma objetiva, clara e passo a passo; explicar termos técnicos quando necessário.
- Ser crítico; não concordar automaticamente. Explicitar incertezas e não afirmar acesso ou execução que não ocorreu.
- Para alterações de arquivos grandes, preferir edição direta no repositório quando autorizada; quando for preciso entregar código/SQL para execução manual, fornecer **arquivo ou comando completo**, não fragmentos que exijam montagem pelo usuário.
- Evitar tornar o usuário intermediário entre chats. Conduzir diagnósticos, decisões e execuções dentro do próprio Codex sempre que houver ferramentas e permissões adequadas.
- Manter ao fim de cada marco um registro breve de **estado, decisões, evidências, pendências, próxima ação e testes**, em arquivo de continuidade somente após autorização para criá-lo/atualizá-lo.
- Se houver compactação de contexto ou nova conversa, reler `AGENTS.md`, a Fonte Mestre, a Diretriz MVP e o estado real do repositório; não depender de memória de chat.
