# Refinamento profissional de UX/UI — Central PDF 3.0

A interface de trabalho foi compactada depois da importação, o editor recebeu propriedades recolhíveis sem perda da seleção e as ações finais passaram a ficar acessíveis no celular, inclusive com configurações recolhidas. Os campos e processadores originais permanecem sendo usados. A Home aprovada e as 34 famílias/39 atalhos foram preservados.

Estado: implementação para avaliação visual na [PR #91, em rascunho](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/pull/91). Esta etapa não recebeu aprovação humana. Sem merge, deploy, publicação no Pages, release ou tag.

- Branch: `refactor/centralpdf-3-ux-mobile-refinement`.
- Base sincronizada: `d5b38e82c1fa90f0d3b28574c779f0500d4a3df1`, com #89/#90 integradas.
- Checkpoint final de código/testes: `c561801a08b63d3304d875aa1e214170d77f488c`; o commit posterior acrescenta a entrega documental/evidências.
- Commits incrementais: `0720469`, `95c3b6d`, `c803c52`, `484497a`, `c3e895b`, `c561801`.
- [Prévia, download e execução local](README.md) · [Checkpoints](CHECKPOINTS.md) · [Resumo verificável](evidence/summary.json) · [Hashes de código/capturas](evidence/manifest.json).

## Alterações e preservação

**Imagens para PDF.** Antes de importar, permanece a seleção acolhedora. Depois, título/descrição/importação e informações repetidas ocupam menos espaço; Adicionar mais continua visível. Miniaturas, tamanho, seleção, arraste, giro e exclusão continuam operando. A sequência visual é orientação, papel, margens, mesclagem, resumo, ação e Mais opções. O nome de saída continua disponível. Os campos originais permanecem dentro de `settingsContent`, com os mesmos IDs/listeners e valores de projeto. As atualizações assíncronas de miniaturas são agrupadas por quadro; alterações de configuração continuam síncronas. Transparência e a indicação de prévia aproximada foram mantidas.

**Editor.** Recolher/Propriedades altera apenas apresentação: não conclui edição, muda ferramenta, cria checkpoint de histórico nem desmarca o objeto. Outro objeto reabre as propriedades. Concluir mantém sua função anterior. A largura acompanha o visual viewport; painel estreito reorganiza cabeçalho/ações, e o limite de altura preserva a área do documento. Em pouca altura, o cabeçalho acompanha a rolagem durante a digitação. O texto selecionado é mantido entre o cabeçalho e o painel. Fonte, tamanho, cor, estilos e alinhamento permanecem acessíveis; precisão, opacidade e camadas continuam em Mais opções, com duplicar/excluir/histórico preservados.

**Ações compartilhadas.** A ação original fica na área inferior móvel: nenhum botão de exportação foi clonado. Altura medida e espaço de rolagem permitem alcançar os últimos campos. O posicionamento acompanha teclado/zoom visual/áreas seguras. Campos focados podem rolar acima da ação; diálogos e propriedades contextuais não competem com esse rodapé. Recolher as configurações no celular mantém a mesma ação acessível e desabilitada quando não há arquivo.

**Limites de escopo.** Sem alterações de motores, formato de projetos, API, autenticação/MFA, Supabase, Worker do Admin, banco ou infraestrutura. O catálogo gerado do Admin muda somente `applicationRevision`, necessária para acompanhar o cache `centralpdf-v3.0.0-pages-58`. O service worker do aplicativo recebe referências/cache consistentes; não houve mudança de estratégia de dados offline. Servidor Go/binário Windows não foram alterados. A aplicação React separada não substitui o aplicativo da raiz.

## QA da interface real

A extensão Browser não expõe a ferramenta de controle nesta sessão. O pedido autoriza testes automatizados; a validação usou Chromium/Firefox do Playwright, em loopback e com motores preparados reais. Fluxo prioritário: importar documento → trabalhar/ajustar → recolher/reabrir propriedades ou configurações → exportar → reabrir resultado.

| Verificação | Resultado e evidência |
| --- | --- |
| Identidade, tela não vazia, framework overlay | Central PDF, conteúdo real, nenhum overlay de framework — [prévia isolada](evidence/preview-isolation.json) |
| Console/runtime | Sem exceções de página na matriz e capturas. Avisos opcionais/telemetria são bloqueados no ambiente isolado, deliberadamente; isso não é ausência universal de avisos de navegador |
| Capturas | 64 antes + 68 depois, Chromium/Firefox, claro/escuro, desktop/celular, com documentos sintéticos — [manifesto](evidence/manifest.json) |
| Responsividade | 816 estados: 34 famílias × 6 larguras (320/360/390/768/1024/1440) × 2 temas × 2 browsers, sem overflow horizontal de página, colisão principal/lateral, inputs laterais cortados ou ação duplicada — [matriz](evidence/layout-matrix.json) |
| Método da matriz | Importação real por família/browser, seguida de redimensionamento/tema no mesmo documento carregado; cobre também manutenção do estado ao redimensionar. Não é uma importação independente para cada linha |
| Interação | Importação compacta, foco, ordem dos ajustes, ação única, configurações recolhidas, download real e reabertura, propriedades sem perda de seleção — [teste final](evidence/layout-api-final.log) |
| Zoom e pouca altura | Chromium: visual viewport real a 200% via CDP; 320×700, 360×740, 390×420, 768×390 e 390×844 nos dois browsers; campos/seleção/Concluir alcançáveis. A emulação não representa um IME físico |
| Teclado | Foco preservado nos ajustes; disclosure via Enter, acesso a opções e estado persistente; não equivale a auditoria completa com leitor de tela |
| Movimento reduzido | Contextos com `prefers-reduced-motion: reduce`; regras novas não acrescentam animação obrigatória |

As [comparações visuais](README.md#comparações-visuais) incluem imagens para PDF, editor expandido, editor recolhido no celular, Juntar, Dividir, Organizar e Comprimir, em claro/escuro. O estado recolhido não existia na referência; ele não foi simulado em uma imagem “antes”.

## Suítes e operações reais

| Verificação | Resultado |
| --- | --- |
| Referência da raiz | 106 verificações executadas; cinco ocorrências iniciais retidas e repetidas com sucesso no checkout de referência apropriado |
| Aplicação da raiz | 107 verificações executadas; duas ocorrências iniciais tratadas/repetidas. Resultado efetivo 107/107 — não foi uma primeira rodada sem falhas |
| App React separado | Typecheck, 241 testes e build aprovados |
| Admin | 28 testes e build aprovados; flows de navegador com providers isolados na CI |
| Go/binário | `go test ./...`, `go vet ./...` e checksum do executável preservado aprovados |
| 34 famílias | Processamento real, saídas verificadas/reabertas — [resultado](evidence/tools-real.json); repetido sob a política de isolamento da prévia — [resultado](evidence/preview-tools.json) |
| 39 atalhos | Todos clicados, com os mesmos IDs/opções de referência, nos dois browsers — [paridade de controles](evidence/last-ux-tool-settings.test.py.log) |
| Imagens | JPG/PNG/WEBP; alfa do PNG e pixel composto sobre fundo escolhido; A4/Carta/personalizado, orientações, margens, mesclagem, PDF/ZIP, giro, ordem, remoção e projetos — [regressão](evidence/last-ux-simplification.test.py.log), [alfa](evidence/last-image-paper-preview.test.py.log) |
| Editor | Estilos, geometria, camadas, histórico, toque emulado, exportação e PDF reaberto; seis execuções preparadas Chromium/Firefox em 1440/768/390 — [resultado](evidence/editor-real.json) |
| Office WASM | LibreOffice 2.7.2 real: cabeçalho/tabela/Unicode, Word visual de páginas mistas, Excel/PPTX, botão/download real e reativação offline, em ambos os browsers — [resultado](evidence/office-real.json); repetido com isolamento da prévia — [resultado](evidence/preview-office.json) |
| Offline | Recarregamento, Worker PDF.js e PDF real de 5 páginas — [resultado](evidence/offline-real.json) |
| Preparação | 291 referências e hashes/licenças de engines/manifests — [integridade](evidence/integrity.json) |

[Resultados efetivos com ligação às repetições](evidence/effective-results.json), [primeira referência](evidence/baseline-first.json), [primeira rodada final](evidence/final-first.json), [repetições](evidence/isolated-reruns.json), [regressões UI finais](evidence/ui-final.json). A CI final pode ser conferida na [aba Checks da PR](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/pull/91/checks); o corpo da PR aponta os runs do último SHA.

Os testes de falha determinísticos já existentes e os providers isolados do Admin não são apresentados como prova de conversão. As provas de processamento usam arquivos sintéticos e motores reais. Nos benchmarks, os bytes reais dos resultados são capturados e reabertos; a gravação física de downloads é dispensada apenas para medir. Os fluxos de UI têm downloads físicos reais também.

## Falhas encontradas e tratamento

1. Ação fora da tela: RED encontrou `processButton` em y=983,53 numa altura de 844px. Rodapé original e espaço reservado foram validados, incluindo exportação real com ajustes recolhidos.
2. Zoom: viewport visual a 200% revelou `scrollWidth=191` para `clientWidth=177`; o botão Excluir ultrapassava a largura. Container query reorganiza as ações/cabeçalho, sem remover controles.
3. Teclado/rotação: seleção parcialmente atrás do cabeçalho foi detectada por geometria real. Limites de rolagem e cabeçalho em pouca altura corrigidos; seleção/conteúdo foram preservados.
4. Regra geral de margem de rolagem interferiu no scroller avançado do editor, fazendo o summary interceptar um toque de giro. A regra foi limitada às configurações, mantendo os asserts de toque/transformações.
5. Duas fixtures retiravam scripts da página sem carregar JSZip, embora exercitassem recuperação/projetos. Incluída a dependência real, sem suprimir o aviso ou relaxar asserts.
6. Teste de revogação de traces executava uma operação inválida e recebia um evento de erro ainda consentido. Agora usa operação real válida sem traces e confirma, separadamente, que diagnóstico continua permitido. O transporte/consentimento de produção não mudou — [diagnóstico da falha](evidence/telemetry-debug.log).
7. A CI inicial falhou no teste de revisão de cache: a fixture não tinha `office/` e a corrupção usava uma URL antiga. A cópia completa agora é validada antes das corrupções; a revisão é encontrada dinamicamente. Os seis casos passaram, sem reduzir a barreira de publicação — [falha inicial](evidence/ci-initial-failure.log), [repetição](evidence/static-validation-final.log).
8. A referência completa começou com vendor preparado. Contratos específicos do checkout vazio/consentimento remoto falharam nesse contexto; o snapshot preparado foi mantido para visual/desempenho, e esses casos foram repetidos no checkout versionado vazio de engines. Dois testes visuais atingiram 360s sob execução concorrente; passaram isoladamente com o mesmo limite. A rodada final também atingiu 360s em `redesign-3`; a repetição isolada passou em 88,21s. Logs/retornos iniciais permanecem separados; nenhum limite foi aumentado.
9. A primeira reutilização do teste de 34 ferramentas na prévia habilitava contadores e aguardava envio a um destino que a CSP deliberadamente bloqueia. As conversões terminaram; a espera de analytics expirou. A variante da prévia usa seu opt-out real e exige envio zero, preservando todos os asserts de conversão. O teste normal de produção/contrato de contadores continua intacto e passou separadamente — [tentativa bloqueada](evidence/preview-optin-blocked.log).

## Desempenho e investigação

Chromium 1440×900, mesmo executor/loopback, arquivos sintéticos, três contextos independentes alternados antes/depois por caso. Todos os PDFs foram reabertos. PDFs: 3/20/80 páginas; imagens: 1/5/20 JPEGs de ruído 1200×800. Heap é somente JS principal após GC via CDP; não inclui memória nativa, canvas, WASM ou workers. Não representa um telefone ou todos os arquivos reais.

A primeira medição de 20 imagens mostrou exportação 932,7 → 1.114,7ms. A remoção de medições desnecessárias do rodapé no desktop não garantiu ganho uniforme: outra rodada mostrou 1.329,8 → 1.881,3ms, com amostras amplamente variáveis. Ambas foram preservadas: [primeira](evidence/performance-first.json), [rodada com guarda](evidence/performance-guard.json). As miniaturas passaram a agrupar atualizações por quadro; os ajustes permanecem imediatos.

### Rodada final, exportação logo após importar

| Caso | Importar antes/depois (ms) | Exportar antes/depois (ms) | Heap JS antes/depois (MiB) |
| --- | --- | --- | --- |
| editPdf · 3 | 759.8 / 776.8 | 72.0 / 121.5 | 5.7 / 5.7 |
| editPdf · 20 | 821.1 / 805.7 | 237.1 / 241.0 | 6.1 / 6.1 |
| editPdf · 80 | 838.4 / 973.2 | 713.1 / 706.1 | 6.4 / 6.4 |
| imagesToPdf · 1 | 170.2 / 345.7 | 177.6 / 198.5 | 4.2 / 4.2 |
| imagesToPdf · 5 | 451.9 / 363.4 | 328.9 / 326.6 | 4.3 / 4.3 |
| imagesToPdf · 20 | 928.9 / 907.0 | 1063.0 / 948.9 | 4.5 / 4.5 |

[Dados completos](evidence/performance-final.json). Em 20 imagens, a rodada final mediu 1.063,0 → 948,9ms na exportação; em outros casos houve aumentos. Não há ganho uniforme.

### Diagnósticos de prontidão

A primeira abertura instala o service worker e preenche seu cache em segundo plano. Foram acrescentados dois cenários sem mudar o aplicativo: aguardar todas as miniaturas/papéis e, depois, aguardar também o service worker instalado/ativado antes da importação. Isso torna explícito o trabalho concorrente de inicialização, sem atribuir causalidade a cada amostra.

| Estado · imagens | Exportar antes/depois (ms) |
| --- | --- |
| Prévias prontas · 1 | 186.9 / 216.2 |
| Prévias prontas · 20 | 506.0 / 696.6 |
| Offline pronto + prévias prontas · 1 | 42.7 / 58.6 |
| Offline pronto + prévias prontas · 20 | 181.1 / 172.7 |

No cenário somente com prévias prontas, 20 imagens tiveram mediana 506,0 → 696,6ms; o percurso importar + esperar prévias + exportar foi 2.975,7 → 3.196,6ms. Com o cache offline pronto, a exportação foi 181,1 → 172,7ms. São cenários diferentes, não valores intercambiáveis. [Prévias prontas, amostras e métricas CDP](evidence/performance-previews-ready.json) · [Cache pronto](evidence/performance-warm.json). As diferenças e os dados anteriores não foram descartados; sem promessa de acelerar todos os casos ou conclusão de causalidade definitiva.

## Arquivos modificados

- `assets/css/ux-simple.css`: modo de trabalho, painel/contexto/rodapé mobile, zoom e regras compartilhadas.
- `assets/js/ux-simple.js`: estado derivado de arquivos, viewport/foco e agrupamento de miniaturas; mantém campos/processador originais.
- `assets/js/pdf-editor.js`: estado visual recolhido e posicionamento/rolagem das propriedades/seleção.
- `index.html`, `sw.js`: controle de propriedades e referências/cache consistentes.
- `admin/shared/catalog.json`: somente revisão gerada do aplicativo.
- `tests/mobile-refinement.test.py`: interação/exportação real e ações compartilhadas; `editor-context-controls`, `diagnostics-telemetry`, `static-site-validation`: preparação/asserções de contrato corrigidas.
- Testes de cache/versão (`cached-editor-downloads`, `editor-orientation-delivery`, `extract-panels-runtime`, `pdf-compatibility-sw`, `release-2.0.1`, `smart-compression-integration`, `split-interactive-ui`, `version-sync`, `workspace-visual-fixes`): acompanham a nova revisão, conservando asserts funcionais.
- `scripts/capture-mobile-refinement.py`: captura reproduzível da aplicação real.
- `docs/mobile-refinement/`: relatório, roteiro, checkpoints, inicializador isolado, amostras e evidências. O manifesto enumera cada captura e seu hash; a PR enumera os arquivos completos.

## Prévia, limites e rollback

O [roteiro de execução](README.md) usa o mesmo aplicativo e motores, com um servidor estático em loopback. O inicializador é separado da aplicação: desativa estatísticas/diagnóstico apenas na nova origem e bloqueia conexões a APIs externas; não modifica o Admin nem o servidor Go de produção. A validação da prévia inclui download real de PDF e as 34 famílias/Office sob essa política.

Pendências humanas: aprovação visual desta etapa, teclado virtual/IME e gestos físicos em Android/iOS, áreas seguras reais, leitor de tela e zoom nativo por navegador (incluindo Firefox). Emulação de toque/viewport e zoom visual do Chromium não são certificação de acessibilidade. Também falta comparar desempenho em hardware móvel real; as medições locais têm apenas três repetições e variação de inicialização/cache.

A prévia de papel continua aproximada, como na entrega anterior; não promete igualdade de pixels para todo EXIF/fonte/formato. Office/OCR/assinatura/censura mantêm seus limites/avisos originais. Não houve atualização de motores nesta etapa.

Antes do merge, fechar a prévia e voltar à main na cópia de desenvolvimento reverte o uso deste código, sem limpar dados. Os checkpoints são commits separados. Uma futura reversão integrada exige nova PR, revisão de cache nova e regressões; não deve reutilizar automaticamente o cache antigo. Nenhum rollback de produção foi executado.
