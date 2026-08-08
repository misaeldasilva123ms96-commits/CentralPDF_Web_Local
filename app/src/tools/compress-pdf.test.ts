import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { encode as jpegEncode } from 'jpeg-js';
import { compressPdfTool } from './compress-pdf';
import type { FileInput } from '../core/types';

function makeJpeg(width: number, height: number, quality: number): Uint8Array {
  const data = new Uint8Array(width * height * 3);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = (index * 7) % 256;
  }
  return Uint8Array.from(jpegEncode({ width, height, data }, quality).data);
}

let nextId = 1;

function toFileInput(name: string, pdfBytes: Uint8Array): FileInput {
  return {
    id: `file-${nextId++}`,
    name,
    size: pdfBytes.byteLength,
    mimeType: 'application/pdf',
    data: pdfBytes.slice().buffer as ArrayBuffer
  };
}

async function pdfWithJpeg(pages: number, jpeg: Uint8Array): Promise<FileInput> {
  const doc = await PDFDocument.create();
  for (let index = 0; index < pages; index += 1) {
    const page = doc.addPage([400, 400]);
    const image = await doc.embedJpg(jpeg);
    page.drawImage(image, { x: 0, y: 0, width: 400, height: 400 });
  }
  return toFileInput(`foto-${pages}p.pdf`, await doc.save());
}

describe('compressPdfTool', () => {
  it('rejeita validação sem arquivos', () => {
    expect(compressPdfTool.validate({ inputs: [], parameters: {} }).ok).toBe(false);
  });

  it('rejeita qualidade inválida', () => {
    const file = toFileInput('a.pdf', new Uint8Array(256));
    const result = compressPdfTool.validate({ inputs: [file], parameters: { quality: 'extremo' } });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('Qualidade');
  });

  it('recomprime JPEG, preserva páginas e reduz o tamanho', async () => {
    const jpeg = makeJpeg(1200, 1200, 95);
    const input = await pdfWithJpeg(2, jpeg);

    const result = await compressPdfTool.execute({
      inputs: [input],
      parameters: { quality: 'balanced', recompressImages: true }
    });

    expect(result.ok).toBe(true);
    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0].name).toBe('foto-2p_comprimido.pdf');
    expect(result.metrics?.pages).toBe(2);
    expect(result.metrics?.imagesRecompressed).toBe(2);
    expect(result.metrics?.bytesIn).toBe(input.size);
    expect(result.metrics?.bytesOut).toBeLessThan(input.size);

    const parsed = await PDFDocument.load(result.outputs[0].data);
    expect(parsed.getPageCount()).toBe(2);
  });

  it('aceita PDF sem imagens e mantém as páginas', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([300, 300]);
    const input = toFileInput('texto.pdf', await doc.save());

    const result = await compressPdfTool.execute({
      inputs: [input],
      parameters: {}
    });

    expect(result.ok).toBe(true);
    expect(result.metrics?.pages).toBe(1);
    expect(result.metrics?.imagesRecompressed ?? 0).toBe(0);
  });

  it('reporta progresso crescente até concluído', async () => {
    const input = await pdfWithJpeg(1, makeJpeg(400, 400, 0.8));
    const progress: number[] = [];
    await compressPdfTool.execute({
      inputs: [input],
      parameters: {},
      progress: (percent) => progress.push(percent)
    });
    expect(progress.length).toBeGreaterThan(1);
    expect(progress[progress.length - 1]).toBe(100);
  });

  it('ignora arquivo corrompido e completa com aviso', async () => {
    const result = await compressPdfTool.execute({
      inputs: [toFileInput('roto.pdf', new Uint8Array([37, 80, 68, 70]))],
      parameters: {}
    });
    expect(result.ok).toBe(false);
    expect(result.warnings[0]).toContain('roto.pdf');
  });
});