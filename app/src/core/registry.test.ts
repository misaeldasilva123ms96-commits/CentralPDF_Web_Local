import { describe, expect, it, beforeEach } from 'vitest';
import { ToolRegistry, RegistryError, toolRegistry } from './registry';
import type { ToolDefinition } from './types';

function makeTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    id: 'merge-pdfs',
    version: '1.0.0',
    category: 'organizacao',
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

  it('rejeita id com formato inválido (maiúsculas e espaços)', () => {
    expect(() => registry.register(makeTool({ id: 'MergePdf' }))).toThrow(/Id de ferramenta inválido/);
    expect(() => registry.register(makeTool({ id: 'merge pdf' }))).toThrow(/Id de ferramenta inválido/);
  });

  it('rejeita ferramenta sem título, versão ou runtime', () => {
    expect(() => registry.register(makeTool({ title: '' }))).toThrow(/sem título/);
    expect(() => registry.register(makeTool({ version: '' }))).toThrow(/sem versão/);
    expect(() => registry.register(makeTool({ runtime: [] }))).toThrow(/sem runtime/);
  });

  it('lista ferramentas ordenadas por id e filtra por categoria', () => {
    registry.register(makeTool({ id: 'b-tool' }));
    registry.register(makeTool({ id: 'a-tool' }));
    registry.register(makeTool({ id: 'c-tool', category: 'seguranca' }));
    const ids = registry.list().map((t) => t.id);
    expect(ids).toEqual(['a-tool', 'b-tool', 'c-tool']);
    expect(registry.listByCategory('seguranca').map((t) => t.id)).toEqual(['c-tool']);
  });

  it('has/clear/count refletem o estado do registro', () => {
    expect(registry.count()).toBe(0);
    registry.register(makeTool());
    expect(registry.has('merge-pdfs')).toBe(true);
    expect(registry.has('nao-existe')).toBe(false);
    registry.clear();
    expect(registry.count()).toBe(0);
  });

  it('get lança RegistryError para id inexistente', () => {
    expect(() => registry.get('ghost')).toThrow(RegistryError);
    expect(() => registry.get('ghost')).toThrow(/não registrada/);
  });
});

describe('singleton toolRegistry', () => {
  it('existe como instância compartilhada e vazia (limpa no carregamento)', () => {
    expect(toolRegistry).toBeInstanceOf(ToolRegistry);
    expect(toolRegistry.count()).toBe(0);
  });
});