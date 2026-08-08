import type { JSONSchema, ToolContext, ToolDefinition, ToolResult, ValidationResult } from '../core/types';
import { loadPdf, RasterizerUnavailableError, rasterizePage, sanitizeOutputBase } from './pdf-engine';

const TOOL_VERSION = '0.1.0';
const DEFAULT_SCALE = 1.5;
const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const MAX_PAGES = 100;

function validate(context: ToolContext): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (context.inputs.length === 0) {
    errors.push('Selecione um arquivo PDF.');
  } else if (context.inputs.length > 1) {
    errors.push('Converta um PDF por vez.');
  } else {
    const file = context.inputs[0];
    const signature = String.fromCharCode(...new Uint8Array(file.data.slice(0, 8)));
    if (!signature.startsWith('%PDF-')) {
      warnings.push(`"${file.name}" não parece ser um PDF válido.`);
    }
  }

  const scale = Number(context.parameters.scale ?? DEFAULT_SCALE);
  if (Number.isNaN(scale) || scale < MIN_SCALE || scale > MAX_SCALE) {
    errors.push(`A escala deve ficar entre ${MIN_SCALE} e ${MAX_SCALE}.`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

function cancelledResult(
  warnings: string[],
  startedAt: number,
  bytesIn: number,
  pageNumber: number
): ToolResult {
  return {
    ok: false,
    outputs: [],
    warnings: [...warnings, 'Conversão cancelada antes de terminar.'],
    metrics: {
      durationMs: Date.now() - startedAt,
      bytesIn,
      bytesOut: 0,
      pages: pageNumber
    }
  };
}

async function execute(context: ToolContext): Promise<ToolResult> {
  const file = context.inputs[0];
  const bytesIn = file.size;
  const startedAt = Date.now();
  const warnings: string[] = [];
  const scale = Number(context.parameters.scale ?? DEFAULT_SCALE);
  const base = sanitizeOutputBase(file.name) || 'pagina';

  const loaded = await loadPdf(file.data);
  const document = loaded.document;
  const totalPages = document.numPages;
  const pageCeiling = Math.min(totalPages, MAX_PAGES);
  const outputs: ToolResult['outputs'] = [];
  let bytesOut = 0;
  let hasRasterSupport = true;

  if (totalPages > MAX_PAGES) {
    warnings.push(
      `O arquivo tem ${totalPages} páginas; a conversão foi limitada às ${MAX_PAGES} primeiras.`
    );
  }

  try {
    for (let pageNumber = 1; pageNumber <= pageCeiling; pageNumber += 1) {
      if (context.signal?.aborted) {
        return cancelledResult(warnings, startedAt, bytesIn, pageNumber - 1);
      }

      context.progress?.(
        Math.round((pageNumber / totalPages) * 90),
        `convertendo página ${pageNumber} de ${totalPages}`
      );

      try {
        const png = await rasterizePage(document, { pageNumber, scale });
        bytesOut += png.byteLength;
        outputs.push({
          name: `${base}-pagina-${String(pageNumber).padStart(2, '0')}.png`,
          mimeType: 'image/png',
          kind: 'image',
          data: png.slice().buffer as ArrayBuffer
        });
      } catch (error) {
        if (error instanceof RasterizerUnavailableError) {
          hasRasterSupport = false;
          warnings.push(
            'Não foi possível rasterizar as páginas: esta operação requer um navegador com suporte a canvas.'
          );
          break;
        }
        warnings.push(
          `A página ${pageNumber} não pôde ser convertida (${error instanceof Error ? error.message : 'erro desconhecido'}).`
        );
      }
    }
  } finally {
    await loaded.destroy();
  }

  if (context.signal?.aborted) {
    return cancelledResult(warnings, startedAt, bytesIn, outputs.length);
  }

  context.progress?.(100, 'concluído');

  if (outputs.length === 0 && !hasRasterSupport) {
    return {
      ok: false,
      outputs: [],
      warnings,
      metrics: {
        durationMs: Date.now() - startedAt,
        bytesIn,
        bytesOut: 0,
        pages: 0
      }
    };
  }

  if (outputs.length === 0) {
    warnings.push('Nenhuma página pôde ser convertida em imagem.');
    return {
      ok: false,
      outputs: [],
      warnings,
      metrics: {
        durationMs: Date.now() - startedAt,
        bytesIn,
        bytesOut: 0,
        pages: totalPages
      }
    };
  }

  return {
    ok: true,
    outputs,
    warnings,
    metrics: {
      durationMs: Date.now() - startedAt,
      bytesIn,
      bytesOut,
      pages: outputs.length
    }
  };
}

const parametersSchema: JSONSchema = {
  type: 'object',
  properties: {
    scale: {
      type: 'number',
      title: 'Escala de renderização (maior = mais nitidez)',
      default: DEFAULT_SCALE,
      minimum: MIN_SCALE,
      maximum: MAX_SCALE
    }
  }
};

export const pdfToImagesTool: ToolDefinition = {
  id: 'pdf-to-images',
  version: TOOL_VERSION,
  category: 'conversao',
  availability: 'available',
  title: 'PDF para imagens',
  description: 'Converte cada página do PDF em imagens PNG no navegador.',
  inputs: [{ kind: 'pdf', accept: ['application/pdf', '.pdf'], multiple: false, minFiles: 1 }],
  outputs: [{ kind: 'image', accept: ['image/png', '.png'], multiple: true, minFiles: 1 }],
  runtime: ['BROWSER_NATIVE'],
  parametersSchema,
  validate,
  estimate: () => ({}),
  execute,
  capabilities: { batch: false, cancellable: true, offline: true, workflow: true, preview: true }
};