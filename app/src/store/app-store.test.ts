import { describe, expect, it, beforeEach } from 'vitest';
import { useAppStore } from './app-store';
import type { FileInput } from '../core/types';

function makeFile(id: string, name: string, size = 100, mimeType = 'application/pdf'): FileInput {
  return { id, name, size, mimeType, data: new ArrayBuffer(size) };
}

describe('app-store (arquivos por id)', () => {
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

  it('adiciona dois arquivos com o mesmo nome como entradas distintas', () => {
    useAppStore.getState().addFiles([makeFile('a', 'documento.pdf'), makeFile('b', 'documento.pdf')]);
    expect(useAppStore.getState().files).toHaveLength(2);
    expect(new Set(useAppStore.getState().files.map((file) => file.id)).size).toBe(2);
  });

  it('diferencia arquivos por id, não por nome', () => {
    useAppStore.getState().addFiles([makeFile('a', 'x.pdf'), makeFile('b', 'x.pdf')]);
    useAppStore.getState().removeFile('a');
    const remaining = useAppStore.getState().files;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('b');
  });

  it('não duplica pelo mesmo id', () => {
    useAppStore.getState().addFiles([makeFile('a', 'x.pdf')]);
    useAppStore.getState().addFiles([makeFile('a', 'x.pdf')]);
    expect(useAppStore.getState().files).toHaveLength(1);
  });

  it('preserva a ordem de inserção', () => {
    useAppStore.getState().addFiles([makeFile('1', 'a.pdf'), makeFile('2', 'b.pdf'), makeFile('3', 'c.pdf')]);
    expect(useAppStore.getState().files.map((file) => file.id)).toEqual(['1', '2', '3']);
  });

  it('reordena um arquivo pelo id', () => {
    useAppStore.getState().addFiles([makeFile('1', 'a.pdf'), makeFile('2', 'b.pdf'), makeFile('3', 'c.pdf')]);
    useAppStore.getState().reorderFileTo('3', 0);
    expect(useAppStore.getState().files.map((file) => file.id)).toEqual(['3', '1', '2']);
    useAppStore.getState().reorderFileTo('3', 10);
    expect(useAppStore.getState().files.map((file) => file.id)).toEqual(['1', '2', '3']);
  });

  it('limpa a fila ao trocar de ferramenta', () => {
    useAppStore.getState().addFiles([makeFile('1', 'a.pdf')]);
    useAppStore.getState().setParameter('qualidade', 'alta');
    useAppStore.getState().selectTool('compress-pdf');
    expect(useAppStore.getState().files).toHaveLength(0);
    expect(useAppStore.getState().parameters).toEqual({});
    expect(useAppStore.getState().task).toBeNull();
    expect(useAppStore.getState().activeToolId).toBe('compress-pdf');
  });

  it('clearWorkspace libera arquivos, parâmetros e tarefa', () => {
    useAppStore.getState().addFiles([makeFile('1', 'a.pdf')]);
    useAppStore.getState().setParameter('k', 1);
    useAppStore.getState().setTask({ id: 'run_x' } as never);
    useAppStore.getState().clearWorkspace();
    const state = useAppStore.getState();
    expect(state.files).toHaveLength(0);
    expect(state.parameters).toEqual({});
    expect(state.task).toBeNull();
  });
});
