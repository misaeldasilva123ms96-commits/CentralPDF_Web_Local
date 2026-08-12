import type { ToolDefinition } from '../core/types';
import { useAppStore } from '../store/app-store';
import { Icon, type IconName } from '../ui/Icon';

interface ToolCardProps { tool: ToolDefinition; }

const TOOL_ICONS: Record<string, IconName> = {
  'merge-pdfs': 'merge',
  'compress-pdf': 'compress',
  'extract-text': 'text',
  'pdf-to-images': 'image',
  'protect-pdf': 'lock',
  'ocr-pdf': 'search'
};

export function ToolCard({ tool }: ToolCardProps) {
  const selectTool = useAppStore((state) => state.selectTool);
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const planned = tool.availability === 'planned';
  const favorite = favorites.includes(tool.id);

  if (tool.availability === 'disabled') return null;

  return (
    <article className={`cp-tool-card${planned ? ' is-planned' : ''}`}>
      <button
        type="button"
        className={`cp-fav-btn${favorite ? ' is-active' : ''}`}
        aria-label={favorite ? `Remover ${tool.title} dos favoritos` : `Adicionar ${tool.title} aos favoritos`}
        aria-pressed={favorite}
        onClick={() => toggleFavorite(tool.id)}
      >
        {favorite ? '★' : '☆'}
      </button>
      <button type="button" className="cp-tool-body" aria-label={tool.title} onClick={() => selectTool(tool.id)}>
        <span className="cp-tool-card__icon"><Icon name={TOOL_ICONS[tool.id] ?? 'file'} size={24} /></span>
        <span className="cp-tool-card__content">
          <span className="cp-tool-card__title">{tool.title}</span>
          <span className="cp-tool-card__desc">{tool.description.replace(/\s*\(planejado\)\.?$/i, '.')}</span>
        </span>
        <span className="cp-tool-card__arrow" aria-hidden="true"><Icon name="arrow-right" size={18} /></span>
      </button>
      <span className="cp-tool-card__status">
        {tool.availability === 'available' ? 'Disponível' : tool.availability === 'experimental' ? 'Experimental' : 'Em breve'}
        {tool.capabilities.offline && <span className="sr-only">offline</span>}
      </span>
    </article>
  );
}
