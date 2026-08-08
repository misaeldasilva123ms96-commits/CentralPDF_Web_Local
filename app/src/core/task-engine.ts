import type { ToolContext, ToolDefinition, ToolResult } from './types';
import type { RuntimeDecision } from './runtime';
import { validateToolRequest } from './tool-validation';

export type TaskStatus = 'queued' | 'running' | 'paused' | 'cancelled' | 'failed' | 'succeeded';

export interface TaskEvent {
  type: 'status' | 'progress' | 'warning';
  timestamp: number;
  status?: TaskStatus;
  percent?: number;
  stage?: string;
  message?: string;
}

export interface TaskRun {
  id: string;
  toolId: string;
  status: TaskStatus;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  percent: number;
  stage: string;
  events: TaskEvent[];
  warnings: string[];
  result?: ToolResult;
  error?: string;
  attempts: number;
  runtime?: RuntimeDecision;
  retryOf?: string;
}

export interface TaskRunOptions {
  inputs: ToolContext['inputs'];
  parameters: Record<string, unknown>;
  runtimeDecision?: RuntimeDecision | null;
  signal?: AbortSignal;
  onUpdate?: (task: TaskRun) => void;
  retryOf?: string;
}

interface ActiveTask {
  task: TaskRun;
  controller: AbortController;
  listener?: (task: TaskRun) => void;
}

const TASK_STATUSES: TaskStatus[] = [
  'queued',
  'running',
  'paused',
  'cancelled',
  'failed',
  'succeeded'
];

const TERMINAL_STATUSES: TaskStatus[] = ['cancelled', 'failed', 'succeeded'];

/**
 * Applies schema defaults to undefined parameters while preserving provided values.
 *
 * @param schema - The parameter schema containing default values
 * @param raw - The input parameter values
 * @returns A copy of the input parameters with applicable defaults applied
 */
export function resolveParameters(
  schema: ToolDefinition['parametersSchema'],
  raw: Record<string, unknown>
): Record<string, unknown> {
  const resolved = { ...raw };
  for (const [key, property] of Object.entries(schema.properties ?? {})) {
    if (resolved[key] === undefined && property.default !== undefined) {
      resolved[key] = property.default;
    }
  }
  return resolved;
}

/**
 * Restricts a percentage value to the range from 0 to 100.
 *
 * @param percent - The percentage value to constrain
 * @returns The constrained percentage value
 */
function clampPercent(percent: number): number {
  return Math.min(100, Math.max(0, percent));
}

/**
 * Creates an independent snapshot of a task run and its mutable collections.
 *
 * @param task - The task run to snapshot
 * @returns A task run with cloned events, warnings, result, outputs, and result warnings
 */
function snapshotTask(task: TaskRun): TaskRun {
  return {
    ...task,
    events: [...task.events],
    warnings: [...task.warnings],
    result: task.result
      ? { ...task.result, outputs: [...task.result.outputs], warnings: [...task.result.warnings] }
      : undefined
  };
}

export class TaskEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskEngineError';
  }
}

export class TaskEngine {
  private readonly history: TaskRun[] = [];
  private readonly activeRuns = new Map<string, ActiveTask>();
  private nextId = 1;

  private createTask(toolId: string): TaskRun {
    const now = Date.now();
    return {
      id: `run_${this.nextId++}`,
      toolId,
      status: 'queued',
      startedAt: now,
      percent: 0,
      stage: 'queued',
      events: [],
      warnings: [],
      error: undefined,
      attempts: 0
    };
  }

  private record(active: ActiveTask, event: TaskEvent): void {
    active.task.events.push(event);
    if (active.listener) {
      active.listener(snapshotTask(active.task));
    }
  }

  private finish(active: ActiveTask, status: TaskStatus): void {
    const task = active.task;
    if (TERMINAL_STATUSES.includes(task.status)) return;
    task.status = status;
    task.endedAt = Date.now();
    task.durationMs = task.endedAt - task.startedAt;
    this.record(active, { type: 'status', timestamp: task.endedAt, status });
    this.activeRuns.delete(task.id);
    this.history.push(task);
  }

  async run(tool: ToolDefinition, options: TaskRunOptions): Promise<TaskRun> {
    const task = this.createTask(tool.id);
    if (options.runtimeDecision) task.runtime = options.runtimeDecision;
    if (options.retryOf) task.retryOf = options.retryOf;
    const controller = new AbortController();
    const externalSignal = options.signal;
    let onExternalAbort: (() => void) | null = null;
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else {
        onExternalAbort = () => controller.abort();
        externalSignal.addEventListener('abort', onExternalAbort);
      }
    }
    const active: ActiveTask = {
      task,
      controller,
      listener: options.onUpdate
    };
    this.activeRuns.set(task.id, active);
    try {
      return await this.runTask(tool, options, active);
    } finally {
      if (externalSignal && onExternalAbort) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
    }
  }

  private async runTask(
    tool: ToolDefinition,
    options: TaskRunOptions,
    active: ActiveTask
  ): Promise<TaskRun> {
    const { task, controller } = active;
    const signal = controller.signal;

    try {
      this.record(active, { type: 'status', timestamp: task.startedAt, status: 'queued' });
      task.status = 'running';
      task.stage = 'validating';
      task.attempts += 1;
      this.record(active, { type: 'status', timestamp: Date.now(), status: 'running' });

      const effectiveParameters = resolveParameters(tool.parametersSchema, options.parameters);

      const context: ToolContext = {
        inputs: options.inputs,
        parameters: effectiveParameters,
        signal,
        progress: (percent, stage) => {
          if (signal.aborted) return;
          task.percent = clampPercent(percent);
          task.stage = stage;
          this.record(active, {
            type: 'progress',
            timestamp: Date.now(),
            percent: task.percent,
            stage
          });
        }
      };

      const request = validateToolRequest({
        tool,
        files: options.inputs,
        parameters: effectiveParameters,
        runtime: options.runtimeDecision ?? null
      });
      const validation = tool.validate(context);
      const warnMessages = [
        ...request.warnings.map((issue) => issue.message),
        ...validation.warnings
      ];

      if (!request.valid || !validation.ok) {
        task.warnings.push(...warnMessages);
        task.error = [...request.errors.map((issue) => issue.message), ...validation.errors].join('; ');
        for (const message of warnMessages) {
          this.record(active, { type: 'warning', timestamp: Date.now(), message });
        }
        this.finish(active, 'failed');
        return task;
      }
      task.warnings.push(...warnMessages);
      for (const message of warnMessages) {
        this.record(active, { type: 'warning', timestamp: Date.now(), message });
      }

      task.stage = 'executing';
      const result = await tool.execute(context);
      if (signal.aborted) {
        this.finish(active, 'cancelled');
        return task;
      }
      task.result = result;
      task.percent = 100;
      task.stage = 'done';
      task.warnings.push(...result.warnings);
      for (const warning of result.warnings) {
        this.record(active, { type: 'warning', timestamp: Date.now(), message: warning });
      }
      if (!result.ok) task.error = 'Falha ao executar a ferramenta';
      this.finish(active, result.ok ? 'succeeded' : 'failed');
      return task;
    } catch (error) {
      if (signal.aborted) {
        this.finish(active, 'cancelled');
        return task;
      }
      task.error = error instanceof Error ? error.message : String(error);
      this.finish(active, 'failed');
      return task;
    }
  }

  retry(
    tool: ToolDefinition,
    options: TaskRunOptions,
    previousRunId: string
  ): Promise<TaskRun> {
    const previous = this.history.find((run) => run.id === previousRunId);
    if (!previous) throw new TaskEngineError(`Execução "${previousRunId}" não encontrada`);
    if (previous.status !== 'failed' && previous.status !== 'cancelled') {
      throw new TaskEngineError(
        `Execução "${previousRunId}" não pode ser repetida (estado ${previous.status})`
      );
    }
    return this.run(tool, { ...options, retryOf: previous.id });
  }

  cancel(taskId: string): boolean {
    const active = this.activeRuns.get(taskId);
    if (!active) return false;
    active.controller.abort();
    return true;
  }

  getHistory(): TaskRun[] {
    return this.history.map(snapshotTask);
  }

  getTask(taskId: string): TaskRun | undefined {
    const active = this.activeRuns.get(taskId);
    if (active) return snapshotTask(active.task);
    const done = this.history.find((run) => run.id === taskId);
    return done ? snapshotTask(done) : undefined;
  }

  isTerminal(status: TaskStatus): boolean {
    return TERMINAL_STATUSES.includes(status);
  }

  statuses(): TaskStatus[] {
    return [...TASK_STATUSES];
  }
}