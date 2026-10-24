# Revisão — parecer e versão dos materiais

Data: 23/10/2026. Repositório Meli-re-Office, branch chore/s3-reconciliation, HEAD 71416fbd3ce465401277d2de6d8fd606c859170a. Remoto GitHub breno97xavier-rgb/Meli-re-Office. Alterações locais anteriores preservadas. Usuário autorizou revisar/corrigir e conferir o recorte; não houve autorização específica nesta etapa para estrutura/permissões remotas ou publicação.

## Evidências efetivas

- Leitura do projeto ycagvwsvccgdjzpbhrfi: presentation_items tem parecer, feedback e reviewed_at, mas nenhum vínculo com revisão de material. Quatro itens, três já avaliados. Não é possível atribuir retroativamente uma versão exata a esses pareceres sem evidência.
- fetchPresentationItems e os retornos de criação/edição em presentationsService carregam content_assets com is_current. get_public_presentation remoto também filtra ca.is_current=true. Logo, a rodada histórica muda visualmente quando a mídia corrente muda; o parecer permanece igual.
- Não existem triggers não internos em content_assets. A substituição atual troca is_current e insere nova versão em duas requisições, com compensação no cliente. Ela não é uma transação única e precisa entrar nos testes de concorrência do recorte de versionamento.
- submit_public_presentation_decision rejeita novo parecer sobre item já avaliado (ITEM_ALREADY_REVIEWED), e usa o reconciliador com proteção por workspace/cliente e locks. Não basta reabilitar botões ou zerar o parecer no frontend: isso perderia a referência histórica e não protegeria uma decisão enviada de uma tela desatualizada.
- RPC público devolve storage_path, mas renderizadores/assinatura esperam file_url. Normalizador não fazia a conversão. Corrigido localmente com testes, sem mudar endpoints ou permissões.
- Policies SELECT de storage.objects para content-assets observadas exigem authenticated e is_admin(). Leitura pública atual pede assinatura pela sessão do navegador. Assim, teste autenticado não comprova exibição para visitante sem login. Esse limite foi identificado por inspeção, não por novo teste anônimo nesta etapa. Não abrir o bucket nem liberar SELECT anon global.

## Recorte recomendado e autorização necessária

1. Versão de revisão persistida por item/rodada, contendo os campos editoriais apresentados e as referências exatas dos arquivos, inclusive ordem e versão. Captura deliberada antes de disponibilizar para avaliação; não congelar silenciosamente um rascunho ainda em elaboração.
2. A decisão deve se referir à revisão exibida; rejeitar envio de tela desatualizada. Nova mídia não herda aprovação. A rodada anterior preserva seu parecer e seus materiais; ajustes seguem nova rodada, aproveitando a linhagem já existente.
3. Pareceres antigos permanecem preservados e identificados como sem versão comprovada. Não preencher snapshots retrospectivos com a mídia atual nem recalcular aprovações em massa. Nova rodada permite revalidar esses casos.
4. Leitura interna e pública devem usar a mesma revisão. Assinatura de mídia pública deve validar token ativo/expiração/revogação, workspace/cliente e pertencimento do arquivo à rodada, com limite de duração e sem receber caminho arbitrário do visitante. Exige componente servidor restrito; não expor service_role e não ampliar policies globais.
5. Coordenação transacional da troca de versões e das decisões, com locks em ordem compatível com os fluxos existentes. Testar gravações concorrentes, falhas no registro/compensação, duplicação, revogação e suspensão.

Essas mudanças alcançam banco/RPCs e assinatura de arquivos, portanto dependem de autorização expressa de escopo conforme AGENTS.md seção 4. Não existe ainda migração revisada/apta a aplicação: este documento é diagnóstico e delimitação para a decisão, não comando para aplicar banco. Após autorização de escopo, preparar SQL incremental e servidor, testar localmente e apresentar o pacote exato antes de aplicar/publicar.

## Implementado localmente e testado

- EditorialPlanFormModal: correção já preparada permite ambas as datas vazias e bloqueia período parcial. QA de botão e 18 testes relacionados aprovados no marco anterior.
- presentationDecisionContracts: mapeia storage_path para file_url, preserva identidade/versão e caminho canônico existente, sem modificar o objeto original. Dois testes de regressão adicionados; seis testes do arquivo passaram.
- Build posterior aprovado em 7,36 s; aviso preexistente de bundle acima de 500 kB. Diff check no escopo aprovado. Sem reinstalação de dependências. Sem nova homologação de tipos/segurança.
- Nenhuma mudança visual publicada. Futuras telas precisam distinguir parecer histórico, revisão enviada e revisão atual; avisar ao usuário antes de publicar essa mudança visual.
- Sem escrita no Supabase, upload, alteração de dados QA, commit, push ou deploy nesta etapa. O teste remoto ajustes → nova rodada → nova mídia → aprovação aguarda a correção completa e sua publicação. Não apresentar o defeito principal como resolvido só pelo normalizador.


## Preparação autorizada e testada — 24/10/2026

Usuário autorizou preparar/testar banco e servidor, reservando aplicação e publicação para revisão. Pacote local implementado em IMPLEMENTACAO-VERSOES-APROVACAO.md (31 arquivos delimitados). Migração criada pelo CLI: 20261024023931_presentation_review_versions.sql, SHA256 9B1EB9F52573BA042B20824C55D851A377213E664C0AFA525BFC3A4A7A75C1E5. Três definições remotas originais salvas por leitura em baseline-review-rpcs-20261023.sql; não é rollback automático.

Implementado preparo deliberado de versão, cópia imutável de textos/mídias apresentáveis, parecer vinculado a review_id, histórico sem reconstrução dos casos antigos, troca atômica de arquivos e assinatura pública restrita por token. Nenhuma policy global de Storage aberta. Alteração visual: botão de preparo, aviso de versão e parecer histórico. 195 testes Node e 39 verificações SQL/concorrência locais passaram; build aprovado. Typecheck mantém 22 erros preexistentes. QA de componentes com doubles é local e não homologa a cadeia remota. Projeto/bucket confirmados em leitura: 7 Contents, 4 itens, 3 pareceres, 0 links ativos, bucket privado e review_id ainda ausente.

Sem escrita no Supabase, novos dados operacionais, exclusão, commit, push ou deploy. Próxima ação depende de autorização expressa do pacote exato: migração no meliere-assets, função nova presentation-review-media (autorização por token próprio) e interface coordenada em produção. Os registros TESTE QA existentes serão usados para a conferência real depois, em contexto sem sessão administrativa. Não interpretar esta preparação como publicação ou homologação completa.
