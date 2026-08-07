import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FileInput, ToolDefinition } from '../core/types';
import type { TaskRun } from '../core/task-engine';

export type WorkspaceStep =
  | 'select'
  | 'preview'
  | 'configure'
  | 'validate'
  | 'process'
  | 'review'
  | 'download';

interface AppState {
  tools: Map<string, ToolDefinition>;
  searchQuery: string;
  favorites: string[];
  activeToolId: string | null;
  files: FileInput[];
  parameters: Record<string, unknown>;
  currentStep: WorkspaceStep;
  task: TaskRun | null;

  setTools: (tools: ToolDefinition[]) => void;
  setSearchQuery: (query: string) => void;
  toggleFavorite: (toolId: string) => void;
  selectTool: (toolId: string | null) => void;
  setFiles: (files: FileInput[]) => void;
  addFiles: (files: FileInput[]) => void;
  removeFile: (name: string) => void;
  setParameter: (key: string, value: unknown) => void;
  setStep: (step: WorkspaceStep) => void;
  setTask: (task: TaskRun | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      tools: new Map(),
      searchQuery: '',
      favorites: [],
      activeToolId: null,
      files: [],
      parameters: {},
      currentStep: 'select',
      task: null,

      setTools: (tools) => set({ tools: new Map(tools.map((t) => [t.id, t])) }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      toggleFavorite: (toolId) =>
        set((state) => ({
          favorites: state.favorites.includes(toolId)
            ? state.favorites.filter((id) => id !== toolId)
            : [...state.favorites, toolId]
        })),
      selectTool: (toolId) =>
        set({ activeToolId: toolId, files: [], parameters: {}, task: null, currentStep: 'select' }),
      setFiles: (files) => set({ files }),
      addFiles: (files) =>
        set((state) => {
          const merged = [...state.files];
          for (const file of files) {
            if (!merged.some((existing) => existing.name === file.name)) merged.push(file);
          }
          return { files: merged, currentStep: merged.length > 0 ? 'preview' : 'select' };
        }),
      removeFile: (name) =>
        set((state) => ({
          files: state.files.filter((file) => file.name !== name),
          currentStep: state.files.length <= 1 ? 'select' : state.currentStep
        })),
      setParameter: (key, value) =>
        set((state) => ({ parameters: { ...state.parameters, [key]: value } })),
      setStep: (step) => set({ currentStep: step }),
      setTask: (task) => set({ task })
    }),
    {
      name: 'centralpdf2-state',
      partialize: (state) => ({ favorites: state.favorites })
    }
  )
);