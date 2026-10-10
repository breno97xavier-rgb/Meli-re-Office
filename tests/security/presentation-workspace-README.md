# Apresentações por workspace — continuidade e validação

Marco de 09/10/2026 (migração criada em UTC em 10/10): correção aplicada ao Supabase meliere-assets, projeto ycagvwsvccgdjzpbhrfi. Histórico remoto e pasta local: 19 migrações. Registro Git e publicação seguem a autorização do usuário para revisar, testar e executar dentro do escopo.

## Escopo e comportamento

- A criação de rodadas valida membership ativa, permissão presentations/operation e escopo do cliente. O caminho service_role permanece reservado ao backend. Foram preservados assinatura, retorno, seleção única de conteúdos, timestamps dos itens, linhagem e regra de uma próxima rodada direta.
- Criação e revogação de links são RPCs SECURITY DEFINER com identidade obrigatória, permissão de operação e validação do workspace. A geração aleatória, hash SHA-256, expiração de 14 dias e revogação idempotente foram preservadas. Tokens existentes não foram alterados.
- As três políticas globais de Apresentações foram substituídas por nove políticas específicas: view para leitura de apresentações/itens; operation para inclusão, atualização e gestão de links; management para exclusão de apresentações/itens. Metadata dos links requer operation.
- Helpers ficam em office_private, com search_path fixo e execução negada a anon. Não foram alteradas configurações de schemas expostos da API. As funções de gestão de links passaram de invoker para definer para permitir operações validadas sem conceder escrita direta na tabela.
- INSERT/UPDATE/DELETE direto em links foi revogado para authenticated. Escrita de decisões, feedback e reviewed_at nos itens exige RPC; novos itens diretos precisam estar pending e sem revisão/feedback. Estados terminais de apresentação também exigem reconciliação por RPC. Mudanças diretas nas relações de cliente, série, predecessor, conteúdo e apresentação são bloqueadas para os papéis da API.
- O serviço de exclusão agora usa uma só operação no pai, com a FK ON DELETE CASCADE já existente, e detecta retorno sem linhas em ambas as exclusões. Uma falha não provoca uma requisição anterior que apague os itens.
- Efeito visível: bloqueios e mensagens de erro quando não houver permissão. Layout, cores e componentes não foram alterados.

## Testes e evidências

Execução local:

```powershell
& ./tests/security/run-presentation-decisions.ps1 -IncludeWorkspaceScope
node --experimental-vm-modules --test ./tests/security/presentation-deletion.test.mjs
node --test ./tests/security/presentation-decision-contracts.test.mjs
```

Resultado: 137 verificações SQL/concorrência (63 regressões de decisões, 67 verificações de workspace e sete verificações de concorrência), seis testes dos serviços reais de exclusão com infraestrutura controlada e quatro testes de contratos. Dados e tokens exclusivamente fictícios. O laboratório foi encerrado e o banco descartável removido. Log local presentation-workspace-results.log ignorado pelo Git.

Os testes cobrem acesso recíproco entre workspaces, admin global sem acesso ao destino, usuário assigned, view/operation, membership suspensa, ausência de permissão/identidade, escrita direta versus RPC, hash de token, revogação, cascatas preservando conteúdos, criação de rodadas com seleção inválida/duplicada e duas chamadas concorrentes gerando somente um sucessor. Reaplicação local preservou os nove policies.

A suíte inicialmente encontrou erros nos testes CTE/permissão do laboratório e no guard baseado em pg_has_role: um superusuário local passa nesse teste mesmo quando a RPC executa como owner. Foi corrigido para os papéis reais de API anon/authenticated, preservando o funcionamento das RPCs. Nenhuma versão com testes falhando foi aplicada remotamente.

Antes da aplicação, o administrador global existente tinha membership ativa e todos os workspaces de clientes com apresentações tinham owner/admin ativo (consulta agregada, sem dados pessoais). Dry-run listou somente 20261010002848_scope_presentation_workflows_to_workspace.sql, sem seeds/roles/Vault.

Após aplicação: SQL registrado e os seis corpos das funções correspondem ao arquivo local; owner postgres, search_path, ACLs, nove policies e revogação de escrita direta em links conferidos. Lint dos schemas public e office_private: No schema errors found. Uma transação READ ONLY com rollback confirmou ausência de leitura sem identidade, helper nulo negado e guards de identidade nas RPCs, sem submeter decisões, criar links ou rodadas reais.

Advisor mantém três tabelas com RLS sem policies, cinco funções com search_path mutável, sete SECURITY DEFINER acessíveis a anon; o total acessível a authenticated passou para 19, devido às duas RPCs de links agora definer e intencionalmente protegidas. Proteção de senhas vazadas continua desabilitada. Referências: [RLS sem policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [execução anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [execução authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Não foram feitas revogações genéricas de funções por alertas.

## Pendências e próximo passo

Clientes e Conteúdos continuam com policies ALL baseadas em is_admin(). Isso mantém exposição global desses módulos a administradores e impede leitura normal por membros sem papel global admin, mesmo quando a RPC de Apresentações é autorizada. O laboratório reproduz e testa essa limitação explicitamente. A próxima auditoria deve reconciliar essas entidades e seus descendentes por workspace, sem afirmar isolamento integral a partir desta etapa.

Storage, assinatura de mídias públicas, autenticação/JWT real, navegação e build local completo não foram homologados. A configuração VITE_SUPABASE_ANON_KEY na Vercel permanece pendente por decisão do usuário; publicar um novo build não resolve essa configuração. Nenhuma credencial, variável de ambiente, usuário, cliente real ou token existente foi modificado. O dump avulso e supabase/.temp permanecem fora dos commits.

Orientação de RLS conferida na [documentação oficial](https://supabase.com/docs/guides/database/postgres/row-level-security): grants e policies precisam ser avaliados juntos; os testes exercitam ambos.
