import { useMemo, useState } from 'react';
import { useAppStore } from './store/app-store';
import { HomeView } from './home/HomeView';
import { ToolLayout } from './workspace/ToolLayout';
import { RuntimeRouter } from './core/runtime';
import { centralCatalog } from './core/catalog';
import type { ToolDefinition } from './core/types';
import { Icon } from './ui/Icon';

const BUILD_VERSION = '2.0.0-alpha.1';

const PRIMARY_NAV = [
  { label: 'Juntar PDF', toolId: 'merge-pdfs' },
  { label: 'Comprimir PDF', toolId: 'compress-pdf' },
  { label: 'PDF para imagens', toolId: 'pdf-to-images' },
  { label: 'Extrair texto', toolId: 'extract-text' },
  { label: 'Proteger PDF', toolId: 'protect-pdf' }
] as const;

export function App() {
  const activeToolId = useAppStore((state) => state.activeToolId);
  const selectTool = useAppStore((state) => state.selectTool);
  const tools = useMemo(() => centralCatalog.list(), []);
  const runtimeRouter = useMemo(() => new RuntimeRouter(), []);
  const activeTool = tools.find((tool) => tool.id === activeToolId) ?? null;
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function navigate(toolId: string | null) {
    selectTool(toolId);
    setToolsOpen(false);
    setMobileOpen(false);
  }

  return (
    <div className="app-shell" data-testid="app-shell">
      <header className="app-header">
        <button type="button" className="app-brand" onClick={() => navigate(null)} aria-label="CentralPDF 2.0 — início">
          <span className="app-brand-mark" aria-hidden="true"><Icon name="file" size={20} /></span>
          <span>CentralPDF</span>
        </button>

        <nav className={`app-nav${mobileOpen ? ' is-open' : ''}`} aria-label="Ferramentas principais">
          {PRIMARY_NAV.map((item) => (
            <button
              key={item.toolId}
              type="button"
              className={`app-nav__item${activeToolId === item.toolId ? ' is-active' : ''}`}
              aria-label={`Abrir ${item.label} pelo menu`}
              onClick={() => navigate(item.toolId)}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            className={`app-nav__item app-nav__all${toolsOpen ? ' is-active' : ''}`}
            aria-expanded={toolsOpen}
            onClick={() => setToolsOpen((open) => !open)}
          >
            Todas as ferramentas <Icon name="chevron-down" size={15} />
          </button>
        </nav>

        <div className="app-header__actions">
          <div className="app-privacy" title={`CentralPDF ${BUILD_VERSION}`}>
            <span className="status-dot" aria-hidden="true" />
            <span>Local e privado</span>
            <span className="sr-only">Modo local · offline · v{BUILD_VERSION}</span>
          </div>
          <button
            type="button"
            className="app-menu-button"
            aria-label="Abrir menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span /><span /><span />
          </button>
        </div>

        {toolsOpen && (
          <ToolsMenu tools={tools} onSelect={navigate} />
        )}
      </header>

      <main className={`app-main${activeTool ? ' app-main--workspace' : ''}`}>
        {activeTool ? (
          activeTool.availability === 'planned' ? (
            <PlannedView tool={activeTool} />
          ) : (
            <ToolLayout tool={activeTool} runtimeRouter={runtimeRouter} />
          )
        ) : (
          <HomeView tools={tools} />
        )}
      </main>
    </div>
  );
}

function ToolsMenu({ tools, onSelect }: { tools: ToolDefinition[]; onSelect: (toolId: string) => void }) {
  const categories = useMemo(() => {
    const map = new Map<string, ToolDefinition[]>();
    for (const tool of tools.filter((item) => item.availability !== 'disabled')) {
      const category = categoryLabel(tool.category);
      map.set(category, [...(map.get(category) ?? []), tool]);
    }
    return [...map.entries()];
  }, [tools]);

  return (
    <div className="app-tools-menu">
      {categories.map(([category, items]) => (
        <section key={category}>
          <h2>{category}</h2>
          {items.map((tool) => (
            <button type="button" key={tool.id} onClick={() => onSelect(tool.id)}>
              <span>{tool.title}</span>
              <small>{tool.availability === 'planned' ? 'Em breve' : 'Abrir ferramenta'}</small>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}

function categoryLabel(category: ToolDefinition['category']): string {
  const labels: Record<ToolDefinition['category'], string> = {
    organizacao: 'Organizar e otimizar',
    conversao: 'Converter',
    conteudo: 'Conteúdo',
    texto: 'Texto e OCR',
    inteligencia: 'Inteligência',
    seguranca: 'Segurança',
    higiene: 'Reparar'
  };
  return labels[category];
}

function PlannedView({ tool }: { tool: ToolDefinition }) {
  const selectTool = useAppStore((state) => state.selectTool);
  return (
    <section className="planned-view" aria-label={tool.title}>
      <div className="planned-view__icon"><Icon name="file" size={30} /></div>
      <h1>{tool.title}</h1>
      <p>{tool.description}</p>
      <p className="planned-view__status"><strong>Em breve</strong> — esta ferramenta está sendo preparada para funcionar localmente.</p>
      <button type="button" className="cp-btn cp-btn--primary" onClick={() => selectTool(null)}>
        <Icon name="arrow-left" size={18} /> Voltar às ferramentas
      </button>
    </section>
  );
}
