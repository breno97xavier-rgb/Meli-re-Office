# Ciclos → Conteúdos — implementação local e revisão

Data: 23/10/2026. Base 7a4cf0f / chore/s3-reconciliation.

## Autorização e estado

O usuário autorizou preparar e testar localmente a correção de autorização de Conteúdos e a ligação entre vagas e peças. Não autorizou nesta etapa escrita no banco remoto, commit, push ou publicação. Esses atos não foram executados. Alterações locais anteriores preservadas.

Implementado localmente, testado no laboratório e com doubles de interface; não aplicado nem homologado no Supabase ou no domínio principal.

## Entrega

- Reutiliza editorial_plans como ciclo, inclusive sem período civil: ambas as datas vazias ou ambas válidas. Não calcula datas de peças pela posição do modelo.
- Aplicação guarda uma cópia da versão do modelo e das vagas. Uma aplicação por ciclo; repetir o pedido da mesma versão retorna o mesmo registro, outra versão não sobrescreve. Não cria Contents em lote, não altera metas/alocações existentes e não automatiza recorrências.
- Cada vaga mantém quantidade e destinos. Operador escolhe uma unidade para criar uma peça draft ou vincular uma existente. Mesma peça não ocupa duas unidades; dois destinos não criam dois Contents. Os destinos continuam sendo instrução editorial da aplicação, não uma publicação efetiva ou conexão social.
- Criação/vínculo são transacionais. Repetição simultânea não duplica peça. Vincular existente preserva texto, status, aprovação, arquivos e data; apenas atribui ciclo quando ainda não houver um. Peça de outro ciclo não é movida silenciosamente.
- Editor de Conteúdos reutilizado. Campos de título/formato/data da criação são conferidos antes de abrir o editor completo. Sem data permanece compatível com backlog. Formato obrigatório deve ser escolhido se a vaga não especificar um.
- Edição de peça preserva pilar já gravado, mesmo fora da alocação quantitativa do ciclo. Não escreve de volta no modelo. Alterar cliente/ciclo/id ou excluir uma peça já vinculada é bloqueado para preservar o histórico. Futuro desfazer vínculo/exclusão exige procedimento explícito; não implementado nesta etapa.
- Funil livre preservado no banco e no editor; canal principal pode ficar nulo. Canal legacy newsletter permanece aceito, com adição de whatsapp/other para compatibilidade com o frontend. Formatos e estados canônicos não mudam.

## Banco proposto e limites de segurança

Arquivo completo: planning-cycle-contents.sql (ainda proposta, fora de supabase/migrations).

- Troca somente a policy global de contents por quatro policies de SELECT/view, INSERT/UPDATE/operation, DELETE/management. Helper privado consulta workspace ativo, membership, permissão contents e client scope. Policy desconhecida interrompe aplicação.
- Duas tabelas dependentes: editorial_cycle_applications e editorial_cycle_content_links. RLS e SELECT delimitado; nenhuma escrita direta para authenticated, nenhum acesso anon. Snapshots só ficam disponíveis a planning/view; vínculos exigem também contents/view.
- Duas RPCs públicas deliberadas e restritas a authenticated: apply_editorial_template e resolve_editorial_slot_content. Search path fixo, auth/escopo explícitos, validação antes de escrever e após espera por bloqueio. Criação/vínculo exige operation tanto em planning como em contents. Somente snapshot/aplicação exige planning.
- Uma função privada de trigger protege o vínculo da peça contra mudança de escopo.
- Não altera policies de Clientes, publicações, Storage, apresentações públicas ou o acesso por token. Não concede leitura de dados comerciais de Clientes para resolver seletores. As limitações legadas desses domínios permanecem e impedem afirmar isolamento completo do Office.
- Seletores atuais de clientes/perfis ainda dependem dos acessos legados. O fluxo visual foi conferido com dados fictícios e representa o usuário interno com acesso; não homologa toda a experiência de membros com permissões restritas. Essa dependência deve ser resolvida por projeções mínimas, sem liberar a tabela inteira de Clientes, antes de oferecer o fluxo a esses membros.
- Nenhum recurso externo de Instagram, Meta, WhatsApp ou Drive foi conectado. Não escreve em publications e não gera métricas externas.

## Verificações executadas

- 180/180 testes Node aprovados, incluindo oito contratos de serviço e dois cenários de datas opcionais adicionados nesta etapa.
- 141 verificações PASS no PostgreSQL portátil 17 local: fixture de fundação/modelos, testes de políticas e integração, mais duas sessões reais de concorrência (aplicação e criação). Servidor em loopback e encerrado em finally; nenhum .env ou endpoint Supabase utilizado pelo laboratório.
- Casos incluem isolamento recíproco A/B, administrador global sem membership, membro assigned, view/operation/management, suspensão, workspace inativo, ausência de identidade/anon, cargas e vínculos inválidos, rollback, snapshot preservado, repetição e proteção de peça vinculada.
- Build aprovado. Verificação de tipos segue com 22 diagnósticos preexistentes; nenhum diagnóstico novo em Planejamento/serviços desta entrega. Aviso de bundle maior que 500 kB permanece.
- QA Chrome com doubles isolados: aplicar modelo, criar peça, herdar objetivo/funil, abrir editor, salvar título, preservar pilar sem alocação, vincular peça preexistente, trocar cliente sem misturar ciclos, viewport 390 × 844 sem overflow horizontal (documento 385 px). Viewport restaurado.
- Ajustados erros do simulador durante o QA (exports de arquivos e nome editorialPlans); o cenário final rodou sem novos erros de console. Doubles nunca acessam Supabase; operações de upload ficam explicitamente indisponíveis nesse teste.
- git diff --check no escopo passou. Arquivos de QA são separados da entrada de produção.
- Upload real, persistência remota, aprovação real e navegação real até backlog/Calendário/Apresentações com a nova peça ainda não foram testados. Testes automatizados existentes passaram; isso não substitui a conferência integrada remota.

Evidências visuais locais em C:\Users\breno\.codex\visualizations\2026\10\19\01a15685-735f-7f10-a987-a91a3d345d8f:
execucao-ciclo-desktop-local.png; execucao-ciclo-mobile-local.png; execucao-editor-local.png.

## Próximo passo e publicação

Revisar os limites acima antes de promover a proposta SQL a migração incremental por CLI. Não aplicar automaticamente esta proposta. Aplicação remota exige autorização específica após conferir novamente projeto, policies, constraints, dependências e impacto nos cinco Contents já existentes. Commit/push/deploy também não estão autorizados neste marco.

Ainda faltam a conferência real integrada, a visão quantitativa completa e o fechamento do Planejamento; não declarar toda a remodelagem concluída.
SHA256 da proposta SQL: E7B19C485F88188FD06F2DF5D1DCADEFA3354CB5596E196EBEA6F5CF35DCA5BB


## Revisão posterior — 23/10/2026
Criada localmente pelo CLI a migração 20261024003810_planning_cycle_content_execution.sql, byte a byte igual à proposta testada (SHA256 E7B19C485F88188FD06F2DF5D1DCADEFA3354CB5596E196EBEA6F5CF35DCA5BB). Fixture passa a referenciá-la. Ajuste pontual no drawer preserva identificação do responsável quando o perfil não estiver na lista carregada. Build posterior aprovado; aviso de bundle permanece. Preflight remoto somente leitura confirmou 5 Contents, 1 ciclo, 0 modelos e ausência da migração; dependências e plano exato em REVISAO-BANCO-CICLOS-CONTEUDOS.md. Sem aplicação remota, stage, commit, push ou publicação.


## Atualização aplicada — 23/10/2026 (horário local)

Usuário autorizou expressamente: aplicar somente o pacote de estrutura/permissões no banco meliere-assets, preservando registros, sem publicação da interface. Projeto ycagvwsvccgdjzpbhrfi reconfirmado ACTIVE_HEALTHY; baseline conferido antes da aplicação.

- apply_migration retornou success=true uma única vez, nome planning_cycle_content_execution, versão efetiva 20261024015103 (UTC de 24/10, ainda 23/10 local).
- Comparação do histórico remoto: statements[1] idêntico ao SQL enviado (exact_source_match=true). SHA256 local E7B19C485F88188FD06F2DF5D1DCADEFA3354CB5596E196EBEA6F5CF35DCA5BB.
- Arquivo local reconciliado para supabase/migrations/20261024015103_planning_cycle_content_execution.sql; somente nome ajustado à versão registrada, sem reparar/reaplicar migração ou alterar o SQL. Fixture atualizado para essa referência.
- Cinco Contents e um ciclo preservados: contagens e fingerprints de todos os campos, calculados em leitura antes/depois, permaneceram iguais. Zero modelos, aplicações e vínculos; nenhum dado operacional foi criado, atualizado ou excluído.
- Conferidas as quatro policies de Contents, duas policies das tabelas novas, RLS nas três tabelas, SELECT apenas para authenticated nas tabelas novas e ausência de escrita direta/anon nelas.
- Funções novas pertencem a postgres, search_path public/pg_temp fixo. As duas RPCs públicas têm execução authenticated e não anon; helper privado segue restrito; função de trigger sem execução direta authenticated/anon. Trigger de proteção presente.
- Duas transações READ ONLY encerradas por ROLLBACK confirmaram: authenticated sem identidade vê zero linhas e recebe negação nas duas RPCs; anon não consegue executar as RPCs. Não se simulou identidade de usuário real e não houve criação de teste no remoto.
- Conferência autenticada no domínio principal, apenas leitura: Conteúdos listou as cinco peças; Planejamento carregou e a troca de cliente mostrou o ciclo histórico. Nenhum erro de console capturado. Não homologa gravação integrada, outros usuários, upload, aprovação ou calendário.
- Advisor de segurança: permanecem 5 tabelas com RLS sem policies, 5 funções com search_path mutável, 7 definers anon e proteção de senha vazada desativada. Categoria authenticated definer passou de 24 para 26 pelas duas RPCs deliberadas deste pacote, com autorização interna e negação sem identidade verificadas. Não houve revogação indiscriminada de funções públicas.

Referências dos advisors:
- [RLS sem policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- [Search path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [Definer anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Definer authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

Próxima ação: preparar revisão final do pacote frontend/commit/publicação para autorização própria. Não houve git add, commit, push ou deploy neste marco. Interface publicada continua na versão anterior. Limites de seletores legados, segurança dos outros domínios e homologação completa permanecem conforme este relatório; não liberar dados reais por inferência.
