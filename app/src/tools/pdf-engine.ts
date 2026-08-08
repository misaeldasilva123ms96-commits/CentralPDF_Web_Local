import type * as PdfjsTypes from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';

type PdfjsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

let pdfjsModulePromise: Promise<PdfjsModule> | null = null;

function loadPdfjsModule(): Promise<PdfjsModule> {
  pdfjsModulePromise ??= import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjsModulePromise;
}

async function ensurePdfjsWorker(): Promise<void> {
  const pdfjs = await loadPdfjsModule();
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  }
}

export async function loadPdf(data: ArrayBuffer): Promise<PdfjsTypes.PDFDocumentProxy> {
  const pdfjs = await loadPdfjsModule();
  await ensurePdfjsWorker();
  return pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
}

export type LoadedPdf = Awaited<ReturnType<typeof loadPdf>>;

export async function extractPageText(
  document: PdfjsTypes.PDFDocumentProxy,
  pageNumber: number
): Promise<string> {
  const page = await document.getPage(pageNumber);
  try {
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join('')
      .replace(/\s+/g, ' ');
    return text.trim();
  } finally {
    page.cleanup();
  }
}

export interface RasterizePageOptions {
  pageNumber: number;
  scale: number;
  backgroundColor?: string;
}

export class RasterizerUnavailableError extends Error {
  constructor() {
    super('A rasterização de páginas exige um navegador com suporte a canvas.');
    this.name = 'RasterizerUnavailableError';
  }
}

export async function rasterizePage(
  document: PdfjsTypes.PDFDocumentProxy,
  options: RasterizePageOptions
): Promise<Uint8Array> {
  if (typeof globalThis.document === 'undefined') {
    throw new RasterizerUnavailableError();
  }

  const page = await document.getPage(options.pageNumber);
  try {
    const viewport = page.getViewport({ scale: options.scale });
    const canvas = globalThis.document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new RasterizerUnavailableError();
    }

    await page.render({
      canvasContext: context,
      viewport,
      canvas,
      background: options.backgroundColor ?? '#ffffff'
    }).promise;

    const dataUrl = canvas.toDataURL('image/png');
    canvas.width = 0;
    canvas.height = 0;

    const base64 = dataUrl.split(',')[1] ?? '';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } finally {
    page.cleanup();
  }
}

export function sanitizeOutputBase(name: string): string {
  return name
    .replace(/\.pdf$/i, '')
    .replace(/[\\/]/g, '-')
    .replace(/[<>:"|?*\x00-\x1f]/g, '')
    .trim()
    .slice(0, 100);
}