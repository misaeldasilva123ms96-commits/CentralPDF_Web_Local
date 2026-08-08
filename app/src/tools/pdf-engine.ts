import type * as PdfjsTypes from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';

type PdfjsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

let pdfjsModulePromise: Promise<PdfjsModule> | null = null;

/**
 * Loads the PDF.js module and reuses the same loading operation for subsequent calls.
 *
 * @returns The loaded PDF.js module
 */
function loadPdfjsModule(): Promise<PdfjsModule> {
  pdfjsModulePromise ??= import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjsModulePromise;
}

/**
 * Ensures PDF.js has a configured worker source.
 */
async function ensurePdfjsWorker(): Promise<void> {
  const pdfjs = await loadPdfjsModule();
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  }
}

export interface LoadedPdf {
  document: PdfjsTypes.PDFDocumentProxy;
  destroy: () => Promise<void>;
}

/**
 * Loads a PDF document from binary data.
 *
 * @param data - The PDF file data
 * @returns The loaded document and a function that releases its loading resources
 */
export async function loadPdf(data: ArrayBuffer): Promise<LoadedPdf> {
  const pdfjs = await loadPdfjsModule();
  await ensurePdfjsWorker();
  const task = pdfjs.getDocument({ data: new Uint8Array(data) });
  const document = await task.promise;
  return { document, destroy: () => task.destroy() };
}

/**
 * Extracts normalized text from a PDF page.
 *
 * @param pageNumber - The one-based page number to extract
 * @returns The page text with consecutive whitespace collapsed and surrounding whitespace removed
 */
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

/**
 * Rasterizes a PDF page as PNG image data.
 *
 * @param options - The page number, rendering scale, and optional background color.
 * @returns The encoded PNG image bytes.
 * @throws {@link RasterizerUnavailableError} If canvas-based rasterization is unavailable.
 * @throws {@link Error} If the rendered page cannot be encoded as a PNG.
 */
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

    const prefix = 'data:image/png;base64,';
    if (!dataUrl.startsWith(prefix) || dataUrl.length <= prefix.length) {
      throw new Error('A página não pôde ser codificada como imagem PNG.');
    }
    const base64 = dataUrl.slice(prefix.length);
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

/**
 * Sanitizes a PDF-derived name for use as an output filename base.
 *
 * @param name - The name to sanitize
 * @returns The sanitized name without a trailing PDF extension, path separators, invalid filename characters, or leading and trailing whitespace, limited to 100 characters
 */
export function sanitizeOutputBase(name: string): string {
  return name
    .replace(/\.pdf$/i, '')
    .replace(/[\\/]/g, '-')
    .replace(/[<>:"|?*\x00-\x1f]/g, '')
    .trim()
    .slice(0, 100);
}