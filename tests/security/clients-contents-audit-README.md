# Clientes e Conteúdos — auditoria de continuidade

Marco iniciado em 09/10/2026. Projeto remoto confirmado por leitura: meliere-assets, ycagvwsvccgdjzpbhrfi, sa-east-1, ACTIVE_HEALTHY. Não houve escrita no banco nesta etapa.

## Correção implementada

A migração histórica 20260926230000_root_entities_tenant_integrity.sql substituiu duas FKs simples por compostas. A consulta ao catálogo remoto confirmou fk_clients_origin_contract_opportunity e fk_clients_workspace_origin_opportunity; os nomes antigos não existem.

clientsService.ts ainda usava os nomes antigos em fetchClients, fetchClientById e updateClient. As seis referências foram substituídas pelos nomes atuais, preservando aliases, campos, filtros, normalização, payload e fallback existente. Não foram alteradas migrações, RLS, grants ou a conversão de contratos. Consultas de listagem/detalhe podiam esconder o erro recorrendo à leitura sem relações; a atualização não tinha esse fallback. Não se afirma que uma atualização com erro de relacionamento havia sido persistida: isso depende do processamento transacional da API, não testado aqui.

Efeito visível esperado: relações de contrato/oportunidade voltam a preencher as informações de origem e as consultas da edição passam a usar os relacionamentos válidos. Nenhuma alteração de layout ou componente.

## Validação

Cinco testes carregam o serviço TypeScript real com infraestrutura controlada, relacionamentos modelados pelas FKs da migração e dados fictícios. Cobrem as três consultas, normalização, ausência de origem comercial e erro de atualização sem nova escrita. Todos passaram. Se os hints antigos forem usados, o modelo devolve erro de relacionamento e os testes das três consultas falham.

```powershell
node --experimental-vm-modules --test tests/security/client-origin-relations.test.mjs tests/security/presentation-deletion.test.mjs
node --test tests/security/presentation-decision-contracts.test.mjs
```

Resultado: cinco testes novos, seis regressões de exclusão e quatro regressões de contratos de apresentação passaram; git diff --check sem erros. A primeira execução dos novos testes falhou no adaptador de imports de tipos, corrigido antes do registro/publicação. Esses testes não representam integração HTTP com PostgREST, autenticação real ou homologação em navegador. Build/lint completos locais não executados porque as dependências não estão instaladas; não houve instalação.

## Evidências de segurança e dependências

| Entidade | Regra remota observada | Limitação |
| --- | --- | --- |
| clients, contents, content_assets | ALL authenticated com is_admin() | Papel global, sem membership/escopo do cliente na política |
| contracts, opportunities | ALL authenticated com is_admin() | Origem comercial depende da mesma autorização global |
| editorial_plans, client_pillars, campaigns | ALL por profiles.role admin/team | Planejamento também precisa de isolamento por workspace |
| profiles | SELECT somente auth.uid() = id | Lista de responsáveis e embeds de outro membro podem ficar incompletos |
| storage.objects | Oito policies dos buckets content-assets/commercial-documents por is_admin() | Ler/enviar mídias continua fora das permissões operacionais por workspace |

is_admin() é SECURITY DEFINER com search_path fixo, não executável por anon, e verifica apenas profiles.role = admin. Seu resultado não considera workspace ou membership suspensa. Portanto essas policies não demonstram isolamento entre tenants. Ausência de acesso de membros sem papel global pode persistir mesmo quando uma RPC de Apresentações é autorizada.

clients contém contatos, notas, datas, monthly_amount, one_time_amount e IDs de origem. RLS limita linhas, não oferece separação desses campos conforme o módulo que solicitou leitura. Permitir SELECT irrestrito da linha por presentations/view exporia também esses campos pela API, mesmo que o frontend selecione somente nome e logo.

contents deriva o workspace de client_id; o serviço permite alterar client_id e vínculos de planejamento. A próxima correção deve validar também novo destino, vínculos de plano/pilar/campanha, decisões de aprovação e efeitos em itens/rodadas já existentes. Calendário usa updateContentPlannedDate na própria entidade, sem fonte duplicada.

convert_signed_contract_to_client é SECURITY INVOKER, não executável por anon, exige identidade e is_admin(). O trigger ensure_client_workspace deriva o workspace da oportunidade de origem ou resolve uma única membership ativa quando não há origem. A coluna workspace_id é NOT NULL sem default. Isso evita a conclusão incorreta de que a omissão no INSERT da RPC, sozinha, comprova falha de conversão. A conversão continua dependendo da RLS comercial e precisa de testes fictícios antes de substituir seus guards.

As chaves de permissão atuais são commercial, contracts, clients, planning, contents, presentations, com níveis view/operation/management. Calendário e Financeiro ainda não possuem chaves próprias nesta constraint; não foram inventadas novas permissões nesta etapa.

## Próximo recorte proposto

1. Reproduzir no laboratório a autorização de Clientes/Conteúdos e descendentes, incluindo admin global de outro workspace, membership suspensa e membro com cliente atribuído.
2. Definir leitura cadastral mínima para seletores de módulos operacionais, separada da leitura integral de Clientes/comercial. Um endpoint de projeção precisa validar identidade, membership, módulo e escopo; uma view definer genérica não resolve a segurança.
3. Reconciliar RLS das entidades raiz e de Planejamento, validação dos vínculos nas escritas e conversão de contratos com as permissões existentes. Não duplicar clientes nem fabricar origens comerciais para cadastro manual.
4. Testar Storage e responsáveis por workspace em recortes próprios, com dados fictícios, antes de declarar o fluxo operacional homologado.

Revisão/testes e execução subsequente dentro do escopo seguem a autorização do usuário nesta conversa. Os riscos acima foram registrados, mas nenhuma correção ampla de RLS foi aplicada nesta etapa. Alterações anteriores em supabase/.temp e o dump avulso continuam preservados fora do commit. A configuração de autenticação na Vercel permanece adiada por decisão do usuário.

Referência de sintaxe conferida na [documentação oficial de relacionamentos Supabase](https://supabase.com/docs/guides/database/joins-and-nesting). Catálogo remoto e migração histórica são as evidências dos nomes usados no projeto.
