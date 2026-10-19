# Google Agenda — escrita no MVP (18/10/2026)

## Escopo implementado

- Criar compromisso simples na agenda `primary` da conta conectada ao usuário/workspace.
- Editar título, descrição, local, início, término e dia inteiro via PATCH, preservando os demais campos.
- Excluir com confirmação no editor e `confirm: true` exigido pelo servidor.
- Ocorrências recorrentes: somente a instância selecionada. Bloquear série mestre, convites com participantes, organizador externo e eventos especiais; encaminhar ao Google.
- Solicitar apenas `calendar.events.owned`. Tokens antigos de leitura continuam lendo, mas não escrevem. A permissão efetiva vem da resposta do Google, nunca da tela.
- Credenciais permanecem no servidor/Vault. Não houve mudança de schema/grants/RLS.
- ETag/If-Match impede sobrescrever alterações concorrentes. Revalidar conexão/workspace imediatamente antes da escrita. Como em qualquer API externa, uma operação já enviada não pode ser cancelada por uma desconexão simultânea.
- ID determinístico de criação por usuário/workspace/request UUID evita duplicação em nova tentativa. Sem repetição automática de escrita; erros ambíguos orientam atualizar a agenda.

## Verificação

`node --experimental-vm-modules --test tests/security/*.test.mjs`: 140 testes aprovados, incluindo 12 testes de escrita com provedor simulado. Não equivalem a teste real do Google.

Funções `google-calendar` e `google-calendar-callback` publicadas na versão 5, projeto `meliere-assets` / `ycagvwsvccgdjzpbhrfi`. JWT obrigatório na API; callback usa state aleatório, hash e consumo único já existentes.

## Pendências de homologação

- Nova autorização pessoal do Google para escrita, pelo botão “Autorizar edição no Google”.
- Criar evento fictício pelo Office, recarregar, editar, conferir no Google e excluir apenas esse registro fictício com confirmação.
- Verificar dia inteiro, ocorrência recorrente fictícia, conflito com alteração no Google e formulário responsivo.
- Aplicativo permanece em Testing; publicar/verificar o OAuth antes da liberação SaaS.

Referências: https://developers.google.com/workspace/calendar/api/v3/reference/events/insert ; https://developers.google.com/workspace/calendar/api/v3/reference/events/patch ; https://developers.google.com/workspace/calendar/api/v3/reference/events/delete
