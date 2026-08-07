import type { ToolContext, ToolDefinition, ToolResult } from './types';

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
}

export interface TaskRunOptions {
  inputs: ToolContext['inputs'];
  parameters: Record<string, unknown>;
  signal?: AbortSignal;
  onUpdate?: (task: TaskRun) => void;
}

const TASK_STATUSES: TaskStatus[] = [
  'queued',
  'running',
  'paused',
  'cancelled',
  'failed',
  'succeeded'
];

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

export class TaskEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskEngineError';
  }
}

export class TaskEngine {
  private readonly history: TaskRun[] = [];
  private nextId = 1;
  private listener?: (task: TaskRun) => void;

  private createTask(toolId: string): TaskRun {
    const now = Date.now();
    const task: TaskRun = {
      id: `run_${this.nextId++}`,
      toolId,
      status: 'queued',
      startedAt: now,
      percent: 0,
      stage: 'queued',
      events: [],
      warnings: [],
      attempts: 0
    };
    return task;
  }

  private record(task: TaskRun, event: TaskEvent): void {
    task.events.push(event);
    if (this.listener) {
      this.listener({ ...task, events: [...task.events], warnings: [...task.warnings] });
    }
  }

  private finish(task: TaskRun, status: TaskStatus): void {
    task.status = status;
    task.endedAt = Date.now();
    task.durationMs = task.endedAt - task.startedAt;
    this.record(task, { type: 'status', timestamp: task.endedAt, status });
    this.history.push(task);
  }

  async run(
    tool: ToolDefinition,
    options: TaskRunOptions
  ): Promise<TaskRun> {
    const task = this.createTask(tool.id);
    const runAbort = options.signal ?? new AbortController().signal;
    this.listener = options.onUpdate;

    try {
      this.record(task, { type: 'status', timestamp: task.startedAt, status: 'queued' });
      task.status = 'running';
      task.attempts += 1;
      task.stage = 'validating';
      this.record(task, { type: 'status', timestamp: Date.now(), status: 'running' });

      const context: ToolContext = {
        inputs: options.inputs,
        parameters: resolveParameters(tool.parametersSchema, options.parameters),
        signal: runAbort,
        progress: (percent, stage) => {
          if (runAbort.aborted) return;
          task.percent = Math.min(100, Math.max(0, percent));
          task.stage = stage;
          this.record(task, { type: 'progress', timestamp: Date.now(), percent: task.percent, stage });
        }
      };

      const validation = tool.validate(context);
      if (!validation.ok) {
        task.warnings.push(...validation.warnings);
        this.finish(task, 'failed');
        task.error = validation.errors.join('; ');
        throw new TaskEngineError(task.error);
      }
      task.warnings.push(...validation.warnings);
      for (const warning of validation.warnings) {
        this.record(task, { type: 'warning', timestamp: Date.now(), message: warning });
      }

      task.stage = 'executing';
      const result = await tool.execute(context);
      if (runAbort.aborted) {
        this.finish(task, 'cancelled');
        return task;
      }
      task.result = result;
      task.percent = 100;
      task.stage = 'done';
      task.warnings.push(...result.warnings);
      for (const warning of result.warnings) {
        this.record(task, { type: 'warning', timestamp: Date.now(), message: warning });
      }
      this.finish(task, result.ok ? 'succeeded' : 'failed');
      if (!result.ok) task.error = 'Falha ao executar a ferramenta';
      return task;
    } catch (error) {
      if (runAbort.aborted) {
        this.finish(task, 'cancelled');
        return task;
      }
      this.finish(task, 'failed');
      task.error = error instanceof Error ? error.message : String(error);
      return task;
    } finally {
      this.listener = undefined;
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
      throw new TaskEngineError(`Execução "${previousRunId}" não pode ser repetida (estado ${previous.status})`);
    }
    return this.run(tool, options);
  }

  cancel(taskId: string): boolean {
    const task = this.history.find((run) => run.id === taskId);
    if (!task) return false;
    if (task.status === 'queued' || task.status === 'running' || task.status === 'paused') {
      this.finish(task, 'cancelled');
      return true;
    }
    return false;
  }

  getHistory(): TaskRun[] {
    return [...this.history];
  }

  getTask(taskId: string): TaskRun | undefined {
    return this.history.find((run) => run.id === taskId);
  }

  isTerminal(status: TaskStatus): boolean {
    return ['cancelled', 'failed', 'succeeded'].includes(status);
  }

  statuses(): TaskStatus[] {
    return [...TASK_STATUSES];
  }
}