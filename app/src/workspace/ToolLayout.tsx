import { useMemo, useRef, useState } from 'react';
import type { ToolDefinition } from '../core/types';
import { RuntimeRouter, type RuntimeDecision } from '../core/runtime';
import { TaskEngine } from '../core/task-engine';
import { validateToolRequest } from '../core/tool-validation';
import { useAppStore, type WorkspaceStep } from '../store/app-store';
import { FileList } from './FileList';
import { SettingsPanel } from './SettingsPanel';
import { ValidationBar } from './ValidationBar';
import { ProgressPanel } from './ProgressPanel';
import { ResultCard } from './ResultCard';

interface ToolLayoutProps {
  tool: ToolDefinition;
  runtimeRouter: RuntimeRouter;
  generateFileId?: () => string;
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

/**
 * Renders the file-processing workflow for a tool, including configuration, validation, progress, and results.
 *
 * @param tool - The tool definition and its workflow configuration
 * @param runtimeRouter - Router used to resolve the tool's execution runtime
 * @param generateFileId - Optional function for generating identifiers for selected files
 */
export function ToolLayout({ tool, runtimeRouter, generateFileId }: ToolLayoutProps) {
  const files = useAppStore((state) => state.files);
  const task = useAppStore((state) => state.task);
  const currentStep = useAppStore((state) => state.currentStep);
  const setStep = useAppStore((state) => state.setStep);
  const setTask = useAppStore((state) => state.setTask);
  const [running, setRunning] = useState(false);
  const runIdRef = useRef<string | null>(null);
  const engine = useMemo(() => new TaskEngine(), []);
  const parameters = useAppStore((state) => state.parameters);

  const decision = useMemo<RuntimeDecision>(
    () => runtimeRouter.resolve(tool.runtime),
    [runtimeRouter, tool]
  );

  const validation = useMemo(
    () =>
      validateToolRequest({
        tool,
        files,
        parameters,
        runtime: decision
      }),
    [tool, files, parameters, decision]
  );

  const runtimeLabel = decision.available ? String(decision.selected) : 'Indisponível';
  const stepIndex = FLOW_STEPS.findIndex((step) => step.id === currentStep);
  const busy = running || Boolean(task && (task.status === 'queued' || task.status === 'running'));

  async function startReproduction(): Promise<void> {
    if (files.length === 0 || busy || !validation.valid || tool.availability === 'planned') return;
    setRunning(true);
    setStep('process');
    setTask(null);
    runIdRef.current = null;
    const run = await engine.run(tool, {
      inputs: files,
      parameters,
      runtimeDecision: decision,
      onUpdate: (next) => {
        if (runIdRef.current === null) runIdRef.current = next.id;
        setTask(next);
      }
    });
    setTask(run);
    setRunning(false);
    if (run.status === 'succeeded') setStep('review');
    else if (run.status === 'failed') setStep('validate');
  }

  function cancelActive(): void {
    if (runIdRef.current) {
      engine.cancel(runIdRef.current);
      runIdRef.current = null;
    }
    setRunning(false);
    setStep('configure');
  }

  function reprocess(): void {
    setTask(null);
    setStep('select');
  }

  return (
    <div className="cp-tool-layout-wrap">
      {tool.availability === 'experimental' && (
        <div className="cp-experimental" role="note">
          Ferramenta experimental: o resultado deve ser conferido antes do uso.
        </div>
      )}
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
          <FileList contracts={tool.inputs} generateId={generateFileId} disabled={busy} />
        </section>

        <section className="cp-panel cp-card" aria-label="Visualização">
          <div className="cp-panel__title">Visualização</div>
          <div className="cp-panel__body">
            {task && (task.status === 'queued' || task.status === 'running') && (
              <ProgressPanel task={task} onCancel={cancelActive} />
            )}
            {task?.result && task.status === 'succeeded' && (
              <ResultCard
                status={task.status}
                result={task.result}
                toolName={tool.title}
                onReprocess={reprocess}
              />
            )}
            {task && (task.status === 'failed' || task.status === 'cancelled') && (
              <ResultCard
                status={task.status}
                error={task.error}
                toolName={tool.title}
                onReprocess={reprocess}
              />
            )}
            {!task && (
              <p className="muted">
                O resultado aparece aqui após o processamento (prévia das páginas chega na Fase 3).
              </p>
            )}
          </div>
        </section>

        <section className="cp-panel cp-card" aria-label="Configurações">
          <div className="cp-panel__title">Configurações</div>
          <SettingsPanel schema={tool.parametersSchema} />
          <div className="cp-panel__body" style={{ paddingTop: 0 }}>
            <ValidationBar
              tool={tool}
              files={files}
              parameters={parameters}
              runtime={decision}
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--cp-space-2)',
                marginTop: 'var(--cp-space-3)'
              }}
            >
              <span className="muted" style={{ fontSize: 'var(--cp-font-size-sm)' }}>
                Motor: {runtimeLabel} · Modo local
              </span>
              <button
                type="button"
                className="cp-btn cp-btn--primary"
                disabled={!validation.valid || busy}
                onClick={() => void startReproduction()}
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