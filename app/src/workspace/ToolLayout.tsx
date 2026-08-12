import { useEffect, useMemo, useRef, useState } from 'react';
import type { ToolDefinition } from '../core/types';
import { RuntimeRouter, type RuntimeDecision } from '../core/runtime';
import { TaskEngine } from '../core/task-engine';
import { validateToolRequest } from '../core/tool-validation';
import { useAppStore } from '../store/app-store';
import { FileList } from './FileList';
import { SettingsPanel } from './SettingsPanel';
import { ValidationBar } from './ValidationBar';
import { ProgressPanel } from './ProgressPanel';
import { ResultCard } from './ResultCard';
import { ToolSidebar } from './ToolSidebar';
import { Icon } from '../ui/Icon';

interface ToolLayoutProps {
  tool: ToolDefinition;
  runtimeRouter: RuntimeRouter;
  generateFileId?: () => string;
}

export function ToolLayout({ tool, runtimeRouter, generateFileId }: ToolLayoutProps) {
  const files = useAppStore((state) => state.files);
  const task = useAppStore((state) => state.task);
  const setTask = useAppStore((state) => state.setTask);
  const clearWorkspace = useAppStore((state) => state.clearWorkspace);
  const selectTool = useAppStore((state) => state.selectTool);
  const [running, setRunning] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const runIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const engine = useMemo(() => new TaskEngine(), []);
  const parameters = useAppStore((state) => state.parameters);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const activeRunId = runIdRef.current;
      runIdRef.current = null;
      if (activeRunId) engine.cancel(activeRunId);
    };
  }, [engine]);

  const decision = useMemo<RuntimeDecision>(() => runtimeRouter.resolve(tool.runtime), [runtimeRouter, tool]);
  const validation = useMemo(
    () => validateToolRequest({ tool, files, parameters, runtime: decision }),
    [tool, files, parameters, decision]
  );
  const runtimeLabel = decision.available ? String(decision.selected).replace('BROWSER_', '') : 'Indisponível';
  const busy = running || Boolean(task && (task.status === 'queued' || task.status === 'running'));
  const showResult = Boolean(task && (task.status === 'succeeded' || task.status === 'failed' || task.status === 'cancelled'));

  async function startProcessing(): Promise<void> {
    if (files.length === 0 || busy || !validation.valid || tool.availability === 'planned') return;
    setRunning(true);
    setProcessingError(null);
    setTask(null);
    runIdRef.current = null;
    try {
      const run = await engine.run(tool, {
        inputs: files,
        parameters,
        runtimeDecision: decision,
        onUpdate: (next) => {
          if (!mountedRef.current) return;
          if (runIdRef.current === null) runIdRef.current = next.id;
          setTask(next);
        }
      });
      if (!mountedRef.current) return;
      setTask(run);
    } catch (error) {
      if (!mountedRef.current) return;
      const message = error instanceof Error ? error.message : String(error);
      console.error('Falha inesperada ao processar.', error);
      setProcessingError(`Não foi possível iniciar o processamento: ${message}`);
    } finally {
      if (mountedRef.current) setRunning(false);
    }
  }

  function cancelActive(): void {
    const activeRunId = runIdRef.current;
    runIdRef.current = null;
    if (activeRunId) engine.cancel(activeRunId);
    if (!mountedRef.current) return;
    setRunning(false);
  }

  function reprocess(): void {
    clearWorkspace();
  }

  function leaveWorkspace(): void {
    if (files.length > 0 && !window.confirm('Sair da ferramenta e descartar os arquivos carregados?')) return;
    selectTool(null);
  }

  return (
    <div className="cp-tool-layout-wrap">
      <div className="cp-workspace-topbar">
        <button type="button" className="cp-back-button" onClick={leaveWorkspace}>
          <Icon name="arrow-left" size={18} /> Todas as ferramentas
        </button>
        {files.length > 0 && !showResult && (
          <span className="cp-workspace-hint"><Icon name="grid" size={16} /> Arraste para reorganizar. Use os botões para mover pelo teclado.</span>
        )}
      </div>

      {tool.availability === 'experimental' && (
        <div className="cp-experimental" role="note">Ferramenta experimental: confira o resultado antes do uso.</div>
      )}

      <div className="cp-tool-layout">
        <section className="cp-workspace" aria-label="Arquivos">
          {showResult ? (
            <ResultCard
              status={task!.status}
              result={task!.result}
              error={task!.error}
              toolName={tool.title}
              onReprocess={reprocess}
            />
          ) : <FileList contracts={tool.inputs} generateId={generateFileId} disabled={busy} />}
          {task && (task.status === 'queued' || task.status === 'running') && (
            <div className="cp-progress-overlay"><ProgressPanel task={task} onCancel={cancelActive} /></div>
          )}
        </section>

        <ToolSidebar
          title={tool.title}
          description={tool.description.replace(/\s*\(planejado\)\.?$/i, '.')}
          fileCount={files.length}
          settings={<SettingsPanel schema={tool.parametersSchema} />}
          validation={
            <>
              <ValidationBar tool={tool} files={files} parameters={parameters} runtime={decision} />
              {processingError && <div className="cp-validation__error" role="alert">{processingError}</div>}
            </>
          }
          runtimeLabel={runtimeLabel}
          primaryAction={showResult ? null :
            <button
              type="button"
              className="cp-btn cp-btn--primary cp-btn--action"
              disabled={!validation.valid || busy}
              onClick={() => void startProcessing()}
            >
              {busy ? 'Processando…' : tool.title} <Icon name="arrow-right" size={19} />
            </button>
          }
        />
      </div>
    </div>
  );
}
