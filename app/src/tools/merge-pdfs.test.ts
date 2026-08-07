import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { mergePdfsTool } from './merge-pdfs';
import type { FileInput } from '../core/types';

async function makePdf(pages: number, title?: string): Promise<FileInput> {
  const doc = await PDFDocument.create();
  if (title) doc.setTitle(title);
  for (let index = 0; index < pages; index += 1) {
    doc.addPage([200, 300]);
  }
  const bytes = await doc.save();
  return {
    name: `${title ?? 'doc'}-${pages}-p.pdf`,
    size: bytes.byteLength,
    mimeType: 'application/pdf',
    data: bytes.slice().buffer as ArrayBuffer
  };
}

describe('mergePdfsTool', () => {
  it('rejeita a validação sem arquivos', () => {
    const result = mergePdfsTool.validate({ inputs: [], parameters: {} });
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes('pelo menos'))).toBe(true);
  });

  it('avisa quando um arquivo não é PDF válido', () => {
    const fake = {
      name: 'nota.txt',
      size: 4,
      mimeType: 'text/plain',
      data: new TextEncoder().encode('hello').buffer
    };
    const result = mergePdfsTool.validate({ inputs: [fake], parameters: {} });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('não parece ser um PDF válido');
  });

  it('junta dois PDFs em um único arquivo com as páginas na ordem', async () => {
    const first = await makePdf(2, 'Contrato');
    const second = await makePdf(3);
    const bytesIn = first.size + second.size;

    const progress: Array<[number, string]> = [];
    const result = await mergePdfsTool.execute({
      inputs: [first, second],
      parameters: {},
      progress: (percent, stage) => progress.push([percent, stage])
    });

    expect(result.ok).toBe(true);
    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0].name).toBe('PDF_unido.pdf');
    expect(result.outputs[0].kind).toBe('pdf');

    const merged = await PDFDocument.load(result.outputs[0].data);
    expect(merged.getPageCount()).toBe(5);
    expect(merged.getTitle()).toBe('Contrato');
    expect(result.metrics?.pages).toBe(5);
    expect(result.metrics?.bytesIn).toBe(bytesIn);
    expect(result.metrics?.bytesOut).toBe(result.outputs[0].data.byteLength);

    expect(progress[0][0]).toBeLessThan(progress[progress.length - 1][0]);
    expect(progress[progress.length - 1][1]).toBe('concluído');
  });

  it('respeita o nome de saída configurado (com e sem extensão)', async () => {
    const file = await makePdf(1);
    const resultado = await mergePdfsTool.execute({
      inputs: [file],
      parameters: { outputName: 'relatorio final.pdf' }
    });
    expect(resultado.outputs[0].name).toBe('relatorio final.pdf');
  });

  it('ignora arquivo corrompido e completa com aviso', async () => {
    const good = await makePdf(1);
    const corrupt = {
      name: 'quebrado.pdf',
      size: 4,
      mimeType: 'application/pdf',
      data: new Uint8Array([37, 80, 68, 70]).buffer
    };
    const result = await mergePdfsTool.execute({
      inputs: [good, corrupt],
      parameters: {}
    });
    expect(result.ok).toBe(true);
    expect(result.warnings[0]).toContain('quebrado.pdf');
    expect(result.metrics?.pages).toBe(1);
    expect((await PDFDocument.load(result.outputs[0].data)).getPageCount()).toBe(1);
  });
});