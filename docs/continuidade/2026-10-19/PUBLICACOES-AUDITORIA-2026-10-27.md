# Publicações — auditoria efetiva e decisão F7.1B (27/10/2026)

## Atualização da decisão

Usuário respondeu “Sim, controle manual primeiro”. Recorte local implementado conforme PUBLICACOES-MANUAL-IMPLEMENTACAO-2026-10-27.md, sem aplicação/publicação remota. Os trechos abaixo preservam a auditoria anterior à resposta; a decisão não está mais pendente.

## Direção e limite

Usuário definiu a sequência prontidão de uso diário → Publicações → integrações/portal posteriores, sem parar a cada ação simples. A Fonte Mestre de setembro dizia retomar F7 após S10; a ordem expressa atual antecipa a análise/recorte operacional, sem declarar S10 concluída ou dispensar isolamento. Roadmap preserva publicação automática fora do MVP pessoal. O escopo inicial manual foi apresentado em pergunta assíncrona ao usuário; resposta ainda pendente neste registro. Não interpretar silêncio como aprovação dessa divisão.

## Estado conferido

- /publicacoes cai em PlaceholderModulePage no switch de App.tsx; navegação já contém o módulo.
- public.publications existe, vazia, com FK content_id → contents ON DELETE CASCADE. Não criar outra Publication ou duplicar Content.
- Colunas: id uuid; content_id uuid obrigatório; channel/status text obrigatórios; scheduled_for/published_at timestamptz opcionais; post_url/channel_specific_copy text opcionais; metrics_cache jsonb; created_at/updated_at timestamptz.
- CHECK channel: instagram, facebook, linkedin, tiktok, youtube, blog, newsletter. CHECK status: planned, scheduled, published, failed, cancelled. Não tratar whatsapp/other de Content como canais aceitos nesta tabela.
- RLS aplicada na migração 20261027003752: scope deriva Content → Client → workspace e owner/admin ativo, mantendo papel legado admin. Trigger impede mudar id/content_id; trigger atualizado mantém updated_at. Sem perfil de equipe novo.
- Nenhuma tabela social_accounts/connected_accounts/métricas identificada. Integração Meta Graph operacional não encontrada. metrics_cache existente não comprova coleta real nem deve virar dados fabricados.
- Content editorial_status permite draft/in_production/review/client_review/approved/cancelled. Não adicionar published ao conteúdo nem usar seu status como substituto da distribuição.

## Recorte proposto para decisão, não publicado

Controle manual por peça/canal, com data prevista, data realizada, status, texto específico opcional e link seguro. Lista/filtros por cliente, canal e status, abertura da peça de origem e indicação explícita de operação manual. Nenhum botão pode afirmar que agendou/postou na rede se apenas gravou um registro Office. A aprovação editorial e os arquivos permanecem na peça; alteração de distribuição não pode reescrever pareceres/snapshots. Definir antes da implementação se publicação exige revisão editorial aprovada ou se haverá registro deliberado de publicação externa pré-existente; não inventar essa regra silenciosamente.

Para escrita: identidade e workspace derivados da sessão, leitura paginada, entidades vinculadas verificadas e proteção contra edição concorrente pelo updated_at. Repetição após resposta indeterminada não pode fabricar distribuição duplicada. Se forem necessárias constraints/RPCs, preparar/testar localmente e obter aprovação específica antes de banco remoto. Não incluir gráficos de métricas sem origem real.

## Evolução preservada

Contas sociais por workspace/cliente, OAuth e tokens no servidor, permissões específicas, integração Meta/Instagram, publicação automática com falhas/retries/idempotência e métricas por Publication permanecem no roadmap. Integração não pode supor que a primeira agência é exceção. Antes de automação real, reconciliar capacidades/permissões do provedor com formato, aprovação, mídia/revisão e segurança; não reutilizar credenciais Google para redes sociais. Relatórios estratégicos cruzarão métricas reais com Planejamento opcional, preservando a discussão anterior.

## Preparação local

Adicionado apenas src/types/publications.ts com o contrato das colunas/enums efetivos. Sem UI operacional, serviço de escrita, migração, conta social, dado novo, commit/push/deploy. Próximo: incorporar resposta do usuário e concluir o primeiro recorte local com testes antes de uma aprovação agrupada para banco/publicação, se necessária.
