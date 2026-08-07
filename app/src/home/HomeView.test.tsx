import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAppStore } from '../store/app-store';
import { HomeView } from './HomeView';
import { demoTools } from '../demo-tools';

function resetStore() {
  useAppStore.setState({ searchQuery: '', favorites: [], activeToolId: null });
}

describe('HomeView', () => {
  beforeEach(resetStore);

  it('lista todas as ferramentas demo', () => {
    render(<HomeView tools={demoTools} />);
    for (const tool of demoTools) {
      expect(screen.getByRole('button', { name: tool.title })).toBeInTheDocument();
    }
  });

  it('filtra pelo texto da busca (por título e descrição)', async () => {
    const user = userEvent.setup();
    render(<HomeView tools={demoTools} />);
    await user.type(screen.getByRole('searchbox', { name: 'Buscar ferramenta' }), 'ocr');
    expect(screen.getByRole('button', { name: 'OCR e PDF pesquisável' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Comprimir PDF' })).not.toBeInTheDocument();
  });

  it('mostra mensagem quando a busca não encontra nada', async () => {
    const user = userEvent.setup();
    render(<HomeView tools={demoTools} />);
    await user.type(screen.getByRole('searchbox', { name: 'Buscar ferramenta' }), 'zzz');
    expect(screen.getByText(/Nenhuma ferramenta encontrada/)).toBeInTheDocument();
  });

  it('exibe seção de favoritas quando há favoritos', async () => {
    const user = userEvent.setup();
    useAppStore.getState().toggleFavorite('protect-pdf');
    render(<HomeView tools={demoTools} />);
    expect(screen.getByRole('heading', { name: 'Favoritas' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Proteger PDF' })).toHaveLength(2);
    await user.click(screen.getAllByRole('button', { name: 'Remover Proteger PDF dos favoritos' })[0]);
    expect(screen.queryByRole('heading', { name: 'Favoritas' })).not.toBeInTheDocument();
  });

  it('mostra badges de motor e capacidades nos cards', () => {
    render(<HomeView tools={demoTools} />);
    expect(screen.getAllByText(/BROWSER/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('lote').length).toBeGreaterThan(0);
  });
});