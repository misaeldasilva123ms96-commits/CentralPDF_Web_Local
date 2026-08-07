import { PDFDocument, PDFName, PDFRawStream, PDFDict, PDFArray, PDFStream, PDFNumber, PDFRef } from 'pdf-lib';
import type { JSONSchema, ToolContext, ToolDefinition, ToolResult, ValidationResult } from '../core/types';
import { QUALITY_RATINGS, recompressJpeg, toCompressionQuality } from './compress-images';

const TOOL_VERSION = '0.1.0';

const NO_IMAGE_BYTES_MIN = 8 * 1024;

function filterNames(filterValue: unknown): string[] {
  if (filterValue instanceof PDFName) return [filterValue.decodeText().replace(/^\//, '')];
  if (filterValue instanceof PDFArray) {
    return filterValue.asArray().flatMap((item) =>
      item instanceof PDFName ? [item.decodeText().replace(/^\//, '')] : []
    );
  }
  return [];
}

interface CompressOutcome {
  bytes: Uint8Array;
  pages: number;
  imagesRecompressed: number;
}

async function compressDocument(
  data: ArrayBuffer,
  quality: number,
  maxDimension: number | undefined
): Promise<CompressOutcome> {
  const doc = await PDFDocument.load(data, { updateMetadata: false });
  const pageIndices = doc.getPageIndices();
  let imagesRecompressed = 0;
  const replacedRefs = new Set<string>();

  if (quality >= 1) {
    const untouched = await doc.save();
    return { bytes: untouched, pages: pageIndices.length, imagesRecompressed };
  }

  for (const pageIndex of pageIndices) {
    const resources = doc.getPage(pageIndex).node.Resources();
    const xobjects = resources?.lookupMaybe(PDFName.XObject, PDFDict);
    if (!xobjects) continue;

for (const key of xobjects.keys()) {
      const raw = xobjects.lookupMaybe(key, PDFStream);
      if (!(raw instanceof PDFRawStream)) continue;

      const subtype = raw.dict.get(PDFName.of('Subtype'));
      if (!(subtype instanceof PDFName) || !subtype.decodeText().includes('Image')) continue;
      if (!filterNames(raw.dict.get(PDFName.of('Filter'))).includes('DCTDecode')) continue;

      const jpegBytes = raw.getContents();
      if (jpegBytes.byteLength < NO_IMAGE_BYTES_MIN) continue;

      const summary = recompressJpeg(jpegBytes, {
        quality,
        maxDimension,
        minBytes: NO_IMAGE_BYTES_MIN
      });
      if (summary.skippedBySize || summary.bytesOut >= summary.bytesIn) continue;

      const ref = xobjects.get(key);
      if (!(ref instanceof PDFRef)) continue;
      const refKey = `${ref.objectNumber}`;
      if (replacedRefs.has(refKey)) continue;
      replacedRefs.add(refKey);

      const newRaw = PDFRawStream.of(
        doc.context.obj({
          Filter: PDFName.of('DCTDecode'),
          Width: PDFNumber.of(summary.width ?? 1),
          Height: PDFNumber.of(summary.height ?? 1),
          ColorSpace: PDFName.of('DeviceRGB'),
          BitsPerComponent: PDFNumber.of(8),
          Subtype: PDFName.of('Image')
        }) as never,
        summary.bytes!
      );
      doc.context.assign(ref, newRaw);
      imagesRecompressed += 1;
    }
  }

  const bytes = await doc.save();
  return { bytes, pages: pageIndices.length, imagesRecompressed };
}

function validate(context: ToolContext): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (context.inputs.length === 0) {
    errors.push('Selecione pelo menos um arquivo PDF.');
  } else {
    for (const file of context.inputs) {
      const signature = String.fromCharCode(...new Uint8Array(file.data.slice(0, 8)));
      if (!signature.startsWith('%PDF-')) {
        warnings.push(`"${file.name}" não parece ser um PDF válido.`);
      }
    }
  }

  const quality = context.parameters.quality;
  if (quality !== undefined && quality !== 'high' && quality !== 'balanced' && quality !== 'auto') {
    errors.push('Qualidade deve ser "high", "balanced" ou "auto".');
  }

  return { ok: errors.length === 0, errors, warnings };
}

const parametersSchema: JSONSchema = {
  type: 'object',
  properties: {
    quality: {
      type: 'string',
      title: 'Qualidade',
      default: 'balanced',
      enum: ['high', 'balanced', 'auto']
    },
    recompressImages: {
      type: 'boolean',
      title: 'Recomprimir imagens JPEG',
      default: true
    }
  }
};

export const compressPdfTool: ToolDefinition = {
  id: 'compress-pdf',
  version: TOOL_VERSION,
  category: 'organizacao',
  title: 'Comprimir PDF',
  description: 'Reduz o tamanho de um PDF recomprimindo imagens JPEG e otimizando o arquivo.',
  inputs: [{ kind: 'pdf', accept: ['application/pdf', '.pdf'], multiple: true, minFiles: 1 }],
  outputs: [{ kind: 'pdf', accept: ['application/pdf'], multiple: false, minFiles: 1 }],
  runtime: ['BROWSER_WASM'],
  parametersSchema,
  validate,
  estimate: () => ({}),
  execute: async (context: ToolContext): Promise<ToolResult> => {
    context.progress?.(2, 'lendo arquivos');
    const qualityParam = toCompressionQuality(String(context.parameters.quality ?? 'balanced'));
    const maxDimension = qualityParam === 'auto' ? 2048 : undefined;
    const recompressImages = context.parameters.recompressImages !== false;

    const startedAt = Date.now();
    const outputs: ToolResult['outputs'] = [];
    const warnings: string[] = [];
    let bytesIn = 0;
    let bytesOut = 0;
    let pages = 0;
    let imagesRecompressed = 0;

    for (let index = 0; index < context.inputs.length; index += 1) {
      const file = context.inputs[index];
      bytesIn += file.size;
      context.progress?.(Math.round((index / context.inputs.length) * 80), `comprimindo ${file.name}`);

      let result: CompressOutcome;
      try {
        result = await compressDocument(
          file.data,
          recompressImages ? QUALITY_RATINGS[qualityParam] : 1,
          maxDimension
        );
      } catch (error) {
        warnings.push(
          `"${file.name}" não pôde ser comprimido (${error instanceof Error ? error.message : 'erro desconhecido'}).`
        );
        continue;
      }

      pages += result.pages;
      imagesRecompressed += result.imagesRecompressed;
      bytesOut += result.bytes.byteLength;
      outputs.push({
        name: `${file.name.replace(/\.pdf$/i, '')}_comprimido.pdf`,
        mimeType: 'application/pdf',
        kind: 'pdf',
        data: result.bytes.slice().buffer as ArrayBuffer
      });
    }

    context.progress?.(100, 'concluído');

    return {
      ok: outputs.length > 0,
      outputs,
      warnings,
      metrics: {
        durationMs: Date.now() - startedAt,
        bytesIn,
        bytesOut,
        pages,
        imagesRecompressed
      }
    };
  },
  capabilities: { batch: true, cancellable: true, offline: true, workflow: true, preview: false }
};