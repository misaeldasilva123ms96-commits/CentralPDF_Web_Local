import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PDFDocument } from 'pdf-lib';
import { App } from '../App';
import { useAppStore } from '../store/app-store';
import { centralCatalog, createDefaultRegistry } from '../core/catalog';
import { TaskEngine } from '../core/task-engine';
import type { ToolContext, ToolDefinition, ToolResult } from '../core/types';

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
  vi.restoreAllMocks();
});

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function slowTool(execute: (context: ToolContext) => Promise<ToolResult>): ToolDefinition {
  return {
    id: 'slow-layout',
    version: '0.1.0',
    category: 'organizacao',
    availability: 'available',
    title: 'Ferramenta de ciclo',
    description: 'Ferramenta de teste do ciclo de vida do workspace.',
    inputs: [{ kind: 'pdf', accept: ['application/pdf', '.pdf'], multiple: false, minFiles: 1 }],
    outputs: [{ kind: 'pdf', accept: ['application/pdf'], multiple: false, minFiles: 1 }],
    runtime: ['BROWSER_NATIVE'],
    parametersSchema: { type: 'object', properties: {} },
    validate: () => ({ ok: true, errors: [], warnings: [] }),
    estimate: () => ({}),
    execute,
    capabilities: { batch: false, cancellable: true, offline: true, workflow: true, preview: true }
  };
}

async function pdfFile(name: string): Promise<File> {
  const doc = await PDFDocument.create();
  doc.addPage([300, 400]);
  const bytes = await doc.save();
  return new File([bytes.slice().buffer], name, { type: 'application/pdf' });
}

async function describeAsTool(
  user: ReturnType<typeof userEvent.setup>,
  name: string
): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  expect(input).not.toBeNull();
  await user.upload(input!, await pdfFile(name));
}

async function startRun(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Ferramenta de ciclo' }));
  await describeAsTool(user, 'a.pdf');
  await user.click(screen.getByRole('button', { name: 'Ferramenta de ciclo' }));
}

describe('ToolLayout — ciclo de vida (unmount e cancelamento)', () => {
  it('desmontar o layout cancela a execução ativa e não atualiza o store depois', async () => {
    const user = userEvent.setup();
    const cancelSpy = vi.spyOn(TaskEngine.prototype, 'cancel');
    const delayed = deferred<ToolResult>();
    centralCatalog.register(slowTool(() => delayed.promise));

    const { unmount } = render(<App />);
    await startRun(user);
    await screen.findByRole('button', { name: 'Cancelar' });
    const taskBefore = useAppStore.getState().task;
    expect(taskBefore?.status).toBe('running');

    unmount();
    delayed.resolve({ ok: true, outputs: [], warnings: [] });
    await new Promise((done) => setTimeout(done, 0));

    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().task).toBe(taskBefore);
  });

  it('nenhum callback antigo atualiza o store após a desmontagem', async () => {
    const user = userEvent.setup();
    const cancelSpy = vi.spyOn(TaskEngine.prototype, 'cancel');
    const delayed = deferred<ToolResult>();
    centralCatalog.register(
      slowTool(async (context) => {
        await delayed.promise;
        if (context.signal?.aborted) {
          return { ok: false, outputs: [], warnings: ['cancelado'] };
        }
        return { ok: true, outputs: [], warnings: [] };
      })
    );

    const { unmount } = render(<App />);
    await startRun(user);
    await screen.findByRole('button', { name: 'Cancelar' });

    const taskBefore = useAppStore.getState().task;
    unmount();
    delayed.resolve({ ok: true, outputs: [], warnings: [] });
    await new Promise((done) => setTimeout(done, 0));

    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().task).toBe(taskBefore);
  });

  it('voltar ao catálogo e abrir outra ferramenta não apresenta resultado antigo', async () => {
    const user = userEvent.setup();
    centralCatalog.register(slowTool(() => new Promise<ToolResult>(() => undefined)));

    const { unmount } = render(<App />);
    await startRun(user);
    await screen.findByRole('button', { name: 'Cancelar' });

    await user.click(screen.getByRole('button', { name: /CentralPDF 2\.0/ }));
    unmount();

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Extrair texto do PDF' }));
    expect(screen.queryByText('Resultado concluído')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Baixar/ })).not.toBeInTheDocument();
    expect(useAppStore.getState().task).toBeNull();
  });

  it('cancelar duas vezes é idempotente e não gera erro', async () => {
    const user = userEvent.setup();
    const cancelSpy = vi.spyOn(TaskEngine.prototype, 'cancel');
    centralCatalog.register(slowTool(() => new Promise<ToolResult>(() => undefined)));

    render(<App />);
    await startRun(user);
    const cancel = await screen.findByRole('button', { name: 'Cancelar' });

    await user.click(cancel);
    await user.click(cancel);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it('recupera a interface quando o motor rejeita antes de criar uma tarefa', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(TaskEngine.prototype, 'run').mockRejectedValueOnce(new Error('motor indisponível'));
    centralCatalog.register(slowTool(async () => ({ ok: true, outputs: [], warnings: [] })));

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Ferramenta de ciclo' }));
    await describeAsTool(user, 'a.pdf');
    const action = screen.getByRole('button', { name: 'Ferramenta de ciclo' });
    await user.click(action);

    expect(await screen.findByRole('alert')).toHaveTextContent('motor indisponível');
    expect(action).not.toBeDisabled();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('pede confirmação antes de descartar arquivos pelo botão voltar', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    centralCatalog.register(slowTool(async () => ({ ok: true, outputs: [], warnings: [] })));

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Ferramenta de ciclo' }));
    await describeAsTool(user, 'a.pdf');
    const backButton = document.querySelector<HTMLButtonElement>('.cp-back-button');
    expect(backButton).not.toBeNull();
    await user.click(backButton!);

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Ferramenta de ciclo' })).toBeInTheDocument();
    confirmSpy.mockReturnValue(true);
    await user.click(backButton!);
    expect(screen.getByRole('heading', { name: /Todas as ferramentas/ })).toBeInTheDocument();
  });
});
