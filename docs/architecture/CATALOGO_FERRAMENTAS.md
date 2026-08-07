# Catálogo de ferramentas — CentralPDF v1.2.1 (baseline 2.0)

> Inventário oficial das 34 ferramentas do aplicativo. Dados extraídos de
> `assets/js/app.js` (`toolConfig`) pelo script
> `scripts/extract-tool-catalog.mjs`. O arquivo `_CATALOGO_RAW.md` é o
> artefato gerado; este documento é o catálogo revisado e categorizado.

## Classificação

### Organização (6)

| id | título | múltiplo | saída | settings ids |
| --- | --- | --- | --- | --- |
| merge | Juntar PDFs | sim | pdf | 7 |
| split | Dividir PDF | sim | auto | 10 |
| extract | Extrair ou remover páginas | sim | auto | 9 |
| rotate | Girar páginas | sim | auto | 5 |
| crop | Recortar PDF avançado | sim | auto | 14 |
| normalize | Normalizar PDF | sim | auto | 1 |

### Conversão e formatos

| id | nome | múltiplas | saída | settings ids |
| --- | --- | --- | --- | --- |
| imagesToPdf | Imagens para PDF avançado | sim | auto | 11 |
| imageConvert | Converter imagens | sim | auto | 4 |
| pdfToImage | PDF para imagens avançado | sim | auto | 12 |
| pdfToOffice | PDF para Office | sim | auto | 8 |
| documentsToPdf | Documentos para PDF | sim | auto | 5 |
| extractImages | Extrair imagens do PDF | sim | zip | 9 |

### Conteúdo e edição

| id | título | múltiplas | saída | settings ids |
| --- | --- | --- | --- | --- |
| editPdf | Editar PDF | não | pdf | 42 |
| watermark | Marca-d’água avançada | sim | auto | 16 |
| pageNumbers | Numerar páginas avançado | sim | auto | 14 |
| formBuilder | Criar formulário preenchível | não | pdf | 19 |
| signPdf | Assinar e rubricar PDF | não | pdf | 26 |

### Texto e reconhecimento

| id | título | múltiplas | saída | settings ids |
| --- | --- | --- | --- | --- |
| pdfToText | Extrair texto do PDF | sim | auto | 1 |
| ocr | OCR e PDF pesquisável | sim | auto | 25 |

### Inteligência documental

| id | título | múltiplas | saída | settings ids |
| --- | --- | --- | --- | --- |
| compare | Comparar PDFs | sim | zip | 8 |
| documentAssistant | Assistente documental | sim | zip | 8 |
| structuredExtraction | Extração estruturada | sim | zip | 7 |
| documentAudit | Auditoria documental | sim | zip | 10 |
| classifyRename | Classificar e renomear | sim | zip | 8 |

### Segurança

| id | título | múltiplas | saída | settings ids |
| --- | --- | --- | --- | --- |
| redact | Censura definitiva | não | pdf | 11 |
| protect | Proteger PDF | sim | auto | 9 (professional) |
| unlock | Remover senha | sim | auto | 1 (professional) |
| flattenForms | Fixar formulários | sim | auto | 1 (professional) |

### Higiene e diagnóstico

| id | título | múltiplas | saída | settings ids |
| --- | --- | --- | --- | --- |
| metadata | Limpar metadados | sim | auto | 4 |
| diagnose | Diagnosticar PDF | sim | auto | 2 (professional) |
| repairAdvanced | Recuperar PDF | sim | auto | 2 (professional) |
| archivePdf | Preparar para arquivamento | sim | auto | 7 |

## Observações do baseline

- **34 ferramentas**, todas com `toolConfig` em `app.js`; 7 marcadas `professional`.
- As 5 ferramentas com maior superfície de configuração (settings ids):
  `editPdf` (42), `signPdf` (26), `ocr` (25), `formBuilder` (19), `watermark` (16).
- `settings` vêm como HTML embutido — alvo da migração para
  `parametersSchema` no 2.0 (ADR-0001, contrato `ToolDefinition`).
- Outputs: `pdf`, `auto` (zip/qpdf/compress) ou `zip`.

## Ordem de migração sugerida (Fase 6, por categoria)

1. Organização (6) — merge, split, extract, rotate, crop, normalize
2. Conversão (6)
3. Conteúdo e edição (5)
4. Texto/reconhecimento (2)
5. Inteligência documental (5)
6. Segurança (4)
7. Higiene e diagnóstico (4)

Cada categoria deve ser migrada em PR independente, sem mistura em um mesmo PR
(ADR-0001).