# Diagnósticos compartilhados com Sentry

[Documentação](README.md) · [Segurança](../SECURITY.md). Guia revisado em **29/10/2026**.

Os logs da tela **Qualidade / Autodiagnóstico** pertencem ao navegador, perfil e
origem atuais (`localStorage`). Um contador `xN` representa ocorrências repetidas,
não pessoas. Limpar essa lista não limpa dados de outros navegadores.

Esta integração centraliza automaticamente **novas categorias técnicas de erros**
no Sentry. O DSN público está configurado e o compartilhamento de erros começa
**ativado por padrão**. Quem desativou explicitamente continua com o envio
bloqueado. O rastreamento de desempenho tem uma autorização separada, desativada
por padrão. O processamento dos documentos continua no navegador; não existe
painel público com os erros dos visitantes. O responsável consulta seu projeto
privado no Sentry. O site e os pacotes locais precisam carregar esta distribuição
após revisão/publicação para receber a nova configuração.

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
     environment: 'production',
     automaticErrors: true,
     tracesSampleRate: 0.1
   });
   ```

   Substitua o exemplo pelo DSN real, sem alterar sua região. São aceitos apenas
   HTTPS e hosts `o<numero>.ingest.sentry.io`, `o<numero>.ingest.us.sentry.io` ou
   `o<numero>.ingest.de.sentry.io`, chave hexadecimal de 32 caracteres e projeto
   numérico. Instalações Sentry próprias precisam de revisão do validador e CSP.
   `environment` aceita `production` ou `staging`. `automaticErrors: true` ativa
   o envio de erros quando não há preferência salva; false/ausência mantém a
   autorização manual. Nenhuma configuração sobrescreve uma desativação salva.
5. Para entregar uma nova configuração aos navegadores existentes, atualize a
   revisão `?v=` do arquivo de configuração em **index.html e sw.js**, e incremente
   `CACHE_VERSION` em `sw.js` e as expectativas dos testes de cache. Faça a revisão
   e publicação pelo fluxo normal do projeto. Alterar esta configuração não publica o app.
   Atualize também o pacote local quando for distribuí-lo; cópias antigas ou
   páginas ainda abertas não recebem a configuração instantaneamente.
6. Abra a versão configurada, entre em **Qualidade / Autodiagnóstico**, confira
   **Compartilhar erros técnicos automaticamente** e clique em **Enviar
   diagnóstico de teste**. A opção já vem marcada em navegadores sem preferência
   anterior; pode ser desmarcada para bloquear o envio. Confirme o evento `diagnostic_test` no projeto correto.
   Verifique a limpeza de IP e a visibilidade privada no evento recebido. O teste
   local de integração não substitui essa verificação no projeto real.
7. Cada navegador permite desativar os erros e autorizar separadamente os tempos
   de processamento. O painel reúne somente eventos efetivamente recebidos;
   não há importação de logs antigos.

Para desativar toda a integração em novas cargas do app, publique `enabled: false`
com a atualização de cache acima. Para revogar em um navegador, desmarque a opção;
as outras abas da mesma origem recebem a mudança. As preferências são associadas à
versão da política e ao host/projeto; uma preferência existente para outro destino
permanece bloqueada até uma nova ativação. Sem preferência salva, os erros usam o
padrão `automaticErrors`. Limpar todo o armazenamento do site restaura esse padrão
na próxima carga, além de apagar a autorização de desempenho. O servidor local
abre portas dinâmicas: outra origem/porta pode não ter a preferência anterior.

## O que é enviado

O transporte usa o protocolo [Sentry Envelope](https://develop.sentry.dev/sdk/data-model/envelopes/)
sem SDK, captura automática, replay, anexos ou breadcrumbs. Os traces de processamento
usam o mesmo transporte e exigem uma autorização adicional, descrita abaixo. O código só
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

## Rastreamento de desempenho das ferramentas

Em **Qualidade / Autodiagnóstico**, com o compartilhamento de erros ativado, marque
**Permitir também o envio de tempos de processamento**. Esta opção começa
**desativada**, inclusive para quem já compartilha os erros. Desmarcar somente esta
opção mantém a coleta de erros autorizada; desativar os erros desativa ambas.
As mudanças se propagam às abas da mesma origem. A autorização de desempenho é associada ao
host/projeto e à versão da política; não se aplica a outros navegadores.

O app mede as execuções das 34 ferramentas pelo ponto comum de processamento.
Cada operação amostrada produz uma transação raiz, por exemplo `tool.merge`, com
operação `ui.action`, horário inicial, duração medida por relógio monotônico,
identificadores aleatórios e resultado `ok` ou `internal_error`. A medição inclui
espera pelos motores, pré-verificação e preparação do resultado; não mede o tempo
que o navegador leva para gravar o download em disco. Tentativas bloqueadas por
outra execução já em andamento não geram transações. Operações que ultrapassam
15 minutos são descartadas.

São enviados apenas nome técnico da ferramenta, versão/ambiente, horários,
identificadores da transação e resultado fixo. **Não há URLs, conteúdo, nomes de
arquivos, parâmetros das ferramentas, mensagens de erro, IDs persistentes ou
captura automática de navegação/requisições.** Não há propagação de cabeçalhos de
tracing para outros serviços, replay ou profiling. Trata-se de um trace raiz por
processamento, sem detalhamento de cada etapa ou Web Vitals. A base de transporte
existente foi preservada para manter o funcionamento local/offline e a lista
fechada de dados; não há uma segunda inicialização do Sentry.

`tracesSampleRate: 0.1` seleciona aleatoriamente 10% das operações autorizadas.
Valores numéricos de 0 a 1 são aceitos; 0, ausência ou valor inválido desativam a
coleta de desempenho. Para um teste local controlado, use 1 temporariamente; não
mantenha esse valor em produção sem avaliar as quotas. Atualize as revisões e o
cache ao distribuir uma mudança de configuração, conforme o passo 5 acima.

Há no máximo **10 traces por carga da página**, incluídos no limite total de 30
envios. Os erros têm prioridade na fila. Traces não são agregados entre operações.
A fila permanece em memória e obedece aos limites de rede, expiração e tentativas
já usados pelos diagnósticos. Revogar o desempenho descarta seus pendentes,
interrompe seu envio em andamento e invalida operações iniciadas sob a autorização
anterior; um evento já recebido não pode ser recolhido.

No projeto privado Sentry, use a visualização **Traces** (ou Performance, conforme
a versão do painel) e filtre por `transaction:tool.merge`, `environment` e
`release:centralpdf@2.0.1-tracing1`. A amostragem e os limites impedem usar esses
dados como contagem exata de operações ou pessoas. A confirmação de ingestão e a
consulta no projeto exigem autenticação Sentry; o DSN público não dá acesso de
leitura.

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

- `node tests/sentry-tracing.test.js`: contrato das transações, relógio monotônico,
  amostragem, consentimento independente, revogação, limites e privacidade.
- `node tests/diagnostics-telemetry.test.js`: configuração, consentimento,
  privacidade, agregação, expiração, quotas, falhas, revogação e limites do receptor.
- `python tests/diagnostics-telemetry.test.py`: dois navegadores independentes,
  painel desktop/mobile e pedidos reais para receptor HTTP **local**, com a URL
  Sentry interceptada. Inclui uma execução real de remoção de metadados com PDF
  sintético, falha de processamento e revogação dos traces entre abas. Nenhum dado
  vai ao Sentry durante esse teste. CI e gates de navegador usam
  `scripts/run-browser-test.py` para bloquear destinos Sentry reais, mantendo o
  receptor de testes explicitamente interceptado.
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

Em 29/10/2026, o rastreamento foi testado com receptor HTTP local e operação real
do app. A consulta autenticada no Sentry não estava disponível na sessão de
desenvolvimento; estes testes **não confirmam a exibição de traces no painel**.
O teste HTTP de 19/10 refere-se somente ao diagnóstico de erros anterior.
