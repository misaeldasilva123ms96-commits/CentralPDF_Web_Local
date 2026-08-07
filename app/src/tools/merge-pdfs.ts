import { PDFDocument } from 'pdf-lib';
import type { JSONSchema, ToolContext, ToolDefinition, ToolResult, ValidationResult } from '../core/types';

const TOOL_VERSION = '0.1.0';

function validate(context: ToolContext): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (context.inputs.length === 0) {
    errors.push('Selecione pelo menos um arquivo PDF.');
  }

  for (const file of context.inputs) {
    const signature = new Uint8Array(file.data.slice(0, 5));
    const isPdf = String.fromCharCode(...signature) === '%PDF-';
    if (!isPdf) errors.push(`"${file.name}" não parece ser um PDF válido.`);
  }

  const warningLimit = 200;
  if (context.inputs.length > warningLimit) {
    warnings.push(`São muitos arquivos (${context.inputs.length}); verifique a ordenação das miniaturas.`);
  }

  return { ok: errors.length === 0, errors, warnings };
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
      warnings.push(`Não foi possível preservar os metadados do primeiro PDF (${error instanceof Error ? error.message : 'erro desconhecido'}).`);
    }
  }

  let pages = 0;
  const bytesIn = context.inputs.reduce((sum, file) => sum + file.size, 0);
  const startedAt = Date.now();

  for (let index = 0; index < context.inputs.length; index += 1) {
    const file = context.inputs[index];
    context.progress?.(
      Math.round((index / context.inputs.length) * 100),
      `processando ${file.name}`
    );

    let source: PDFDocument;
    try {
      source = await PDFDocument.load(file.data, { ignoreEncryption: true });
    } catch {
      warnings.push(`"${file.name}" não pôde ser lido e foi ignorado.`);
      continue;
    }

    const copied = await merged.copyPages(source, source.getPageIndices());
    pages += copied.length;
    for (const page of copied) {
      merged.addPage(page);
    }
  }

context.progress?.(98, 'gerando arquivo final');
  const bytes = await merged.save();
  const outputName =
    typeof context.parameters.outputName === 'string' && context.parameters.outputName.trim() !== ''
      ? context.parameters.outputName.replace(/\.pdf$/i, '') + '.pdf'
      : 'PDF_unido.pdf';

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
      pages
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
  title: 'Juntar PDFs',
  description: 'Une múltiplos PDFs em um único documento, na ordem das miniaturas.',
  inputs: [{ kind: 'pdf', accept: ['application/pdf', '.pdf'], multiple: true, minFiles: 1 }],
  outputs: [{ kind: 'pdf', accept: ['application/pdf'], multiple: false, minFiles: 1 }],
  runtime: ['BROWSER_NATIVE'],
  parametersSchema,
  validate,
  estimate: () => ({}),
  execute,
  capabilities: { batch: true, cancellable: false, offline: true, workflow: true, preview: true }
};