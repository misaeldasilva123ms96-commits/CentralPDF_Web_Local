import type { JSONSchema, ToolContext, ToolDefinition, ToolResult, ValidationResult } from '../core/types';
import { extractPageText, loadPdf, sanitizeOutputBase } from './pdf-engine';

const TOOL_VERSION = '0.1.0';

/**
 * Validates that exactly one PDF file is selected.
 *
 * @param context - The tool context containing the selected input files
 * @returns The validation status, errors, and warnings
 */
function validate(context: ToolContext): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (context.inputs.length === 0) {
    errors.push('Selecione um arquivo PDF.');
  } else if (context.inputs.length > 1) {
    errors.push('Extraia o texto de um PDF por vez.');
  } else {
    const file = context.inputs[0];
    const signature = String.fromCharCode(...new Uint8Array(file.data.slice(0, 8)));
    if (!signature.startsWith('%PDF-')) {
      warnings.push(`"${file.name}" não parece ser um PDF válido.`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Creates a failed result for an extraction that was cancelled before completion.
 *
 * @param warnings - Warnings accumulated before cancellation
 * @param startedAt - Start time used to calculate elapsed duration
 * @param bytesIn - Number of input bytes processed
 * @param pages - Number of pages processed
 * @returns A failed result containing the cancellation warning and processing metrics
 */
function cancelledResult(
  warnings: string[],
  startedAt: number,
  bytesIn: number,
  pages: number
): ToolResult {
  return {
    ok: false,
    outputs: [],
    warnings: [...warnings, 'Extração cancelada antes de terminar.'],
    metrics: {
      durationMs: Date.now() - startedAt,
      bytesIn,
      bytesOut: 0,
      pages
    }
  };
}

/**
 * Extracts text from all pages of a PDF, optionally adding page-number headers.
 *
 * Processing can be cancelled through the execution context. PDFs without
 * extractable text produce a failed result with an OCR recommendation.
 *
 * @returns The extraction result, including a UTF-8 text output on success.
 */
async function execute(context: ToolContext): Promise<ToolResult> {
  const file = context.inputs[0];
  const bytesIn = file.size;
  const startedAt = Date.now();
  const warnings: string[] = [];
  const includePageNumbers = context.parameters.includePageNumbers === true;

  const loaded = await loadPdf(file.data);
  const document = loaded.document;
  const totalPages = document.numPages;
  const segments: string[] = [];
  const pageTexts: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      if (context.signal?.aborted) {
        return cancelledResult(warnings, startedAt, bytesIn, pageNumber - 1);
      }

      context.progress?.(
        Math.round((pageNumber / totalPages) * 95),
        `extraindo página ${pageNumber} de ${totalPages}`
      );

      const text = await extractPageText(document, pageNumber);
      pageTexts.push(text);
      const header = includePageNumbers ? `----- Página ${pageNumber} -----` : '';
      segments.push(header ? `${header}\n${text}` : text);
    }

    if (context.signal?.aborted) {
      return cancelledResult(warnings, startedAt, bytesIn, totalPages);
    }

    const joined = segments.join('\n\n');
    const bytes = new TextEncoder().encode(joined);

    if (pageTexts.every((text) => text.trim().length === 0)) {
      warnings.push(
        'Nenhum texto foi encontrado. Se o PDF for digitalizado (imagens), use a ferramenta de OCR.'
      );
      return {
        ok: false,
        outputs: [],
        warnings,
        metrics: {
          durationMs: Date.now() - startedAt,
          bytesIn,
          bytesOut: bytes.byteLength,
          pages: totalPages
        }
      };
    }

    context.progress?.(100, 'concluído');

    return {
      ok: true,
      outputs: [
        {
          name: `${sanitizeOutputBase(file.name) || 'documento'}.txt`,
          mimeType: 'text/plain',
          kind: 'text',
          data: bytes.slice().buffer as ArrayBuffer
        }
      ],
      warnings,
      metrics: {
        durationMs: Date.now() - startedAt,
        bytesIn,
        bytesOut: bytes.byteLength,
        pages: totalPages
      }
    };
  } finally {
    await loaded.destroy();
  }
}

const parametersSchema: JSONSchema = {
  type: 'object',
  properties: {
    includePageNumbers: {
      type: 'boolean',
      title: 'Incluir números de página',
      default: false
    }
  }
};

export const extractTextTool: ToolDefinition = {
  id: 'extract-text',
  version: TOOL_VERSION,
  category: 'texto',
  availability: 'available',
  title: 'Extrair texto do PDF',
  description: 'Extrai o texto de todas as páginas para um arquivo TXT.',
  inputs: [{ kind: 'pdf', accept: ['application/pdf', '.pdf'], multiple: false, minFiles: 1 }],
  outputs: [{ kind: 'text', accept: ['text/plain', '.txt'], multiple: false, minFiles: 1 }],
  runtime: ['BROWSER_NATIVE'],
  parametersSchema,
  validate,
  estimate: () => ({}),
  execute,
  capabilities: { batch: false, cancellable: true, offline: true, workflow: true, preview: true }
};