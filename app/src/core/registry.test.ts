import { describe, expect, it, beforeEach } from 'vitest';
import { ToolRegistry, RegistryError, toolRegistry } from './registry';
import type { ToolDefinition } from './types';

function makeTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    id: 'merge-pdfs',
    version: '1.0.0',
    category: 'organizacao',
    availability: 'available',
    title: 'Juntar PDFs',
    description: 'Une múltiplos PDFs em um único documento.',
    inputs: [{ kind: 'pdf', accept: ['application/pdf'], multiple: true, minFiles: 2 }],
    outputs: [{ kind: 'pdf', accept: ['application/pdf'], multiple: false, minFiles: 1 }],
    runtime: ['BROWSER_NATIVE'],
    parametersSchema: { type: 'object', properties: { preserveMetadata: { type: 'boolean', default: true } } },
    validate: () => ({ ok: true, errors: [], warnings: [] }),
    estimate: () => ({}),
    execute: async () => ({ ok: true, outputs: [], warnings: [] }),
    capabilities: { batch: true, cancellable: false, offline: true, workflow: true, preview: true },
    ...overrides
  };
}

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it('registra e recupera ferramenta pelo id', () => {
    registry.register(makeTool());
    expect(registry.has('merge-pdfs')).toBe(true);
    expect(registry.get('merge-pdfs').title).toBe('Juntar PDFs');
  });

  it('rejeita registro duplicado do mesmo id', () => {
    registry.register(makeTool());
    expect(() => registry.register(makeTool())).toThrow(RegistryError);
    expect(() => registry.register(makeTool())).toThrow(/já registrada/);
  });

  it('rejeita id vazio ou com formato inválido', () => {
    expect(() => registry.register(makeTool({ id: '' }))).toThrow(/Id de ferramenta inválido/);
    expect(() => registry.register(makeTool({ id: 'MergePdf' }))).toThrow(/Id de ferramenta inválido/);
    expect(() => registry.register(makeTool({ id: 'merge pdf' }))).toThrow(/Id de ferramenta inválido/);
  });

  it('rejeita versão inválida', () => {
    expect(() => registry.register(makeTool({ version: 'demo' }))).toThrow(/versão inválida/);
    expect(() => registry.register(makeTool({ version: '1.' }))).toThrow(/versão inválida/);
  });

  it('rejeita ferramenta sem título, runtime ou estado de disponibilidade', () => {
    expect(() => registry.register(makeTool({ title: '' }))).toThrow(/sem título/);
    expect(() => registry.register(makeTool({ runtime: [] }))).toThrow(/sem runtime/);
    expect(() => registry.register(makeTool({ availability: 'alpha' as never }))).toThrow(/disponibilidade/);
  });

  it('rejeita contrato de entrada/saída inválido', () => {
    expect(() => registry.register(makeTool({ inputs: [] }))).toThrow(/contrato de entrada/);
    expect(() =>
      registry.register(makeTool({ outputs: [] }))
    ).toThrow(/contrato de saída/);
  });

  it('rejeita capacidades ausentes ou com tipos errados', () => {
    expect(() => registry.register(makeTool({ capabilities: undefined as never }))).toThrow(/capacidades/);
    expect(() =>
      registry.register(makeTool({ capabilities: { ...makeTool().capabilities, batch: 'sim' as never } }))
    ).toThrow(/capacidades/);
  });

  it('lista ferramentas ordenadas por id e filtra por categoria e disponibilidade', () => {
    registry.register(makeTool({ id: 'b-tool' }));
    registry.register(makeTool({ id: 'a-tool' }));
    registry.register(makeTool({ id: 'c-tool', category: 'seguranca' }));
    registry.register(makeTool({ id: 'd-tool', availability: 'planned' }));
    expect(registry.list().map((t) => t.id)).toEqual(['a-tool', 'b-tool', 'c-tool', 'd-tool']);
    expect(registry.listByCategory('seguranca').map((t) => t.id)).toEqual(['c-tool']);
    expect(registry.listByAvailability('planned').map((t) => t.id)).toEqual(['d-tool']);
  });

  it('has/clear/count refletem o estado do registro', () => {
    expect(registry.count()).toBe(0);
    registry.register(makeTool());
    expect(registry.has('merge-pdfs')).toBe(true);
    registry.clear();
    expect(registry.count()).toBe(0);
  });

  it('get lança RegistryError para id inexistente', () => {
    expect(() => registry.get('ghost')).toThrow(RegistryError);
    expect(() => registry.get('ghost')).toThrow(/não registrada/);
  });

  it('aprova múltiplos contratos de entrada e saída válidos', () => {
    const tool = makeTool({
      inputs: [
        { kind: 'pdf', accept: ['application/pdf', '.pdf'], multiple: true, minFiles: 1 },
        { kind: 'image', accept: ['image/png', '.png'], multiple: true, minFiles: 0 }
      ],
      outputs: [
        { kind: 'pdf', accept: ['application/pdf'], multiple: false, minFiles: 1 },
        { kind: 'image', accept: ['image/png', '.png'], multiple: true, minFiles: 1 }
      ]
    });
    expect(() => registry.register(tool)).not.toThrow();
    expect(registry.count()).toBe(1);
  });

  it('rejeita segundo contrato de entrada inválido', () => {
    const tool = makeTool({
      inputs: [
        { kind: 'pdf', accept: ['application/pdf'], multiple: true, minFiles: 1 },
        { kind: 'unknown-kind' as never, accept: [], multiple: true, minFiles: 0 }
      ]
    });
    expect(() => registry.register(tool)).toThrow(/contrato de entrada/);
  });

  it('rejeita terceiro contrato de entrada inválido', () => {
    const tool = makeTool({
      inputs: [
        { kind: 'pdf', accept: ['application/pdf'], multiple: true, minFiles: 1 },
        { kind: 'image', accept: ['image/png'], multiple: true, minFiles: 0 },
        { kind: 'pdf', accept: ['application/pdf'], multiple: true, minFiles: -1 }
      ]
    });
    expect(() => registry.register(tool)).toThrow(/contrato de entrada/);
  });

  it('rejeita segundo contrato de saída inválido', () => {
    const tool = makeTool({
      outputs: [
        { kind: 'pdf', accept: ['application/pdf'], multiple: false, minFiles: 1 },
        { kind: 'pdf', accept: ['application/pdf'], multiple: false, minFiles: 1, maxFiles: 0 }
      ]
    });
    expect(() => registry.register(tool)).toThrow(/contrato de saída/);
  });

  it('rejeita runtime vazio', () => {
    expect(() => registry.register(makeTool({ runtime: [] }))).toThrow(/sem runtime/);
  });

  it('rejeita runtime fora da allowlist', () => {
    expect(() => registry.register(makeTool({ runtime: ['BROWSER_FFMPEG'] as never }))).toThrow(
      /runtime inválido/
    );
    expect(() => registry.register(makeTool({ runtime: ['BROWSER_NATIVE', 'NODE' ] as never }))).toThrow(
      /runtime inválido/
    );
  });

  it('aprova runtime dentro da allowlist', () => {
    expect(() =>
      registry.register(makeTool({ runtime: ['BROWSER_NATIVE', 'BROWSER_WASM'] }))
    ).not.toThrow();
  });

  it('rejeita ferramenta sem validate', () => {
    expect(() => registry.register(makeTool({ validate: undefined as never }))).toThrow(
      /validate\/estimate\/execute/
    );
  });

  it('rejeita ferramenta sem execute', () => {
    expect(() => registry.register(makeTool({ execute: undefined as never }))).toThrow(
      /validate\/estimate\/execute/
    );
  });

  it('registra ferramenta com múltiplos contratos de entrada', () => {
    expect(() =>
      registry.register(
        makeTool({
          inputs: [
            { kind: 'pdf', accept: ['application/pdf'], multiple: true, minFiles: 1 },
            { kind: 'image', accept: ['image/png'], multiple: false, minFiles: 0 }
          ]
        })
      )
    ).not.toThrow();
    expect(registry.count()).toBe(1);
  });

  it('faz rollback do estado quando um contrato posterior é inválido', () => {
    registry.register(makeTool({ id: 'merge-pdfs' }));
    expect(() =>
      registry.register(
        makeTool({
          inputs: [
            { kind: 'pdf', accept: ['application/pdf'], multiple: true, minFiles: 1 },
            { kind: 'arquivo-invalido', accept: ['application/pdf'], multiple: false, minFiles: 0 } as never
          ]
        })
      )
    ).toThrow(RegistryError);
    expect(registry.count()).toBe(1);
    expect(registry.has('merge-pdfs')).toBe(true);
  });
});

describe('singleton toolRegistry', () => {
  it('existe como instância compartilhada e vazia (limpa no carregamento)', () => {
    expect(toolRegistry).toBeInstanceOf(ToolRegistry);
    expect(toolRegistry.count()).toBe(0);
  });
});