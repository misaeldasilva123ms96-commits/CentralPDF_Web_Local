import { useMemo } from 'react';
import type { ToolDefinition } from '../core/types';
import { useAppStore } from '../store/app-store';
import { ToolCard } from './ToolCard';
import { Icon } from '../ui/Icon';

interface HomeViewProps {
  tools: ToolDefinition[];
}

export function HomeView({ tools }: HomeViewProps) {
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const favorites = useAppStore((state) => state.favorites);
  const query = searchQuery.trim().toLowerCase();

  const filtered = useMemo(() => {
    const visible = tools.filter((tool) => tool.availability !== 'disabled');
    if (!query) return visible;
    return visible.filter(
      (tool) =>
        tool.title.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.id.includes(query)
    );
  }, [tools, query]);

  const favoriteTools = useMemo(
    () => tools.filter((tool) => favorites.includes(tool.id) && tool.availability !== 'disabled'),
    [tools, favorites]
  );

  return (
    <div className="cp-home">
      <section className="cp-home__hero">
        <div>
          <h1>Todas as ferramentas de PDF em um só lugar</h1>
          <p>Organize, converta e proteja seus documentos com processamento local e privado.</p>
        </div>
        <label className="cp-home__search-wrap">
          <Icon name="search" size={19} />
          <span className="sr-only">Buscar ferramenta</span>
          <input
            type="search"
            className="cp-home__search"
            placeholder="Buscar uma ferramenta"
            value={searchQuery}
            aria-label="Buscar ferramenta"
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
      </section>

      <section className="cp-home__tools" aria-labelledby="tools-title">
        {!query && favoriteTools.length > 0 && (
          <div className="cp-home__favorites">
            <div className="cp-section-heading"><div><h2>Favoritas</h2><p>Suas ferramentas mais usadas.</p></div></div>
            <div className="cp-tool-grid">
              {favoriteTools.map((tool) => <ToolCard key={`favorite-${tool.id}`} tool={tool} />)}
            </div>
          </div>
        )}
        <div className="cp-section-heading">
          <div>
            <h2 id="tools-title">{query ? `Resultados para “${searchQuery}”` : 'Escolha uma ferramenta'}</h2>
            <p>{query ? `${filtered.length} resultado(s) encontrado(s)` : 'Comece em poucos segundos. Seus arquivos não saem do dispositivo.'}</p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="cp-empty-search">
            <Icon name="search" size={26} />
            <h3>Nenhuma ferramenta encontrada</h3>
            <p>Tente buscar por juntar, converter, texto ou proteger.</p>
          </div>
        ) : (
          <div className="cp-tool-grid">
            {filtered.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
          </div>
        )}
      </section>

      <aside className="cp-home__privacy">
        <span><Icon name="lock" size={18} /></span>
        <div><strong>Privacidade por padrão</strong><p>O processamento acontece no navegador, sem envio dos documentos.</p></div>
      </aside>
    </div>
  );
}
