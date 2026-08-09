# THIRD_PARTY_NOTICES — CentralPDF 2.0

Política de licenças e dependências do CentralPDF (ADR-0001, PR 2).

## Regras

1. Ideias e padrões arquiteturais de projetos de referência podem ser estudados
   (iLovePDF, PDFCraft, Stirling PDF).
2. **Código do PDFCraft (AGPL-3.0) não deve ser copiado nem adaptado** — qualquer
   uso direto exigiria tornar o trabalho derivado AGPL.
3. Código do Stirling PDF sob MIT: reutilização apenas após revisão do arquivo
   específico e com atribuição. Diretórios proprietários (engine, SaaS, desktop,
   cloud) não devem ser usados.
4. A interface visual do CentralPDF é design próprio.
5. Este documento deve ser atualizado a cada dependência nova ou atualizada.
6. A SBOM de cada release deve referenciar este documento e os hashes abaixo.

## Dependências commitadas (`vendor/`)

| Pacote | Versão | Licença | Arquivo | SHA-256 |
| --- | --- | --- | --- | --- |
| JSZip | 3.x | MIT ou GPLv3 | `vendor/jszip.min.js` | `acc7e41455a80765b5fd9c7ee1b8078a6d160bbbca455aeae854de65c947d59e` |
| pptxgenjs | 4.0.1 | MIT | `vendor/pptxgen.min.js` (licença em `vendor/pptxgen.LICENSE.txt`) | `097f0b92e15035a72bba72b59ef1ece62ab45ec6075ac85fe0e2d80d3f59b8e3` |
| LibPDF core (pkijs + deps) | experimental | MIT/BSD-2/BSD-3 (ver `vendor/libpdf-core.LICENSES.txt`) | `vendor/libpdf-core.mjs` | `ba6a01a814b4e32532ecdd8f8af982ee8468b39430e4b01637b653e1c36029a5` |

Dentro de `vendor/libpdf-core.LICENSES.txt`:
- pvtsutils — MIT (c) 2017-2024 Peculiar Ventures
- pako 2.2.0 — MIT AND Zlib
- noble-hashes — MIT (c) 2022 Paul Miller
- pkijs — BSD-2 (c) 2014 GlobalSign / 2015-2019 Peculiar Ventures
- scure-base — MIT (c) 2022 Paul Miller

## Dependências baixadas por `prepare-offline.ps1`

| Pacote | Versão | Licença | Caminho | SHA-256 |
| --- | --- | --- | --- | --- |
| pdf-lib | 1.17.1 | MIT | `vendor/pdf-lib.min.js` | `0f9a5cad07941f0826586c94e089d89b918c46e5c17cf2d5a3c6f666e3bc694f` |
| PDF.js (dist) | 6.2.108 | Apache-2.0 | `vendor/pdfjs/` | `b3e68d5cda70551a90b3f771419d379e20fc788ce056fa32de73608e01df47f4` |
| Tesseract.js | 7.0.0 | Apache-2.0 | `vendor/tesseract/` | `000c27d9cd0def655f77b36c72a389c0ab13793aa31cb4d7aab56d09c0afbc7e` (tesseract.min.js) |
| tesseract.js-core | 7.0.0 | Apache-2.0 | `vendor/tesseract-core/` | ver `prepare-offline.ps1` (8 wasm) |
| tessdata pt-BR | 4.0.0 | Apache-2.0 | `vendor/tessdata/4.0.0/por.traineddata.gz` | `3f5feea9dfc39106c92348089097a39bec66e9d6d09ca49befebb0bb60947374` |
| tessdata en | 4.0.0 | Apache-2.0 | `vendor/tessdata/4.0.0/eng.traineddata.gz` | `ed350f3752f81ee8f38769edc14d92d997dababe23b565c59879372cc46a2468` |
| UTIF | 3.1.0 | MIT | `vendor/UTIF.js` | `e3e76115f49571e39624c3316a76b3c4c5b2c5ca518dfec4b66a9f7af8c6d059` |
| heic2any | 0.0.4 | MIT | `vendor/heic2any.min.js` | `0963cfa50e9e1e7e6af929a40a81e3e898a673f1270eafa6917dd137e4968164` |

## Dependências de build/teste (a introduzir na Fase 1)

| Pacote | Versão | Licença | Uso |
| --- | --- | --- | --- |
| React | 19.x | MIT | UI do 2.0 |
| Vite | 7.x | MIT | Build estático |
| TypeScript | 5.x | Apache-2.0 | Tipagem |
| Zustand | 5.x | MIT | Estado global |
| Vitest | 3.x | MIT | Testes unitários |
| Testing Library | 16.x | MIT | Testes de componentes |

> As versões exatas serão fixadas no `app/package-lock.json` (PR 3) e este
> documento deve ser atualizado com o SBOM gerado pelo lockfile.

## Referências de comportamento (sem código copiado)

| Projeto | Licença | Uso permitido |
| --- | --- | --- |
| iLovePDF | Proprietário | Referência de UX/fluxo somente |
| PDFCraft | AGPL-3.0 | Referência de arquitetura somente; **sem copiar código** |
| Stirling PDF | MIT (núcleo) / proprietário (alguns dirs) | MIT: com revisão de arquivo e atribuição; dirs proprietários: não |

## Verificação por release

- `checksums.sha256` cobre os artefatos de distribuição.
- `release-provenance.test.py` valida atestações (repositório existente).
- A SBOM do 2.0 será gerada por release a partir do `package-lock.json` e deste
  documento.
