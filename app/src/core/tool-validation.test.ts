import { describe, expect, it } from 'vitest';
import { validateToolRequest, type ValidationIssue } from './tool-validation';
import type { RuntimeDecision } from './runtime';
import type { FileInput, ToolDefinition } from './types';

function makeFile(id: string, name: string, size = 100, mimeType = 'application/pdf', data?: ArrayBuffer): FileInput {
  return { id, name, size, mimeType, data: data ?? new ArrayBuffer(size) };
}

function makeTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    id: 'merge-pdfs',
    version: '1.0.0',
    category: 'organizacao',
    availability: 'available',
    title: 'Juntar PDFs',
    description: 'Une múltiplos PDFs.',
    inputs: [{ kind: 'pdf', accept: ['application/pdf'], multiple: true, minFiles: 2, maxFiles: 5 }],
    outputs: [{ kind: 'pdf', accept: ['application/pdf'], multiple: false, minFiles: 1 }],
    runtime: ['BROWSER_NATIVE'],
    parametersSchema: {
      type: 'object',
      properties: {
        qualidade: { type: 'string', enum: ['alta', 'baixa'], default: 'alta' },
        margem: { type: 'number' },
        preservar: { type: 'boolean' }
      },
      required: ['preservar']
    },
    validate: () => ({ ok: true, errors: [], warnings: [] }),
    estimate: () => ({}),
    execute: async () => ({ ok: true, outputs: [], warnings: [] }),
    capabilities: { batch: true, cancellable: false, offline: true, workflow: true, preview: true },
    ...overrides
  };
}

const runtime: RuntimeDecision = {
  selected: 'BROWSER_NATIVE',
  available: true,
  reason: 'preferred',
  supported: ['BROWSER_NATIVE']
};

function call(files: FileInput[], parameters: Record<string, unknown> = {}, tool = makeTool(), rt: RuntimeDecision | null = runtime) {
  return validateToolRequest({ tool, files, parameters, runtime: rt });
}

function errorsOf(result: ReturnType<typeof validateToolRequest>): string[] {
  return result.errors.map((issue: ValidationIssue) => `${issue.code}: ${issue.message}`);
}

function warningsOf(result: ReturnType<typeof validateToolRequest>): string[] {
  return result.warnings.map((issue: ValidationIssue) => `${issue.code}: ${issue.message}`);
}

describe('validateToolRequest', () => {
  it('aceita uma requisição válida', () => {
    const result = call(
      [makeFile('1', 'a.pdf', 10, 'application/pdf', new TextEncoder().encode('%PDF-1.4').buffer),
       makeFile('2', 'b.pdf', 10, 'application/pdf', new TextEncoder().encode('%PDF-1.4').buffer)],
      { preservar: true }
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('erro quando não há arquivos', () => {
    const result = call([], {});
    expect(result.valid).toBe(false);
    expect(errorsOf(result).some((e) => e.includes('min_files'))).toBe(true);
  });

  it('erro abaixo do mínimo de arquivos', () => {
    const result = call([makeFile('1', 'a.pdf')], {});
    expect(result.valid).toBe(false);
    expect(errorsOf(result).some((e) => e.includes('min_files'))).toBe(true);
  });

  it('erro acima do máximo de arquivos', () => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, index) => makeFile(id, `f${index}.pdf`));
    const result = call(files, {});
    expect(result.valid).toBe(false);
    expect(errorsOf(result).some((e) => e.includes('max_files'))).toBe(true);
  });

  it('erro quando ferramenta de arquivo único recebe múltiplos', () => {
    const tool = makeTool({
      inputs: [{ kind: 'pdf', accept: ['application/pdf'], multiple: false, minFiles: 1 }]
    });
    const result = call([makeFile('1', 'a.pdf'), makeFile('2', 'b.pdf')], {}, tool);
    expect(result.valid).toBe(false);
    expect(errorsOf(result).some((e) => e.includes('ultiple'))).toBe(true);
  });

  it('erro para MIME inválido', () => {
    const result = call([makeFile('1', 'a.txt', 10, 'text/plain')], {});
    expect(result.valid).toBe(false);
    expect(errorsOf(result).some((e) => e.includes('file_type'))).toBe(true);
  });

  it('erro para extensão inválida', () => {
    const result = call([makeFile('1', 'a.txt', 10, 'application/pdf')], {});
    expect(result.valid).toBe(false);
    expect(errorsOf(result).some((e) => e.includes('file_type'))).toBe(true);
  });

  it('aviso para assinatura inválida sem bloquear', () => {
    const result = call(
      [makeFile('1', 'a.pdf', 10, 'application/pdf', new TextEncoder().encode('hello').buffer),
       makeFile('2', 'b.pdf', 10, 'application/pdf', new TextEncoder().encode('%PDF-1.5').buffer)],
      { preservar: true }
    );
    expect(result.valid).toBe(true);
    expect(warningsOf(result).some((e) => e.includes('bad_signature'))).toBe(true);
  });

  it('erro para arquivo vazio (zero bytes)', () => {
    const result = call([makeFile('1', 'a.pdf', 0), makeFile('2', 'b.pdf', 10)], {});
    expect(result.valid).toBe(false);
    expect(errorsOf(result).some((e) => e.includes('empty_file'))).toBe(true);
  });

  it('erro para arquivo sem nome', () => {
    const blank = makeFile('1', '   ');
    const result = call([blank, makeFile('2', 'b.pdf')], {});
    expect(result.valid).toBe(false);
    expect(errorsOf(result).some((e) => e.includes('empty_name'))).toBe(true);
  });

  it('erro para parâmetro obrigatório ausente', () => {
    const result = call(
      [makeFile('1', 'a.pdf'), makeFile('2', 'b.pdf')],
      {}
    );
    expect(result.valid).toBe(false);
    expect(errorsOf(result).some((e) => e.includes('missing_parameter'))).toBe(true);
  });

  it('erro para valor fora do enum', () => {
    const result = call(
      [makeFile('1', 'a.pdf'), makeFile('2', 'b.pdf')],
      { preservar: true, qualidade: 'extremo' }
    );
    expect(result.valid).toBe(false);
    expect(errorsOf(result).some((e) => e.includes('invalid_enum'))).toBe(true);
  });

  it('erro para tipo básico inválido', () => {
    const result = call(
      [makeFile('1', 'a.pdf'), makeFile('2', 'b.pdf')],
      { preservar: true, margem: 'grande' }
    );
    expect(result.valid).toBe(false);
    expect(errorsOf(result).some((e) => e.includes('invalid_type'))).toBe(true);
  });

  it('erro quando o runtime está indisponível', () => {
    const result = call(
      [makeFile('1', 'a.pdf'), makeFile('2', 'b.pdf')],
      {},
      makeTool(),
      { selected: null, available: false, reason: 'unavailable', supported: ['BROWSER_NATIVE'] }
    );
    expect(result.valid).toBe(false);
    expect(errorsOf(result).some((e) => e.includes('runtime_unavailable'))).toBe(true);
  });

  it('erro para ferramenta planejada', () => {
    const tool = makeTool({ availability: 'planned' });
    const result = call([makeFile('1', 'a.pdf')], {}, tool);
    expect(result.valid).toBe(false);
    expect(errorsOf(result).some((e) => e.includes('tool_planned'))).toBe(true);
  });

  it('erro para ferramenta desabilitada', () => {
    const tool = makeTool({ availability: 'disabled' });
    const result = call([makeFile('1', 'a.pdf')], {}, tool);
    expect(result.valid).toBe(false);
    expect(errorsOf(result).some((e) => e.includes('tool_disabled'))).toBe(true);
  });

  it('avisa (sem bloquear) para ferramenta experimental', () => {
    const tool = makeTool({ availability: 'experimental' });
    const result = call(
      [makeFile('1', 'a.pdf'), makeFile('2', 'b.pdf')],
      { preservar: true },
      tool
    );
    expect(result.valid).toBe(true);
    expect(warningsOf(result).some((e) => e.includes('experimental'))).toBe(true);
  });
});