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
    currentStep: 'select',
    task: null
  });
});

describe('App (shell 2.0)', () => {
  it('renderiza o shell com marca, modo local e versão', () => {
    render(<App />);
    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CentralPDF 2\.0/ })).toBeInTheDocument();
    expect(screen.getByText(/Modo local · offline/)).toBeInTheDocument();
    expect(screen.getByText(/v2\.0\.0-alpha/)).toBeInTheDocument();
  });

  it('exibe o catálogo oficial na home com apenas uma ferramenta disponível', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /Todas as ferramentas/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Juntar PDFs' })).toBeInTheDocument();
    expect(screen.getByText('Disponível')).toBeInTheDocument();
    expect(screen.getAllByText('Em breve').length).toBeGreaterThan(0);
  });

  it('abre o workspace ao selecionar uma ferramenta disponível e volta à home', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Juntar PDFs' }));
    expect(screen.getByTestId('flow-bar')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Configurações' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /CentralPDF 2\.0/ }));
    expect(screen.getByRole('heading', { name: /Todas as ferramentas/ })).toBeInTheDocument();
  });

  it('ferramenta planejada não abre o workspace', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'OCR e PDF pesquisável' }));
    expect(screen.getByText(/Em breve/)).toBeInTheDocument();
    expect(screen.queryByTestId('flow-bar')).not.toBeInTheDocument();
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
});