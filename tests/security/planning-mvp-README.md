# MVP interno — continuidade de Planejamento

11/10/2026. O usuário informou que há um lead verdadeiro e que os demais leads e dois clientes são testes; pediu adiar a limpeza e continuar. Não identificar o lead verdadeiro por suposição e não excluir registros sem seleção/confirmação futura. Quantidades e natureza dos registros são contexto informado pelo usuário, não inventário de dados pessoais realizado pelo agente.

Prioridade permanece Cliente → Planejamento → Conteúdos, depois demais módulos do MVP, sem expansão de perfis/permissões SaaS. A mudança estética desejada para Conteúdos e Apresentações aguarda alinhamento ao chegar às telas.

Inspeção do código confirmou estratégia, catálogo de pilares, ciclos editoriais e campanhas existentes. A RPC set_editorial_plan_pillars(uuid,uuid,jsonb) está instalada e executável por authenticated; leitura do corpo remoto confirmou transação, relação plano/cliente, pertença dos pilares, proteção de novos pilares inativos e preservação de vínculos históricos. O trigger check_content_planning_tenant_integrity valida plano, pilar e campanha contra client_id na gravação de Conteúdos. Isso não homologa permissões completas por workspace nem o fluxo HTTP real; guards existentes usam perfis globais conforme auditoria anterior.

Lacuna corrigida: criação de ciclo truncava negativos para zero via Math.max; distribuição por pilar arredondava frações para baixo via Math.floor; NaN/Infinity/frações podiam chegar às operações. Criação, edição e alocações agora exigem contagem inteira de 0 a 2147483647, intervalo do integer PostgreSQL. Meta total omitida na criação continua zero. Valores válidos e zero são preservados; inválidos são rejeitados antes de autenticação/consulta/escrita. Não mudou layout, banco, RLS, grants ou dados.

Oito testes novos carregam o serviço real com infraestrutura controlada: validação nos três caminhos, criação vinculada ao cliente/autor, edição única com zero, RPC transacional seguida de leitura do mesmo plano, duplicatas rejeitadas e erro de RPC sem fallback destrutivo ou leitura de sucesso. Com as 30 regressões anteriores: 38 testes passaram. Dados fictícios nos doubles; não foram criados planos, conteúdos ou novos clientes no remoto. Não foi executado tsc/build completo local por ausência de dependências, sem instalação. Publicação/build automático da Vercel deve ser conferido antes de relatar disponibilidade.

```powershell
node --experimental-vm-modules --test tests/security/planning-mvp.test.mjs tests/security/manual-client.test.mjs tests/security/client-origin-relations.test.mjs tests/security/presentation-deletion.test.mjs
node --test tests/security/presentation-decision-contracts.test.mjs
```

Próximos pontos de auditoria: troca rápida de cliente e respostas antigas nos hooks; estratégia usa leitura seguida de INSERT/UPDATE, portanto não afirmar UPSERT atômico apenas por comentário; reordenação de pilares usa múltiplos UPDATEs, com possível aplicação parcial; confirmar criação/gravação/recuperação de conteúdos e seus assets, incluindo Storage. Não há evidência ainda de homologação ponta a ponta. Não alterar aspectos estéticos de Conteúdos/Apresentações antes de alinhar o pedido do usuário.
