import { PDFDocument } from 'pdf-lib';
import { describe, expect, it, vi } from 'vitest';
import { inspectPdfBytes, isPdfCandidate } from './pdf-ingest';

async function realPdf(): Promise<ArrayBuffer> {
  const document = await PDFDocument.create();
  document.addPage([200, 300]);
  return Uint8Array.from(await document.save()).buffer;
}

describe('pdf-ingest', () => {
  it.each([
    ['mime vazio', { name: 'arquivo.pdf', mimeType: '' }],
    ['octet-stream', { name: 'arquivo.pdf', mimeType: 'application/octet-stream' }],
    ['MIME PDF', { name: 'arquivo.bin', mimeType: 'application/pdf' }]
  ])('trata %s como candidato e confirma pelos bytes', async (_label, candidate) => {
    const parse = vi.fn(async (bytes: ArrayBuffer) => ({ pageCount: (await PDFDocument.load(bytes)).getPageCount() }));
    expect(isPdfCandidate(candidate)).toBe(true);
    await expect(inspectPdfBytes(await realPdf(), candidate, parse)).resolves.toMatchObject({
      status: 'valid', pageCount: 1
    });
  });

  it('rejeita extensão PDF sem assinatura', async () => {
    await expect(inspectPdfBytes(
      new TextEncoder().encode('conteúdo que não é PDF').buffer,
      { name: 'falso.pdf', mimeType: '' },
      async () => ({ pageCount: 1 })
    )).rejects.toMatchObject({ code: 'unsupported' });
  });

  it('classifica arquivo vazio e PDF protegido separadamente', async () => {
    await expect(inspectPdfBytes(new ArrayBuffer(0), { name: 'vazio.pdf', mimeType: 'application/pdf' }, async () => ({ pageCount: 1 })))
      .rejects.toMatchObject({ code: 'empty' });

    const password = Object.assign(new Error('Password required'), { name: 'PasswordException' });
    await expect(inspectPdfBytes(await realPdf(), { name: 'senha.pdf', mimeType: 'application/pdf' }, async () => { throw password; }))
      .rejects.toMatchObject({ code: 'encrypted' });
  });

  it.each([
    ['worker', Object.assign(new Error('Setting up fake worker failed'), { name: 'UnknownErrorException' })],
    ['corrupted', Object.assign(new Error('Invalid PDF structure'), { name: 'InvalidPDFException' })]
  ])('classifica falha de %s sem expor a exceção técnica', async (code, parserError) => {
    await expect(inspectPdfBytes(await realPdf(), { name: 'falha.pdf', mimeType: 'application/pdf' }, async () => { throw parserError; }))
      .rejects.toMatchObject({ code });
  });

  it('entrega uma cópia descartável ao parser', async () => {
    const source = await realPdf();
    const size = source.byteLength;
    await inspectPdfBytes(source, { name: 'owner.pdf', mimeType: 'application/pdf' }, async (copy) => {
      structuredClone(copy, { transfer: [copy] });
      return { pageCount: 1 };
    });
    expect(source.byteLength).toBe(size);
  });
});
