import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAppStore } from './store/app-store';
import { App } from './App';

beforeEach(() => {
  useAppStore.setState({
    searchQuery: '',
    favorites: [],
    activeToolId: null,
    files: [],
    parameters: {},
    task: null
  });
});

describe('App (shell 2.0)', () => {
  it('renderiza o shell com marca, modo local e versão', () => {
    render(<App />);
    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CentralPDF 2\.0/ })).toBeInTheDocument();
    expect(screen.getByText(/Modo local · offline/)).toBeInTheDocument();
    expect(screen.getByText(/v2\.0\.1/)).toBeInTheDocument();
  });

  it('exibe o catálogo oficial na home com as ferramentas disponíveis', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /Todas as ferramentas/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Juntar PDFs' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Extrair texto do PDF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Proteger PDF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PDF para imagens' })).toBeInTheDocument();
    expect(screen.getAllByText('Disponível')).toHaveLength(2);
    expect(screen.getAllByText('Experimental')).toHaveLength(2);
    expect(screen.getAllByText('Em breve').length).toBeGreaterThan(0);
  });

  it('abre o workspace ao selecionar uma ferramenta disponível e volta à home', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Juntar PDFs' }));
    expect(screen.getByRole('region', { name: 'Resumo, configurações, validação e ação da ferramenta' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /CentralPDF 2\.0/ }));
    expect(screen.getByRole('heading', { name: /Todas as ferramentas/ })).toBeInTheDocument();
  });

  it('ferramenta planejada não abre o workspace', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'OCR e PDF pesquisável' }));
    expect(screen.getByText(/Em breve/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Resumo, configurações, validação e ação da ferramenta' })).not.toBeInTheDocument();
  });

  it('favoritar uma ferramenta persiste e desenha a seção de favoritas', async () => {
    const user = userEvent.setup();
    render(<App />);
    const favButton = screen.getByRole('button', { name: /Adicionar Juntar PDFs aos favoritos/ });
    await user.click(favButton);
    expect(screen.getByRole('heading', { name: 'Favoritas' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Remover Juntar PDFs dos favoritos' }).length).toBeGreaterThan(0);
    expect(useAppStore.getState().favorites).toEqual(['merge-pdfs']);
  });

  it('não renderiza nenhuma ferramenta desabilitada no catálogo', () => {
    render(<App />);
    expect(screen.queryByText('Desabilitada')).not.toBeInTheDocument();
  });

  it('mantém o rótulo e o submenu consistentes ao fechar o menu mobile', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
    const toolsButton = screen.getByRole('button', { name: /Todas as ferramentas/ });
    await user.click(toolsButton);
    expect(toolsButton).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByRole('button', { name: 'Fechar menu' }));
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false');
    expect(toolsButton).toHaveAttribute('aria-expanded', 'false');
  });
});
