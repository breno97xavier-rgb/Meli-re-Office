# Revisão para atualização do banco — ciclos e Conteúdos

Data local: 23/10/2026. Base 7a4cf0f, branch chore/s3-reconciliation. Aprovação visual do usuário registrada; autorização deste marco cobre preparação/revisão local, não aplicação remota ou publicação.

## Pacote concreto

Migração criada pelo Supabase CLI 2.120.0 já em cache, sem instalação: `20261024003810_planning_cycle_content_execution.sql`. O nome usa o horário UTC do CLI; data local da revisão é 23/10. Nenhum comando db push/pull/reset/repair foi executado.

Arquivo versionável e proposta `planning-cycle-contents.sql` têm bytes idênticos, SHA256 `E7B19C485F88188FD06F2DF5D1DCADEFA3354CB5596E196EBEA6F5CF35DCA5BB`. O laboratório referencia agora esse arquivo de migração; os 141 PASS anteriores correspondem exatamente a esse SQL, sem modificação do corpo nesta revisão.

## Preflight remoto somente de leitura

Projeto meliere-assets, ycagvwsvccgdjzpbhrfi, ACTIVE_HEALTHY.

- Cinco Contents, um ciclo, zero modelos salvos; nova aplicação, helper e registro de migração ausentes.
- Policy Contents ainda é a única ALL baseada em is_admin. As quatro policies atuais de Planejamento continuam por workspace. Nenhuma policy remota foi modificada.
- Nenhum cliente sem workspace; nenhum período histórico nulo; os Contents existentes pertencem a workspaces com pelo menos um owner/admin ativo. Isto verifica dependência estrutural, não autenticação/JWT ou funcionamento integral de cada usuário.
- Constraints de canal, funil, período e chave (id,client_id) coincidem com o baseline esperado pela migração. Ampliar valores aceitos não exige reescrever os cinco Contents.
- get_public_presentation e submit_public_presentation_decision continuam SECURITY DEFINER, postgres, com execução pública intencional. reconcile_presentation_item_decision continua definer sem execução direta por anon/authenticated. As funções de nova rodada/decisão administrativa continuam separadas e não serão alteradas.

## Impacto exato da aplicação proposta

Cria duas tabelas vazias (aplicações e vínculos), duas RPCs authenticated, helper privado e trigger de proteção; substitui autorização direta de Contents por workspace/permissão/client scope; permite ciclos sem datas em conjunto, canal principal vazio e classificação editorial livre. Mantém formatos, status, registros, aprovações, arquivos e datas existentes.

Uma peça que futuramente receber vínculo não poderá ser excluída ou transferida silenciosamente de cliente/ciclo. Essa proteção só passa a afetar peças vinculadas; a migração não cria vínculos nem Contents. Arquivar modelos/ciclos continua preservando o histórico.

Não muda policies/grants de Clientes, publicações, Storage ou apresentações, não conecta serviços externos e não apaga registros. Seletores legados para membros restritos continuam uma limitação conhecida; não apresentar este marco como fechamento de toda a autorização SaaS.

O pacote só de banco é compatível com a interface publicada atual. A interface nova depende dele e deve ser publicada em outro ato autorizado, depois da verificação do banco.

## Revisão local adicional

Corrigida identificação do responsável no drawer quando o perfil não estiver na lista carregada: opção atual explícita preserva a atribuição e evita exibir Não atribuído indevidamente. Pequeno ajuste de texto/opção, sem reconstrução de layout. Build reconferido após esse ajuste; resultados em IMPLEMENTACAO-CICLOS-CONTEUDOS.md e registro posterior desta revisão.

## Execução após autorização específica

1. Reconfirmar projeto, baseline e ausência da migração. Se houver divergência, investigar antes de aplicar; não reparar ou reaplicar automaticamente.
2. Aplicar somente o SQL revisado, em transação. Falha antes do COMMIT deve reverter o pacote; não executar pedaços isolados para contornar erros.
3. Conferir histórico/SQL efetivo, grants, policies, funções e trigger; reconciliar nome local com a versão efetivamente registrada, sem reaplicar.
4. Comparar contagens e conferir ausência de dados operacionais novos; fazer verificações de negação somente de leitura, advisors e leitura autenticada atual. Não criar modelos/Contents reais ou fictícios nessa etapa.
5. Relatar o resultado e limites; commit/push/deploy permanecem fora desta autorização de banco. Homologação integrada de criação, upload, aprovação e calendário continua posterior.

Depois de aplicações/vínculos em uso, não executar rollback destrutivo ou apagar tabelas para voltar uma versão. Qualquer correção posterior exige plano próprio e preservação do histórico.

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
