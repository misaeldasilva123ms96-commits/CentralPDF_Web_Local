import { describe, expect, it } from 'vitest';
import { copyPdfBytesForWorker } from './pdf-engine';

describe('pdf-engine — propriedade do ArrayBuffer', () => {
  it('não destaca nem modifica o buffer persistido pelo chamador', async () => {
    const data = new TextEncoder().encode('%PDF-1.7\nconteúdo proprietário').buffer;
    const size = data.byteLength;
    const firstBytes = Array.from(new Uint8Array(data.slice(0, 8)));

    const disposable = copyPdfBytesForWorker(data);
    structuredClone(disposable.buffer, { transfer: [disposable.buffer] });

    expect(data.byteLength).toBe(size);
    expect(Array.from(new Uint8Array(data.slice(0, 8)))).toEqual(firstBytes);
  });
});
