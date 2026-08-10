import { useMemo } from 'react';
import { useAppStore } from './store/app-store';
import { HomeView } from './home/HomeView';
import { ToolLayout } from './workspace/ToolLayout';
import { RuntimeRouter } from './core/runtime';
import { centralCatalog } from './core/catalog';

const BUILD_VERSION = '2.0.0-alpha.2';

/**
 * Renders the CentralPDF application shell and the view for the currently selected tool.
 */
export function App() {
  const activeToolId = useAppStore((state) => state.activeToolId);
  const tools = useMemo(() => centralCatalog.list(), []);

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
          activeTool.availability === 'planned' ? (
            <PlannedView title={activeTool.title} description={activeTool.description} />
          ) : (
            <ToolLayout tool={activeTool} runtimeRouter={runtimeRouter} />
          )
        ) : (
          <HomeView tools={tools} />
        )}
      </main>

      <footer className="app-footer">
        CentralPDF 2.0 · processamento local, sem envio de documentos
      </footer>
    </div>
  );
}

/**
 * Displays a planned tool's details and provides navigation back to the catalog.
 *
 * @param title - The tool title displayed in the panel.
 * @param description - The tool description displayed beneath its availability status.
 */
function PlannedView({ title, description }: { title: string; description: string }) {
  const selectTool = useAppStore((state) => state.selectTool);
  return (
    <section className="cp-panel cp-card" aria-label={title}>
      <div className="cp-panel__title">{title}</div>
      <div className="cp-panel__body">
        <p className="cp-validation__warning">Em breve — esta ferramenta ainda não executa.</p>
        <p className="muted">{description}</p>
        <button
          type="button"
          className="cp-btn"
          onClick={() => selectTool(null)}
        >
          Voltar para o catálogo
        </button>
      </div>
    </section>
  );
}