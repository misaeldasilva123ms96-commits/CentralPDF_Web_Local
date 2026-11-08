# Prévia — refinamento mobile do Central PDF 3.0

Esta é uma etapa nova para avaliação. A PR [#91](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/pull/91) permanece aberta para avaliação. O site de produção e o Admin não são ambientes desta prévia.

Branch: `refactor/centralpdf-3-ux-mobile-refinement`. Base: `d5b38e8`, após as PRs #89/#90. O [relatório](RELATORIO.md) registra os commits de implementação, resultados, falhas iniciais, repetições, desempenho e limitações. Os [checkpoints](CHECKPOINTS.md) mostram as decisões incrementais.

## Abrir a aplicação real localmente

Se recebeu o ZIP completo da prévia, extraia a pasta e abra `ABRIR_PREVIA.bat` (requer Python 3). O inicializador abre um endereço local isolado; o pacote contém os motores preparados. Mantenha a janela do terminal aberta enquanto avalia. O aplicativo deve ser servido por HTTP local.

Para executar pela cópia do repositório no Codex local/Windows:

```powershell
git clone --branch refactor/centralpdf-3-ux-mobile-refinement --single-branch https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local.git CentralPDF-Previa-Mobile
cd CentralPDF-Previa-Mobile
.\PREPARAR_OFFLINE.bat
Copy-Item .\docs\mobile-refinement\preview-launcher\* .
.\ABRIR_PREVIA.bat
```

A preparação baixa e verifica as dependências; é dispensável no ZIP já preparado. No computador com Python, também é possível servir uma cópia preparada com:

```bash
python INICIAR_PREVIA.py
```

Abra o endereço `http://127.0.0.1:PORTA/PREVIA_INICIO.html` exibido **nessa máquina**. Esse endereço não é uma hospedagem pública. O procedimento local é a alternativa prevista no pedido, pois não foi disponibilizada hospedagem isolada autorizada. Não foi publicado um site de demonstração no Pages.

O [build Pages da PR](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/actions/workflows/pages.yml?query=branch%3Arefactor%2Fcentralpdf-3-ux-mobile-refinement), quando aprovado, oferece o artefato `github-pages` com a aplicação e motores reais, sem deploy. O download do GitHub pode exigir login; extraia também `artifact.tar`, extraia o [inicializador](INICIADOR_PREVIA.zip) na pasta de `index.html` e use o inicializador acima. Esse artefato não contém o servidor Windows.

Use arquivos sintéticos ou cópias de teste. A origem local tem seu próprio armazenamento; não importa nem apaga os projetos do site público. O inicializador desativa estatísticas e diagnóstico nesta origem nova; o servidor da prévia bloqueia conexões a APIs externas de produção. As preferências do site público não são alteradas.

As [amostras sintéticas](AMOSTRAS_PREVIA.zip) incluem PDFs de 2/3 páginas e imagens JPG/PNG/WEBP, com PNG transparente.

## Roteiro de avaliação

1. **JPG/PNG para PDF:** veja o estado vazio, importe JPG/PNG/WEBP e observe o topo compacto. Ajuste miniaturas, ordem, seleção e giro. Teste Retrato/Paisagem/Automática, A4/Carta/Personalizado, margens, Mesclar e Mais opções. Gere PDF e ZIP e abra os resultados. Teste PNG transparente com fundo colorido.
2. **Editor:** importe PDF sintético, insira texto com acentos e altere fonte, tamanho, cor, estilos e alinhamento. Use Mais opções, duplicação, exclusão e histórico. No celular, toque em Recolher e Propriedades: o mesmo objeto deve continuar selecionado. Concluir mantém sua função original. Exporte e reabra o PDF.
3. **Ações finais:** experimente Juntar, Dividir e Organizar. No celular, confira o botão inferior e sua mensagem de estado. Recolha as configurações e verifique que a mesma ação continua acessível; sem arquivo, permanece desabilitada.
4. **Responsividade:** alterne claro/escuro e largura/orientação. Confira a página ao editar com pouca altura, teclado e zoom. As emulações executadas não substituem a conferência em aparelhos reais.
5. **Outras funções:** OCR, Office, assinatura, censura, projetos, fila, resultados e offline mantêm seus fluxos e avisos existentes.

## Comparações visuais

A correção da revisão também preserva objetos e alças ao selecionar sem abrir o texto: [antes](evidence/review-selection/before-chromium-390.png), [depois Chromium](evidence/review-selection/after-chromium-390.png) e [depois Firefox](evidence/review-selection/after-firefox-390.png). A prévia completa inclui essa correção (pages-59/mobile2).

Capturas da aplicação real com documentos sintéticos. Todas as capturas estão nas pastas [antes](evidence/before) e [depois](evidence/after), com manifestos e hashes no relatório.

| Estado | Antes | Depois |
| --- | --- | --- |
| Imagens — desktop escuro | [Abrir](evidence/before/imagesToPdf-chromium-1440-dark.png) | [Abrir](evidence/after/imagesToPdf-chromium-1440-dark.png) |
| Imagens — celular claro | [Abrir](evidence/before/imagesToPdf-chromium-390-light.png) | [Abrir](evidence/after/imagesToPdf-chromium-390-light.png) |
| Editor expandido — desktop claro | [Abrir](evidence/before/editor-expanded-chromium-1440-light.png) | [Abrir](evidence/after/editor-expanded-chromium-1440-light.png) |
| Editor expandido — celular escuro | [Abrir](evidence/before/editor-expanded-chromium-390-dark.png) | [Abrir](evidence/after/editor-expanded-chromium-390-dark.png) |
| Editor recolhido — celular | O controle não existia | [Abrir](evidence/after/editor-collapsed-chromium-390-dark.png) |
| Juntar — celular claro | [Abrir](evidence/before/merge-chromium-390-light.png) | [Abrir](evidence/after/merge-chromium-390-light.png) |
| Dividir — desktop escuro | [Abrir](evidence/before/split-chromium-1440-dark.png) | [Abrir](evidence/after/split-chromium-1440-dark.png) |
| Organizar — celular escuro | [Abrir](evidence/before/organize-chromium-390-dark.png) | [Abrir](evidence/after/organize-chromium-390-dark.png) |
| Comprimir — desktop claro | [Abrir](evidence/before/compress-chromium-1440-light.png) | [Abrir](evidence/after/compress-chromium-1440-light.png) |

As outras combinações de tema/browser/viewport têm o mesmo padrão de nome. Para repetir as capturas numa cópia preparada:

```bash
python scripts/capture-mobile-refinement.py --site CAMINHO_PREPARADO --output CAMINHO_DAS_CAPTURAS
```

## Rollback e pendências humanas

Antes do merge, basta fechar a prévia e voltar à `main` na cópia de desenvolvimento. Não é necessário limpar armazenamento ou excluir projetos. Cada checkpoint está em um commit próprio; uma eventual reversão após integração deve ser feita em nova PR, com revisão de cache nova e testes. Não reutilize automaticamente um cache antigo em uma publicação futura.

Ainda exigem avaliação humana: visual desta etapa, teclado virtual/IME físico, gestos e áreas seguras de aparelhos reais, leitor de tela e zoom nativo de cada navegador. O teste de zoom automatizado cobre o visual viewport real do Chromium a 200%; não equivale a certificação de acessibilidade.
