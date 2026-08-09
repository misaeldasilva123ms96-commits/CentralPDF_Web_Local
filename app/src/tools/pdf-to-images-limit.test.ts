import { describe, expect, it, vi } from 'vitest';
import type { FileInput } from '../core/types';

const state = vi.hoisted(() => ({
  numPages: 3,
  interpreter: (): number => 0
}));

vi.mock('./pdf-engine', async (importOriginal) => {
  const original = await importOriginal<typeof import('./pdf-engine')>();
  return {
    ...original,
    loadPdf: async () => ({
      document: { numPages: state.numPages },
      destroy: async () => undefined
    }),
    rasterizePage: vi.fn(async (): Promise<Uint8Array> => {
      const bytes = state.interpreter();
      const png = new Uint8Array(1);
      Object.defineProperty(png, 'byteLength', { value: bytes, configurable: true });
      return png;
    })
  };
});

import { MAX_IMAGES_OUTPUT_BYTES, pdfToImagesTool } from './pdf-to-images';

const LIMIT = MAX_IMAGES_OUTPUT_BYTES;
const HALF = Math.floor(LIMIT / 2);

let nextId = 1;

function inputPdf(pages: number): FileInput {
  state.numPages = pages;
  return {
    id: `file-${nextId++}`,
    name: 'fotos.pdf',
    size: 128,
    mimeType: 'application/pdf',
    data: new Uint8Array(128).buffer
  };
}

describe('pdfToImagesTool — limite máximo de saída', () => {
  afterEach(() => {
    state.interpreter = () => 0;
  });

  it('converte todas as páginas quando a soma fica abaixo do limite', async () => {
    state.interpreter = () => Math.floor(HALF / 2);
    const result = await pdfToImagesTool.execute({ inputs: [inputPdf(4)], parameters: {} });
    expect(result.ok).toBe(true);
    expect(result.outputs).toHaveLength(4);
    expect(result.metrics?.bytesOut).toBe(HALF * 2);
    expect(result.warnings.some((w) => w.includes('limite'))).toBe(false);
  });

  it('aceita a conversão que termina exatamente no limite', async () => {
    state.interpreter = () => HALF;
    const result = await pdfToImagesTool.execute({ inputs: [inputPdf(2)], parameters: {} });
    expect(result.ok).toBe(true);
    expect(result.outputs).toHaveLength(2);
    expect(result.metrics?.bytesOut).toBe(LIMIT);
    expect(result.warnings.some((w) => w.includes('limite'))).toBe(false);
  });

  it('interrompe ao passar do limite e preserva as páginas anteriores', async () => {
    state.interpreter = () => HALF + 1;
    const result = await pdfToImagesTool.execute({ inputs: [inputPdf(3)], parameters: {} });
    expect(result.ok).toBe(true);
    expect(result.outputs).toHaveLength(1);
    expect(result.metrics?.bytesOut).toBe(HALF + 1);
    expect(result.metrics?.pages).toBe(1);
    expect(result.warnings.some((w) => w.includes('limite'))).toBe(true);
    expect(result.warnings[0]).toContain('250 MB');
  });

  it('retorna falha sem saídas quando a primeira página já passa do limite', async () => {
    state.interpreter = () => LIMIT + 1;
    const result = await pdfToImagesTool.execute({ inputs: [inputPdf(2)], parameters: {} });
    expect(result.ok).toBe(false);
    expect(result.outputs).toHaveLength(0);
    expect(result.metrics?.bytesOut).toBe(0);
    expect(result.warnings.some((w) => w.includes('limite'))).toBe(true);
  });
});