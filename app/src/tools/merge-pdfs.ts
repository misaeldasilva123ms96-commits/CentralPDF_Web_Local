import { PDFDocument } from 'pdf-lib';
import type { JSONSchema, ToolContext, ToolDefinition, ToolResult, ValidationResult } from '../core/types';

const TOOL_VERSION = '0.1.0';
const DEFAULT_OUTPUT_NAME = 'PDF_unido.pdf';

function validate(context: ToolContext): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (context.inputs.length === 0) {
    errors.push('Selecione pelo menos um arquivo PDF.');
  } else if (context.inputs.length < 2) {
    errors.push('Envie pelo menos dois PDFs para juntar.');
  }

  const warningLimit = 200;
  if (context.inputs.length > warningLimit) {
    warnings.push(`São muitos arquivos (${context.inputs.length}); confira a ordem de entrada.`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

function sanitizeOutputName(raw: string | undefined): string {
  const candidates: string[] = [];
  if (typeof raw === 'string') candidates.push(raw);
  const trimmed = candidates[0]?.trim();
  if (!trimmed) return DEFAULT_OUTPUT_NAME;
  const sanitized = trimmed
    .replace(/[\\/]/g, '-')
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*\x00-\x1f]/g, '')
    .trim()
    .slice(0, 120);
  const base = sanitized.replace(/\.pdf$/i, '');
  return `${base || 'PDF_unido'}.pdf`;
}

async function execute(context: ToolContext): Promise<ToolResult> {
  const warnings: string[] = [];
  const merged = await PDFDocument.create();

  if (context.parameters.preserveMetadata !== false && context.inputs.length > 0) {
    try {
      const first = await PDFDocument.load(context.inputs[0].data, {
        ignoreEncryption: false,
        updateMetadata: false
      });
      const title = first.getTitle();
      if (title) merged.setTitle(title);
      const author = first.getAuthor();
      if (author) merged.setAuthor(author);
      const subject = first.getSubject();
      if (subject) merged.setSubject(subject);
      const keywords = first.getKeywords();
      if (keywords && keywords.length > 0) merged.setKeywords([keywords]);
    } catch (error) {
      warnings.push(
        `Não foi possível preservar os metadados do primeiro PDF (${error instanceof Error ? error.message : 'erro desconhecido'}).`
      );
    }
  }

  let pages = 0;
  let processed = 0;
  let ignored = 0;
  const bytesIn = context.inputs.reduce((sum, file) => sum + file.size, 0);
  const startedAt = Date.now();

  for (let index = 0; index < context.inputs.length; index += 1) {
    const file = context.inputs[index];
    if (context.signal?.aborted) {
      warnings.push('Junção Cancelado antes de terminar.');
      return {
        ok: false,
        outputs: [],
        warnings,
        metrics: {
          durationMs: Date.now() - startedAt,
          bytesIn,
          bytesOut: 0,
          pages,
          filesProcessed: processed,
          filesIgnored: ignored
        }
      };
    }

    context.progress?.(
      Math.round((index / context.inputs.length) * 90),
      `processando ${file.name}`
    );

    let source: PDFDocument;
    try {
      source = await PDFDocument.load(file.data, { ignoreEncryption: true });
    } catch {
      ignored += 1;
      warnings.push(`"${file.name}" não pôde ser lido e foi ignorado.`);
      continue;
    }

    processed += 1;
    const copied = await merged.copyPages(source, source.getPageIndices());
    pages += copied.length;
    for (const page of copied) {
      merged.addPage(page);
    }
  }

  context.progress?.(98, 'gerando arquivo final');

  if (pages === 0) {
    warnings.push('Nenhum arquivo produziu páginas válidas.');
    return {
      ok: false,
      outputs: [],
      warnings,
      metrics: {
        durationMs: Date.now() - startedAt,
        bytesIn,
        bytesOut: 0,
        pages: 0,
        filesProcessed: processed,
        filesIgnored: ignored
      }
    };
  }

  const bytes = await merged.save();
  try {
    await PDFDocument.load(bytes, { ignoreEncryption: true });
  } catch (error) {
    warnings.push(
      `O PDF final não pôde ser validado (${error instanceof Error ? error.message : 'erro desconhecido'}).`
    );
    return {
      ok: false,
      outputs: [],
      warnings,
      metrics: {
        durationMs: Date.now() - startedAt,
        bytesIn,
        bytesOut: bytes.byteLength,
        pages,
        filesProcessed: processed,
        filesIgnored: ignored
      }
    };
  }

  const outputName =
    context.parameters.outputName !== undefined
      ? sanitizeOutputName(String(context.parameters.outputName))
      : DEFAULT_OUTPUT_NAME;

  context.progress?.(100, 'concluído');

  return {
    ok: true,
    outputs: [
      {
        name: outputName,
        mimeType: 'application/pdf',
        kind: 'pdf',
        data: bytes.slice().buffer as ArrayBuffer
      }
    ],
    warnings,
    metrics: {
      durationMs: Date.now() - startedAt,
      bytesIn,
      bytesOut: bytes.byteLength,
      pages,
      filesProcessed: processed,
      filesIgnored: ignored
    }
  };
}

const parametersSchema: JSONSchema = {
  type: 'object',
  properties: {
    preserveMetadata: {
      type: 'boolean',
      title: 'Preservar metadados do primeiro PDF',
      default: true
    },
    outputName: {
      type: 'string',
      title: 'Nome do arquivo final',
      default: 'PDF_unido'
    }
  }
};

export const mergePdfsTool: ToolDefinition = {
  id: 'merge-pdfs',
  version: TOOL_VERSION,
  category: 'organizacao',
  availability: 'available',
  title: 'Juntar PDFs',
  description: 'Une múltiplos PDFs na ordem em que foram adicionados.',
  inputs: [{ kind: 'pdf', accept: ['application/pdf', '.pdf'], multiple: true, minFiles: 2 }],
  outputs: [{ kind: 'pdf', accept: ['application/pdf'], multiple: false, minFiles: 1 }],
  runtime: ['BROWSER_NATIVE'],
  parametersSchema,
  validate,
  estimate: () => ({}),
  execute,
  capabilities: { batch: true, cancellable: true, offline: true, workflow: true, preview: true }
};