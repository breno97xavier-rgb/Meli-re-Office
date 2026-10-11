# MVP interno — cadastro manual de Clientes

11/10/2026: prioridade confirmada pelo usuário para uso diário por um administrador, adiando perfis e permissões granulares SaaS. Alteração local adiciona Novo cliente em Clientes e formulário de nome/razão social, nome comercial, segmento, telefone, e-mail e observações. Preserva componentes, paleta e edição existentes. Mudança estética específica de Conteúdos/Apresentações permanece pendente de alinhamento.

O serviço identifica o usuário autenticado e consulta exclusivamente suas memberships ativas owner/admin em workspaces ativos. Exige um único workspace distinto e envia workspace_id explicitamente. RLS existente continua sendo aplicada: esse filtro frontend não substitui segurança do banco nem homologa isolamento completo. Não houve mudança de RLS, grants, migrações, autenticação ou configuração Vercel. Conta com membership admin mas sem o papel global exigido pela policy atual ainda pode ser recusada pelo banco.

Nome comercial vazio usa nome/razão social; slug utiliza nome normalizado e UUID aleatório para evitar colisões por nomes iguais. Status inicial onboarding; origens comerciais e valores financeiros não são enviados. INSERT retorna a linha persistida; falha não dispara nova tentativa automática. Duplo envio e fechamento durante salvamento são bloqueados no formulário; erros preservam os campos. A lista é recarregada e filtros são limpos ao concluir; uma falha nessa recarga aparece no banner existente.

Inspeção somente de leitura confirmou constraints de nome/commercial_name/slug/workspace obrigatórios, unicidade de slug, status permitido, origens opcionais e INSERT concedido a authenticated. Correção de interpretação do diagnóstico anterior: resolve_single_active_workspace_id conta workspaces ativos visíveis ao papel da consulta, não memberships diretamente. Este cadastro não depende desse fallback: envia o workspace validado nas memberships. Não foram criados clientes reais ou fictícios no remoto.

Validação: oito testes do serviço real com infraestrutura controlada passaram, junto a cinco testes de origem comercial, seis de exclusão de apresentações e quatro de contratos de retorno — 23 no total. Casos: dados mínimos/normalização, workspace próprio explícito, payload sem origens comerciais/valores ou workspace injetado, identidade ausente, zero/múltiplos workspaces administrativos ativos, erro de membership, INSERT negado sem repetição e nome comercial distinto.

```powershell
node --experimental-vm-modules --test tests/security/manual-client.test.mjs tests/security/client-origin-relations.test.mjs tests/security/presentation-deletion.test.mjs
node --test tests/security/presentation-decision-contracts.test.mjs
```

Revisão React: dialog nativo modal com foco inicial e fechamento por Escape, labels associados por encapsulamento, mensagem role=alert, guard de envio por ref, sem listeners globais, payload e dependências mínimos. Build/lint completos locais indisponíveis porque node_modules não está instalado e compiladores não foram encontrados no cache/runtime; não houve instalação. Gravação HTTP autenticada, persistência após login/reload, acesso com a conta do administrador, aparência real e navegação ainda precisam de validação com dados fictícios. Não declarar este fluxo homologado para dados reais apenas pelos testes unitários.

As policies globais existentes, proteção de Storage e backup/recuperação continuam pendências mínimas de segurança antes do uso real. Não retomar a expansão SaaS como requisito para entregar o cadastro básico. Testes/protótipos de autorização financeira anteriores continuam preservados em arquivos separados, sem aplicação remota.

## Ação correta e publicação principal — 11/10/2026

O usuário autorizou publicar no domínio principal com o ajuste do botão. Inspeção de App, OfficeLayout, Topbar e ClientsPage mostrou que o + Novo era placeholder de ação rápida genérica, sem handler, desativado e rotulado como futuro. A Fonte Mestre não determina que esse botão seja exclusivamente de Clientes; a Diretriz MVP exige cadastro manual agora. Ligá-lo contextualmente em /clientes cumpre essa prioridade, sem executar automaticamente a ação em outros módulos.

O estado do formulário passa a ser compartilhado pelo App: callback explícito App → OfficeLayout → Topbar; ClientsPage recebe abertura/fechamento e mantém a recarga da lista após gravação. Navegar para outra rota limpa a abertura. O formulário, a persistência e os guards do cadastro são os mesmos. Botão extra Novo cliente removido de ClientsHeader; o + Novo existente fica ativo e acessível também no mobile em Clientes. Nos outros módulos permanece desativado. Não houve mudança de banco, RLS, grants ou chaves.

As 23 regressões de serviços foram reexecutadas e passaram; revisão React e diff --check realizados. Main remota conferida via fetch e confirmada como ancestral da branch de entrega, sem commits divergentes. Avanço para main/publicação autorizado especificamente nesta conversa; nenhuma alteração local avulsa ou protótipo financeiro deve entrar nesse commit. Build local completo permanece indisponível sem dependências; o build do deployment e o bundle efetivamente servido no domínio principal serão conferidos. Teste autenticado de criação com dados fictícios e aprovação visual continuam a cargo da validação do usuário, sem cadastrar dados reais automaticamente.
