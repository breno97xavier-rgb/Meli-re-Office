# Tarefas — MVP interno

12/10/2026 UTC (11/10 em São Paulo). Usuário autorizou expressamente aplicar o isolamento de tasks no projeto meliere-assets e implementar/publicar a tela operacional.

Inspeção remota confirmou tabela tasks existente, vazia, sem workspace_id, com policy global is_admin(). Não foram consultados títulos/dados pessoais. Migração tasks_internal_mvp_workspace aplicada pelo conector e registrada em 20261012005625; a primeira tentativa falhou por requestState expirado e não criou a coluna; a segunda concluiu. Nome local reconciliado ao registro remoto. Comparação dos statements confirmou o mesmo SQL, normalizando comentários/espaços. Nenhuma migração histórica editada.

Adiciona workspace obrigatório, FK composta para cliente, título não vazio de até 200 caracteres e índices. Substitui a policy global por SELECT/INSERT/UPDATE de owner/admin ativo do workspace, com agência ativa. API não pode modificar autor/workspace nem inserir vínculos futuros com conteúdo/oportunidade/apresentação. Nenhum acesso anon ou DELETE authenticated. Arquivamento usa status existente, sem excluir registros. Migração para se a tabela deixar de estar vazia, sem atribuir registros por suposição.

18 verificações no PostgreSQL local descartável: criar/concluir, cliente estrangeiro, workspace estrangeiro, suspensão, agência inativa, anonimato, título/status inválidos e escrita em campos proibidos. Não representa homologação completa de outros módulos. Consulta posterior ao catálogo remoto confirmou políticas, coluna obrigatória e ausência de privilégios proibidos.

Frontend aproveita entidade central e campos existentes. Tela permite criar, editar, concluir/reabrir, arquivar/reativar, filtrar status/cliente e buscar. Prazo é date civil sem conversão UTC. Responsável do novo cadastro é o usuário atual; gestão de equipe fica para evolução posterior. Tarefa pode ser interna (client_id null). Nenhuma integração Google Agenda ou inclusão no calendário editorial foi acrescentada neste marco. + Novo contextual de /tarefas abre o mesmo formulário. Dialog protege notas não salvas e bloqueia ações durante gravação.

Serviço exige uma única agência ativa como owner/admin; lista tarefas e clientes mínimos apenas desse workspace; valida dados antes de requests; criação deriva autor/workspace da identidade, atualização filtra id e workspace e exige retorno confirmado. Não usa delete, upsert ou chave privilegiada.

72 testes JavaScript/TypeScript passaram, incluindo oito novos do serviço real com infraestrutura fictícia. Build local/tsc completo indisponíveis sem dependências instaladas; verificar build automático Vercel e fluxo autenticado no navegador antes de declarar disponibilidade.
