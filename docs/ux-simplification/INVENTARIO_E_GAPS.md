# Inventário e gaps — UX simples

Base auditada antes da implementação: `a499c8ddda27ea2b398ad309afc84ccdc1253516` (`main`, 07/11/2026). Branch `feat/ux-simple-professional`. Aplicação original da raiz; React e Admin separados.

## Matriz de preservação anterior à implementação

34 famílias do catálogo, 39 cartões/atalhos. Todos os IDs, modos, opções e valores padrão no [inventário estruturado](inventario-base.json), incluindo controles contextuais movidos pelo editor.

| ID | Entrada → saída | Controles preservados |
| --- | --- | --- |
| organize | application/pdf,.pdf → pdf | `organizerPreserveMetadata` |
| editPdf | application/pdf,.pdf → pdf | `editorReturnToPage`, `editorReadOriginal`, `editorNativeSearch`, `editorTextValue`, `editorFontFamily`, `editorFontSize`, `editorTextColor`, `editorTextOpacity`, `editorBold`, `editorItalic`, `editorTextAlign`, `editorObjectX`, `editorObjectY`, `editorObjectWidth`, `editorObjectHeight`, `editorObjectRotation`, `editorRotateLeft`, `editorResetRotation`, `editorRotateRight`, `editorObjectLockAspect`, `editorResetImageRatio`, `editorAlignLeft`, `editorAlignCenterX`, `editorAlignRight`, `editorAlignTop`, `editorAlignCenterY`, `editorAlignBottom`, `editorSendBackward`, `editorBringForward`, `editorDuplicateObject`, `editorDeleteObject`, `editorBrushColor`, `editorBrushWidth`, `editorHighlightColor`, `editorHighlightWidth`, `editorClearDrawings`, `editorCoverColor`, `editorCoverOpacity`, `editorApplyCrop`, `editorResetCrop` |
| merge | application/pdf,.pdf → pdf | `mergePreserveMetadata`, `mergeSourceSort`, `mergeReverseSources` |
| split | application/pdf,.pdf → auto | `splitAddInterval`, `splitCustomGroups`, `splitIncludeUnmentioned`, `splitPartCount`, `splitPagesPerFile`, `splitCuts`, `splitMode`, `splitIncludeManifest` |
| extract | application/pdf,.pdf → auto | `extractMode`, `extractPages`, `extractAllowDuplicates`, `extractGroups`, `extractManifest`, `extractRemovePages` |
| rotate | application/pdf,.pdf → auto | `rotationAngle`, `rotateMode`, `rotatePages`, `rotateBehavior` |
| watermark | application/pdf,.pdf → auto | `watermarkType`, `watermarkText`, `watermarkFont`, `watermarkColor`, `watermarkImageFile`, `watermarkSize`, `watermarkOpacity`, `watermarkRotation`, `watermarkPattern`, `watermarkPosition`, `watermarkScope`, `watermarkPages` |
| pageNumbers | application/pdf,.pdf → auto | `numberFormat`, `numberCustomFormat`, `numberScope`, `numberPages`, `numberSkip`, `numberStart`, `numberSize`, `numberColor`, `numberPosition`, `numberMargin`, `numberTotalMode`, `numberBackground` |
| imagesToPdf | image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp → auto | `imageOutputMode`, `imagePageMode`, `imageCustomWidth`, `imageCustomHeight`, `imageOrientation`, `imageMargin`, `imageFit`, `imageAlign`, `imageBackground`, `imageNoUpscale` |
| imageConvert | image/*,.png,.jpg,.jpeg,.webp,.bmp,.gif → auto | `outputFormat`, `maxWidth`, `maxHeight`, `quality` |
| compress | application/pdf,.pdf → auto | `compressionMode`, `compressionDpi`, `compressionQuality`, `compressionGrayscale`, `compressionScope`, `compressionPages`, `compressionStripMetadata`, `compressionKeepSmaller`, `compressionReport` |
| pdfToImage | application/pdf,.pdf → auto | `pdfImageFormat`, `pdfImageDpi`, `pdfImageQuality`, `pdfImageScope`, `pdfImagePages`, `pdfImageOutputMode`, `pdfImageColumns`, `pdfImageGrayscale`, `pdfImageTransparent`, `pdfImagePrefix` |
| crop | application/pdf,.pdf → auto | `cropMode`, `cropTop`, `cropRight`, `cropBottom`, `cropLeft`, `cropCenterWidth`, `cropCenterHeight`, `cropScope`, `cropPages`, `cropBehavior` |
| metadata | application/pdf,.pdf → auto | `metaTitle`, `metaAuthor`, `metaKeywords`, `metaSoftware` |
| normalize | application/pdf,.pdf → auto | `normalizeMetadata` |
| pdfToText | application/pdf,.pdf → auto | `textPageHeaders` |
| ocr | application/pdf,image/png,image/jpeg,image/webp,image/bmp,.pdf,.png,.jpg,.jpeg,.webp,.bmp → auto | `ocrOutputMode`, `ocrLanguage`, `ocrDpi`, `ocrRecognitionMode`, `ocrPageScope`, `ocrPageSegMode`, `ocrPages`, `ocrManualRotation`, `ocrNativeThreshold`, `ocrAutoRotate`, `ocrGrayscale`, `ocrContrast`, `ocrThresholdEnabled`, `ocrThreshold`, `ocrPreserveNative`, `ocrPageHeaders`, `ocrIncludeReport`, `ocrDetectPatterns`, `ocrConfidenceThreshold`, `ocrReviewButton` |
| compare | application/pdf,.pdf → zip | `compareMode`, `compareIgnoreCase`, `compareIgnoreWhitespace`, `comparePages`, `compareDpi`, `compareThreshold`, `compareIncludeImages` |
| redact | application/pdf,.pdf → pdf | `redactionSearch`, `redactionSearchScope`, `redactionRegex`, `redactionFind`, `redactionDpi`, `redactionColor`, `redactionLabel`, `redactionRasterAll`, `redactionReport`, `redactionClearAll` |
| formBuilder | application/pdf,.pdf → pdf | `formFieldType`, `formFieldName`, `formFieldLabel`, `formFieldDefault`, `formFieldOptions`, `formFieldFontSize`, `formFieldMaxLength`, `formFieldTextColor`, `formFieldBorderColor`, `formFieldBackground`, `formFieldRequired`, `formStartPlacement`, `formUpdateSelected`, `formDuplicateSelected`, `formDeleteSelected`, `formCopyPages`, `formCopySelected` |
| signPdf | application/pdf,.pdf → pdf | `signatureSource`, `signaturePadClear`, `signatureInkColor`, `signatureInkWidth`, `signatureTypedText`, `signatureTypedFont`, `signatureTypedColor`, `signatureImageInput`, `signatureRemoveWhite`, `signaturePrepare`, `signatureSignerName`, `signatureDateMode`, `signatureCustomDate`, `signaturePageScope`, `signatureRotation`, `signatureSelectedPages`, `signatureDuplicate`, `signatureRubricAll`, `signatureDelete` |
| pdfToOffice | application/pdf,.pdf → auto | `officeExportFormat`, `officeDocxMode`, `officeXlsxSheets`, `officeExportPages`, `officeExportDpi` |
| documentsToPdf | .docx,.doc,.odt,.xlsx,.xls,.ods,.pptx,.ppt,.odp,.rtf,.html,.htm,.txt,.csv,.md,.markdown,image/*,.png,.jpg,.jpeg,.webp,.bmp,.gif,.tif,.tiff,.heic,.heif → auto | `docToPdfEngine`, `docToPdfCombine`, `docToPdfPageSize`, `docToPdfFontSize`, `docToPdfImagePage` |
| extractImages | application/pdf,.pdf → zip | `extractImageMode`, `extractImageFormat`, `extractImageQuality`, `extractImageMinWidth`, `extractImageMinHeight`, `extractImagePages`, `extractImageDpi`, `extractImageDedupe` |
| archivePdf | application/pdf,.pdf → auto | `archiveMode`, `archiveDpi`, `archiveFlattenForms`, `archiveRemoveMetadata`, `archiveManifest` |
| documentAssistant | application/pdf,.pdf → zip | `intelligenceQuestion`, `intelligenceFocus`, `intelligenceSummarySize`, `intelligenceEvidenceCount`, `intelligenceIncludeSections`, `intelligenceIncludePatterns` |
| structuredExtraction | application/pdf,.pdf → zip | `extractionProfile`, `extractionIncludePages`, `extractionGroupByFile`, `extractionExportXlsx`, `extractionCustomRegex` |
| documentAudit | application/pdf,.pdf → zip | `auditProfile`, `auditLaunchDate`, `auditPaymentDate`, `auditDueFallback`, `auditCompareCnpj`, `auditCompareCodes`, `auditCompareAmounts`, `auditCheckCnd` |
| classifyRename | application/pdf,.pdf → zip | `renameTemplate`, `renameMaxLength`, `renameIncludeCopies`, `renameDetectBlank`, `renameDetectDuplicates`, `renameUseDate` |
| protect | application/pdf,.pdf → auto | `protectPassword`, `protectPasswordConfirm`, `protectOwnerPassword`, `protectAlgorithm`, `permPrint`, `permCopy`, `permModify`, `permAnnotate`, `permForms` |
| unlock | application/pdf,.pdf → auto | `unlockPassword` |
| diagnose | application/pdf,.pdf → auto | `diagnosePassword`, `diagnoseJson` |
| repairAdvanced | application/pdf,.pdf → auto | `repairPassword`, `repairRemoveProtection` |
| flattenForms | application/pdf,.pdf → auto | `flattenPassword` |

## Fricções e tratamento proposto

- Editor: balão até 760 px; opacidade ocupa a linha principal. Reduzir para 400 px e mover opacidade para Mais opções junto de geometria/camadas. Duplicar/Excluir/Concluir e histórico preservados. Calcular posição sem cobrir a seleção.
- Imagens: miniaturas pequenas e sem papel/margem. Aumentar área visual; orientação/margens explícitas, união por checkbox e resumo da saída. Manter imagem/A4/Carta/personalizado, margens em mm, giro e WEBP, encaixe/fundo/alinhamento. Identificar prévia aproximada.
- Demais módulos: duas regiões já existem. Compactar cabeçalho e metadados repetitivos; manter avisos de segurança. Agrupar apenas configurações secundárias identificadas; manter painéis condicionais, campos obrigatórios e modos.
- Mobile: configurações no fluxo e controles acessíveis, sem sobrepor documentos.

## Segurança, limites e rollback

Sem novos motores/rede, contratos Admin/Auth/API, deploy ou release. Commits reversíveis e PRs draft. Capturas e matriz anteriores permitem comparar as mudanças. Prévia/teste usa motores locais reais já presentes, com marcador de preparação equivalente ao instalador; nenhuma saída simulada.

## Referência e validação

Suíte de referência em execução; resultados serão registrados em TESTES_E_PARIDADE.md. Screenshots em evidence/before/. Não há ferramenta invocável do Browser da extensão; o prompt permite Playwright, usado para Chromium e Firefox.
