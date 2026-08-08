/**
 * MÓDULO EXPERIMENTAL — NÃO REGISTRADO, NÃO EXECUTÁVEL.
 *
 * Esta implementação de compressão foi movida para fora do catálogo enquanto
 * os seguintes riscos não forem resolvidos no próximo PR:
 * - substituição de objetos de imagem pode perder SMask, Decode e perfis ICC;
 * - conversão indevida de espaços de cor (incluindo CMYK);
 * - cancelamento incompleto durante o processamento;
 * - ausência de regressão visual e de fallback pelo tamanho final.
 *
 * NÃO importe estas funções como ferramenta executável.
 */
import { PDFDocument, PDFName, PDFRawStream, PDFDict, PDFArray, PDFStream, PDFNumber, PDFRef } from 'pdf-lib';
import type { JSONSchema, ToolContext, ValidationResult } from '../core/types';
import { recompressJpeg } from './compress-images';

const NO_IMAGE_BYTES_MIN = 8 * 1024;

/**
 * Extracts filter names from a PDF name or array of PDF names.
 *
 * @param filterValue - The PDF filter value to inspect
 * @returns The decoded filter names, or an empty array when the value contains no supported names
 */
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

/**
 * Recompresses eligible JPEG images in a PDF document.
 *
 * @param data - The PDF document data
 * @param quality - JPEG compression quality; values greater than or equal to `1` preserve the document content
 * @param maxDimension - Optional maximum dimension for recompressed images
 * @returns The saved PDF bytes, page count, and number of images recompressed
 */
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

/**
 * Validates the selected PDF inputs and compression quality parameter.
 *
 * @returns A validation result containing errors for missing inputs or unsupported quality values, and warnings for files whose signature does not indicate a PDF.
 */
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

export const compressPdfWip = {
  compressDocument,
  validate,
  parametersSchema
};

// NOTA: nenhum ToolDefinition é exportado daqui. A ferramenta 'compress-pdf'
// registrada no catálogo (planned) usa um execute() que lança erro até a
// implementação segura ser concluída.