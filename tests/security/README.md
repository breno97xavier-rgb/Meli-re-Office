# Laboratório local — helpers S4.1

Resultado em 09/10/2026: 50 asserções PASS, nenhuma falha.

## Ambiente e execução

PostgreSQL portátil 17.11, binários oficiais EDB:
https://www.enterprisedb.com/download-postgresql-binaries

Runtime/cluster: $env:TEMP\office-helper-lab-20261009
Endpoint exclusivo: 127.0.0.1:55439; banco office_helpers_test; usuário local office_lab.
Sem serviço Windows, alteração de PATH ou conexão ao Supabase. Autenticação trust é exclusiva deste laboratório temporário em loopback, desligado ao terminar.

Execute na raiz do repositório:

```powershell
& ./tests/security/run-workspace-helpers.ps1
```

O executor exige o cluster portátil já inicializado, recusa cluster em execução, inicia em loopback, executa psql com -X e ON_ERROR_STOP e desliga o servidor em finally. O runtime temporário pode desaparecer pela limpeza do Windows; nesse caso deverá ser preparado novamente. Não aponta para banco remoto.

## O que foi testado

- Três defeitos reproduzidos nas funções históricas antes da correção.
- Owner/admin com cliente do próprio workspace, estrangeiro e inexistente.
- Member com escopo assigned versus all, incluindo cliente local não atribuído.
- Responsabilidade por área e primary/collaborator.
- Hierarquia view/operation/management, permissão ausente, chave NULL/inválida e nível NULL/inválido.
- Usuário inexistente, sem identidade e membership suspensa.
- Argumentos workspace/cliente/área nulos.
- SECURITY DEFINER funcionando com leitura direta de clients bloqueada por RLS.
- OIDs, proprietário, ACL, search_path, volatility, retorno e argumentos preservados.
- EXECUTE negado a anon; reaplicação local preserva EXECUTE de authenticated.

Os objetos e dados fictícios são criados em uma transação com ROLLBACK. O banco local vazio e os binários permanecem; o servidor está desligado.

## Limites

Schema mínimo, auth.uid simulada via configuração da sessão e roles locais. Não representa Supabase Auth/JWT real, API, todas as constraints/triggers, RLS de negócio, Storage ou interfaces. PostgreSQL remoto observado é 17.6; o laboratório usa 17.11. A correção dos helpers foi aplicada ao Supabase meliere-assets em 09/10/2026 após autorização, com definições e permissões verificadas. Isso não homologa S4.1; as migrações históricas foram preservadas.

Resultado detalhado local: workspace-helpers-results.log (ignorado pelo Git conforme a regra existente para logs).
Migração testada: ../../supabase/migrations/20261009232133_harden_workspace_authorization_helpers.sql.
