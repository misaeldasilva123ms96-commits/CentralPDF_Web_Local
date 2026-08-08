import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAppStore } from '../store/app-store';
import { centralCatalog, createDefaultRegistry } from '../core/catalog';
import { App } from '../App';
import type { ToolDefinition } from '../core/types';

async function pdfFile(name: string): Promise<File> {
  const { PDFDocument } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  doc.addPage([300, 400]);
  const bytes = await doc.save();
  return new File([bytes.slice().buffer], name, { type: 'application/pdf' });
}

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
  centralCatalog.clear();
  for (const tool of createDefaultRegistry().list()) centralCatalog.register(tool);
});

describe('Acessibilidade (roles ARIA e nomes acessíveis)', () => {
  it('o fluxo é navegável por nomes acessíveis e anúncios de status', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Juntar PDFs' }));

    expect(screen.getByRole('list', { name: 'Etapas do fluxo' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Configurações' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escolha ou arraste seus arquivos' })).toBeInTheDocument();

    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    await user.upload(input!, await pdfFile('a.pdf'));
    await user.upload(input!, await pdfFile('b.pdf'));

    expect(screen.getByRole('button', { name: 'Remover b.pdf' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mover b.pdf para cima' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Pronto para processar');
    expect(screen.getByRole('button', { name: 'Juntar PDFs' })).not.toBeDisabled();
  });

  it('exibe barra de progresso acessível e permite cancelar durante a execução', async () => {
    centralCatalog.register(slowTool);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Compressão lenta' }));
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    await user.upload(input!, await pdfFile('um.pdf'));
    await user.click(screen.getByRole('button', { name: 'Compressão lenta' }));

    const bar = await screen.findByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(Number(bar.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(0);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Processamento cancelado');
  });

  it('ferramenta experimental anuncia aviso com role de nota', async () => {
    centralCatalog.register({ ...slowTool, id: 'exp', title: 'Ferramenta beta' });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Ferramenta beta' }));
    expect(screen.getByRole('note')).toHaveTextContent(/experimental/i);
  });

  it('voltar à home preserva o foco sem abrir o workspace', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Juntar PDFs' }));
    await user.click(screen.getByRole('button', { name: /CentralPDF 2.0/ }));
    expect(screen.queryByTestId('flow-bar')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Todas as ferramentas/ })).toBeInTheDocument();
  });
});

const slowTool: ToolDefinition = {
  id: 'slow-compress',
  version: '0.1.0',
  category: 'organizacao',
  availability: 'experimental',
  title: 'Compressão lenta',
  description: 'Ferramenta lenta para o exercício de a11y.',
  inputs: [{ kind: 'pdf', accept: ['application/pdf', '.pdf'], multiple: true, minFiles: 1 }],
  outputs: [{ kind: 'pdf', accept: ['application/pdf'], multiple: false, minFiles: 1 }],
  runtime: ['BROWSER_NATIVE'],
  parametersSchema: { type: 'object', properties: {} },
  validate: () => ({ ok: true, errors: [], warnings: [] }),
  estimate: () => ({}),
  execute: async (ctx) => {
    for (let index = 0; index < 60; index += 1) {
      ctx.progress?.(Math.round((index / 60) * 100), `etapa ${index}`);
      await new Promise((resolve) => setTimeout(resolve, 15));
      if (ctx.signal?.aborted) {
        ctx.progress?.(0, 'cancelado');
        return { ok: false, outputs: [], warnings: ['Processamento cancelado pelo usuário.'] };
      }
    }
    return { ok: true, outputs: [], warnings: [] };
  },
  capabilities: { batch: true, cancellable: true, offline: true, workflow: true, preview: true }
};