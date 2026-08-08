import type { ToolDefinition } from '../core/types';
import { useAppStore } from '../store/app-store';

interface ToolCardProps {
  tool: ToolDefinition;
}

const AVAILABILITY_LABEL: Record<ToolDefinition['availability'], string> = {
  available: 'Disponível',
  experimental: 'Experimental',
  planned: 'Em breve',
  disabled: 'Desabilitada'
};

export function ToolCard({ tool }: ToolCardProps) {
  const selectTool = useAppStore((state) => state.selectTool);
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const favorite = favorites.includes(tool.id);
  const planned = tool.availability === 'planned';

  if (tool.availability === 'disabled') return null;

  return (
    <article className="cp-tool-card">
      <button
        type="button"
        className={`cp-fav-btn${favorite ? ' is-active' : ''}`}
        aria-label={favorite ? `Remover ${tool.title} dos favoritos` : `Adicionar ${tool.title} aos favoritos`}
        aria-pressed={favorite}
        onClick={(event) => {
          event.stopPropagation();
          toggleFavorite(tool.id);
        }}
      >
        {favorite ? '★' : '☆'}
      </button>
      <button
        type="button"
        className="cp-tool-body"
        style={{ border: 'none', background: 'transparent', textAlign: 'left', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 'var(--cp-space-2)', flex: 1 }}
        aria-label={tool.title}
        onClick={() => selectTool(tool.id)}
      >
        <span className="cp-tool-card__title">{tool.title}</span>
        <span className="cp-tool-card__desc">{tool.description}</span>
      </button>
      <div className="cp-tool-card__badges">
        <span className={`cp-badge${planned ? ' cp-badge--planned' : ''}`}>
          {AVAILABILITY_LABEL[tool.availability]}
        </span>
        {tool.capabilities.offline && <span className="cp-badge cp-badge--neutral">offline</span>}
      </div>
    </article>
  );
}