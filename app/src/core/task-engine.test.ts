import { describe, expect, it } from 'vitest';
import { TaskEngine, TaskEngineError, resolveParameters } from './task-engine';
import type { ToolDefinition } from './types';

const pdfInput = {
  id: 'file-1',
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
    availability: 'available',
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

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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
  it('1. executa ferramenta com sucesso e registra histórico uma única vez', async () => {
    const engine = new TaskEngine();
    const run = await engine.run(makeTool(), options());
    expect(run.status).toBe('succeeded');
    expect(run.percent).toBe(100);
    expect(run.result?.ok).toBe(true);
    expect(engine.getHistory()).toHaveLength(1);
    expect(engine.getHistory().filter((item) => item.id === run.id)).toHaveLength(1);
  });

  it('2. falha quando validate rejeita a entrada', async () => {
    const engine = new TaskEngine();
    const tool = makeTool({
      validate: () => ({ ok: false, errors: ['Precisa de pelo menos 2 PDFs'], warnings: [] })
    });
    const run = await engine.run(tool, options());
    expect(run.status).toBe('failed');
    expect(run.error).toMatch(/2 PDFs/);
    expect(run.endedAt).toBeDefined();
  });

  it('3. falha quando execute lança erro e preserva a mensagem', async () => {
    const engine = new TaskEngine();
    const tool = makeTool({ execute: async () => { throw new Error('OOM'); } });
    const run = await engine.run(tool, options());
    expect(run.status).toBe('failed');
    expect(run.error).toBe('OOM');
  });

  it('4. resultado com ok:false marca a tarefa como falha', async () => {
    const engine = new TaskEngine();
    const tool = makeTool({
      execute: async () => ({ ok: false, outputs: [], warnings: ['sem páginas válidas'] })
    });
    const run = await engine.run(tool, options());
    expect(run.status).toBe('failed');
    expect(run.error).toMatch(/Falha ao executar/);
  });

  it('5. cancelamento com AbortSignal durante uma execução demorada', async () => {
    const engine = new TaskEngine();
    const controller = new AbortController();
    const tool = makeTool({
      execute: async (ctx) => {
        ctx.signal?.addEventListener('abort', () => undefined);
        for (let i = 0; i < 50; i += 1) {
          if (ctx.signal?.aborted) break;
          await sleep(5);
        }
        return { ok: true, outputs: [], warnings: ['parcial'] };
      }
    });
    const promise = engine.run(tool, { ...options(), signal: controller.signal });
    setTimeout(() => controller.abort(), 20);
    const run = await promise;
    expect(run.status).toBe('cancelled');
    expect(run.result).toBeUndefined();
  });

  it('6. cancel por id durante a execução interrompe a tarefa ativa', async () => {
    const engine = new TaskEngine();
    let aborted = false;
    const tool = makeTool({
      execute: async (ctx) => {
        ctx.signal?.addEventListener('abort', () => {
          aborted = true;
        });
        for (let i = 0; i < 100; i += 1) {
          if (ctx.signal?.aborted) break;
          await sleep(5);
        }
        return { ok: true, outputs: [], warnings: [] };
      }
    });
    let runId = '';
    const promise = engine.run(tool, {
      ...options(),
      onUpdate: (task) => {
        runId = task.id;
      }
    });
    await sleep(30);
    expect(runId).not.toBe('');
    expect(aborted).toBe(false);
    expect(engine.cancel(runId)).toBe(true);
    const run = await promise;
    expect(run.status).toBe('cancelled');
    expect(aborted).toBe(true);
    expect(engine.cancel(run.id)).toBe(false);
  });

  it('7. cancel de id inexistente retorna false', async () => {
    const engine = new TaskEngine();
    expect(engine.cancel('ghost')).toBe(false);
  });

  it('8. cancel de tarefa já concluída retorna false', async () => {
    const engine = new TaskEngine();
    const run = await engine.run(makeTool(), options());
    expect(run.status).toBe('succeeded');
    expect(engine.cancel(run.id)).toBe(false);
  });

  it('9. histórico não possui duplicidades após várias execuções', async () => {
    const engine = new TaskEngine();
    for (let i = 0; i < 5; i += 1) {
      await engine.run(makeTool(), options());
    }
    const history = engine.getHistory();
    const ids = history.map((run) => run.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('10. cada tarefa possui exatamente um evento de status terminal', async () => {
    const engine = new TaskEngine();
    const tool = makeTool({ execute: async () => { throw new Error('boom'); } });
    const run = await engine.run(tool, options());
    const terminals = run.events.filter((event) =>
      event.type === 'status' && ['succeeded', 'failed', 'cancelled'].includes(event.status ?? '')
    );
    expect(terminals).toHaveLength(1);
    expect(run.status).toBe('failed');
  });

  it('11. erro aparece no snapshot terminal entregue ao listener', async () => {
    const engine = new TaskEngine();
    const snapshots: Array<{ status: string; error?: string }> = [];
    const tool = makeTool({ execute: async () => { throw new Error('explodiu'); } });
    await engine.run(tool, { ...options(), onUpdate: (next) => snapshots.push(next) });
    const terminal = snapshots.find((s) => ['failed', 'cancelled', 'succeeded'].includes(s.status));
    expect(terminal?.status).toBe('failed');
    expect(terminal?.error).toBe('explodiu');
  });

  it('12. duas tarefas concorrentes executam e finalizam de forma independente', async () => {
    const engine = new TaskEngine();
    const slow = makeTool({
      id: 'merge-pdfs',
      execute: async () => {
        await sleep(40);
        return { ok: true, outputs: [], warnings: [] };
      }
    });
    const fast = makeTool({
      id: 'merge-pdfs',
      execute: async () => {
        await sleep(5);
        return { ok: true, outputs: [], warnings: [] };
      }
    });
    const [a, b] = await Promise.all([engine.run(slow, options()), engine.run(fast, options())]);
    expect(a.status).toBe('succeeded');
    expect(b.status).toBe('succeeded');
    expect(a.id).not.toBe(b.id);
    expect(engine.getHistory()).toHaveLength(2);
  });

  it('13/14. listeners de execuções concorrentes ficam isolados', async () => {
    const engine = new TaskEngine();
    const seenA: number[] = [];
    const seenB: number[] = [];
    const toolA = makeTool({
      execute: async (ctx) => {
        ctx.progress?.(1, 'ida');
        await sleep(10);
        return { ok: true, outputs: [], warnings: [] };
      }
    });
    const toolB = makeTool({
      execute: async (ctx) => {
        ctx.progress?.(1, 'volta');
        await sleep(1);
        return { ok: true, outputs: [], warnings: [] };
      }
    });
    const [a, b] = await Promise.all([
      engine.run(toolA, { ...options(), onUpdate: (t) => seenA.push(t.percent) }),
      engine.run(toolB, { ...options(), onUpdate: (t) => seenB.push(t.percent) })
    ]);
    expect(a.id).not.toBe(b.id);
    // o listener da primeira não recebeu eventos quando a segunda finalizou
    expect(seenA.filter((p) => p === 100)).toHaveLength(1);
    expect(seenB.filter((p) => p === 100)).toHaveLength(1);
    expect(seenB.every((p) => p <= 100)).toBe(true);
  });

  it('15. retry de tarefa com falha gera nova execução vinculada', async () => {
    const engine = new TaskEngine();
    let calls = 0;
    const tool = makeTool({
      execute: async () => {
        calls += 1;
        if (calls === 1) throw new Error('primeira falha');
        return { ok: true, outputs: [], warnings: [] };
      }
    });
    const first = await engine.run(tool, options());
    expect(first.status).toBe('failed');
    const second = await engine.retry(tool, options(), first.id);
    expect(second.status).toBe('succeeded');
    expect(second.retryOf).toBe(first.id);
    expect(engine.getHistory()).toHaveLength(2);
  });

  it('16. retry é permitido depois de cancelamento', async () => {
    const engine = new TaskEngine();
    const tool = makeTool({
      execute: async (ctx) => {
        for (let i = 0; i < 100; i += 1) {
          if (ctx.signal?.aborted) break;
          await sleep(5);
        }
        return { ok: true, outputs: [], warnings: [] };
      }
    });
    const cancelled1 = await engine.run(tool, { ...options(), signal: abortedSignal() });
    const cancelled2 = await engine.run(tool, { ...options(), signal: abortedSignal() });
    const retried = await engine.retry(tool, options(), cancelled2.id);
    expect(cancelled1.status).toBe('cancelled');
    expect(cancelled2.status).toBe('cancelled');
    expect(retried.status).toBe('succeeded');
    expect(retried.retryOf).toBe(cancelled2.id);
  });

  it('17. retry rejeita execução inexistente ou concluída em sucesso', async () => {
    const engine = new TaskEngine();
    expect(() => engine.retry(makeTool(), options(), 'ghost')).toThrow(TaskEngineError);
    const ok = await engine.run(makeTool(), options());
    expect(() => engine.retry(makeTool(), options(), ok.id)).toThrow(/não pode ser repetida/);
  });

  it('18. consulta de tarefa ativa durante execução', async () => {
    const engine = new TaskEngine();
    const tool = makeTool({
      execute: async () => {
        await sleep(30);
        return { ok: true, outputs: [], warnings: [] };
      }
    });
    let runId = '';
    const promise = engine.run(tool, {
      ...options(),
      onUpdate: (task) => {
        runId = task.id;
      }
    });
    expect(runId).not.toBe('');
    const mid = engine.getTask(runId);
    expect(mid).toBeDefined();
    expect(['queued', 'running']).toContain(mid?.status);
    await promise;
    const final = engine.getTask(runId);
    expect(final?.status).toBe('succeeded');
  });

  it('19. consulta de tarefa concluída após o fim', async () => {
    const engine = new TaskEngine();
    const run = await engine.run(makeTool(), options());
    const later = engine.getTask(run.id);
    expect(later?.status).toBe('succeeded');
    expect(later?.result).toBeDefined();
  });

  it('20. progresso é limitado ao intervalo 0–100', async () => {
    const engine = new TaskEngine();
    const tool = makeTool({
      execute: async (ctx) => {
        ctx.progress?.(-50, 'baixo');
        ctx.progress?.(1250, 'alto');
        ctx.progress?.(40, 'meio');
        return { ok: true, outputs: [], warnings: [] };
      }
    });
    const run = await engine.run(tool, options());
    const progresses = run.events.filter((e) => e.type === 'progress');
    expect(progresses).toHaveLength(3);
    for (const event of progresses) {
      expect(event.percent ?? -1).toBeGreaterThanOrEqual(0);
      expect(event.percent ?? 101).toBeLessThanOrEqual(100);
    }
  });

  it('registra a decisão de runtime na execução', async () => {
    const engine = new TaskEngine();
    const run = await engine.run(makeTool(), {
      ...options(),
      runtimeDecision: { selected: 'BROWSER_NATIVE', available: true, reason: 'preferred', supported: ['BROWSER_NATIVE'] }
    });
    expect(run.runtime?.selected).toBe('BROWSER_NATIVE');
    expect(run.runtime?.available).toBe(true);
  });
});

it('não executa quando a validação central bloqueia (planejada)', async () => {
  const engine = new TaskEngine();
  const tool = { ...makeTool(), availability: 'planned' as const };
  const run = await engine.run(tool, options());
  expect(run.status).toBe('failed');
  expect(run.result).toBeUndefined();
  expect(run.error).toContain('ainda não está disponível');
  expect(engine.getHistory()).toHaveLength(1);
});

it('não executa quando o runtime está indisponível', async () => {
  const engine = new TaskEngine();
  const run = await engine.run(makeTool(), {
    ...options(),
    runtimeDecision: { selected: null, available: false, reason: 'unavailable', supported: ['BROWSER_NATIVE'] }
  });
  expect(run.status).toBe('failed');
  expect(run.result).toBeUndefined();
  expect(engine.getHistory()).toHaveLength(1);
});

it('aplica defaults do schema antes da validação central', async () => {
  const engine = new TaskEngine();
  const seen: string[] = [];
  const tool = makeTool({
    parametersSchema: {
      type: 'object',
      properties: { qualidade: { type: 'string', enum: ['alta', 'baixa'], default: 'alta' } },
      required: ['qualidade']
    },
    execute: async (ctx) => {
      seen.push(String(ctx.parameters.qualidade));
      return { ok: true, outputs: [], warnings: [] };
    }
  });
  const run = await engine.run(tool, options());
  expect(run.status).toBe('succeeded');
  expect(seen).toEqual(['alta']);
});

it('falha de validação central não registra a tarefa duas vezes no histórico', async () => {
  const engine = new TaskEngine();
  const tool = makeTool({
    validate: () => ({ ok: false, errors: ['rejeitado'], warnings: [] })
  });
  const run = await engine.run(tool, options());
  expect(run.status).toBe('failed');
  expect(engine.getHistory().filter((item) => item.id === run.id)).toHaveLength(1);
});

it('cancel(taskId) aborta uma tarefa ativa cooperativa', async () => {
  const engine = new TaskEngine();
  let capturedId = '';
  const tool = makeTool({
    execute: async (ctx) => {
      ctx.progress?.(10, 'inicio');
      await sleep(60);
      if (ctx.signal?.aborted) return { ok: false, outputs: [], warnings: ['cancelado'] };
      return { ok: true, outputs: [], warnings: [] };
    }
  });
  const promise = engine.run(tool, {
    ...options(),
    onUpdate: (next) => {
      capturedId = next.id;
    }
  });
  await sleep(15);
  expect(capturedId).toMatch(/^run_/);
  expect(engine.cancel(capturedId)).toBe(true);
  const run = await promise;
  expect(run.status).toBe('cancelled');
  expect(run.result?.outputs ?? []).toHaveLength(0);
  expect(engine.getHistory().filter((item) => item.id === run.id)).toHaveLength(1);
});

it('cancel(taskId) retorna false para tarefa inexistente ou já finalizada', async () => {
  const engine = new TaskEngine();
  expect(engine.cancel('run_inexistente')).toBe(false);
  const run = await engine.run(makeTool(), options());
  expect(engine.cancel(run.id)).toBe(false);
});

it('execuções concorrentes mantêm listeners isolados', async () => {
  const engine = new TaskEngine();
  const seenA: string[] = [];
  const seenB: string[] = [];
  const slow = (id: string) =>
    makeTool({
      id,
      execute: async (ctx) => {
        ctx.progress?.(5, 'inicio');
        await sleep(20);
        ctx.progress?.(50, 'meio');
        return { ok: true, outputs: [], warnings: [] };
      }
    });
  const runA = engine.run(slow('tool-a'), { ...options(), onUpdate: (next) => seenA.push(next.id) });
  const runB = engine.run(slow('tool-b'), { ...options(), onUpdate: (next) => seenB.push(next.id) });
  const [a, b] = await Promise.all([runA, runB]);
  expect(a.status).toBe('succeeded');
  expect(b.status).toBe('succeeded');
  expect(seenA.length).toBeGreaterThan(0);
  expect(seenB.length).toBeGreaterThan(0);
  expect(seenA.every((id) => id === a.id)).toBe(true);
  expect(seenB.every((id) => id === b.id)).toBe(true);
  expect(engine.getHistory()).toHaveLength(2);
});

function abortedSignal(): AbortSignal {
  const controller = new AbortController();
  controller.abort();
  return controller.signal;
}