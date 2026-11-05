# Central PDF 3.0 — implementação em revisão

Base: `1dc49d820a719f065ddd6ce807eedeb1e77c0c45` (PR #79).
Referência: prompt mestre do ZIP fornecido pelo responsável e documentos de `docs/proposals/centralpdf-3-redesign/`.

**Entrega em rascunho. Sem merge, publicação, release, deploy ou alteração de banco.**
O número 3.0 identifica o sistema visual; as versões técnicas permanecem 2.0.1 (site/React) e 0.3.0 (Admin).

## Checkpoints e superfícies

| Etapa | Alteração | Contrato preservado |
| --- | --- | --- |
| 0 | Inventário 34 módulos / 39 atalhos, capturas antes, exportações sintéticas de referência | Base #79, callbacks, parâmetros e handlers |
| 1 | `design-3.css`, SVG local, hero, cartões, navegação e configurações; tema no topo | IDs, eventos, preferência de tema e oito ações reais |
| 2 | Juntar, Dividir e Organizar usam a camada visual e os motores existentes | Capas completas, seis modos de divisão, edição e exportação |
| 3 | Camada comum em todos os workspaces, editor, diálogos, projetos, resultados e mensagens | Geometria dos documentos/canvases e lógica de execução intactas |
| 4 | Admin: estilos comuns, marca e alternância de tema em acesso e páginas privadas | Auth/PKCE/MFA, rotas, API, RLS e storage independente |
| 5 | React parcial: identidade e tema próprio nos componentes existentes | Catálogo parcial, ferramentas experimentais/planejadas e bundle separado |

CSS novo é carregado por último e escopado no site por `data-design="3"`. Não há cópia do HTML demonstrativo nem troca pela migração React. Ícones das ferramentas continuam vindo do sprite real. Novos assets não dependem de rede externa. A revisão de cache do site passa para `pages-50`.

## Linha de base e falhas de preparação

- Capturas em `evidence/before/` foram realizadas antes de editar a apresentação.
- A primeira tentativa dos 34 módulos parou porque o checkout não estava preparado para uso offline. Foi repetida sobre um snapshot estático do SHA de base, com os motores fixados e hashes verificados conforme `prepare-offline.ps1`.
- A primeira tentativa do Admin encontrou build local antigo (`pages-48`), incompatível com a referência do código (`pages-49`). Um build local da base corrigiu o ambiente. Nenhum deploy foi executado.
- Durante a implementação foram corrigidas a navegação móvel herdada com posição fixa e a interceptação do tema global pelo backdrop de Configurações.
- O novo teste dos três exemplos inicialmente não carregava JSZip no harness de teste; isso foi corrigido no harness, preservando a execução real.

## Evidências e verificação

Os JSON em `evidence/` registram resultados realmente executados, sem documentos privados. Os PDFs, imagens e nomes de teste são sintéticos. Hashes individuais não significam igualdade byte a byte entre execuções: metadados temporais podem variar.

Resultados já confirmados:

- `tests/tool-regression-real.py`: **34/34 PASS antes e depois**, zero erros de página; exportações reabertas, hashes registrados, casos adicionais de OCR girado, compressão sem perda de texto/vetores e XML Office válidos.
- `tests/redesign-3-exports.test.py`: **PASS**, ordem B1/B2/B3/A1/A2, três partes P1–P6 e organização final P4/P1/P1/P2/em branco, com rotação de 90°.
- `tests/settings-theme-toggle.test.py`: **PASS** em Chromium/Firefox, persistência, teclado, oito ações, tela móvel/baixa e storage bloqueado.
- JavaScript da raiz, sintaxe, integridade estática e sincronização dos ícones: **PASS**.

As suítes restantes e a matriz visual continuam em verificação. Testes concorrentes interrompidos ou com timeout não são marcados como aprovados; são repetidos em sequência por causa do limite de duas CPUs. Ausência de um resultado não significa aprovação.

## Limites de validação e revisão pendente

- Capturas e automação não substituem avaliação manual com leitor de tela, toque em aparelho físico e zoom do navegador em 200%.
- SQL/RLS remoto, autenticação pessoal e entrega real de e-mail não são executados; o painel é testado com fixtures locais.
- Motores Office/OCR mantêm suas limitações anteriores. Não se promete fidelidade irrestrita.
- Nenhuma atualização deve ser integrada enquanto houver checks falhando ou telas/ações sem revisão.

## Rollback

Reverter cada commit de apresentação e seu ajuste de cache/URLs como unidade; não apagar localStorage/IndexedDB, projetos, dados ou migrations. Admin e React têm seus próprios estilos e SVGs; podem ser revertidos independentemente. Não há transformação de dados ou credenciais.

### Compatibilidade dos testes visuais históricos

Três fixtures substituíam literalmente `<body>` para ativar o modo escuro. A
camada escopada acrescentou `data-design`, por isso as fixtures passaram a
preservar atributos ao selecionar o tema por regex. As assertivas de layout,
barra recolhida e overflow foram mantidas; cores, cartões com borda e gradientes
foram atualizados para o desenho aprovado. A inspeção encontrou e alinhou as
superfícies secundárias do diagnóstico, incluindo cabeçalho com precedência antiga.

### Continuidade do foco no novo layout

A suíte integral também encontrou um caso de foco: ao esconder a tela de
resultado, o navegador pode mover o elemento ativo do botão oculto para o corpo
somente durante o layout. A proteção existente interpretava isso como escolha
de outro controle e não devolvia o foco ao botão de processamento. O ajuste é
restrito a esse tratamento visual: aceita o retorno ao corpo/documento e continua
respeitando outro campo selecionado pelo usuário. O teste de retorno normal e o
teste de digitação rápida/exportação sem margem são repetidos, sem retries ou
remoção das assertivas. Não altera processamento, formatos ou estado dos arquivos.

## Resultado acumulado e PRs

1. [PR #80 — aplicativo original](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/pull/80)
2. [PR #81 — Admin/acesso](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/pull/81), empilhada sobre #80
3. [PR #82 — React parcial](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/pull/82), empilhada sobre #81

Todas são rascunhos; nenhuma autorizada para merge ou deploy nesta execução.

| Verificação executada | Resultado / evidência |
| --- | --- |
| 34 módulos com motores reais, antes/depois | 34/34 em ambas; `baseline-34.json`, `after-34.json` |
| Casos adicionais de OCR, Office e compressão | PASS nos mesmos relatórios |
| 3 exportações prioritárias e hashes | PASS, `reference-exports.json` e PNGs de união/divisão/organização |
| Layout de 34 workspaces / 39 atalhos | PASS, 12 combinações navegador/largura e dois temas, `layout-matrix.json` |
| Editor real | PASS, 6 combinações Chromium/Firefox e desktop/tablet/celular, `editor-browsers.json` |
| Recarga offline + união real de 5 páginas | PASS, `offline.json`; zero telemetria enviada |
| JavaScript da raiz e sintaxe | PASS |
| Integridade estática, ícones e catálogo | PASS |
| Suíte Python da raiz | 84 arquivos executados; 3 falhas iniciais registradas em `suite-initial.json` e corrigidas, com repetições em `final-rechecks.json` |
| React parcial | 241 testes, tipos e build PASS; navegador real em 4 larguras e 2 temas PASS |
| Admin | 27 testes, tipos/build e navegador Chromium/Firefox desktop/celular PASS, com fixtures e sem requisições externas |
| Go local | NÃO EXECUTADO neste ambiente; conferir os passos Go na CI da revisão final |
| SQL/RLS em banco real / login pessoal / e-mail real | NÃO EXECUTADOS; nenhuma operação remota de administração |

Os relatórios parciais preservam falhas iniciais; as repetições mostram quais
problemas foram corrigidos. Screenshots em `evidence/before/`, `evidence/after/`
e nas entregas separadas do Admin e React. Gerador de capturas do site:
`CAPTURE_PHASE=after python scripts/run-browser-test.py scripts/capture-design-3.py`.

A revisão de tela identificou e corrigiu contraste de ações primárias no tema
escuro React, ícones vetoriais e o posicionamento móvel dos menus. O texto dos
passos continua visível no celular. Não foi introduzida transmissão adicional de
documentos, nova dependência remota obrigatória ou credencial no frontend.

**Decisão de entrega: manter em rascunho para revisão.** Os resultados de CI de
cada HEAD devem ser conferidos nas PRs; resultados de commits anteriores não
substituem os da revisão final. Permanecem aceite visual humano, leitor de tela,
zoom real de 200% e testes em aparelho físico. Não se declara o redesign
homologado/publicado nem se autoriza produção com base somente nesta automação.
