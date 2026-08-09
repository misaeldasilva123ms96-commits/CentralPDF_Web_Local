import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAppStore } from '../store/app-store';
import { HomeView } from './HomeView';
import { centralCatalog } from '../core/catalog';

const tools = centralCatalog.list();

function resetStore() {
  useAppStore.setState({ searchQuery: '', favorites: [], activeToolId: null });
}

describe('HomeView', () => {
  beforeEach(resetStore);

  it('lista todas as ferramentas do catálogo oficial', () => {
    render(<HomeView tools={tools} />);
    for (const tool of tools) {
      expect(screen.getByRole('button', { name: tool.title })).toBeInTheDocument();
    }
  });

  it('filtra pelo texto da busca (por título e descrição)', async () => {
    const user = userEvent.setup();
    render(<HomeView tools={tools} />);
    await user.type(screen.getByRole('searchbox', { name: 'Buscar ferramenta' }), 'ocr');
    expect(screen.getByRole('button', { name: 'OCR e PDF pesquisável' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Juntar PDFs' })).not.toBeInTheDocument();
  });

  it('mostra mensagem quando a busca não encontra nada', async () => {
    const user = userEvent.setup();
    render(<HomeView tools={tools} />);
    await user.type(screen.getByRole('searchbox', { name: 'Buscar ferramenta' }), 'zzz');
    expect(screen.getByText(/Nenhuma ferramenta encontrada/)).toBeInTheDocument();
  });

  it('exibe seção de favoritas quando há favoritos', async () => {
    const user = userEvent.setup();
    useAppStore.getState().toggleFavorite('protect-pdf');
    render(<HomeView tools={tools} />);
    expect(screen.getByRole('heading', { name: 'Favoritas' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Proteger PDF' })).toHaveLength(2);
    await user.click(screen.getAllByRole('button', { name: 'Remover Proteger PDF dos favoritos' })[0]);
    expect(screen.queryByRole('heading', { name: 'Favoritas' })).not.toBeInTheDocument();
  });

  it('mostra estados de disponibilidade nos cards', () => {
    render(<HomeView tools={tools} />);
    expect(screen.getAllByText('Disponível')).toHaveLength(2);
    expect(screen.getAllByText('Experimental')).toHaveLength(2);
    expect(screen.getAllByText('Em breve').length).toBeGreaterThan(0);
    expect(screen.getAllByText('offline').length).toBeGreaterThan(0);
  });
});