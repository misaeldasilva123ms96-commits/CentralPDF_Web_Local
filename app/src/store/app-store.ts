import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FileInput } from '../core/types';
import type { TaskRun } from '../core/task-engine';

interface AppState {
  searchQuery: string;
  favorites: string[];
  activeToolId: string | null;
  files: FileInput[];
  parameters: Record<string, unknown>;
  task: TaskRun | null;

  setSearchQuery: (query: string) => void;
  toggleFavorite: (toolId: string) => void;
  selectTool: (toolId: string | null) => void;
  setFiles: (files: FileInput[]) => void;
  addFiles: (files: FileInput[]) => void;
  removeFile: (fileId: string) => void;
  reorderFileTo: (fileId: string, toIndex: number) => void;
  setParameter: (key: string, value: unknown) => void;
  setTask: (task: TaskRun | null) => void;
  clearWorkspace: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      searchQuery: '',
      favorites: [],
      activeToolId: null,
      files: [],
      parameters: {},
      task: null,

      setSearchQuery: (query) => set({ searchQuery: query }),
      toggleFavorite: (toolId) =>
        set((state) => ({
          favorites: state.favorites.includes(toolId)
            ? state.favorites.filter((id) => id !== toolId)
            : [...state.favorites, toolId]
        })),
      selectTool: (toolId) =>
        set({ activeToolId: toolId, files: [], parameters: {}, task: null }),
      setFiles: (files) => set({ files }),
      addFiles: (files) =>
        set((state) => {
          let added = false;
          const merged = [...state.files];
          for (const file of files) {
            if (!file.id) continue;
            if (!merged.some((existing) => existing.id === file.id)) {
              merged.push(file);
              added = true;
            }
          }
          return added ? { files: merged } : {};
        }),
      removeFile: (fileId) =>
        set((state) => ({ files: state.files.filter((file) => file.id !== fileId) })),
      reorderFileTo: (fileId, toIndex) =>
        set((state) => {
          const files = [...state.files];
          const fromIndex = files.findIndex((file) => file.id === fileId);
          if (fromIndex < 0) return {};
          const [moved] = files.splice(fromIndex, 1);
          const clamped = Math.max(0, Math.min(toIndex, files.length));
          files.splice(clamped, 0, moved);
          return { files };
        }),
      setParameter: (key, value) =>
        set((state) => ({ parameters: { ...state.parameters, [key]: value } })),
      setTask: (task) => set({ task }),
      clearWorkspace: () => set({ files: [], parameters: {}, task: null })
    }),
    {
      name: 'centralpdf2-state',
      partialize: (state) => ({ favorites: state.favorites })
    }
  )
);
