import type { JSONSchema, ToolContext, ToolDefinition, ToolResult, ValidationResult } from '../core/types';
import { QpdfUnavailableError, runQpdfJob } from './qpdf-bridge';
import { sanitizeOutputBase } from './pdf-engine';

const TOOL_VERSION = '0.1.0';
const MIN_PASSWORD_LENGTH = 4;
const MAX_PASSWORD_LENGTH = 32;

export interface PdfRestrictions {
  allowPrinting: boolean;
  allowCopying: boolean;
  allowEditing: boolean;
}

const RESTRICTION_FLAGS: Record<keyof PdfRestrictions, string> = {
  allowPrinting: '--print',
  allowCopying: '--extract',
  allowEditing: '--modify'
};

const RESTRICTION_VALUES_FORCE_ALLOWED: Record<keyof PdfRestrictions, string> = {
  allowPrinting: 'full',
  allowCopying: 'y',
  allowEditing: 'all'
};

const RESTRICTION_VALUES_FORCE_DENIED: Record<keyof PdfRestrictions, string> = {
  allowPrinting: 'none',
  allowCopying: 'n',
  allowEditing: 'none'
};

/**
 * Builds qpdf arguments for encrypting a PDF with configured permissions.
 *
 * @param password - The user password required to open the PDF
 * @param ownerPassword - The owner password used to manage PDF permissions
 * @param restrictions - Permissions to allow or deny in the encrypted PDF
 * @returns qpdf encryption arguments
 */
export function buildEncryptArgv(
  password: string,
  ownerPassword: string,
  restrictions: PdfRestrictions
): string[] {
  const args: string[] = [
    '--encrypt',
    '--user-password',
    password,
    '--owner-password',
    ownerPassword,
    '256'
  ];

  for (const key of Object.keys(RESTRICTION_FLAGS) as (keyof PdfRestrictions)[]) {
    args.push(RESTRICTION_FLAGS[key]);
    args.push(restrictions[key] ? RESTRICTION_VALUES_FORCE_ALLOWED[key] : RESTRICTION_VALUES_FORCE_DENIED[key]);
  }

  return args;
}

/**
 * Resolves the owner password, using the user password when the provided value is empty or unavailable.
 *
 * @param password - The user password used as the fallback.
 * @param ownerPasswordValue - The optional owner password value.
 * @returns The trimmed owner password or the user password when no owner password is provided.
 */
export function resolveOwnerPassword(password: string, ownerPasswordValue: unknown): string {
  return String(ownerPasswordValue ?? '').trim() || password;
}

/**
 * Validates the selected PDF input and password settings.
 *
 * @param context - The tool context containing inputs and password parameters
 * @returns Validation status with any errors and warnings
 */
function validate(context: ToolContext): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (context.inputs.length === 0) {
    errors.push('Selecione um arquivo PDF.');
  } else if (context.inputs.length > 1) {
    errors.push('Proteja um PDF por vez.');
  } else {
    const file = context.inputs[0];
    const signature = String.fromCharCode(...new Uint8Array(file.data.slice(0, 8)));
    if (!signature.startsWith('%PDF-')) {
      warnings.push(`"${file.name}" não parece ser um PDF válido.`);
    }
  }

  const password = String(context.parameters.password ?? '');
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  } else if (password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`A senha pode ter no máximo ${MAX_PASSWORD_LENGTH} caracteres.`);
  }
  if (password.startsWith('-') || String(context.parameters.ownerPassword ?? '').startsWith('-')) {
    errors.push('As senhas não podem começar com "-".');
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Creates a failed result for a cancelled PDF protection operation.
 *
 * @param warnings - Warnings collected before cancellation
 * @param startedAt - Timestamp when the operation started
 * @param bytesIn - Number of input bytes processed
 * @returns A failed result with a cancellation warning and zero output bytes
 */
function cancelledResult(
  warnings: string[],
  startedAt: number,
  bytesIn: number
): ToolResult {
  return {
    ok: false,
    outputs: [],
    warnings: [...warnings, 'Proteção cancelada antes de terminar.'],
    metrics: {
      durationMs: Date.now() - startedAt,
      bytesIn,
      bytesOut: 0
    }
  };
}

/**
 * Protects a PDF with password-based encryption and configured permissions.
 *
 * @returns The protection result containing the encrypted PDF and processing metrics, or warnings and metrics when protection fails.
 */
async function execute(context: ToolContext): Promise<ToolResult> {
  const file = context.inputs[0];
  const bytesIn = file.size;
  const startedAt = Date.now();
  const warnings: string[] = [];

  const password = String(context.parameters.password ?? '');
  const ownerPassword = resolveOwnerPassword(password, context.parameters.ownerPassword);
  const restrictions: PdfRestrictions = {
    allowPrinting: context.parameters.allowPrinting === true,
    allowCopying: context.parameters.allowCopying === true,
    allowEditing: context.parameters.allowEditing === true
  };

  try {
    const argv = buildEncryptArgv(password, ownerPassword, restrictions);
    context.progress?.(10, 'iniciando protetor');

    const result = await runQpdfJob(
      {
        input: file.data,
        fileTitle: 'entrada',
        argv
      },
      context.signal
    );

    context.progress?.(100, 'concluído');

    return {
      ok: true,
      outputs: [
        {
          name: `${sanitizeOutputBase(file.name) || 'documento'}_protegido.pdf`,
          mimeType: 'application/pdf',
          kind: 'pdf',
          data: result.output
        }
      ],
      warnings,
      metrics: {
        durationMs: Date.now() - startedAt,
        bytesIn,
        bytesOut: result.output.byteLength
      }
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return cancelledResult(warnings, startedAt, bytesIn);
    }
    if (error instanceof QpdfUnavailableError) {
      warnings.push(error.message);
      return {
        ok: false,
        outputs: [],
        warnings,
        metrics: {
          durationMs: Date.now() - startedAt,
          bytesIn,
          bytesOut: 0
        }
      };
    }
    warnings.push(
      `Não foi possível proteger o PDF (${error instanceof Error ? error.message : 'erro desconhecido'}).`
    );
    return {
      ok: false,
      outputs: [],
      warnings,
      metrics: {
        durationMs: Date.now() - startedAt,
        bytesIn,
        bytesOut: 0
      }
    };
  }
}

const parametersSchema: JSONSchema = {
  type: 'object',
  properties: {
    password: {
      type: 'string',
      title: 'Senha de abertura',
      default: ''
    },
    ownerPassword: {
      type: 'string',
      title: 'Senha de administrador (opcional)',
      default: ''
    },
    allowPrinting: {
      type: 'boolean',
      title: 'Permitir impressão',
      default: false
    },
    allowCopying: {
      type: 'boolean',
      title: 'Permitir copiar texto',
      default: false
    },
    allowEditing: {
      type: 'boolean',
      title: 'Permitir edição',
      default: false
    }
  },
  required: ['password']
};

export const protectPdfTool: ToolDefinition = {
  id: 'protect-pdf',
  version: TOOL_VERSION,
  category: 'seguranca',
  availability: 'available',
  title: 'Proteger PDF',
  description: 'Adiciona senha de abertura e restrições de uso ao PDF.',
  inputs: [{ kind: 'pdf', accept: ['application/pdf', '.pdf'], multiple: false, minFiles: 1 }],
  outputs: [{ kind: 'pdf', accept: ['application/pdf'], multiple: false, minFiles: 1 }],
  runtime: ['BROWSER_WASM'],
  parametersSchema,
  validate,
  estimate: () => ({}),
  execute,
  capabilities: { batch: false, cancellable: true, offline: true, workflow: true, preview: false }
};