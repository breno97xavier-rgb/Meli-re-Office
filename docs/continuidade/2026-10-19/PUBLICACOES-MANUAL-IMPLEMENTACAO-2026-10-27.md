# Publicações manuais — implementação local (27/10/2026)

## Decisão e escopo

Usuário respondeu expressamente “Sim, controle manual primeiro” à divisão proposta: peça existente → canal → data prevista/status/link publicado. Automação, contas sociais e métricas ficam para evolução. Isso antecipa o recorte operacional de F7 na ordem atual do usuário, sem afirmar que S10 ou integrações Meta estão concluídas.

Implementado localmente /publicacoes com cadastro/edição de registros da tabela public.publications existente. Sem nova tabela, migração, grant, RLS, conta social ou API de postagem. Nenhuma escrita remota de publicações neste marco (count remoto confirmado zero). Não cadastrar conteúdos novamente nem alterar aprovação/material da peça ao registrar distribuição.

## Comportamento

- Seletor de peça existente, com cliente e informação da aprovação editorial. Registro manual não concede aprovação nem altera o editorial_status. Permite registrar fatos externos sem impor retrospectivamente aprovação editorial a dados publicados fora do Office; qualquer trava futura de postagem automática deverá validar aprovação/revisão no servidor.
- Canais exatamente conforme CHECK do banco: Instagram, Facebook, LinkedIn, TikTok, YouTube, blog e newsletter. Não inventar WhatsApp/outro por existirem em Content.
- Planejada, Programada (controle manual), Publicada, Falha e Cancelada. Programada exige data prevista; Publicada exige data realizada no formulário/contrato do serviço. Texto específico e link são opcionais. Sem texto específico, operador consulta a legenda da peça; não a copia silenciosamente.
- Mensagens persistentes esclarecem que salvar não publica/programa na rede. Datas editoriais continuam independentes; este recorte não adiciona distribuição ao Calendário nem muda datas da peça.
- Cliente/canal/status/busca filtram a lista; estado vazio/carga/erro explícitos. Link externo somente HTTPS sem credenciais, com noopener/noreferrer. Sem métricas simuladas.
- Cancelamento é status do registro, sem exclusão física. Confirmação de descarte dentro do Office; diálogo nativo HTML com foco/modal e Escape tratados. beforeunload apenas para sair/recarregar com formulário alterado.

## Autorização e integridade

Serviço deriva uma única agência ativa owner/admin da identidade Auth, conforme o padrão atual de Tarefas/Financeiro. Lê peças com Client!inner filtrado por workspace e publicações com Content!inner → Client!inner, também filtradas; ambas listas paginadas em blocos500 e ordenadas por id. RLS remota existente revalida workspace e papel legado admin; não depende apenas do filtro de interface. Seleção de peça é relida sob escopo imediatamente antes de salvar. Edição impede troca de content_id e filtra id/content_id/updated_at. Trigger remoto existente avança updated_at e protege identidade.

Criação usa UUID estável durante a vida do formulário; uma nova tentativa com o mesmo ID não gera linha duplicada. Sem retry automático. Resposta indeterminada orienta atualizar, sem declarar sucesso. Payload allowlist não inclui metrics_cache/ownership/id externo. Isso não equivale a criação de RPCs novas ou validação integral no banco das regras opcionais de datas; constraints de status/canal/identidade/workspace já existentes são preservadas.

## Arquivos do recorte

src/App.tsx; src/types/publications.ts; src/services/publicationContracts.ts; src/services/publicationsService.ts; src/pages/PublicationsPage.tsx; tests/security/publications.test.mjs; tests/security/publications-preview.cjs; este documento e PUBLICACOES-AUDITORIA-2026-10-27.md.

## Testes e limites

209 testes Node aprovados. Novos casos: canais/status inválidos, datas necessárias e data inexistente, URLs inseguras/credenciais, stripping de atributos, identidade ausente/ambígua, workspace explícito, paginação501, identidade da peça imutável, updated_at concorrente, UUID estável e nenhuma repetição automática após erro. Testes do serviço usam mock; não comprovam sozinhos comportamento PostgREST real. Documentação oficial consultada: https://supabase.com/docs/guides/database/joins-and-nesting (FK, aliases e !inner).

Build aprovado; aviso anterior de bundle grande permanece. Lint registra22 diagnósticos anteriores; os quatro erros novos do Map de clientes foram corrigidos por tipos explícitos. Comparação programática TypeScript: baseline23/atual23, mesmo conjunto de diagnósticos; CLI tsc registra22. A diferença do verificador programático foi mantida explícita, sem declarar lint aprovado. Nenhum diagnóstico novo do recorte após a correção; erros históricos não modificados.

Prévia local real de PublicationsPage com serviço isolado em memória, sem credenciais/dados reais: cadastro programado28/10/09h, edição para publicado27/10/10h com link example.test, cancelamento de descarte mantém texto e vínculo, filtros/status vazio, console sem erros. Nada postado; fixture desaparece ao reiniciar. Screenshot publicacoes-manual-local-20261027.jpg. Servidor3013 encerrado; não é homologação remota. Primeiro build passou; tipagem detectou Map desconhecido, corrigido e revalidado.

## Próxima ação

Obter aprovação agrupada de commit/push/deploy somente destes arquivos; não incluir demais alterações locais. Não há migração nem deploy de função. Após publicação, validar leitura/joins em sessão autenticada e cadastro/edição/cancelamento exclusivamente fictícios vinculados a peça de QA existente, com confirmação de persistência e concorrência. Não limpar testes antigos. Manter integração social/automação/métricas, projeção de distribuição no calendário, campos de conta e auditoria mais ampla no roadmap futuro, sem declará-los entregues por este recorte.
