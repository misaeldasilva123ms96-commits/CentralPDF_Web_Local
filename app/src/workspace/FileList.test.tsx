import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAppStore } from '../store/app-store';
import { FileList } from './FileList';
import type { FileContract } from '../core/types';

const CONTRACT: FileContract = {
  kind: 'pdf',
  accept: ['application/pdf', '.pdf'],
  multiple: true,
  minFiles: 1
};

type ReadHandle = { resolve: (b: ArrayBuffer) => void; reject: (e: Error) => void };

const pendingReads: ReadHandle[] = [];

let originalArrayBuffer: PropertyDescriptor | undefined;

function installReadControl(): void {
  originalArrayBuffer = Object.getOwnPropertyDescriptor(File.prototype, 'arrayBuffer');
  Object.defineProperty(File.prototype, 'arrayBuffer', {
    configurable: true,
    writable: true,
    value: function arrayBuffer(this: File): Promise<ArrayBuffer> {
      return new Promise<ArrayBuffer>((resolve, reject) => {
        pendingReads.push({ resolve, reject });
      });
    }
  });
}

function resolveNextRead(bytes = 32): void {
  const handle = pendingReads.shift();
  if (!handle) throw new Error('nenhuma leitura pendente');
  handle.resolve(new Uint8Array(bytes).buffer);
}

function rejectNextRead(): void {
  const handle = pendingReads.shift();
  if (!handle) throw new Error('nenhuma leitura pendente');
  handle.reject(new Error('leitura falhou'));
}

beforeEach(() => {
  useAppStore.setState({
    searchQuery: '',
    favorites: [],
    activeToolId: null,
    files: [],
    parameters: {},
    task: null
  });
  pendingReads.length = 0;
  installReadControl();
});

afterEach(() => {
  if (originalArrayBuffer) {
    Object.defineProperty(File.prototype, 'arrayBuffer', originalArrayBuffer);
  } else {
    delete (File.prototype as { arrayBuffer?: unknown }).arrayBuffer;
  }
  vi.restoreAllMocks();
});

async function flushAsync(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
}

describe('FileList — serialização e ciclo de vida da ingestão', () => {
  it('preserva a ordem das seleções mesmo com leituras de durações diferentes', async () => {
    const user = userEvent.setup();
    render(<FileList contracts={[CONTRACT]} />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();

    await user.upload(input!, [new File([new Uint8Array(4)], 'a.pdf', { type: 'application/pdf' })]);
    await user.upload(input!, [new File([new Uint8Array(4)], 'b.pdf', { type: 'application/pdf' })]);
    await flushAsync();

    expect(pendingReads).toHaveLength(1); // somente a primeira seleção foi lida
    act(() => resolveNextRead()); // a.pdf (lenta)
    await flushAsync();

    act(() => resolveNextRead()); // b.pdf só começa depois
    await flushAsync();

    const files = useAppStore.getState().files;
    expect(files.map((f) => f.name)).toEqual(['a.pdf', 'b.pdf']);
  });

  it('só inicia a leitura da segunda seleção após a primeira concluir', async () => {
    const user = userEvent.setup();
    render(<FileList contracts={[CONTRACT]} />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');

    await user.upload(input!, [new File([new Uint8Array(4)], 'a.pdf', { type: 'application/pdf' })]);
    await flushAsync();
    expect(pendingReads).toHaveLength(1);

    await user.upload(input!, [new File([new Uint8Array(4)], 'b.pdf', { type: 'application/pdf' })]);
    await flushAsync();
    expect(pendingReads).toHaveLength(1);

    act(() => resolveNextRead());
    await flushAsync();
    expect(pendingReads).toHaveLength(1);

    act(() => resolveNextRead());
    await flushAsync();
    expect(pendingReads).toHaveLength(0);
    expect(useAppStore.getState().files.map((f) => f.name)).toEqual(['a.pdf', 'b.pdf']);
  });

  it('descarta a leitura pendente quando a fila fica bloqueada', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<FileList contracts={[CONTRACT]} />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');

    await user.upload(input!, [new File([new Uint8Array(4)], 'a.pdf', { type: 'application/pdf' })]);
    await flushAsync();
    rerender(<FileList contracts={[CONTRACT]} disabled />);

    act(() => resolveNextRead());
    await flushAsync();

    expect(useAppStore.getState().files).toHaveLength(0);
  });

  it('descarta a leitura pendente quando o componente é desmontado', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<FileList contracts={[CONTRACT]} />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');

    await user.upload(input!, [new File([new Uint8Array(4)], 'a.pdf', { type: 'application/pdf' })]);
    await flushAsync();
    unmount();

    act(() => resolveNextRead());
    await flushAsync();

    expect(useAppStore.getState().files).toHaveLength(0);
  });

  it('uma leitura com erro não quebra a fila nem as seleções seguintes', async () => {
    const user = userEvent.setup();
    render(<FileList contracts={[CONTRACT]} />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');

    await user.upload(input!, [new File([new Uint8Array(4)], 'ruim.pdf', { type: 'application/pdf' })]);
    await user.upload(input!, [new File([new Uint8Array(4)], 'bom.pdf', { type: 'application/pdf' })]);
    await flushAsync();

    act(() => rejectNextRead());
    await flushAsync();
    act(() => resolveNextRead());
    await flushAsync();

    const files = useAppStore.getState().files;
    expect(files.map((f) => f.name)).toEqual(['bom.pdf']);
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível ler: ruim.pdf.');
  });

  it('mantém arquivos com o mesmo nome independentes e com IDs únicos', async () => {
    const user = userEvent.setup();
    render(<FileList contracts={[CONTRACT]} />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');

    await user.upload(input!, [new File([new Uint8Array(4)], 'documento.pdf', { type: 'application/pdf' })]);
    await user.upload(input!, [new File([new Uint8Array(4)], 'documento.pdf', { type: 'application/pdf' })]);
    await flushAsync();

    act(() => resolveNextRead());
    await flushAsync();
    act(() => resolveNextRead());
    await flushAsync();

    const files = useAppStore.getState().files;
    expect(files).toHaveLength(2);
    expect(files[0].id).not.toBe(files[1].id);
  });

  it('aceita a primeira seleção por arrastar e soltar na mesma ordem', async () => {
    const file = new File([new Uint8Array(4)], 'drop.pdf', { type: 'application/pdf' });
    render(<FileList contracts={[CONTRACT]} />);
    const dropzone = screen.getByRole('button', { name: 'Escolha ou arraste seus arquivos' });

    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });
    await flushAsync();
    act(() => resolveNextRead());
    await flushAsync();

    expect(useAppStore.getState().files.map((f) => f.name)).toEqual(['drop.pdf']);
  });

  it('impede a rolagem ao ativar a área de upload com Espaço', () => {
    render(<FileList contracts={[CONTRACT]} />);
    const dropzone = screen.getByRole('button', { name: 'Escolha ou arraste seus arquivos' });
    expect(fireEvent.keyDown(dropzone, { key: ' ' })).toBe(false);
  });

  it('fecha a prévia com Escape e devolve o foco ao botão que a abriu', async () => {
    const user = userEvent.setup();
    useAppStore.setState({
      files: [{ id: 'preview', name: 'arquivo.pdf', size: 12, mimeType: 'application/pdf', data: new ArrayBuffer(12) }]
    });
    render(<FileList contracts={[CONTRACT]} />);

    const trigger = screen.getByRole('button', { name: 'Abrir prévia de arquivo.pdf' });
    await user.click(trigger);
    expect(screen.getByRole('button', { name: 'Fechar visualização' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await flushAsync();
    expect(trigger).toHaveFocus();
  });

  it('usa a prévia genérica para arquivos sem extensão', async () => {
    const user = userEvent.setup();
    useAppStore.setState({
      files: [{ id: 'generic', name: 'README', size: 12, mimeType: 'text/plain', data: new ArrayBuffer(12) }]
    });
    render(<FileList contracts={[CONTRACT]} />);

    expect(screen.getByText('ARQ')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Abrir prévia de README' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('ARQ');
    expect(screen.queryByRole('img', { name: /Prévia/ })).not.toBeInTheDocument();
  });
});
