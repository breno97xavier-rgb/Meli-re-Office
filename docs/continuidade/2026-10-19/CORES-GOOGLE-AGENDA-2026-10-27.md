# Cores dos compromissos Google — 27/10/2026

## Escopo local implementado

Usuário confirmou preferência por cores provenientes da integração e pediu continuidade. Implementada leitura de colorId na listagem Google e consulta opcional à paleta oficial /calendar/v3/colors, permitida pelos escopos atuais. Somente GET adicional, no servidor, com timeout de quatro segundos; não salva nem muda eventos ou credenciais. Falha da paleta não oculta compromissos. A revalidação da conexão após as consultas permanece ativa.

GoogleEventCard, usado no mês, na visão compacta/mobile e na janela do dia, recebe fundo da paleta e escolhe texto preto/branco por luminância para contraste. Somente hexadecimal de seis dígitos entra no estilo. Título, horário e identificação de origem permanecem. Sem seletor novo ou edição da cor pelo Office neste recorte. Sem alterar tarefas/conteúdos ou criar fonte paralela de eventos.

Limite explícito: eventos sem colorId específico conservam o azul padrão do Office. A cor padrão personalizada do calendário como um todo não é consultada; isso precisaria avaliar CalendarList e suas permissões separadamente. Esta implementação não promete reproduzir essa configuração. A apresentação visual usa as definições da paleta da API, não uma cópia pixel a pixel da interface do Google.

## Arquivos do recorte

- src/components/calendar/GoogleCalendarPanel.tsx
- src/types/googleCalendar.ts
- src/services/googleCalendarColors.ts (novo)
- supabase/functions/_shared/google-calendar-core.ts
- tests/security/google-calendar.test.mjs

## Validação e publicação

199 testes Node aprovados (inclui cores/paleta indisponível ou malformada/projeção do dia/CSS inválido/contraste). Build Vite aprovado; aviso anterior de bundle grande permanece. Lint registra 22 diagnósticos; comparação programática TypeScript com os arquivos de HEAD registra o mesmo conjunto de diagnósticos, sem novos erros deste recorte. Não reinstaladas dependências.

Sem migração, escrita de eventos, commit, push ou deploy. Necessário publicar conjuntamente a função google-calendar (JWT preservado) e frontend para conferir no domínio principal. Não incluir demais alterações locais no commit. Aprovação específica de publicação exigida pelo AGENTS.md §4.4. Ainda não homologado visualmente com eventos reais nem testado o fluxo de três casos especiais Google. O CRUD simples anterior não deve ser repetido para recriar o evento já removido.

Fontes: https://developers.google.com/workspace/calendar/api/v3/reference/events ; https://developers.google.com/workspace/calendar/api/v3/reference/colors/get . Changelog Supabase via ferramenta web retornou tipo markdown não suportado; nenhum SDK/configuração Supabase alterado.
