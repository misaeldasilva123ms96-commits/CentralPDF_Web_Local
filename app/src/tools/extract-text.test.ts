import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { extractTextTool } from './extract-text';
import type { FileInput } from '../core/types';

let nextId = 1;

async function pdfWithText(
  pages: Array<{ title: string; body: string }>,
  name = 'relatorio.pdf'
): Promise<FileInput> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const { title, body } of pages) {
    const page = doc.addPage([400, 400]);
    page.drawText(title, { x: 40, y: 340, font, size: 18 });
    page.drawText(body, { x: 40, y: 300, font, size: 12 });
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

async function pdfWithoutText(name = 'escaneado.pdf'): Promise<FileInput> {
  const doc = await PDFDocument.create();
  for (let index = 0; index < 2; index += 1) {
    doc.addPage([300, 300]);
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

describe('extractTextTool', () => {
  it('rejeita validação sem arquivos', () => {
    expect(extractTextTool.validate({ inputs: [], parameters: {} }).ok).toBe(false);
  });

  it('rejeita mais de um arquivo na validação', () => {
    const result = extractTextTool.validate({
      inputs: [corruptPdf('a.pdf'), corruptPdf('b.pdf')],
      parameters: {}
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('um PDF por vez');
  });

  it('avisa quando o arquivo não parece um PDF', () => {
    const result = extractTextTool.validate({
      inputs: [{ id: 'file-1', name: 'a.txt', size: 6, mimeType: 'text/plain', data: new ArrayBuffer(6) }],
      parameters: {}
    });
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => w.includes('a.txt'))).toBe(true);
  });

  it('extrai o texto de todas as páginas em um único TXT', async () => {
    const input = await pdfWithText([
      { title: 'Introdução', body: 'Este é o primeiro parágrafo.' },
      { title: 'Conclusão', body: 'Este é o último parágrafo.' }
    ]);

    const result = await extractTextTool.execute({ inputs: [input], parameters: {} });

    expect(result.ok).toBe(true);
    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0].name).toBe('relatorio.txt');
    expect(result.outputs[0].mimeType).toBe('text/plain');

    const text = new TextDecoder().decode(result.outputs[0].data);
    expect(text).toContain('Introdução');
    expect(text).toContain('primeiro parágrafo');
    expect(text).toContain('Conclusão');
    expect(text).toContain('último parágrafo');
    expect(result.metrics?.pages).toBe(2);
    expect(result.metrics?.bytesOut).toBe(result.outputs[0].data.byteLength);
  });

  it('insere cabeçalho de página quando habilitado', async () => {
    const input = await pdfWithText([{ title: 'Parte 1', body: 'conteúdo único' }]);
    const result = await extractTextTool.execute({
      inputs: [input],
      parameters: { includePageNumbers: true }
    });
    expect(result.ok).toBe(true);
    const text = new TextDecoder().decode(result.outputs[0].data);
    expect(text).toContain('----- Página 1 -----');
  });

  it('falha com ok:false quando nenhum texto é encontrado e sugere OCR', async () => {
    const input = await pdfWithoutText();
    const result = await extractTextTool.execute({ inputs: [input], parameters: {} });
    expect(result.ok).toBe(false);
    expect(result.outputs).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes('OCR'))).toBe(true);
    expect(result.metrics?.pages).toBe(2);
  });

  it('cancela cooperativamente e reporta páginas processadas', async () => {
    const input = await pdfWithText([
      { title: 'A', body: 'página um' },
      { title: 'B', body: 'página dois' },
      { title: 'C', body: 'página três' }
    ]);
    const controller = new AbortController();
    let calls = 0;
    const result = await extractTextTool.execute({
      inputs: [input],
      parameters: {},
      signal: controller.signal,
      progress: () => {
        calls += 1;
        if (calls === 2) controller.abort();
      }
    });
    expect(result.ok).toBe(false);
    expect(result.outputs).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes('cancelada'))).toBe(true);
    expect(result.metrics?.pages).toBeLessThan(3);
  });

  it('reporta progresso crescente até concluído', async () => {
    const input = await pdfWithText([{ title: 'A', body: 'texto' }]);
    const progress: number[] = [];
    await extractTextTool.execute({
      inputs: [input],
      parameters: {},
      progress: (percent) => progress.push(percent)
    });
    expect(progress.length).toBeGreaterThan(0);
    expect(progress[progress.length - 1]).toBe(100);
  });
});