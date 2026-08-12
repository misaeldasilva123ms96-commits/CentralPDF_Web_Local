import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PDFDocument } from 'pdf-lib';
import { useAppStore } from '../store/app-store';
import { centralCatalog, createDefaultRegistry } from '../core/catalog';
import { App } from '../App';
import type { ToolDefinition } from '../core/types';

beforeEach(() => {
  useAppStore.setState({
    searchQuery: '',
    favorites: [],
    activeToolId: null,
    files: [],
    parameters: {},
    task: null
  });
  centralCatalog.clear();
  for (const tool of createDefaultRegistry().list()) centralCatalog.register(tool);
});

async function openTool(name: string): Promise<ReturnType<typeof userEvent.setup>> {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name }));
  return user;
}

async function pdfFile(name: string, pages: number, title?: string): Promise<File> {
  const doc = await PDFDocument.create();
  if (title) doc.setTitle(title);
  for (let index = 0; index < pages; index += 1) doc.addPage([300, 400]);
  const bytes = await doc.save();
  return new File([bytes.slice().buffer], name, { type: 'application/pdf' });
}

async function addPdf(user: ReturnType<typeof userEvent.setup>, file: File): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  expect(input).not.toBeNull();
  await user.upload(input!, file);
}

describe('Workspace (fluxo da ferramenta)', () => {
  it('valida a ausência de arquivos e desabilita o botão de processar', async () => {
    await openTool('Juntar PDFs');
    expect(await screen.findByText(/Envie pelo menos 2 arquivos/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Juntar PDFs' })).toBeDisabled();
  });

  it('um único arquivo mantém o botão desabilitado (mínimo de dois)', async () => {
    const user = await openTool('Juntar PDFs');
    await addPdf(user, await pdfFile('unico.pdf', 1));
    expect(await screen.findByText(/Envie pelo menos 2 arquivos/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Juntar PDFs' })).toBeDisabled();
  });

  it('dois arquivos habilitam o processamento e a validação confirma', async () => {
    const user = await openTool('Juntar PDFs');
    await addPdf(user, await pdfFile('a.pdf', 1));
    await addPdf(user, await pdfFile('b.pdf', 1));
    expect(await screen.findByText('Pronto para processar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Juntar PDFs' })).not.toBeDisabled();
  });

  it('executa a fusão real e apresenta ResultCard com métricas e download', async () => {
    const user = await openTool('Juntar PDFs');
    await addPdf(user, await pdfFile('contrato.pdf', 1, 'Contrato'));
    await addPdf(user, await pdfFile('anexo.pdf', 1));
    await user.click(screen.getByRole('button', { name: 'Juntar PDFs' }));

    expect(await screen.findByText('Resultado concluído')).toBeInTheDocument();
    const download = screen.getByRole('link', { name: 'Baixar PDF_unido.pdf' });
    expect(download).toHaveAttribute('href', 'blob:mock');
    expect(screen.getByText('Páginas')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('aceita dois arquivos com o mesmo nome e remove apenas um deles', async () => {
    const user = await openTool('Juntar PDFs');
    await addPdf(user, await pdfFile('documento.pdf', 1));
    await addPdf(user, await pdfFile('documento.pdf', 1));
    expect(screen.getAllByText('documento.pdf')).toHaveLength(2);

    const removeButtons = screen.getAllByRole('button', { name: 'Remover documento.pdf' });
    expect(removeButtons).toHaveLength(2);
    await user.click(removeButtons[0]);
    expect(screen.getAllByText('documento.pdf')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Juntar PDFs' })).toBeDisabled();
  });

  it('reordena arquivos pelos botões de movimento', async () => {
    const user = await openTool('Juntar PDFs');
    await addPdf(user, await pdfFile('primeiro.pdf', 1));
    await addPdf(user, await pdfFile('segundo.pdf', 1));

    const list = document.querySelector<HTMLElement>('.cp-file-list');
    expect(list).not.toBeNull();
    const namesBefore = within(list!).getAllByText(/primeiro|segundo/).map((node) => node.textContent);
    expect(namesBefore).toEqual(['primeiro.pdf', 'segundo.pdf']);

    await user.click(screen.getByRole('button', { name: 'Mover primeiro.pdf para baixo' }));
    const namesAfter = within(list!).getAllByText(/primeiro|segundo/).map((node) => node.textContent);
    expect(namesAfter).toEqual(['segundo.pdf', 'primeiro.pdf']);
  });

  it('ferramenta planejada mostra "Em breve" e não abre o workspace', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'OCR e PDF pesquisável' }));
    expect(screen.getByText(/Em breve/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Resumo, configurações, validação e ação da ferramenta' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Processando…' })).not.toBeInTheDocument();
  });

  it('falha total exibe painel de falha sem botão de download', async () => {
    const user = await openTool('Juntar PDFs');
    await addPdf(user, new File([new Uint8Array([37, 80, 68, 70])], 'r1.pdf', { type: 'application/pdf' }));
    await addPdf(user, new File([new Uint8Array([37, 80, 68, 70])], 'r2.pdf', { type: 'application/pdf' }));
    await user.click(screen.getByRole('button', { name: 'Juntar PDFs' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Falha ao processar')).toBeInTheDocument();
    expect(screen.queryByText('Resultado concluído')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Baixar/ })).not.toBeInTheDocument();
  });

  it('permite cancelar uma execução cooperativa e mostra o estado cancelado', async () => {
    centralCatalog.register(slowTool);
    const user = await openTool('Compressão lenta');
    await addPdf(user, await pdfFile('grande.pdf', 1));
    await user.click(screen.getByRole('button', { name: 'Compressão lenta' }));

    const cancel = await screen.findByRole('button', { name: 'Cancelar' });
    await user.click(cancel);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Processamento cancelado')).toBeInTheDocument();
  });

  it('trava a fila de arquivos enquanto a tarefa está rodando', async () => {
    centralCatalog.register(slowTool);
    const user = await openTool('Compressão lenta');
    await addPdf(user, await pdfFile('arquivo.pdf', 1));
    await user.click(screen.getByRole('button', { name: 'Compressão lenta' }));

    await screen.findByRole('button', { name: 'Cancelar' });
    expect(screen.getByRole('button', { name: 'Remover arquivo.pdf' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Escolha ou arraste seus arquivos' })).toHaveAttribute('aria-disabled', 'true');
  });
});

const slowTool: ToolDefinition = {
  id: 'slow-compress',
  version: '0.1.0',
  category: 'organizacao',
  availability: 'experimental',
  title: 'Compressão lenta',
  description: 'Ferramenta lenta para testar cancelamento.',
  inputs: [{ kind: 'pdf', accept: ['application/pdf', '.pdf'], multiple: true, minFiles: 1 }],
  outputs: [{ kind: 'pdf', accept: ['application/pdf'], multiple: false, minFiles: 1 }],
  runtime: ['BROWSER_NATIVE'],
  parametersSchema: { type: 'object', properties: {} },
  validate: () => ({ ok: true, errors: [], warnings: [] }),
  estimate: () => ({}),
  execute: async (ctx) => {
    for (let index = 0; index < 60; index += 1) {
      ctx.progress?.(Math.round((index / 60) * 100), `etapa ${index}`);
      await new Promise((resolve) => setTimeout(resolve, 30));
      if (ctx.signal?.aborted) {
        ctx.progress?.(0, 'cancelado');
        return { ok: false, outputs: [], warnings: ['cancelado pelo usuário'] };
      }
    }
    return { ok: true, outputs: [], warnings: [] };
  },
  capabilities: { batch: true, cancellable: true, offline: true, workflow: true, preview: true }
};
