# Decisões de apresentações — validação e aplicação

Estado em 09/10/2026: migração aplicada ao Supabase meliere-assets; correções, reconciliação das migrações e testes incluídos no registro Git local desta etapa. Sem push, deploy ou homologação integral.

A migração `20261009234515_restore_presentation_decision_rpcs.sql` restaura as três RPCs de decisão. O núcleo só pode ser executado por service_role; a entrada pública valida o hash do token, validade, revogação e pertencimento do item; a entrada administrativa exige permissão de operação e acesso ao cliente no workspace. As tabelas e suas políticas RLS não são alteradas.

O banco conserva `adjustments_requested`, `under_review` e `approved_with_adjustments`. Os serviços traduzem esses estados para o vocabulário existente da interface. O normalizador público aceita o envelope atual com `presentation`, `items` e `access`, preservando também o formato plano anterior. Não há mudança de layout; há efeito funcional nos estados exibidos e nas decisões quando a correção for aplicada.

Os bloqueios serializam decisões por conteúdo e apresentação, revalidam o token após espera e protegem decisões concorrentes, revogação, expiração e agregação. Conteúdos cancelados ou publicados e aprovações de rodadas posteriores são preservados. Reabrir uma decisão administrativa pode retornar a apresentação para revisão; apresentações arquivadas continuam arquivadas. A data de revisão segue a semântica histórica de preservar a primeira decisão enquanto não houver reabertura.

## Execução e resultados

```powershell
& ./tests/security/run-presentation-decisions.ps1
node --test ./tests/security/presentation-decision-contracts.test.mjs
```

O executor utiliza exclusivamente o PostgreSQL portátil já preparado em `$env:TEMP/office-helper-lab-20261009`, na porta local 55439. Recusa cluster já ativo e cria um banco exclusivo com dados fictícios. Remove somente seu banco e papéis de teste e encerra o cluster no bloco finally. Não instala dependências nem conecta ao Supabase.

Resultado: 63 asserções SQL e cinco verificações de concorrência aprovadas; quatro testes Node dos contratos aprovados. A suíte também reaplica a migração localmente para conferir seus grants. Nas corridas, o executor verifica que o segundo processo realmente está esperando um bloqueio antes de avaliar o resultado. O registro SQL local está em `presentation-decisions-results.log`, ignorado pelo Git conforme a regra existente para logs; os scripts e este resumo são versionados.

Foram incluídas cópias fiéis de quatro funções e cinco triggers recuperados por leitura do banco remoto, em `presentation-decisions-remote-triggers.sql`. São exercitados timestamps, aprovação, integridade entre clientes e linhagem/série. O trigger de aprovação mantém `approved_at` no timestamp da transação, enquanto a decisão do item usa `clock_timestamp()`. Os testes confirmam essa interação sem modificar os triggers remotos. O trigger de integridade de planejamento, limitado a mudanças em campos de planejamento/client_id, não é disparado pelas atualizações de decisão e não foi incluído no fixture.

## Aplicação e conferência remota

A autorização de 09/10/2026 permite avançar da revisão/testes para aplicação dentro do escopo, sem nova confirmação a cada etapa. A prévia `db push --linked --skip-vault --dry-run` listou somente esta migração. A execução correspondente aplicou somente ela, sem seeds ou atualização de Vault. O histórico remoto e a pasta local agora contêm 18 migrações; isso não significa que todas estejam rastreadas no Git.

O usuário também autorizou concluir commits após a revisão aprovada, sem novo pedido de confirmação. O commit desta etapa inclui as cinco migrações antes não rastreadas, os serviços corrigidos, AGENTS.md e os scripts/documentação de testes. Os cinco arquivos SQL correspondem aos comandos remotos na comparação que remove comentários de linha, espaços e separadores; para as RPCs novas também foram comparados os corpos e grants após aplicação. Nenhuma migração histórica rastreada foi editada. O dump avulso e os arquivos de supabase/.temp permanecem fora do commit; nenhuma credencial ou arquivo de ambiente foi incluído.

Após a aplicação: os três corpos das funções correspondem ao SQL local; os nove comandos registrados correspondem ao arquivo considerando os separadores removidos pelo CLI. Owner postgres, SECURITY DEFINER, search_path fixo e grants foram conferidos. As funções dos triggers permaneceram idênticas à origem. `db lint --linked --fail-on error` retornou `No schema errors found`.

Quatro verificações adicionais remotas foram executadas em transação READ ONLY com rollback, sem dados reais: token nulo rejeitado, núcleo inacessível a anon, função administrativa inacessível a anon e identidade ausente rejeitada para authenticated. Nenhuma decisão real foi submetida.

Advisor após aplicação: três tabelas com RLS sem políticas, cinco funções com search_path mutável, sete SECURITY DEFINER acessíveis a anon e 17 a authenticated, além do aviso de proteção contra senhas vazadas desabilitada. O acréscimo de uma função pública e duas autenticadas corresponde às entradas restauradas; seu acesso é intencional e protegido na implementação, não motivo para revogação automática. A análise das demais ocorrências segue pendente.

Limites: Auth local é simulado por parâmetros de sessão; o schema contém as estruturas relevantes, não todo o Supabase. Esses testes não homologam RLS global, Storage, navegador ou integração completa. O build da aplicação não foi executado porque as dependências locais não estão instaladas; nenhuma instalação foi feita. A assinatura de mídia para acesso público e a autorização por workspace da criação de rodadas continuam pendentes e não fazem parte desta correção.
