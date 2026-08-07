import { useMemo, useRef, useState } from 'react';
import type { ToolDefinition } from '../core/types';
import { RuntimeRouter } from '../core/runtime';
import { TaskEngine } from '../core/task-engine';
import { useAppStore, type WorkspaceStep } from '../store/app-store';
import { FileList } from './FileList';
import { SettingsPanel } from './SettingsPanel';
import { ValidationBar } from './ValidationBar';
import { ProgressPanel } from './ProgressPanel';
import { ResultCard } from './ResultCard';

interface ToolLayoutProps {
  tool: ToolDefinition;
  runtimeRouter: RuntimeRouter;
}

const FLOW_STEPS: { id: WorkspaceStep; label: string }[] = [
  { id: 'select', label: 'Selecionar' },
  { id: 'preview', label: 'Pré-visualizar' },
  { id: 'configure', label: 'Configurar' },
  { id: 'validate', label: 'Validar' },
  { id: 'process', label: 'Processar' },
  { id: 'review', label: 'Revisar' },
  { id: 'download', label: 'Baixar' }
];

export function ToolLayout({ tool, runtimeRouter }: ToolLayoutProps) {
  const files = useAppStore((state) => state.files);
  const task = useAppStore((state) => state.task);
  const currentStep = useAppStore((state) => state.currentStep);
  const setStep = useAppStore((state) => state.setStep);
  const setTask = useAppStore((state) => state.setTask);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const engine = useMemo(() => new TaskEngine(), []);

  const decision = useMemo(() => runtimeRouter.resolve(tool.runtime), [runtimeRouter, tool]);

  const runtimeLabel =
    decision.reason === 'unavailable' ? 'Indisponível' : decision.mode.replace('_', ' ');

  const stepIndex = FLOW_STEPS.findIndex((step) => step.id === currentStep);
  const busy = running || Boolean(task && (task.status === 'queued' || task.status === 'running'));

  async function process(): Promise<void> {
    if (files.length === 0 || busy) return;
    setRunning(true);
    setStep('process');
    const controller = new AbortController();
    abortRef.current = controller;
    setTask(null);
    const run = await engine.run(tool, {
      inputs: files,
      parameters: useAppStore.getState().parameters,
      signal: controller.signal,
      onUpdate: (next) => setTask(next)
    });
    setTask(run);
    setRunning(false);
    if (run.status === 'succeeded') setStep('review');
    else if (run.status === 'failed') setStep('validate');
    else setStep('configure');
  }

  function cancelActive(): void {
    abortRef.current?.abort();
    abortRef.current = null;
    setRunning(false);
    setStep('configure');
    const current = useAppStore.getState().task;
    if (current && (current.status === 'queued' || current.status === 'running')) {
      engine.cancel(current.id);
    }
  }

  return (
    <div className="cp-tool-layout-wrap">
      <div className="cp-flow" data-testid="flow-bar" role="list" aria-label="Etapas do fluxo">
        {FLOW_STEPS.map((step, index) => (
          <span
            key={step.id}
            role="listitem"
            className={`cp-flow__step${index === stepIndex ? ' is-active' : ''}${index < stepIndex ? ' is-done' : ''}`}
          >
            {index > 0 && <span className="cp-flow__arrow" aria-hidden="true">→</span>}
            {step.label}
          </span>
        ))}
      </div>

      <div className="cp-tool-layout">
        <section className="cp-panel cp-card" aria-label="Arquivos">
          <div className="cp-panel__title">Arquivos</div>
          <FileList contracts={tool.inputs} />
        </section>

        <section className="cp-panel cp-card" aria-label="Visualização">
          <div className="cp-panel__title">Visualização</div>
          <div className="cp-panel__body">
            <p className="muted">Miniaturas das páginas chegam com as ferramentas piloto (Fase 3).</p>
            {task && task.status !== 'succeeded' && (
              <ProgressPanel task={task} onCancel={cancelActive} />
            )}
            {task?.result && (
              <ResultCard
                result={task.result}
                toolName={tool.title}
                onContinue={() => undefined}
              />
            )}
          </div>
        </section>

        <section className="cp-panel cp-card" aria-label="Configurações">
          <div className="cp-panel__title">Configurações</div>
          <SettingsPanel schema={tool.parametersSchema} />
          <div className="cp-panel__body" style={{ paddingTop: 0 }}>
            <ValidationBar
              files={files}
              contracts={tool.inputs}
              schema={tool.parametersSchema}
              runtime={decision}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cp-space-2)', marginTop: 'var(--cp-space-3)' }}>
              <span className="muted" style={{ fontSize: 'var(--cp-font-size-sm)' }}>
                Motor: {runtimeLabel} · Modo local
              </span>
              <button
                type="button"
                className="cp-btn cp-btn--primary"
                disabled={files.length === 0 || decision.reason === 'unavailable' || busy}
                onClick={() => void process()}
              >
                {busy ? 'Processando…' : tool.title}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}