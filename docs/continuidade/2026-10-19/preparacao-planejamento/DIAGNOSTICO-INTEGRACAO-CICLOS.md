# Integração de ciclos e Conteúdos — diagnóstico de retomada

Data: 23/10/2026. Base local 7a4cf0f, branch chore/s3-reconciliation. Inspeção somente de leitura no projeto meliere-assets (ycagvwsvccgdjzpbhrfi), ACTIVE_HEALTHY. Alterações locais anteriores preservadas.

## Evidências atuais

- editorial_plans já representa o ciclo e tem chave única (id,client_id); start_date/end_date ainda obrigatórios. Reutilizar, sem entidade de ciclo paralela.
- contents possui editorial_plan_id, pillar_id e campaign_id. Trigger remoto valida que os vínculos pertencem ao mesmo cliente. Cinco Contents existentes; nenhum vínculo com ciclo de cliente diferente foi encontrado. Não houve leitura de títulos ou dados pessoais.
- Não há tabela de aplicações de modelos nem de vagas de execução no catálogo consultado. Modelos e revisões publicados existem.
- Planejamento usa can_access_planning_client e permissões/escopo por workspace. Contents mantém a policy ALL "Admins have full access to contents", baseada em is_admin(). O helper is_admin verifica somente profiles.role='admin', sem workspace. Grants authenticated SELECT/INSERT/UPDATE/DELETE. Não basta criar uma RPC protegida e manter o caminho direto global como se todo o módulo estivesse isolado.
- contents.primary_channel obrigatório aceita instagram/facebook/linkedin/tiktok/youtube/blog/newsletter. A grade permite whatsapp/other e nenhum destino. contents.funnel_stage aceita somente topo/meio/fundo ou nulo; a grade aceita classificação livre. Não converter silenciosamente para instagram, descartar funil ou usar valores rejeitados pelo banco.
- publications existe (não content_publications): content_id, channel, status, scheduled_for, published_at, post_url, channel_specific_copy, metrics_cache. Não tem perfil de destino e usa policy global is_admin; não transformar vaga planejada em publicação nem criar tabela equivalente sem avaliar esse legado.

## Recorte proposto

1. Fechar autorização de Conteúdos por workspace, permissão contents e escopo de cliente; verificar dependências mínimas dos seletores e leitura de apresentações antes de qualquer alteração remota. Não mudar regras de acesso público por token incidentalmente.
2. Reutilizar editorial_plans como execução; início/fim ambos opcionais em conjunto, sem datas artificiais e sem alteração dos ciclos históricos.
3. Aplicação registra versão e snapshot do modelo/vagas, sem criar Contents em lote automaticamente, sem sobrescrever metas/alocações existentes e sem automatizar recorrências manuais/alternadas.
4. Cada unidade explicitamente selecionada de uma vaga pode criar ou vincular um Content do mesmo cliente. Criação e vínculo atômicos e idempotentes, preservando uma peça com múltiplos destinos. Content já vinculado a outro ciclo não será movido silenciosamente.
5. Resolver preservação de destinos e classificação livre antes de conectar o editor. Não alterar enums históricos nem usar publications como substituto de instrução editorial.
6. Reutilizar modal/drawer, arquivos, aprovação e calendário. Data do ciclo não gera data automática no Content; sem data continua no backlog.

## Validação necessária

Laboratório com workspaces A/B, owner/admin/member, níveis de permissão, escopo assigned, acesso direto e RPC, ausência de identidade e anon. Testar snapshot imutável, quantidade/destinos, isolamento por cliente, repetição concorrente, rollback e vínculo existente. Depois regressões locais de Conteúdos/Apresentações/Calendário e conferência visual. Banco remoto e publicação exigem aprovação específica do pacote revisado.

Nenhuma implementação, migração ou teste novo foi executado nesta retomada; este documento registra diagnóstico e proposta, não entrega homologada.

## Direção de Relatórios esclarecida em 23/10

Usuário quer resultados reais comparados à estratégia vigente e aos objetivos do serviço/contrato, incluindo Instagram e Meta Ads quando integrados. Planejamento continua opcional: relatórios usam o contexto disponível, informam lacunas e não impõem métricas sociais a sites/branding/serviços avulsos. Essa comparação detalhada não estava especificada na Fonte Mestre. Preservar como direção futura, sem implementar Relatórios nesta etapa nem prometer causalidade a partir de métricas isoladas.
