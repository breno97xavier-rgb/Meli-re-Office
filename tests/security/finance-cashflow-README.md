# Financeiro — caixa acumulado e recorrências (15/10/2026)

Decisão autorizada na conversa: MVP interno com saldo inicial datado, caixa acumulado por movimentação efetiva, receitas/despesas mensais e projeção com horizonte explícito. Pró-labore continua despesa interna comum; nenhum cadastro de funcionários/sócios ou billing SaaS foi criado.

## Comportamento

- Saldo inicial representa o caixa no início da data escolhida. Somam-se apenas recebimentos/pagamentos efetivados dessa data até hoje, sem filtro de mês/cliente. Antes da configuração, saldo atual e saldo final projetado aparecem indisponíveis, nunca como zero presumido.
- Indicadores mensais existentes continuam separados. O cartão “Saldo realizado” é o resultado do mês, não o caixa acumulado.
- Previsão global inclui pendências abertas (vencidas identificadas separadamente), regras mensais futuras e movimentações com data efetiva futura. Limite de 24 meses por consulta; despesas podem ter regra sem término, receitas exigem término confirmado. Não presume novos clientes ou renovação.
- Mensalidade/vigência do cliente podem preencher a regra mediante conferência; vencimento deve ser escolhido. Não altera cliente, lead, oportunidade ou contrato. Mudanças posteriores no cadastro não alteram parcelas históricas.
- Geração explícita e transacional por regra/período cria pendências, nunca pagamentos. Índices únicos impedem repetição por regra/mês e mensalidade do mesmo cliente/mês, inclusive após cancelamento ou troca de regra. Dias 29–31 usam o último dia de meses curtos.
- Encerrar uma regra para novas previsões/gerações preserva parcelas já emitidas. Elas precisam ser liquidadas/canceladas individualmente. Valores/vigência da regra não são reescritos; uma nova regra representa um novo acordo.
- Saldo inicial e regras têm auditoria imutável de snapshots; parcelas mantêm o histórico já existente. Alterações usam versão anterior para evitar sobrescrita concorrente.

## Segurança e validação

- Migração incremental `20261015183607_finance_cashflow_recurrence.sql`, aplicada no projeto confirmado `meliere-assets`. SQL recuperado do histórico remoto comparado com o enviado, desconsiderando somente comentários/espaços/separadores: equivalente.
- Novas tabelas com RLS e grants mínimos, sem acesso anônimo/exclusão. RPC de geração SECURITY INVOKER; auditoria por trigger com search_path fixo e execução direta revogada. Workspace, autor e vínculo da parcela com regra preservados.
- `node --experimental-vm-modules --test tests/security/*.test.mjs`: 106 testes passaram, incluindo 26 de Financeiro.
- `./tests/security/run-finance-mvp.ps1 -Fixture finance-cashflow-lab.sql`: suíte PostgreSQL local passou, incluindo matriz owner/outro workspace/suspenso/anon, idempotência, fevereiro comum/bissexto, troca de regra, campos imutáveis e histórico.
- Teste remoto sob papel authenticated, com geração/baixa/encerramento e ROLLBACK: passou; zero lançamentos, regras e saldos iniciais remanescentes. Sem dados financeiros fictícios permanentes.
- Advisor consultado: nenhum apontamento nas novas tabelas/funções; alertas preexistentes de outros domínios permanecem pendentes de auditoria específica. Isso não homologa toda a segurança do Office.
- Dependências locais não instaladas; build e inspeção visual da publicação devem ser registrados após a entrega.

## Limites e continuidade

Caixa é um controle informado pelo usuário, sem conciliação bancária automática e sem movimentar dinheiro. Projeção não equivale a lucro contábil. Categorias são texto livre; favorecidos estruturados/equipe permanecem evolução futura. Homologação final de uso e visual depende do usuário.
