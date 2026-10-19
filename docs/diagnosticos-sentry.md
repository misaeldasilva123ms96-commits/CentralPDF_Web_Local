# Diagnósticos compartilhados com Sentry

Os logs da tela **Qualidade / Autodiagnóstico** pertencem ao navegador, perfil e
origem atuais (`localStorage`). Um contador `xN` representa ocorrências repetidas,
não pessoas. Limpar essa lista não limpa dados de outros navegadores.

Esta integração oferece uma coleta central opcional. **O DSN público fornecido
pelo responsável está configurado, mas cada navegador começa sem autorização:
nenhum relatório é enviado antes do consentimento.** A disponibilização no site
depende da publicação da versão configurada pelo fluxo normal do projeto. O
processamento dos documentos continua no navegador. Não existe painel público
com os erros dos visitantes; o responsável consulta seu projeto privado no Sentry.

## Configuração e verificação pelo responsável

O destino desta entrega já está configurado. Os passos abaixo documentam a
configuração de outro projeto e a verificação dos ajustes na conta Sentry.

1. Crie sua conta em <https://sentry.io/> e um projeto para JavaScript no navegador.
   Convide somente as pessoas que devem consultar os diagnósticos. Verifique
   quotas, região, retenção e custos do plano escolhido.
2. Nas configurações do projeto, revise os controles de privacidade e de dados
   sensíveis. Desative armazenamento/enriquecimento por IP quando disponível e
   mantenha a limpeza de dados sensíveis ativa. O receptor recebe o IP e os
   cabeçalhos normais da conexão HTTP; omitir esses campos do JSON não impede
   que o serviço os observe. Não prometa anonimato absoluto.
3. Copie somente o **DSN público do projeto**. Nunca coloque token de API,
   senha ou credenciais administrativas no site. Um DSN é público e pode ser
   extraído do JavaScript; ele permite ingresso de eventos, não acesso ao painel.
4. Edite `assets/js/diagnostics-config.js`:

   ```js
   window.CentralPDFDiagnosticsConfig = Object.freeze({
     enabled: true,
     dsn: 'https://CHAVE_PUBLICA_32_HEX@o123.ingest.us.sentry.io/456',
     environment: 'production'
   });
   ```

   Substitua o exemplo pelo DSN real, sem alterar sua região. São aceitos apenas
   HTTPS e hosts `o<numero>.ingest.sentry.io`, `o<numero>.ingest.us.sentry.io` ou
   `o<numero>.ingest.de.sentry.io`, chave hexadecimal de 32 caracteres e projeto
   numérico. Instalações Sentry próprias precisam de revisão do validador e CSP.
   `environment` aceita `production` ou `staging`.
5. Para entregar uma nova configuração aos navegadores existentes, atualize a
   revisão `?v=` do arquivo de configuração em **index.html e sw.js**, e incremente
   `CACHE_VERSION` em `sw.js` e as expectativas dos testes de cache. Faça a revisão
   e publicação pelo fluxo normal do projeto. Alterar esta configuração não publica o app.
   Atualize também o pacote local quando for distribuí-lo; cópias antigas ou
   páginas ainda abertas não recebem a configuração instantaneamente.
6. Abra a versão configurada, entre em **Qualidade / Autodiagnóstico**, marque
   **Permitir o envio de novos diagnósticos técnicos** e clique em **Enviar
   diagnóstico de teste**. Confirme o evento `diagnostic_test` no projeto correto.
   Verifique a limpeza de IP e a visibilidade privada no evento recebido. O teste
   local de integração não substitui essa verificação no projeto real.
7. Cada visitante precisa autorizar em seu próprio navegador. O painel reúne os
   eventos recebidos dessas instalações. Não há importação de logs antigos.

Para desativar toda a integração em novas cargas do app, publique `enabled: false`
com a atualização de cache acima. Para revogar em um navegador, desmarque a opção;
as outras abas da mesma origem recebem a mudança. O consentimento é associado à
versão desta política e ao host/projeto; mudar de projeto exige nova autorização.
O servidor local abre portas dinâmicas: cada origem/porta pode pedir autorização
novamente, conforme as regras de armazenamento do navegador.

## O que é enviado

O transporte usa o protocolo [Sentry Envelope](https://develop.sentry.dev/sdk/data-model/envelopes/)
sem SDK, captura automática, replay, tracing, anexos ou breadcrumbs. O código só
constrói campos previstos em uma lista fechada:

| Campo | Conteúdo |
| --- | --- |
| `event_id`, `timestamp` | Identificador aleatório do evento e horário |
| `release`, `environment` | Versão fixa da integração e ambiente permitido |
| `tags.code` | Categoria técnica conhecida, por exemplo `input_empty` ou `javascript_failure` |
| `tags.tool` | Uma das 34 ferramentas, `unknown` ou `diagnostics` no teste |
| `tags.component` | Nome conhecido de módulo do app ou `runtime` |
| `exception`, `level`, `fingerprint` | Descrição fixa, gravidade e agrupamento por categoria/ferramenta/módulo |
| `extra.occurrences` | Ocorrências iguais agrupadas enquanto aguardam envio |

**Não são enviados** mensagens brutas, stack traces, nomes de arquivos, conteúdo
ou bytes de PDF/imagem, texto digitado, URLs de páginas, consultas, cookies,
identificadores de usuário/dispositivo ou o histórico local. O pedido usa
`credentials: 'omit'`, `referrerPolicy: 'no-referrer'` e rejeita redirecionamentos.
Cabeçalhos gerados pelo navegador e metadados de rede continuam visíveis ao
receptor. Falhas atribuídas a URLs de extensões são descartadas. Avisos sem uma
categoria reconhecida também ficam somente na lista local.

Falhas genéricas são agrupadas em categorias fixas, por privacidade. Elas não
trazem a linha do código ou a mensagem original; para uma investigação detalhada,
o usuário ainda pode revisar e compartilhar manualmente seu diagnóstico local.
Esse arquivo local pode conter nomes: ele **não** faz parte da coleta automática.

## Consulta e limites

No painel privado do projeto, filtre por `release`, `environment`, `tool`,
`component` e `code`. Erros de arquivo vazio, senha, formato incompatível, fontes e
recuperação têm nível de aviso para diferenciar problemas de entrada dos erros
de execução. O teste tem nível informativo. Os contadores não representam usuários
únicos e não garantem todas as ocorrências; não há identidade persistente.

A fila fica somente em memória, com até 20 grupos e validade de 15 minutos. Há no
máximo 30 eventos enviados por carga da página e 10 tentativas por minuto. Falhas
de rede/servidor têm até três tentativas; desconexão espera o retorno da rede.
Fechar a aba pode perder pendências. Limites do Sentry são respeitados por
`X-Sentry-Rate-Limits`/`Retry-After`, descartando pendências durante a pausa. Não há
retransmissão garantida nem armazenamento remoto próprio do Central PDF.

Desautorizar descarta pendências e cancela pedidos em andamento, mas não pode
recolher um evento já recebido. **Limpar logs locais** apaga apenas a lista local.
Para excluir eventos centrais ou ajustar retenção, use os controles do projeto no
Sentry. Bloqueadores, navegador offline, quotas e falta de autorização podem impedir
o envio; a tela informa contadores e pausas desta aba.

## Verificação desta entrega

- `node tests/diagnostics-telemetry.test.js`: configuração, consentimento,
  privacidade, agregação, expiração, quotas, falhas, revogação e limites do receptor.
- `python tests/diagnostics-telemetry.test.py`: dois navegadores independentes,
  painel desktop/mobile e pedidos reais para receptor HTTP **local**, com a URL
  Sentry interceptada. Nenhum dado vai ao Sentry durante o teste.
- `go test ./...` em `server/`: CSP aceita apenas os domínios de ingresso previstos,
  além dos destinos já usados pelo app. O executável Windows foi recompilado pelo
  mesmo comando reproduzível da CI, com checksum atualizado.

Em 19/10/2026, foi realizado separadamente um único envio real de
`diagnostic_test`, gerado pelo transporte do app com o DSN configurado. O receptor
Sentry respondeu HTTP 200 com o mesmo identificador do evento; os cabeçalhos CORS
permitem a origem do site. Nenhum documento, log antigo ou nome de arquivo foi
usado nesse teste. Os testes automatizados continuam locais e não enviam eventos
ao projeto real.

A aceitação HTTP foi verificada; a exibição do evento no painel, retenção,
visibilidade privada e limpeza de IP ainda devem ser conferidas pelo responsável
na conta Sentry, conforme o passo 6. O teste real não publicou a versão no site.
