import { describe, expect, it } from 'vitest';
import { TaskEngine, TaskEngineError, resolveParameters } from './task-engine';
import type { ToolDefinition } from './types';

const pdfInput = {
  name: 'doc.pdf',
  size: 1024,
  mimeType: 'application/pdf',
  data: new ArrayBuffer(1024)
};

function makeTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    id: 'merge-pdfs',
    version: '1.0.0',
    category: 'organizacao',
    title: 'Juntar PDFs',
    description: 'Une múltiplos PDFs.',
    inputs: [{ kind: 'pdf', accept: ['application/pdf'], multiple: true, minFiles: 1 }],
    outputs: [{ kind: 'pdf', accept: ['application/pdf'], multiple: false, minFiles: 1 }],
    runtime: ['BROWSER_NATIVE'],
    parametersSchema: { type: 'object', properties: {} },
    validate: () => ({ ok: true, errors: [], warnings: [] }),
    estimate: () => ({}),
    execute: async () => ({
      ok: true,
      outputs: [{ name: 'merged.pdf', mimeType: 'application/pdf', data: new ArrayBuffer(2048), kind: 'pdf' }],
      warnings: []
    }),
    capabilities: { batch: true, cancellable: false, offline: true, workflow: true, preview: true },
    ...overrides
  };
}

const options = () => ({ inputs: [pdfInput], parameters: {} });

describe('resolveParameters', () => {
  it('aplica os defaults do schema aos parâmetros ausentes', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        preserveMetadata: { type: 'boolean' as const, default: true },
        label: { type: 'string' as const, default: 'x' }
      }
    };
    const resolved = resolveParameters(schema, { label: 'custom' });
    expect(resolved.preserveMetadata).toBe(true);
    expect(resolved.label).toBe('custom');
  });

  it('não sobrescreve valores fornecidos nem cria chaves sem default', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        quality: { type: 'string' as const, default: 'high' },
        senha: { type: 'string' as const }
      }
    };
    const resolved = resolveParameters(schema, { quality: 'auto' });
    expect(resolved.quality).toBe('auto');
    expect(resolved.senha).toBeUndefined();
  });
});

describe('TaskEngine', () => {
  it('executa ferramenta com sucesso e registra histórico', async () => {
    const engine = new TaskEngine();
    const run = await engine.run(makeTool(), options());
    expect(run.status).toBe('succeeded');
    expect(run.percent).toBe(100);
    expect(run.result?.ok).toBe(true);
    expect(run.attempts).toBe(1);
    expect(engine.getHistory()).toHaveLength(1);
    expect(engine.getHistory()[0].id).toBe(run.id);
    expect(engine.getTask(run.id)).toBe(run);
  });

  it('falha quando validate rejeita a entrada', async () => {
    const engine = new TaskEngine();
    const tool = makeTool({
      validate: () => ({ ok: false, errors: ['Precisa de pelo menos 2 PDFs'], warnings: [] })
    });
    const run = await engine.run(tool, options());
    expect(run.status).toBe('failed');
    expect(run.error).toMatch(/2 PDFs/);
    expect(run.endedAt).toBeDefined();
    expect(run.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('falha quando execute lança erro e preserva a mensagem', async () => {
    const engine = new TaskEngine();
    const tool = makeTool({ execute: async () => { throw new Error('OOM'); } });
    const run = await engine.run(tool, options());
    expect(run.status).toBe('failed');
    expect(run.error).toBe('OOM');
  });

  it('registra progresso e estágios via progress callback', async () => {
    const engine = new TaskEngine();
    const tool = makeTool({
      execute: async (ctx) => {
        ctx.progress?.(10, 'parsing');
        ctx.progress?.(70, 'merging');
        return { ok: true, outputs: [], warnings: [] };
      }
    });
    const run = await engine.run(tool, options());
    const progressEvents = run.events.filter((e) => e.type === 'progress');
    expect(progressEvents.map((e) => [e.percent, e.stage])).toEqual([
      [10, 'parsing'],
      [70, 'merging']
    ]);
    expect(run.percent).toBe(100);
  });

  it('cancela com AbortSignal durante a execução', async () => {
    const engine = new TaskEngine();
    const controller = new AbortController();
    const tool = makeTool({
      execute: async (ctx) => {
        ctx.signal?.addEventListener('abort', () => undefined);
        await new Promise((resolve) => setTimeout(resolve, 60));
        return { ok: true, outputs: [], warnings: [] };
      }
    });
    const promise = engine.run(tool, { ...options(), signal: controller.signal });
    setTimeout(() => controller.abort(), 10);
    const run = await promise;
    expect(run.status).toBe('cancelled');
    expect(engine.isTerminal(run.status)).toBe(true);
  });

  it('retry repete execução falhada e gera nova execução', async () => {
    const engine = new TaskEngine();
    let calls = 0;
    const tool = makeTool({
      execute: async () => {
        calls += 1;
        if (calls === 1) throw new Error('tentativa 1 falhou');
        return { ok: true, outputs: [], warnings: [] };
      }
    });
    const first = await engine.run(tool, options());
    expect(first.status).toBe('failed');
    const second = await engine.retry(tool, options(), first.id);
    expect(second.status).toBe('succeeded');
    expect(calls).toBe(2);
    expect(second.attempts).toBe(1);
    expect(engine.getHistory()).toHaveLength(2);
  });

it('retry rejeita execução inexistente ou já concluída em sucesso', async () => {
    const engine = new TaskEngine();
    expect(() => engine.retry(makeTool(), options(), 'ghost')).toThrow(TaskEngineError);
    expect(() => engine.retry(makeTool(), options(), 'ghost')).toThrow(/não encontrada/);
    const ok = await engine.run(makeTool(), options());
    expect(() => engine.retry(makeTool(), options(), ok.id)).toThrow(/não pode ser repetida/);
  });

  it('cancel() por id interrompe apenas execuções ativas/em fila', async () => {
    const engine = new TaskEngine();
    const ok = await engine.run(makeTool(), options());
    expect(engine.cancel(ok.id)).toBe(false); // já terminou
    expect(engine.cancel('ghost')).toBe(false);
    expect(engine.isTerminal('queued')).toBe(false);
    expect(engine.isTerminal('running')).toBe(false);
    expect(engine.isTerminal('succeeded')).toBe(true);
  });

  it('statuses retorna a lista fixa de estados', () => {
    const engine = new TaskEngine();
    expect(engine.statuses()).toEqual([
      'queued', 'running', 'paused', 'cancelled', 'failed', 'succeeded'
    ]);
  });
});