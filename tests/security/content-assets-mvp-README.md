# MVP interno — upload e recuperação de mídias

11/10/2026. Prioridade: permitir organizar as publicações dos clientes com mídia persistente. Limpeza de testes adiada pelo usuário; nenhuma exclusão de registros existentes ou mídia remota foi executada. Mudança estética de Conteúdos/Apresentações aguardando descrição do usuário, sem alterar layout neste recorte.

Projeto remoto confirmado por leitura: meliere-assets, ycagvwsvccgdjzpbhrfi, ACTIVE_HEALTHY. Bucket content-assets privado, 52428800 bytes (50 MiB), MIME JPG/PNG/WebP/MP4, alinhado ao limite do serviço. content_assets usa file_url como caminho interno; não é URL pública. Não há trigger nessa tabela que confirme caminho/client_id; FK valida content_id e usa cascata se conteúdo for excluído. Não houve alteração de schema, policies, grants, bucket ou credenciais.

Lacunas corrigidas no fluxo do aplicativo: upload validava somente cliente/workspace, sem confirmar que o conteúdo pertencia ao cliente; substituição buscava somente ID do asset, sem exigir mesmo conteúdo/versão atual; erro ao ler ordem dos slides era silenciado e assumia zero após já enviar o arquivo. Agora a leitura de Contents exige id/client_id e o resultado é validado; workspace deriva do cliente; alocação de display_order é feita antes do upload e falhas interrompem o envio; tipo e ordem são validados. Substituição lê e altera somente asset do mesmo conteúdo ainda is_current=true, com retorno de linha obrigatório, e a restauração existente também fica limitada ao conteúdo.

O caminho continua workspace/<workspace_id>/clients/<client_id>/contents/<content_id>/<uuid>.<ext>; não sobrepõe objetos existentes (upsert=false). A visualização usa signed URL temporária com expiração padrão de uma hora. Compensação existente remove somente o objeto recém-enviado se a gravação de metadata falhar; não é limpeza dos testes antigos.

Dez testes novos carregam o serviço real com doubles: relação conteúdo/cliente, ordem antes do upload, metadados do objeto privado, cliente incorreto, leitura de assets negada sem envio, ordem/formato/tamanho inválidos sem requests, falha de upload sem metadata, compensação do objeto recém-criado, substituição de asset estrangeiro/histórico negada, substituição atual com filtros e incremento de versão e recuperação por signed URL. Total com regressões: 48 testes passaram. A primeira execução tinha expectativa incorreta sobre mensagem de erro de PostgREST, corrigida para o objeto plain usado pelo SDK; suíte inteira reexecutada. Não houve envio de arquivo ou criação de dados fictícios no remoto.

```powershell
node --experimental-vm-modules --test tests/security/content-assets-mvp.test.mjs tests/security/planning-mvp.test.mjs tests/security/manual-client.test.mjs tests/security/client-origin-relations.test.mjs tests/security/presentation-deletion.test.mjs
node --test tests/security/presentation-decision-contracts.test.mjs
```

Limites: frontend guards não substituem RLS; as policies globais existentes de Contents/Assets/Storage continuam pendentes. Troca de versão ainda é multioperação (upload, desativação, INSERT e compensação); não declarar transação atômica/concorrência homologada. Retornos de erro do SDK na compensação/restauração podem ainda precisar de tratamento; reordenação também usa várias escritas e pode aplicar parcialmente. signed URLs podem expirar enquanto a tela fica aberta. Esses pontos exigem recortes próprios antes de homologar mídias reais e recuperação. Build local completo indisponível por ausência de dependências, sem instalação; conferir o build automático e bundle principal após publicação.

Próximo passo: definir mudança estética desejada e validar criação de conteúdo, upload, refresh, substituição e visualização do histórico com mídia fictícia. Não há dados reais autorizados para introdução automática, nem autorização para excluir os testes existentes.
