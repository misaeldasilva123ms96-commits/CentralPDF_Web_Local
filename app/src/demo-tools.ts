import type { ToolDefinition } from './core/types';
import { mergePdfsTool } from './tools/merge-pdfs';
import { compressPdfTool } from './tools/compress-pdf';

export const demoTools: ToolDefinition[] = [
  mergePdfsTool,
  compressPdfTool,
  {
    id: 'extract-text',
    version: '0.1.0-demo',
    category: 'texto',
    title: 'Extrair texto do PDF',
    description: 'Extrai o texto de todas as páginas para um arquivo TXT.',
    inputs: [{ kind: 'pdf', accept: ['application/pdf', '.pdf'], multiple: false, minFiles: 1 }],
    outputs: [{ kind: 'text', accept: ['text/plain'], multiple: false, minFiles: 1 }],
    runtime: ['BROWSER_WASM'],
    parametersSchema: { type: 'object', properties: {} },
    validate: () => ({ ok: true, errors: [], warnings: [] }),
    estimate: () => ({}),
    execute: async () => ({ ok: true, outputs: [], warnings: [] }),
    capabilities: { batch: false, cancellable: true, offline: true, workflow: true, preview: true }
  },
  {
    id: 'ocr-pdf',
    version: '0.1.0-demo',
    category: 'texto',
    title: 'OCR e PDF pesquisável',
    description: 'Reconhece texto em imagens e gera PDF pesquisável com Tesseract WASM.',
    inputs: [{ kind: 'pdf', accept: ['application/pdf', '.pdf'], multiple: true, minFiles: 1 }],
    outputs: [{ kind: 'pdf', accept: ['application/pdf'], multiple: false, minFiles: 1 }],
    runtime: ['BROWSER_WASM'],
    parametersSchema: {
      type: 'object',
      properties: {
        language: { type: 'string', title: 'Idioma', default: 'por+eng', enum: ['por', 'eng', 'por+eng'] }
      }
    },
    validate: () => ({ ok: true, errors: [], warnings: [] }),
    estimate: () => ({}),
    execute: async (ctx) => {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 300);
        ctx.signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          resolve();
        });
      });
      if (ctx.signal?.aborted) return { ok: false, outputs: [], warnings: [] };
      return { ok: true, outputs: [], warnings: ['Motor OCR chega na Fase 3.'] };
    },
    capabilities: { batch: true, cancellable: true, offline: true, workflow: true, preview: true }
  },
  {
    id: 'protect-pdf',
    version: '0.1.0-demo',
    category: 'seguranca',
    title: 'Proteger PDF',
    description: 'Adiciona senha de abertura e restrições de uso ao PDF.',
    inputs: [{ kind: 'pdf', accept: ['application/pdf', '.pdf'], multiple: false, minFiles: 1 }],
    outputs: [{ kind: 'pdf', accept: ['application/pdf'], multiple: false, minFiles: 1 }],
    runtime: ['BROWSER_NATIVE'],
    parametersSchema: {
      type: 'object',
      properties: {
        password: { type: 'string', title: 'Senha' },
        restrictPrinting: { type: 'boolean', title: 'Proibir impressão', default: false }
      }
    },
    validate: () => ({ ok: true, errors: [], warnings: [] }),
    estimate: () => ({}),
    execute: async () => ({ ok: true, outputs: [], warnings: [] }),
    capabilities: { batch: false, cancellable: false, offline: true, workflow: false, preview: false }
  },
  {
    id: 'pdf-to-images',
    version: '0.1.0-demo',
    category: 'conversao',
    title: 'PDF para imagens',
    description: 'Converte cada página do PDF em imagens PNG no navegador.',
    inputs: [{ kind: 'pdf', accept: ['application/pdf', '.pdf'], multiple: false, minFiles: 1 }],
    outputs: [{ kind: 'zip', accept: ['application/zip'], multiple: false, minFiles: 1 }],
    runtime: ['BROWSER_WASM'],
    parametersSchema: { type: 'object', properties: {} },
    validate: () => ({ ok: true, errors: [], warnings: [] }),
    estimate: () => ({}),
    execute: async () => ({ ok: true, outputs: [], warnings: [] }),
    capabilities: { batch: false, cancellable: true, offline: true, workflow: false, preview: false }
  }
]