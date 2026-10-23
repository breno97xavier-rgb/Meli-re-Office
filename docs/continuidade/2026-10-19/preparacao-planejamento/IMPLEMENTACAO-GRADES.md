# Grades editoriais — incremento local de modelos

Data: 22/10/2026. Base publicada: b34aec0, branch chore/s3-reconciliation. Usuário aprovou expressamente o resultado visual publicado da primeira parte e pediu continuidade. Não houve nova autorização de banco, commit/push ou publicação. Aprovação visual não foi convertida em homologação de gravação real ou de todo o Office.

## Auditoria e recorte

Prompt original de Planejamento relido integralmente. Catálogo remoto consultado apenas em leitura: não há tabela de templates; editorial_plans segue ciclo datado, com início/fim NOT NULL. Estratégia/briefing/séries da fase 1 estão aplicados. Mantidos ciclos e esquema de Content intactos. Este incremento implementa modelos reutilizáveis; aplicar modelo a ciclo e produzir/vincular Content continuam incrementos posteriores. Nenhuma migração nova aplicada.

## Implementado localmente

- types/editorialTemplates.ts: modelo, vaga, destino editorial e revisão.
- utils/editorialTemplates.ts: validação, cópia com identidades independentes, movimento/ordem, filtros e contagens sem datas.
- services/editorialTemplateService.ts: consultas por cliente, histórico por cliente+modelo, RPC com versão esperada e tradução de conflitos/erros.
- components/planning/EditorialTemplatesSection.tsx e EditorialSlotEditor.tsx: nova aba Grade editorial, modelos de 7/14/28 posições ou personalizados, até 366 posições; lista de semanas responsiva, posições vazias, várias vagas por posição, editor opcional, filtros canal/pilar/série/formato/funil, prioridade, recorrência, quantidade, canal/perfil, duplicação, mudança de posição, subir/reordenar, arquivar/reativar, histórico somente leitura.
- PlanningPage.tsx: seis abas, teclado recalculado pelo tamanho da lista, mesmo controle de rascunho/cliente. Nenhuma mudança de design global.

Campos editoriais vazios permitidos. Nome de modelo obrigatório. Limites operacionais propostos: 366 posições, 1.000 vagas/modelo, 1.000 unidades/vaga, 50 destinos/vaga, nome 200 caracteres, notas 20.000 e textos de vaga 10.000. Reduzir posições não remove vagas ativas ou arquivadas; exige movê-las antes. Duplicar modelo cria novo id e novos ids de vagas, sem compartilhar objetos/destinos do rascunho. Arquivar não apaga. Recorrências são instruções; mensal não vira mês civil ou agendamento. 28 posições é quatro semanas.

Resumo rotulado como rascunho filtrado, calculado de vagas ativas (inclui opcionais explicitamente): vagas = número de instruções; peças previstas = soma de quantidades; destinos previstos = quantidade × destinos. Nenhuma contagem apresentada como Contents produzidos ou publicados. Barras de distribuição de pilar usam o mesmo denominador. Funil é texto de classificação do modelo e não é enviado à constraint atual de contents. Canal/perfil é destino editorial livre, não OAuth nem publicação. Não implementa catálogo conectado de contas sociais.

## Proposta SQL (não aplicada, ainda fora de migrations)

planning-editorial-templates.sql cria duas tabelas: client_editorial_templates e client_editorial_template_revisions. Vagas ficam como documento JSON ordenado do modelo; não são Contents nem cópias de ciclos. Revisões guardam snapshot completo imutável ao usuário. Escolha preserva unidade transacional do editor e evita atribuir entidade de produção às vagas de modelo. Aplicações futuras terão snapshot/ref de revisão próprios, sem reescrever execuções anteriores.

RLS e SELECT por can_access_planning_client(client_id,'view'), dependente de workspace/membership/escopo; sem INSERT/UPDATE/DELETE direto para authenticated e sem acesso anon/PUBLIC. RPC save_client_editorial_template exige operation antes/depois do lock; expected_revision, bloqueio por id, imutabilidade de client_id e validação de todo payload antes do upsert+snapshot. FOREIGN KEY composta protege modelo/revisão. Referências em slots JSON são validadas com cliente e FOR SHARE nos catálogos; não são FKs físicas de cada vaga. Arquivados do mesmo cliente são aceitos para preservar histórico/duplicação, mas não oferecidos como nova escolha comum na UI. Exclusões físicas futuras de catálogos precisam tratar explicitamente referências JSON; este incremento não cria exclusão física ou limpeza. Nenhuma mudança em cycles/Contents, Auth/Google/Storage, sem clientes/registros operacionais criados.

## Testes executados

- 12 testes Node novos executam utilitários e serviço reais: relativas/vazios/múltiplas, redução sem perda, duplicação independente, ordem/movimento, quantidades/destinos, chaves de classificação como __proto__, interseção de filtros, limites/payload, arquivamento, consultas servidor por cliente, bloqueio antes de request e conflito sem fallback. Suite consolidada 170/170 passou.
- Build passou com 1922 módulos (aviso já existente de pacote grande). TypeScript repetido: os 22 diagnósticos anteriores em outros módulos, nenhum diagnóstico novo da grade. Não declarar lint aprovado.
- PostgreSQL portátil 17.11 restaurado da página oficial EDB https://www.enterprisedb.com/download-postgresql-binaries (link disponibilizado fileid=1260616). ZIP SHA256 80379B2C04D51C30225532E0AE04509899141E9957ED096FE749D7FD9DF8F82F, pasta C:/Users/breno/AppData/Local/Temp/office-template-runtime-20261022. Extração completa foi interrompida por lentidão do pgAdmin e concluída seletivamente para bin/lib/share; postgres --version confirmado. Sem instalação de serviço/PATH ou pacote npm. Runner aceita -Runtime preservando default antigo.
- Laboratório SQL editorial-templates-lab.sql executou fundação anterior + proposta em cluster fictício loopback e terminou com exit 0: 60 regressões anteriores + 29 verificações da grade = 89, mais concorrência real de briefing e modelos = 91 PASS. Workspace/membership suspensos, ausência de identidade, admin estrangeiro, assigned view, escrita direta, payload inválido, histórico, arquivos e destinos testados. Duas sessões confirmaram espera por lock, primeira grava e segunda revision_conflict; histórico íntegro. Falha inicial na consulta de verificação concorrente foi codificação de texto acentuado passado por -c; corrigido literal do harness para ASCII e reexecutado com sucesso, sem alteração de SQL do produto.
- Log final C:/Users/breno/AppData/Local/Temp/office-template-final-lab-20261022.log. Servidor encerrado em finally; não excluído dado local/cluster.

## UI: conferido e pendente

Cenário de browser existente atualizado com serviços em memória e proxy que bloqueia qualquer acesso real ao Supabase. IDs fictícios passaram a UUIDs para exercer a validação real. Conferidos via controles visíveis: criar modelo14, adicionar vaga, selecionar pilar/formato/funil, dois perfis no mesmo canal, salvar versão1, contagens 1 vaga/1 peça/2 destinos, versão1 no histórico, duplicar vaga na mesma posição e salvar versão2. Nada disso comprova persistência remota/JWT.

Captura fullPage travou o CDP; tentativa de conferir largura390/capturar também expirou e reiniciou a sessão CUA. Nenhuma captura final da grade foi obtida. Mobile, inspeção visual completa e diálogo de descarte NÃO estão validados nesta rodada. Não publicar com alegação de homologação integral. Documentação de fase1 com capturas antigas permanece distinta.

## Próxima ação

Concluir verificações do pacote; pedir autorização específica para aplicar somente a proposta de banco dos modelos/revisões, sem publicação. Depois reconferir catálogo e integração autenticada. Publicação exigirá autorização própria e conferência visual; aplicação ao ciclo e vínculo/criação de Content seguem após validar os modelos, sem converter ciclos históricos automaticamente. Nenhum commit/push/deploy nesta rodada. Arquivos/documentos anteriores preservados; registrar a aprovação visual do usuário no relatório de continuidade.

Após a rodada consolidada, adicionada tradução de erros de referência/validação do modelo para mensagens acessíveis; repetidos os 12 testes do serviço/utilitários, todos aprovados. Reinicialização do CUA confirmou Chrome5 indisponível; não obtida captura e não confirmado ajuste de largura. Cenário Vite local encerrado. Diff check dos arquivos alterados de código/testes sem erro após remover linha vazia adicional no harness. O relatório principal e logs foram atualizados localmente, sem commit/publicação.

## Aplicação autorizada das grades no banco — 22/10/2026 (23/10 UTC)

O usuário autorizou expressamente somente a estrutura de banco de modelos e versões, sem publicação de interface nem alteração de ciclos/Contents/dados existentes. Vínculo local e projeto remoto reconfirmados: meliere-assets / ycagvwsvccgdjzpbhrfi, ACTIVE_HEALTHY. Branch chore/s3-reconciliation, HEAD b34aec0, alterações locais anteriores preservadas.

Preflight remoto: as duas tabelas de modelos/revisões e a RPC não existiam; helper de autorização e séries da fundação presentes. Contagens antes: dois clientes, cinco Contents, um ciclo, uma estratégia e três pilares. Aplicada uma vez por apply_migration, success=true, nome planning_reusable_editorial_templates, versão remota 20261023003335. exact_source_match=true contra statements[1] do histórico. Nenhum registro operacional ou modelo de teste criado.

CLI 2.120.0 já em cache consultada por migration new --help e usada somente para gerar arquivo local; não houve instalação/atualização, db push/pull/repair. Arquivo gerado inicialmente 20261023003951 foi renomeado para a versão remota, sem reaplicação. Arquivo definitivo: supabase/migrations/20261023003335_planning_reusable_editorial_templates.sql. Hash SHA256 da proposta e arquivo local iguais: 0889E9C39996D1BC7708E9CFCAD8947A4FAA2E56D72757279F8BA7EF3C4FE04E. Cabeçalho histórico de proposta preservado como SQL aplicado; status efetivo está neste adendo. Fixture editorial-templates-lab.sql agora referencia a migração versionada, cujo conteúdo é igual ao testado.

Verificação do catálogo: duas tabelas com RLS, SELECT authenticated por policy can_access_planning_client(client_id,'view'), sem INSERT/UPDATE/DELETE/TRUNCATE direto authenticated e sem acesso anon. RPC save_client_editorial_template SECURITY DEFINER pertence a postgres, search_path=public,pg_temp, EXECUTE authenticated e não anon. Modelos e revisões com zero linhas. Contagens existentes após aplicação exatamente iguais às anteriores; não alterados ciclos, Content, estratégias/pilares, datas ou aprovação de clientes.

Teste remoto READ ONLY com SET LOCAL ROLE authenticated sem identidade: helper negou, leituras retornaram zero e chamada da RPC com parâmetros nulos foi negada por insufficient_privilege antes de qualquer escrita. ROLLBACK executado. Não executada gravação válida/autenticada de modelo pelo frontend remoto, que ainda está apenas local, nem criado cliente/modelo fictício em produção.

Advisor: permanecem cinco tabelas anteriores com RLS sem policy, cinco funções com search_path mutável, sete funções definer acessíveis a anon, proteção de senhas vazadas desativada. Categoria de funções definer executáveis por authenticated passou de 23 para 24 pela nova RPC intencional que verifica autorização+versão. Não revogar indiscriminadamente; não afirmar homologação global. Referência da categoria: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable ; senhas: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . Nenhum outro ajuste remoto executado.

Última bateria local continua 170 testes Node, 89 verificações SQL e duas concorrências (91 PASS), build aprovado, 22 erros TypeScript anteriores. Não repetida por mera mudança de caminho de fixture/hash idêntico; verificações remotas acima são adicionais. Nesta rodada não houve commit/push/deploy ou mudança visual. Próximo passo: concluir conferência visual/mobile da grade local e revisão de publicação; gravação pela interface real permanece pendente. Aplicação a ciclos/geração de Content segue depois sem conversão de ciclos históricos. A autorização atual de banco não se estende à publicação ou à criação/limpeza de dados.

## QA visual e revisão de publicação — 22/10/2026

Chrome reconectado (novo id2, mesma extensão), cenário isolado em loopback com serviços fictícios. Conferidos nesta rodada: modelo14posições/v1; edição de vaga na viewport390x844 (quantidade2, formatoReels, perfil editorial); salvarv2 e consultar v1/v2; resumo1vaga/2peças/2destinos; filtroTikTok sem resultado gera zero sem NaN; cópia de modelo independente salva v1; troca para segundo cliente sem mostrar modelos do primeiro. Sem acesso/gravação no Supabase nesse cenário. Console sem erros capturados.

Detectado espaço vazio no desktop por reservar quatro colunas para apenas duas semanas; corrigida a classe de grade para acompanhar a quantidade de semanas. Corrigidos rótulos no singular e ampliada a área de toque dos botões de vaga/adicionar para44px. HMR fechou o rascunho em memória durante a edição de código; modelo já salvo na simulação foi reaberto e permaneceu íntegro. Nenhuma mudança na persistência ou banco.

Capturas de viewport obtidas com sucesso desta vez, sem fullPage: grade-editorial-posicoes-desktop.png (semanas em duas colunas de600px na viewport desktop), grade-editorial-editor-mobile.png e grade-editorial-posicoes-mobile.png em C:/Users/breno/.codex/visualizations/2026/10/19/01a15685-735f-7f10-a987-a91a3d345d8f/ . Medida mobile: document.scrollWidth385 para viewport390, sem overflow horizontal no cenário testado. Override removido ao finalizar. A pendência de captura/mobile das rodadas anteriores está resolvida para esse roteiro; não estender isso a todos os dispositivos/fluxos. Diálogo de descarte permanece sem homologação manual.

Criado REVISAO-PUBLICACAO-GRADES.md com lista explícita de15arquivos e exclusões, preservando trabalho anterior. git ls-remote reconfirmou main e chore/s3-reconciliation em b34aec0. Suite170/170 passou novamente após ajustes; build/TypeScript em conferência final. Não executados git add/commit/push/deploy ou alteração remota nesta rodada. Próxima ação depende de autorização específica de commit/push/publicação da UI dos modelos; migração já aplicada não deve ser reaplicada.

Resultado final desta rodada: build exit0, 1922módulos e aviso de bundle grande já conhecido; TypeScript exit1 com os mesmos22diagnósticos anteriores, nenhum nos novos arquivos da grade. Artefato dist sem marcadores de cenário fictício consultados. Servidor de QA local encerrado após capturas. Nenhum commit/push/deploy realizado.
