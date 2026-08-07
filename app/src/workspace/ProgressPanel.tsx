import type { TaskRun } from '../core/task-engine';
import { formatDuration } from './format';

interface ProgressPanelProps {
  task: TaskRun;
  onCancel: () => void;
}

const RUNNING: Record<TaskRun['status'], string> = {
  queued: 'Na fila',
  running: 'Processando',
  paused: 'Pausado',
  cancelled: 'Cancelado',
  failed: 'Falhou',
  succeeded: 'Concluído'
};

export function ProgressPanel({ task, onCancel }: ProgressPanelProps) {
  const active = task.status === 'queued' || task.status === 'running' || task.status === 'paused';

  return (
    <div className="cp-progress">
      <div className="cp-progress__bar" role="progressbar" aria-valuenow={task.percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="cp-progress__fill" style={{ width: `${task.percent}%` }} />
      </div>
      <div className="cp-progress__meta">
        <span>
          {RUNNING[task.status]} · {task.stage}
        </span>
        <span>{task.percent}%</span>
      </div>
      <div className="cp-progress__meta">
        <span>Tentativa {task.attempts}</span>
        {task.durationMs !== undefined && <span>{formatDuration(task.durationMs)}</span>}
      </div>
      {active && (
        <button type="button" className="cp-btn cp-btn--small" style={{ marginTop: 'var(--cp-space-2)' }} onClick={onCancel}>
          Cancelar
        </button>
      )}
    </div>
  );
}