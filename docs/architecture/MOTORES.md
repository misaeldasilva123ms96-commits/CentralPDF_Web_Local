# Motores e dependências — CentralPDF v1.2.1

Mapa de todos os motores e dependências do baseline 2.0. Este documento é a
fonte de verdade para a Fase 0 (congelamento de dependências) e alimenta o
`THIRD_PARTY_NOTICES.md`.

## 1. Motores de navegador (commitados em `vendor/`)

| Motor | Versão | Uso | Arquivo | SHA-256 (commitado) |
| --- | --- | --- | --- | --- |
| JSZip | 3.x (MIT/GPLv3) | ZIP de saída (dividir, extrair imagens, lote) | `vendor/jszip.min.js` | `acc7e41455a80765b5fd9c7ee1b8078a6d160bbbca455aeae854de65c947d59e` |
| pptxgenjs | 4.0.1 | Geração de PPTX (PDF para Office) | `vendor/pptxgen.min.js` | `097f0b92e15035a72bba72b59ef1ece62ab45ec6075ac85fe0e2d80d3f59b8e3` |
| LibPDF core | experimental | Assinatura digital (pkijs, noble-hashes, pvtsutils, pako, scure-base) | `vendor/libpdf-core.mjs` | `ba6a01a814b4e32532ecdd8f8af982ee8468b39430e4b01637b653e1c36029a5` |

## 2. Motores baixados por `scripts/prepare-offline.ps1` (não commitados)

| Motor | Versão | Uso | Caminho local | Fonte (CDN) | SHA-256 verificado |
| --- | --- | --- | --- | --- | --- |
| pdf-lib | 1.17.1 | Criação/edição de PDF (juntar, dividir, organizar, proteger) | `vendor/pdf-lib.min.js` | jsDelivr | `0f9a5cad07941f0826586c94e089d89b918c46e5c17cf2d5a3c6f666e3bc694f` |
| PDF.js | 6.2.108 | Renderização de páginas, extração de texto/imagens | `vendor/pdfjs/` (tgz do npm) | registry.npmjs.org | tgz: `b3e68d5cda70551a90b3f771419d379e20fc788ce056fa32de73608e01df47f4` |
| — API PDF.js | 6.2.108 | — | `pdf.min.mjs` | — | `9fab0c910bf1484835c5c2aeb68f7eb3dfce7f9eb435a004526c5af86d70890c` |
| — Worker PDF.js | 6.2.108 | — | `pdf.worker.min.mjs` | — | `bc0d1b88ea0b66196b1d36a58ac243c6d92adfe725624e2a9fdd381bdf8ef434` |
| — Recursos PDF.js | 6.2.108 | cmaps/iccs/fonts/wasm | `vendor/pdfjs/` | — | `960886d4e606e53b75909ea28efae08ff7f41011b1b8b09ed370f9c9087761be` |
| Tesseract.js | 7.0.0 | OCR | `vendor/tesseract/tesseract.min.js` | jsDelivr | `000c27d9cd0def655f77b36c72a389c0ab13793aa31cb4d7aab56d09c0afbc7e` |
| — Worker Tesseract | 7.0.0 | — | `vendor/tesseract/worker.min.js` | — | `576b7df7e3393e137e51849357c9adb53fe7ac1bb69bfa06cf3d61520f182c6d` |
| tesseract.js-core | 7.0.0 | WASM do OCR | `vendor/tesseract-core/` (8 variantes) | — | ver `prepare-offline.ps1` |
| Tessdata pt-BR | 4.0.0 | Idioma português | `vendor/tessdata/4.0.0/por.traineddata.gz` | tessdata.projectnaptha.com | `3f5feea9dfc39106c92348089097a39bec66e9d6d09ca49befebb0bb60947374` |
| Tessdata en | 4.0.0 | Idioma inglês | `vendor/tessdata/4.0.0/eng.traineddata.gz` | tessdata.projectnaptha.com | `ed350f3752f81ee8f38769edc14d92d997dababe23b565c59879372cc46a2468` |
| UTIF | 3.1.0 | Decodificação TIFF | `vendor/UTIF.js` | jsDelivr | `e3e76115f49571e39624c3316a76b3c4c5b2c5ca518dfec4b66a9f7af8c6d059` |
| heic2any | 0.0.4 | Decodificação HEIC/HEIF | `vendor/heic2any.min.js` | jsDelivr | `0963cfa50e9e1e7e6af929a40a81e3e898a673f1270eafa6917dd137e4968164` |

Fonte de verificação: `scripts/prepare-offline.ps1` (`$items` e `$pdfJsPackage`).
Recuperação: `PREPARAR_OFFLINE.bat` / `./scripts/prepare-offline.ps1`.

## 3. Motor local (Go)

| Componente | Versão | Uso | Caminho |
| --- | --- | --- | --- |
| `centralpdf/localserver` | go 1.23 | Servidor local (escuta `127.0.0.1`, porta aleatória, token por sessão) | `server/` |

Sem dependências externas de Go (`go.mod` sem requires) — stdlib apenas.

## 4. Roteamento por ferramenta (baseline de runtime)

- `BROWSER_NATIVE` (pdf-lib): organize, editPdf, merge, split, extract, rotate, crop, metadata, normalize, protect, unlock, flattenForms, watermark, pageNumbers, imagesToPdf, imageConvert
- `BROWSER_WASM` (PDF.js + tesseract + UTIF + heic2any + libpdf): pdfToImage, pdfToText, ocr, pdfToOffice, extractImages, signPdf, compare, redact, formBuilder, documentAssistant, structuredExtraction, documentAudit, classifyRename
- `LOCAL_COMPANION` (futuro): pdfToOffice pesado, archivePdf, repairAdvanced, diagnose, documentsToPdf (Office)

A classificação definitiva por ferramenta será fixada na Fase 6 (migração) no
`RuntimeRouter`.

## 5. Licenças resumidas

| Motor | Licença |
| --- | --- |
| pdf-lib | MIT |
| PDF.js | Apache-2.0 |
| Tesseract.js / core / tessdata | Apache-2.0 (traineddata: Apache-2.0) |
| JSZip | MIT ou GPLv3 (dupla) |
| pptxgenjs | MIT |
| UTIF | MIT |
| heic2any | MIT |
| LibPDF core (pkijs, pvtsutils, noble-hashes, pako, scure-base) | MIT/BSD-2/BSD-3 (ver `vendor/libpdf-core.LICENSES.txt`) |

Consulte `THIRD_PARTY_NOTICES.md` para os avisos completos.