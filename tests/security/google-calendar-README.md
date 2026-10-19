# Google Agenda — conexão e leitura no MVP

Escopo aprovado em 18/10/2026: conectar a conta Google e visualizar compromissos, mantendo criação/edição para etapa posterior. Agenda principal da conta conectada; somente eventos de calendários próprios, escopo `https://www.googleapis.com/auth/calendar.events.owned.readonly`. Não é login social e não substitui o login atual do Office.

## Funcionamento e segurança

- CalendarPage agrega eventos externos aos conteúdos e tarefas existentes, sem criar cópias nas tabelas operacionais. Google continua fonte dos compromissos. Desktop e mobile têm cards azuis identificados; texto filtra todos, filtros editoriais/cliente não afetam eventos pessoais. Fuso segue o navegador; fim de evento é exclusivo, inclusive eventos de dia inteiro.
- Credencial OAuth da aplicação fica nos Secrets das Edge Functions. Refresh token fica criptografado no Supabase Vault. Tabelas auxiliares no schema não exposto office_google_private, sem acesso direto de anon/authenticated/service_role; função SQL estreita somente service_role permite armazenamento.
- API google-calendar mantém verificação JWT no gateway e valida usuário no Auth, uma única membership owner/admin ativa e workspace ativo. O backend deriva usuário/workspace, sem aceitar IDs de escopo enviados pelo navegador. SQL revalida membership em toda operação privilegiada. Cada conexão é do par usuário/workspace, nunca compartilhada automaticamente com outros membros.
- Callback google-calendar-callback recebe o retorno público do Google sem JWT Office; autentica a autorização por estado aleatório de 256 bits, armazenado apenas como SHA-256, validade de dez minutos, uso único, vínculo usuário/workspace e revisão da conexão. Desconectar invalida estados e callbacks concorrentes. Callback retorna só resultado genérico ao domínio fixo do Office; códigos/tokens não vão em logs ou redirect.
- Tokens de acesso são usados apenas no servidor. API não devolve credenciais, descrições ou participantes. Links de eventos são restritos aos hosts oficiais. Requisições de eventos são GET, com período limitado e paginação; falha de página invalida todo o resultado. Não há método de escrita na Calendar API.
- Desconectar apaga apenas a credencial dessa conexão no Office/Vault e preserva eventos. Não revoga em massa concessões do aplicativo Google que possam ser usadas por outra conexão; o usuário pode revisar/remover a autorização no painel da conta Google.
- Falta de configuração aparece explicitamente no painel, sem botão falso de conexão funcionando.

## Google Cloud — configuração necessária pelo administrador

1. Abra [Google Cloud Console](https://console.cloud.google.com/) e crie/selecione um projeto dedicado ao Office. O projeto do Google AI Studio não comprova que Calendar API/OAuth estejam configurados.
2. Em APIs e serviços → Biblioteca, ative **Google Calendar API**.
3. Configure Google Auth Platform (branding, público e acesso a dados). Para conta Gmail pessoal, público é **Externo**; em testes, adicione sua própria conta como usuário de teste. Não solicite acesso geral de escrita à agenda. Configure o escopo de leitura de eventos próprios indicado acima. Complete os dados/URLs que o Google exigir com informações reais da aplicação, sem inventar políticas publicadas.
4. Em Clientes/Credenciais, crie **ID de cliente OAuth — Aplicativo da Web**.
5. Origem JavaScript autorizada, se solicitada: `https://meli-re-office.vercel.app`.
6. URI de redirecionamento autorizado, exatamente:

   `https://ycagvwsvccgdjzpbhrfi.supabase.co/functions/v1/google-calendar-callback`

7. No [Supabase, Edge Function Secrets](https://supabase.com/dashboard/project/ycagvwsvccgdjzpbhrfi/functions/secrets), cadastre separadamente:

   | Nome | Valor |
   | --- | --- |
   | GOOGLE_CALENDAR_CLIENT_ID | ID do cliente OAuth criado no Google |
   | GOOGLE_CALENDAR_CLIENT_SECRET | Segredo do mesmo cliente OAuth |

   Não usar prefixo VITE_, não cadastrar no código, não enviar valores no chat. Os secrets SUPABASE_* do runtime são fornecidos pela plataforma e não devem ser copiados para o frontend.
8. Volte ao Office → Calendário → Atualizar agenda → Conectar Google Agenda. O próprio administrador escolhe a conta e concede a permissão no Google. Só então validar eventos fictícios conhecidos, alteração no Google seguida de atualização no Office e desconexão.

Aplicativos OAuth externos em modo de teste podem ter refresh tokens com validade de sete dias para estes escopos. Não confundir publicar a configuração OAuth no Google com lançar o SaaS ao público; a passagem para produção/verificação deve seguir as exigências do Google, não ser contornada. [Documentação de expiração](https://developers.google.com/identity/protocols/oauth2#expiration).

## Testes e limites de validação

`node --experimental-vm-modules --test tests/security/*.test.mjs` inclui casos reais do handler com APIs fictícias: autenticação, origem, escopo mínimo, callback fixo, estado hash, replay/expiração/negação, token não exposto, paginação/falhas, troca de conexão, desconexão, links e datas. Nenhum consentimento real é simulado como homologado.

`./tests/security/run-finance-mvp.ps1 -Fixture google-calendar-lab.sql` testa grants/isolamento/expiração/revisões localmente. Vault é um double de contrato no laboratório, não uma alegação de criptografia local; criptografia real precisa de verificação transacional no Vault remoto, usando somente segredo fictício e rollback. Primeiro teste local teve UUID inválido no fixture; corrigido e suíte reexecutada.

Sem credencial OAuth configurada e consentimento real, conexão ponta a ponta permanece pendente. Nenhum compromisso é criado, alterado ou excluído por estes testes. Validação do build/publicação e limitações de navegador devem ser registradas após execução.

## Evidências de implantação

Migração registrada como `20261018235252_google_calendar_readonly`; statements recuperados e comparados ao SQL enviado, normalizando comentários/espaços/separadores: equivalentes. O schema office_private de Apresentações já existente foi preservado; esta integração usa somente office_google_private. Teste transacional no Vault real confirmou cifra diferente do segredo fictício, decifração coerente, bloqueio de replay e remoção do segredo na desconexão. ROLLBACK deixou zero conexões e estados. anon/authenticated não executam a função privilegiada.

Edge Functions google-calendar (JWT obrigatório) e google-calendar-callback (estado OAuth de uso único) implantadas. Requisição API sem autenticação retornou 401; callback inválido retornou 303 somente para o domínio fixo do Office. Suíte completa local: 128 testes passaram, incluindo 18 desta integração; SQL local também passou. Não houve instalação de dependências locais; SDK da função está fixado em 2.112.4. Código Deno é verificado separadamente do TypeScript do frontend e excluído do tsconfig Vite.

Advisor indicou dois INFO novos `rls_enabled_no_policy` nas tabelas privadas de credenciais/estados. É bloqueio deliberado de acesso direto, com privilégios revogados e execução controlada pelo servidor; não foram criadas policies permissivas apenas para silenciar o aviso. [Descrição do advisor](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Alertas antigos de outros módulos permanecem fora deste recorte. Não equivale a homologação global.

Referências oficiais: [escopos](https://developers.google.com/workspace/calendar/api/auth), [OAuth web server](https://developers.google.com/identity/protocols/oauth2/web-server), [listagem de eventos](https://developers.google.com/workspace/calendar/api/v3/reference/events/list), [Vault](https://supabase.com/docs/guides/database/vault).
