import { useMemo } from 'react';
import type { ToolDefinition } from '../core/types';
import { useAppStore } from '../store/app-store';
import { ToolCard } from './ToolCard';

interface HomeViewProps {
  tools: ToolDefinition[];
}

export function HomeView({ tools }: HomeViewProps) {
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const favorites = useAppStore((state) => state.favorites);

  const query = searchQuery.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!query) return tools;
    return tools.filter(
      (tool) =>
        tool.title.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.id.includes(query)
    );
  }, [tools, query]);

  const favoriteTools = useMemo(
    () => tools.filter((tool) => favorites.includes(tool.id)),
    [tools, favorites]
  );

  return (
    <div className="cp-home">
      <h1 style={{ margin: 'var(--cp-space-4) 0 var(--cp-space-2)' }}>CentralPDF 2.0</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Processamento local, sem envio de documentos.
      </p>

      <label style={{ display: 'block', margin: 'var(--cp-space-6) 0' }}>
        <span className="muted" style={{ fontSize: 'var(--cp-font-size-sm)', display: 'block', marginBottom: 'var(--cp-space-1)' }}>
          Buscar ferramenta (Ctrl+K em breve)
        </span>
        <input
          type="search"
          className="cp-home__search"
          placeholder="Ex.: juntar, dividir, ocr…"
          value={searchQuery}
          aria-label="Buscar ferramenta"
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </label>

      {query && (
        <>
<h2 className="cp-home__section-title">
            Resultados para “{searchQuery}” ({filtered.length})
          </h2>
          {filtered.length === 0 ? (
            <p className="muted">Nenhuma ferramenta encontrada.</p>
          ) : (
            <div className="cp-tool-grid">
              {filtered.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}
        </>
      )}

      {!query && (
        <>
          {favoriteTools.length > 0 && (
            <>
              <h2 className="cp-home__section-title">Favoritas</h2>
              <div className="cp-tool-grid">
                {favoriteTools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </>
          )}
          <h2 className="cp-home__section-title">Todas as ferramentas</h2>
          <div className="cp-tool-grid">
            {filtered.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}