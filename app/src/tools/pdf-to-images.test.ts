import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { pdfToImagesTool } from './pdf-to-images';
import type { FileInput } from '../core/types';

let nextId = 1;

async function makePdf(pages: number, name = 'fotos.pdf'): Promise<FileInput> {
  const doc = await PDFDocument.create();
  for (let index = 0; index < pages; index += 1) {
    doc.addPage([200, 300]);
  }
  const bytes = await doc.save();
  return {
    id: `file-${nextId++}`,
    name,
    size: bytes.byteLength,
    mimeType: 'application/pdf',
    data: bytes.slice().buffer as ArrayBuffer
  };
}

function corruptPdf(name: string): FileInput {
  return {
    id: `file-${nextId++}`,
    name,
    size: 4,
    mimeType: 'application/pdf',
    data: new Uint8Array([37, 80, 68, 70]).buffer
  };
}

describe('pdfToImagesTool', () => {
  it('rejeita validação sem arquivos', () => {
    expect(pdfToImagesTool.validate({ inputs: [], parameters: {} }).ok).toBe(false);
  });

  it('rejeita mais de um arquivo na validação', () => {
    const result = pdfToImagesTool.validate({
      inputs: [corruptPdf('a.pdf'), corruptPdf('b.pdf')],
      parameters: {}
    });
    expect(result.ok).toBe(false);
  });

  it('rejeita escala fora da faixa permitida', () => {
    const result = pdfToImagesTool.validate({
      inputs: [corruptPdf('a.pdf')],
      parameters: { scale: 9 }
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('escala');
  });

  it('aceita escala dentro da faixa', () => {
    const result = pdfToImagesTool.validate({
      inputs: [corruptPdf('a.pdf')],
      parameters: { scale: 2 }
    });
    expect(result.ok).toBe(true);
  });

  it('falha com ok:false de forma graciosa quando o ambiente não tem canvas', async () => {
    const input = await makePdf(2);
    const result = await pdfToImagesTool.execute({ inputs: [input], parameters: {} });
    expect(result.ok).toBe(false);
    expect(result.outputs).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes('canvas'))).toBe(true);
  });

  it('cancela cooperativamente e retorna estado de cancelamento', async () => {
    const input = await makePdf(3);
    const controller = new AbortController();
    controller.abort();
    const result = await pdfToImagesTool.execute({
      inputs: [input],
      parameters: {},
      signal: controller.signal
    });
    expect(result.ok).toBe(false);
    expect(result.outputs).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes('cancelada'))).toBe(true);
    expect(result.metrics?.pages).toBe(0);
  });

  it('reporta progresso crescente até concluído mesmo sem canvas', async () => {
    const input = await makePdf(1);
    const progress: number[] = [];
    await pdfToImagesTool.execute({
      inputs: [input],
      parameters: {},
      progress: (percent) => progress.push(percent)
    });
    expect(progress[progress.length - 1]).toBe(100);
  });

  it('metadados e anúncio disponível no catálogo', () => {
    expect(pdfToImagesTool.availability).toBe('available');
    expect(pdfToImagesTool.id).toBe('pdf-to-images');
    expect(pdfToImagesTool.outputs[0].kind).toBe('image');
    expect(pdfToImagesTool.capabilities.cancellable).toBe(true);
  });
});