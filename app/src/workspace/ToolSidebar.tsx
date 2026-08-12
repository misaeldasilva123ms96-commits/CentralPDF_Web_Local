import type { ReactNode } from 'react';
import { Icon } from '../ui/Icon';

interface ToolSidebarProps {
  title: string;
  description: string;
  fileCount: number;
  settings: ReactNode;
  validation: ReactNode;
  primaryAction: ReactNode;
  runtimeLabel: string;
}

export function ToolSidebar({
  title,
  description,
  fileCount,
  settings,
  validation,
  primaryAction,
  runtimeLabel
}: ToolSidebarProps) {
  return (
    <aside className="cp-tool-sidebar" role="region" aria-label="Configurações">
      <div className="cp-tool-sidebar__header">
        <span className="cp-tool-sidebar__icon"><Icon name="file" size={20} /></span>
        <div><h1>{title}</h1><p>{description}</p></div>
      </div>
      <div className="cp-tool-sidebar__summary">
        <span>Arquivos</span>
        <strong>{fileCount} {fileCount === 1 ? 'arquivo' : 'arquivos'}</strong>
      </div>
      <section className="cp-tool-sidebar__settings">
        <h2>Configurações</h2>
        {settings}
      </section>
      {primaryAction && <div className="cp-tool-sidebar__footer">
          {validation}
          <span className="cp-tool-sidebar__runtime"><span className="status-dot" /> {runtimeLabel} · processamento local</span>
          {primaryAction}
        </div>}
    </aside>
  );
}
