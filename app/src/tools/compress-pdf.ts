import type { JSONSchema, ToolContext, ToolDefinition, ValidationResult } from '../core/types';

const TOOL_VERSION = '0.1.0';

/**
 * Validates the input files and compression quality selection.
 *
 * @param context - Tool context containing the input files and selected parameters
 * @returns The validation status, error messages, and warnings for files without a PDF signature
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

export const compressPdfTool: ToolDefinition = {
  id: 'compress-pdf',
  version: TOOL_VERSION,
  category: 'organizacao',
  availability: 'planned',
  title: 'Comprimir PDF',
  description: 'Reduz o tamanho de um PDF recomprimindo imagens JPEG e otimizando o arquivo (planejado).',
  inputs: [{ kind: 'pdf', accept: ['application/pdf', '.pdf'], multiple: true, minFiles: 1 }],
  outputs: [{ kind: 'pdf', accept: ['application/pdf'], multiple: false, minFiles: 1 }],
  runtime: ['BROWSER_NATIVE'],
  parametersSchema,
  validate,
  estimate: () => ({}),
  execute: async () => {
    throw new Error('Comprimir PDF ainda não está disponível nesta versão.');
  },
  capabilities: { batch: false, cancellable: false, offline: true, workflow: false, preview: false }
};