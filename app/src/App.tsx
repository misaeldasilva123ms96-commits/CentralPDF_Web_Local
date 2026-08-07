import { useEffect, useMemo } from 'react';
import { useAppStore } from './store/app-store';
import { HomeView } from './home/HomeView';
import { ToolLayout } from './workspace/ToolLayout';
import { RuntimeRouter } from './core/runtime';
import { demoTools } from './demo-tools';

const BUILD_VERSION = '2.0.0-alpha.1';

export function App() {
  const activeToolId = useAppStore((state) => state.activeToolId);
  const tools = Array.from(useAppStore((state) => state.tools).values());

  useEffect(() => {
    useAppStore.getState().setTools(demoTools);
  }, []);

  const runtimeRouter = useMemo(() => new RuntimeRouter(), []);
  const activeTool = tools.find((tool) => tool.id === activeToolId) ?? null;

  return (
    <div className="app-shell" data-testid="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <span className="app-brand-mark" aria-hidden="true">CP</span>
          <button
            type="button"
            className="cp-btn cp-btn--ghost"
            style={{ fontWeight: 700, fontSize: 'var(--cp-font-size-lg)', padding: 0 }}
            onClick={() => useAppStore.getState().selectTool(null)}
          >
            CentralPDF 2.0
          </button>
        </div>
        <div className="app-header-status">
          <span className="status-dot" aria-hidden="true" />
          <span>Modo local · offline</span>
          <span className="muted">v{BUILD_VERSION}</span>
        </div>
      </header>

      <main className="app-main">
        {activeTool ? (
          <ToolLayout tool={activeTool} runtimeRouter={runtimeRouter} />
        ) : (
          <HomeView tools={tools.length > 0 ? tools : demoTools} />
        )}
      </main>

      <footer className="app-footer">
        CentralPDF 2.0 · processamento local, sem envio de documentos
      </footer>
    </div>
  );
}