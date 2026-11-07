# Testes e paridade — simplificação UX

Estado: implementação em rascunho; revisão visual humana pendente. Sem merge, deploy ou release. Base `a499c8d`. PRs [#89](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/pull/89) e [#90](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/pull/90); a segunda depende da primeira.

## Paridade por família

34/34 famílias exportadas com motores reais e arquivos sintéticos; saídas reabertas e verificadas. O teste de controles compara todos os IDs e opções com o inventário anterior. 39/39 cartões foram clicados em Chromium/Firefox, desktop/celular.

| Família | Opções sob Mais opções (IDs reais) | Exportação real |
| --- | --- | --- |
| `organize` | Controles essenciais diretos / grupos especializados existentes | PASS — PDF |
| `editPdf` | `editorTextOpacity`, `editorObjectX`, `editorObjectY`, `editorObjectWidth`, `editorObjectHeight`, `editorObjectRotation`, `editorSendBackward`, `editorBringForward` | PASS — PDF |
| `merge` | `mergePreserveMetadata` | PASS — PDF |
| `split` | `splitIncludeManifest` | PASS — ZIP |
| `extract` | Controles essenciais diretos / grupos especializados existentes | PASS — PDF |
| `rotate` | `rotateBehavior` | PASS — PDF |
| `watermark` | `watermarkRotation`, `watermarkPattern` | PASS — PDF |
| `pageNumbers` | `numberSize`, `numberColor`, `numberMargin`, `numberTotalMode`, `numberBackground` | PASS — PDF |
| `imagesToPdf` | `imageOutputMode`, `imageOrientation`, `imageMargin`, `imageFit`, `imageAlign`, `imageBackground`, `imageNoUpscale` | PASS — PDF |
| `imageConvert` | `maxWidth`, `maxHeight` | PASS — JPG |
| `compress` | `compressionStripMetadata`, `compressionKeepSmaller`, `compressionReport` | PASS — ZIP |
| `pdfToImage` | `pdfImageColumns`, `pdfImageGrayscale`, `pdfImageTransparent`, `pdfImagePrefix` | PASS — ZIP |
| `crop` | `cropBehavior` | PASS — PDF |
| `metadata` | Controles essenciais diretos / grupos especializados existentes | PASS — PDF |
| `normalize` | Controles essenciais diretos / grupos especializados existentes | PASS — PDF |
| `pdfToText` | Controles essenciais diretos / grupos especializados existentes | PASS — TXT |
| `ocr` | `ocrAutoRotate`, `ocrGrayscale`, `ocrContrast`, `ocrThresholdEnabled`, `ocrThreshold`, `ocrPreserveNative`, `ocrPageHeaders`, `ocrIncludeReport`, `ocrDetectPatterns`, `ocrConfidenceThreshold` | PASS — PDF |
| `compare` | `compareIgnoreCase`, `compareIgnoreWhitespace`, `compareDpi`, `compareThreshold`, `compareIncludeImages` | PASS — ZIP |
| `redact` | Controles essenciais diretos / grupos especializados existentes | PASS — PDF |
| `formBuilder` | `formFieldFontSize`, `formFieldMaxLength`, `formFieldTextColor`, `formFieldBorderColor`, `formFieldBackground` | PASS — PDF |
| `signPdf` | Controles essenciais diretos / grupos especializados existentes | PASS — PDF |
| `pdfToOffice` | Controles essenciais diretos / grupos especializados existentes | PASS — DOCX |
| `documentsToPdf` | `docToPdfImagePage` | PASS — PDF |
| `extractImages` | `extractImageMinWidth`, `extractImageMinHeight`, `extractImageDedupe` | PASS — ZIP |
| `archivePdf` | `archiveDpi`, `archiveFlattenForms`, `archiveRemoveMetadata`, `archiveManifest` | PASS — ZIP |
| `documentAssistant` | `intelligenceEvidenceCount`, `intelligenceIncludeSections`, `intelligenceIncludePatterns` | PASS — ZIP |
| `structuredExtraction` | `extractionIncludePages`, `extractionGroupByFile`, `extractionExportXlsx`, `extractionCustomRegex` | PASS — ZIP |
| `documentAudit` | Controles essenciais diretos / grupos especializados existentes | PASS — ZIP |
| `classifyRename` | `renameMaxLength`, `renameIncludeCopies`, `renameDetectBlank`, `renameDetectDuplicates`, `renameUseDate` | PASS — ZIP |
| `protect` | `protectOwnerPassword`, `protectAlgorithm`, `permPrint`, `permCopy`, `permModify`, `permAnnotate`, `permForms` | PASS — PDF |
| `unlock` | Controles essenciais diretos / grupos especializados existentes | PASS — PDF |
| `diagnose` | `diagnoseJson` | PASS — ZIP |
| `repairAdvanced` | Controles essenciais diretos / grupos especializados existentes | PASS — PDF |
| `flattenForms` | Controles essenciais diretos / grupos especializados existentes | PASS — PDF |

Os grupos são explícitos por ferramenta. Somente contêineres inteiros cujos controles são todos secundários são movidos. Painéis condicionais continuam com os mesmos IDs e handlers; não foi aplicada uma tela genérica a editores, assinatura, formulário, censura ou auditoria. As funções originais de interação e exportação continuam sendo as executadas.

## Cobertura executada

| Verificação | Resultado e alcance |
| --- | --- |
| Referência antes da mudança | 103 verificações de raiz/JS/Python/integridade aprovadas |
| Matriz com arquivos importados | 816/816 estados: 34 ferramentas × 6 larguras (320/360/390/768/1024/1440) × 2 temas × Chromium/Firefox; sem overflow horizontal, sobreposição entre principal/lateral ou campos cortados na lateral; sem page errors |
| Controles e atalhos | Todos os IDs/opções anteriores, abertura por teclado, ajuste persistente e 39 cartões clicáveis em ambos os navegadores |
| Editor | Fonte/tamanho/cor/estilos/alinhamento/opacidade, geometria, duplicação/exclusão, histórico e export/reabertura; edição nativa coberta pela regressão existente; texto original e acentos preservados |
| Imagens | JPG/PNG/WEBP; 7 combinações de tamanho/orientação/margem por navegador, incluindo personalizado, PDF combinado/ZIP separado, ordem, giro, remoção e restauração de projeto |
| PNG transparente | Prévia mantém alpha; fundo escolhido conferido no PDF real em ambos os navegadores |
| Motores preparados | Hashes/licenças/manifests e referências estáticas validados; 34 operações com saídas reais; segurança, OCR girado, formatos Office, censura e campos achatados verificados |
| Office WASM real | Local e CI: cabeçalho/tabela/Unicode preservados, Word visual reaberto, Excel/PPTX, exportação real e reativação offline em Chromium/Firefox |
| Offline | Recarregamento offline, Worker PDF.js real e união/exportação de 5 páginas aprovados |
| Editor preparado | 6 execuções em Chromium/Firefox, desktop/tablet/celular, temas/modos, ponteiros e geometria da imagem exportada |
| App React separado | Typecheck, testes e build executados; permanece separado do site original |
| Admin | 28 testes e build aprovados; somente catálogo gerado atualizado para a revisão do app; Auth/MFA/API/Worker/banco sem alteração |
| Go | `go test ./...` e `go vet ./...` aprovados; servidor/binário sem alteração |

A suíte da raiz foi executada por inteiro (105 verificações na primeira rodada pós-mudança, mais o caso novo de PNG/limites: 106 verificações distintas no conjunto final). A primeira rodada local pós-alteração registrou 3 falhas (arquivo bruto preservado), tratadas e verificadas novamente conforme abaixo. A CI completa das duas branches de implementação passou: App, Admin, suíte geral e build preparado; deploy ignorado como esperado em PR. A descrição das PRs aponta para os checks do último SHA, incluindo o commit documental final.

## Falhas encontradas e tratamento

1. Balão de texto: teste RED confirmou largura de 760 px; novo limite de 400 px validado.
2. Altura de texto: alterar X/Y podia reaplicar altura antiga depois de editar o conteúdo e cortar linhas na exportação. Campos de geometria passaram a acompanhar a altura real, sem reescrever o campo de texto/foco. Export com texto original e acentos reaberto.
3. Toque em imagem: o painel no fluxo podia deslocar a página entre pointerdown e click. A seleção agora respeita o objeto que iniciou o gesto; regressão de toque/histórico passou.
4. Checkbox de união: um listener de atualização podia restaurar o valor antes de change. Corrigida a sincronização com o seletor original; ZIP e restauração de projeto verificados.
5. PNG: miniatura antiga achatava transparência sobre branco. Prévia PNG conserva alpha; export mantém o fundo escolhido.
6. Preferência Compacto: espaçamento havia sido sobrescrito. Regras escopadas restauram o efeito da preferência; teste compara as duas densidades.
7. Preparação do Admin na CI: catálogo gerado apontava para cache anterior. Sincronizada somente a revisão; checks Admin/App aprovados nas novas execuções.
8. Testes antigos acessavam margem recolhida diretamente. Passaram a abrir Personalizada, preservando todos os asserts de pixels, giro, projeto e foco.
9. Medição de sobreposição do editor amostrava caixas em chamadas diferentes durante ajuste de scroll. A mesma comparação geométrica passou a usar uma única leitura de layout; sem espera artificial ou relaxamento da desigualdade. Propriedades de imagem ficam no fluxo, sem encolher como item flex.
10. Fixture de assinatura: a checagem do hit target podia ocorrer antes de terminar o ajuste nativo de scroll/prévia. Aguarda a condição real de hit test e conserva os asserts estritos de ponteiro/arraste.
11. Uma rodada local concorrente atingiu o limite do executor no teste visual geral. Reexecução isolada aprovada; limite não foi aumentado e nenhum caso foi removido. A rodada local Office offline também atingiu o tempo limite sob carga; a execução preparada na CI passou e a repetição local isolada também passou. Resultado local em `evidence/office-real.json`: cabeçalho/tabela/Unicode, Word visual, Excel, PowerPoint e reativação offline em Chromium/Firefox; o registro da falha inicial foi mantido.

12. A prévia do papel podia ser cortada nos extremos do controle de miniaturas e no celular. Teste RED confirmou o corte; limite de tamanho passou a usar a altura disponível. Mesmo teste passou nos dois extremos, em desktop/celular, nos dois navegadores. Saída de PDF sem alteração.
13. Opacidade de texto não deve aparecer desabilitada nas propriedades de imagem. Visibilidade por tipo restaurada e regressão contextual validada.

## Arquivos alterados

- `assets/css/ux-simple.css`: tokens/padrões de workspace, densidade, escolhas, papel, contexto e adaptação a telas menores.
- `assets/js/ux-simple.js`: adaptadores visuais de imagens ligados aos campos originais e organização do resumo secundário.
- `assets/js/ux-tool-settings.js`: mapa explícito de opções secundárias por família, sem alterar handlers.
- `assets/js/app.js`, `assets/js/pdf-editor.js`: metadados de prévia/alpha, opacidade contextual, sincronização de geometria e origem do gesto.
- `index.html`, `sw.js`: carregar/cachear os recursos novos; revisão final `centralpdf-v3.0.0-pages-57`.
- `admin/shared/catalog.json`, `docs/architecture/_CATALOGO_RAW.md`: referências geradas coerentes com os campos e o cache.
- `tests/`: novos testes de prioridades, paridade e prévia PNG; helper com motores npm reais; testes anteriores continuam com seus asserts e acessam os novos disclosures. Contratos de cache acompanham a revisão.
- `scripts/capture-ux-simplification.py` e esta pasta: reprodução, inventário, resultados e capturas de navegador. Nenhum protótipo substituiu o app.

## Desempenho medido

Chromium, 1440×900, loopback local, 3 contextos independentes alternados antes/depois por tamanho e ferramenta. 36 exportações sintéticas reabertas. Medianas em ms; heap é somente JS principal após GC via CDP, exclui memória nativa/canvas/WASM/workers. Não é medição de todos os dispositivos. PDFs: 3/20/80 páginas com texto e vetor; imagens: 1/5/20 JPEGs de ruído de 1200×800, até vários MB de entrada. Geração das fixtures não entra na medição de importação/exportação.

| Caso | Importar antes/depois (ms) | Exportar antes/depois (ms) | Heap JS antes/depois (MiB) |
| --- | --- | --- | --- |
| editPdf · 3 | 579 / 639 | 42 / 47 | 5.7 / 5.7 |
| editPdf · 20 | 634 / 655 | 154 / 145 | 6.1 / 6.1 |
| editPdf · 80 | 626 / 628 | 438 / 448 | 6.3 / 6.4 |
| imagesToPdf · 1 | 175 / 160 | 146 / 102 | 4.2 / 4.2 |
| imagesToPdf · 5 | 332 / 306 | 203 / 196 | 4.3 / 4.3 |
| imagesToPdf · 20 | 808 / 792 | 361 / 428 | 4.5 / 4.5 |

A prévia de imagens passa de até 220 px para até 480 px e PNG mantém alpha. Esse ganho de visualização pode acrescentar trabalho de miniaturas em lotes; os números de exportação incluem trabalho concorrente do próprio app após importar. Não foi alterado o motor para esconder essa diferença. Os dados brutos estão em `evidence/performance.json`; não se declara melhoria universal ou ausência de variação entre execuções.

## Escopo da evidência / limitações

- Testes reais usam somente arquivos sintéticos. Os testes de raiz servem cópias reais dos motores npm quando vendor não foi preparado; os testes do pacote preparado validam os bytes/distribuição/Worker reais, incluindo Office WASM. Não há mock de exportação nos novos testes.
- O teste antigo `runtime-reliability` mantém seu parser simulado para cenários de falha determinísticos; ele não substitui as provas de exportação real descritas acima.
- A prévia de papel/margens é identificada como aproximada; não promete igualdade de pixels com todos os formatos/EXIF/fontes. Valores/saídas reais permanecem no motor original.
- Toque foi emulado; teclado virtual físico, leitor de tela e zoom nativo de 200% precisam de conferência humana. Reflow de 320 a 1440 px foi testado; isso não é certificação de acessibilidade.
- Recursos avançados existentes de Office/OCR/assinatura/censura continuam sujeitos aos seus avisos e limites. Nenhum motor ou política de segurança foi atualizado neste trabalho.
- Desempenho: medições controladas de mediana e heap JS são registradas em seção separada; não representam todos os dispositivos nem a memória total de processos/WASM/canvas.

## Comandos principais

```bash
python scripts/run-browser-test.py tests/ux-simplification.test.py
python scripts/run-browser-test.py tests/ux-tool-settings.test.py
python scripts/run-browser-test.py tests/image-paper-preview.test.py
python scripts/run-browser-test.py tests/editor-context-controls.test.py
python scripts/run-browser-test.py tests/editor-cross-browser-real.py --site CAMINHO_PREPARADO --report editor.json
python scripts/run-browser-test.py tests/tool-regression-real.py --site CAMINHO_PREPARADO --report tools.json
python scripts/run-browser-test.py tests/offline-tools-real.py --site CAMINHO_PREPARADO --report offline.json
python scripts/run-browser-test.py tests/office-conversions.test.py --site CAMINHO_PREPARADO --engine --report office.json
npm --prefix app run typecheck && npm --prefix app test && npm --prefix app run build
npm --prefix admin test && npm --prefix admin run build
cd server && go test ./... && go vet ./...
```

A suíte integral da raiz segue os comandos de CONTRIBUTING.md/CI. Não executar apenas estes casos focados como substituto de toda a CI.

### Revisão antes do merge — PNG transparente

A revisão automática da PR #89 identificou um fundo branco herdado em `img.file-cover-image`, sobrepondo a cor do papel apenas na prévia. A regra foi limitada à prévia de imagens e corrigida para `background: transparent`, sem alterar a exportação. O teste agora mede o pixel da captura renderizada do elemento, além do alfa do bitmap e do PDF exportado. Antes da correção, o pixel era `(255, 255, 255)` e o teste falhou; após a correção, deve coincidir com o papel `(51, 68, 85)` em Chromium e Firefox. A revisão da referência CSS passou a `v=2` no HTML e no service worker. As capturas e matrizes anteriores continuam sendo evidência do checkpoint aprovado; esta correção adicional tem sua própria evidência de regressão.
