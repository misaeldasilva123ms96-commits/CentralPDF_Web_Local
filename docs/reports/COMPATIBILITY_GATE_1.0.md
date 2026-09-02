# CentralPDF — Compatibility Gate 1.0

Data da execução: 2026-09-02

PR: #33

Branch: `codex/fix-pdf-ingestion-reliability`

Resultado: **PASS**

## Escopo e método

O gate valida o pipeline real de ingestão em navegador, PDF.js 6.2.108, PDF-Lib 1.17.1, renderização da primeira página, thumbnail, preservação do `ArrayBuffer` proprietário e limpeza de recursos. O corpus é reproduzível: arquivos públicos vêm de commits imutáveis com SHA-256 no manifesto; arquivos grandes, inválidos e de estresse são gerados deterministicamente e não são versionados.

Foram exercitados 52 PDFs: 20 Mozilla, 14 veraPDF, 7 PDF Association, 4 PDFium e 7 gerados. O conjunto contém versões observadas de PDF 1.3 a PDF 2.0, além de amostra deliberadamente incomum e arquivo sem cabeçalho PDF. Abrange texto e Unicode, fontes, imagens e espaços de cor, transparência e vetores, anotações, formulários AcroForm/XFA, outlines, anexos, metadados, xref recuperável e malformado, linearização, atualização incremental, assinatura, criptografia, PDF/A-1/2/3/4, PDF/UA-1/2, PDF 2.0, truncamento, extensão falsa, 600 páginas e arquivo de 50 MiB.

## Resumo

| Estágio | PASS | Rejeição/limitação esperada | Falha inesperada |
| --- | ---: | ---: | ---: |
| Ingestão | 48 | 4 | 0 |
| PDF.js | 48 | 4 | 0 |
| PDF-Lib | 48 | 4 | 0 |
| Renderização | 48 | 4 N/A | 0 |
| Thumbnail | 48 | 4 N/A | 0 |

- Regressões de detachment de `ArrayBuffer`: 0.
- Rejeições não tratadas: 0.
- Arquivos perdidos em lote: 0.
- Duplicações inesperadas: 0.
- Stress de 50 PDFs pequenos: PASS no frontend legado e no React.
- PDF com 600 páginas: PASS.
- PDF de aproximadamente 50 MiB: PASS.
- Service worker: atualização de cache e disponibilidade offline dos artefatos versionados: PASS.

## Matriz por arquivo

`N/A` é o resultado esperado quando a ingestão rejeita corretamente um PDF protegido ou inválido antes de renderizar.

| Caso | Fonte | Categorias | Esperado | Ingestão | PDF.js | PDF-Lib | Render | Thumbnail | Páginas | Resultado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- |
| moz-basic | mozilla | basic, text, pdf-1.x | PASS | PASS | PASS | PASS | PASS | PASS | 3 | PASS |
| moz-acroform | mozilla | acroform, multipage | PASS | PASS | PASS | PASS | PASS | PASS | 2 | PASS |
| moz-xfa | mozilla | xfa, forms | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| moz-complex-font | mozilla | fonts, embedded-font | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| moz-cmyk-jpeg | mozilla | image, cmyk, jpeg | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| moz-jpx | mozilla | image, jpeg2000, jpx | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| moz-jbig2 | mozilla | image, jbig2 | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| moz-annotation | mozilla | annotations, attachment | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| moz-outlines | mozilla | bookmarks, outlines | PASS | PASS | PASS | PASS | PASS | PASS | 9 | PASS |
| moz-attachment | mozilla | attachments | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| moz-encrypted-attachment | mozilla | encryption, attachments | EXPECTED_REJECTION | EXPECTED_REJECTION | PASSWORD | EXPECTED_UNSUPPORTED | N/A | N/A | 0 | PASS |
| moz-recoverable-xref | mozilla | xref, recoverable, malformed | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| moz-unicode-font | mozilla | unicode, cidfont | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| moz-cmyk-shading | mozilla | cmyk, vectors, shading | PASS | PASS | PASS | PASS | PASS | PASS | 2 | PASS |
| moz-jpx-smask | mozilla | jpeg2000, transparency | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| moz-mixed-fonts | mozilla | fonts, text | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| moz-standard-fonts | mozilla | fonts, standard-fonts | PASS | PASS | PASS | PASS | PASS | PASS | 14 | PASS |
| moz-annotations-large | mozilla | annotations, large-content | PASS | PASS | PASS | PASS | PASS | PASS | 14 | PASS |
| moz-signed | mozilla | digital-signature, incremental-update | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| moz-transparency | mozilla | transparency, vectors | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| vera-pdfa1-unicode | verapdf | pdf-a-1, unicode, fonts | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| vera-pdfa1-transparency | verapdf | pdf-a-1, transparency | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| vera-pdfa2-header | verapdf | pdf-a-2, header | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| vera-pdfa2-transparency | verapdf | pdf-a-2, transparency | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| vera-pdfa3-attachment | verapdf | pdf-a-3, attachments | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| vera-pdfa4-header | verapdf | pdf-a-4, pdf-2.0, header | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| vera-pdfa4-xref | verapdf | pdf-a-4, pdf-2.0, xref | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| vera-pdfa4-optional-content | verapdf | pdf-a-4, pdf-2.0, optional-content | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| vera-pdfua1-version | verapdf | pdf-ua-1, accessibility | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| vera-pdfua1-general | verapdf | pdf-ua-1, tagged-pdf | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| vera-pdfua2-version | verapdf | pdf-ua-2, pdf-2.0, accessibility | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| vera-pdfua2-metadata | verapdf | pdf-ua-2, pdf-2.0, metadata | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| vera-iso32000-1-invalid-standard | verapdf | pdf-1.7, standard-invalid, images | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| vera-iso32000-2-invalid-standard | verapdf | pdf-2.0, standard-invalid, trailer | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| pdf20-simple | pdfassociation | pdf-2.0, basic, metadata | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| pdf20-utf8 | pdfassociation | pdf-2.0, unicode, outlines | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| pdf20-utf8-annotation | pdfassociation | pdf-2.0, unicode, annotations | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| pdf20-bpc-image | pdfassociation | pdf-2.0, image, icc-profile | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| pdf20-incremental | pdfassociation | pdf-2.0, incremental-update | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| pdf20-offset | pdfassociation | pdf-2.0, offset-header | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| pdf20-output-intent | pdfassociation | pdf-2.0, icc-profile, output-intent | PASS | PASS | PASS | PASS | PASS | PASS | 2 | PASS |
| pdfium-basic | pdfium | basic, text | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| pdfium-linearized | pdfium | linearized, xref | PASS | PASS | PASS | PASS | PASS | PASS | 3 | PASS |
| pdfium-encrypted | pdfium | encryption, password | EXPECTED_REJECTION | EXPECTED_REJECTION | PASSWORD | EXPECTED_UNSUPPORTED | N/A | N/A | 0 | PASS |
| pdfium-rebuilt-xref | pdfium | xref, recoverable, malformed | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| generated-basic | generated | basic, pdf-1.7 | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| generated-unicode | generated | unicode, metadata, pdf-1.7 | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| generated-multipage | generated | multipage, rotations, page-sizes | PASS | PASS | PASS | PASS | PASS | PASS | 8 | PASS |
| generated-large-pages | generated | 600-pages, stress | PASS | PASS | PASS | PASS | PASS | PASS | 600 | PASS |
| generated-large-size | generated | 50mb, stress, attachment | PASS | PASS | PASS | PASS | PASS | PASS | 1 | PASS |
| generated-fake | generated | invalid, fake-extension | EXPECTED_REJECTION | EXPECTED_REJECTION | EXPECTED_FAILURE | EXPECTED_UNSUPPORTED | N/A | N/A | 0 | PASS |
| generated-truncated | generated | invalid, truncated, malformed | EXPECTED_REJECTION | EXPECTED_REJECTION | EXPECTED_FAILURE | EXPECTED_UNSUPPORTED | N/A | N/A | 0 | PASS |

## Ensaios operacionais

Nos frontends legado e React, o gate executou lote de 19 válidos seguido imediatamente por outro arquivo, mistura de válidos com protegido e inválido, clique seguido de drop, drop seguido de drop e stress com 50 PDFs pequenos e nomes únicos. A ordem determinística de cada runtime foi preservada (A–Z no merge legado e ordem de entrada no React), as falhas ficaram isoladas, e nenhum arquivo foi perdido ou duplicado. No legado, a falha deliberada de worker/thumbnail também manteve o arquivo disponível para a ferramenta.

O teste do service worker instalou uma versão antiga do cache, atualizou para a atual, confirmou remoção do cache obsoleto e verificou offline os artefatos exatos e versionados de aplicação e ingestão. Isso cobre o caminho estático usado pelo GitHub Pages; não faz um deploy remoto durante o gate local.

## Reprodutibilidade

```powershell
python scripts/fetch-pdf-corpus.py --verify-only
python tests/pdf-compatibility-gate.py
python tests/pdf-compatibility-sw.test.py
```

Para reconstruir o cache do zero, execute `python scripts/fetch-pdf-corpus.py`. O manifesto fixa repositório, commit, licença, caminho e SHA-256 de cada artefato público. A regeneração dos sete fixtures controlados produz hashes estáveis.

## Limitações conhecidas

- O gate comprova abertura, parsing, renderização inicial, thumbnail, prontidão para edição e comportamento em lote; ele não certifica conformidade normativa completa de PDF/A ou PDF/UA.
- O teste de 50 MiB e a limpeza explícita não indicaram retenção ou crash, mas não substituem um perfil prolongado de heap em todos os navegadores e dispositivos.
- PDFs protegidos são rejeitados de forma controlada; desbloqueio por senha não faz parte do escopo atual do produto.
