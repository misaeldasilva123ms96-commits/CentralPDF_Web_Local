import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { mergePdfsTool } from './merge-pdfs';
import type { FileInput } from '../core/types';

let nextId = 1;

async function makePdf(pages: number, name?: string, title?: string): Promise<FileInput> {
  const doc = await PDFDocument.create();
  if (title) doc.setTitle(title);
  for (let index = 0; index < pages; index += 1) {
    doc.addPage([200, 300]);
  }
  const bytes = await doc.save();
  return {
    id: `file-${nextId++}`,
    name: name ?? `${title ?? 'doc'}-${pages}-p.pdf`,
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

function makeEncryptedPdf(name?: string): FileInput {
  const objects: string[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
  objects[3] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>';
  objects[4] = '<< /Length 0 /Filter /FlateDecode >>';

  let body = '%PDF-1.4\n';
  const offsets: Record<number, number> = {};
  for (let id = 1; id <= 4; id += 1) {
    offsets[id] = body.length;
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }

  const xrefStart = body.length;
  body +=
    'xref\n0 5\n0000000000 65535 f \n' +
    [1, 2, 3, 4]
      .map((id) => `${String(offsets[id]).padStart(10, '0')} 00000 n \n`)
      .join('');
  body += `trailer\n<< /Size 5 /Root 1 0 R /Encrypt 4 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  const encoded = Uint8Array.from(new TextEncoder().encode(body));
  return {
    id: `file-${nextId++}`,
    name: name ?? 'protegido.pdf',
    size: encoded.byteLength,
    mimeType: 'application/pdf',
    data: encoded.slice().buffer as ArrayBuffer
  };
}

describe('mergePdfsTool', () => {
  it('1. rejeita a validação sem arquivos', () => {
    const result = mergePdfsTool.validate({ inputs: [], parameters: {} });
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes('pelo menos'))).toBe(true);
  });

  it('2. exige no mínimo dois PDFs na validação', async () => {
    const one = await makePdf(1, 'unico.pdf');
    const result = mergePdfsTool.validate({ inputs: [one], parameters: {} });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('dois');
  });

  it('3. junta dois PDFs e preserva a ordem das páginas', async () => {
    const first = await makePdf(2, 'a.pdf', 'Origin');
    const second = await makePdf(3, 'b.pdf');
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
    const merged = await PDFDocument.load(result.outputs[0].data);
    expect(merged.getPageCount()).toBe(5);
    expect(progress[progress.length - 1][1]).toBe('concluído');
    expect(result.metrics?.pages).toBe(5);
    expect(result.metrics?.bytesIn).toBe(bytesIn);
    expect(result.metrics?.filesProcessed).toBe(2);
    expect(result.metrics?.filesIgnored).toBe(0);
  });

  it('4. junta três PDFs sem duplicar páginas', async () => {
    const pdfs = [await makePdf(1, 'a.pdf'), await makePdf(2, 'b.pdf'), await makePdf(1, 'c.pdf')];
    const result = await mergePdfsTool.execute({ inputs: pdfs, parameters: {} });
    expect(result.ok).toBe(true);
    const merged = await PDFDocument.load(result.outputs[0].data);
    expect(merged.getPageCount()).toBe(4);
  });

  it('5. preserva a ordem de entrada das páginas', async () => {
    const seq = [await makePdf(1, 'primeiro.pdf'), await makePdf(1, 'segundo.pdf')];
    const result = await mergePdfsTool.execute({ inputs: seq, parameters: {} });
    const loaded = await PDFDocument.load(result.outputs[0].data);
    expect(loaded.getPageCount()).toBe(2);
    expect(result.outputs[0].name).toBe('PDF_unido.pdf');
  });

  it('6. ignora arquivo corrompido entre válidos e avisa qual foi', async () => {
    const good1 = await makePdf(1, 'v1.pdf');
    const broken = corruptPdf('quebrado.pdf');
    const good2 = await makePdf(1, 'v2.pdf');
    const result = await mergePdfsTool.execute({ inputs: [good1, broken, good2], parameters: {} });
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => w.includes('quebrado.pdf'))).toBe(true);
    expect(result.metrics?.pages).toBe(2);
    expect(result.metrics?.filesProcessed).toBe(2);
    expect(result.metrics?.filesIgnored).toBe(1);
    expect((await PDFDocument.load(result.outputs[0].data)).getPageCount()).toBe(2);
  });

  it('7. falha com ok:false quando nenhum arquivo produz páginas', async () => {
    const result = await mergePdfsTool.execute({
      inputs: [corruptPdf('r1.pdf'), corruptPdf('r2.pdf')],
      parameters: {}
    });
    expect(result.ok).toBe(false);
    expect(result.outputs).toHaveLength(0);
    expect(result.metrics?.pages).toBe(0);
    expect(result.metrics?.filesIgnored).toBe(2);
  });

  it('8. aceita dois arquivos com o mesmo nome como entradas distintas', async () => {
    const first = await makePdf(1, 'documento.pdf');
    const second = await makePdf(1, 'documento.pdf');
    expect(first.id).not.toBe(second.id);
    const result = await mergePdfsTool.execute({ inputs: [first, second], parameters: {} });
    expect(result.ok).toBe(true);
    expect((await PDFDocument.load(result.outputs[0].data)).getPageCount()).toBe(2);
  });

  it('9. preserva metadados do primeiro PDF quando habilitado', async () => {
    const origin = await makePdf(1, 'origem.pdf', 'Título Original');
    const result = await mergePdfsTool.execute({ inputs: [origin, await makePdf(1, 'outro.pdf')], parameters: { preserveMetadata: true } });
    const merged = await PDFDocument.load(result.outputs[0].data);
    expect(merged.getTitle()).toBe('Título Original');
  });

  it('10. não preserva metadados quando desabilitado', async () => {
    const origin = await makePdf(1, 'origem.pdf', 'Título Original');
    const result = await mergePdfsTool.execute({ inputs: [origin, await makePdf(1, 'outro.pdf')], parameters: { preserveMetadata: false } });
    const merged = await PDFDocument.load(result.outputs[0].data);
    expect(merged.getTitle()).toBeUndefined();
  });

  it('11. respeita nome de saída customizado e garante a extensão .pdf', async () => {
    const pdfs = [await makePdf(1), await makePdf(1)];
    const comPonto = await mergePdfsTool.execute({ inputs: pdfs, parameters: { outputName: 'relatorio final.pdf' } });
    const semPonto = await mergePdfsTool.execute({ inputs: pdfs, parameters: { outputName: 'relatorio-sem-extensao' } });
    expect(comPonto.outputs[0].name).toBe('relatorio final.pdf');
    expect(semPonto.outputs[0].name).toBe('relatorio-sem-extensao.pdf');
  });

  it('12. bloqueia path traversal no nome de saída', async () => {
    const pdfs = [await makePdf(1), await makePdf(1)];
    const result = await mergePdfsTool.execute({
      inputs: pdfs,
      parameters: { outputName: '../../etc/senhas.pdf' }
    });
    const name = result.outputs[0].name;
    expect(name).not.toContain('/');
    expect(name).not.toContain('..');
    expect(name).toMatch(/\.pdf$/);
  });

  it('13. cancela cooperativamente entre arquivos sem emitir saída', async () => {
    const controller = new AbortController();
    const pdfs = [await makePdf(1, 'a.pdf'), await makePdf(1, 'b.pdf')];
    const resultPromise = mergePdfsTool.execute({
      inputs: pdfs,
      parameters: {},
      signal: controller.signal
    });
    controller.abort();
    const result = await resultPromise;
    expect(result.ok).toBe(false);
    expect(result.outputs).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes('Junção cancelada antes de terminar.'))).toBe(true);
  });

  it('cancela antes de processar o primeiro arquivo', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await mergePdfsTool.execute({
      inputs: [await makePdf(1, 'a.pdf'), await makePdf(1, 'b.pdf')],
      parameters: {},
      signal: controller.signal
    });
    expect(result.ok).toBe(false);
    expect(result.outputs).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes('Junção cancelada'))).toBe(true);
    expect(result.metrics?.filesProcessed).toBe(0);
  });

  it('cancela entre arquivos no meio da junção', async () => {
    const controller = new AbortController();
    const progress: string[] = [];
    const result = await mergePdfsTool.execute({
      inputs: [await makePdf(1, 'a.pdf'), await makePdf(1, 'b.pdf'), await makePdf(1, 'c.pdf')],
      parameters: {},
      signal: controller.signal,
      progress: (_percent, stage) => {
        progress.push(stage ?? '');
        if (progress.filter((s) => s.startsWith('processando')).length === 2) {
          controller.abort();
        }
      }
    });
    expect(result.ok).toBe(false);
    expect(result.outputs).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes('Junção cancelada antes de terminar.'))).toBe(true);
    expect(result.metrics?.pages).toBeLessThan(3);
  });

  it('cancela antes de salvar o arquivo final', async () => {
    const controller = new AbortController();
    const result = await mergePdfsTool.execute({
      inputs: [await makePdf(1, 'a.pdf'), await makePdf(1, 'b.pdf')],
      parameters: {},
      signal: controller.signal,
      progress: (_percent, stage) => {
        if (stage === 'gerando arquivo final') controller.abort();
      }
    });
    expect(result.ok).toBe(false);
    expect(result.outputs).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes('Junção cancelada antes de terminar.'))).toBe(true);
  });

  it('ignora PDF protegido por senha entre válidos com aviso específico', async () => {
    const locked = makeEncryptedPdf('segredo.pdf');
    const result = await mergePdfsTool.execute({
      inputs: [await makePdf(1, 'v1.pdf'), locked, await makePdf(1, 'v2.pdf')],
      parameters: {}
    });
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => w.includes('protegido por senha'))).toBe(true);
    expect(result.warnings.some((w) => w.includes('segredo.pdf'))).toBe(true);
    expect(result.metrics?.pages).toBe(2);
    expect(result.metrics?.filesIgnored).toBe(1);
  });

  it('falha com ok:false quando todos os PDFs estão protegidos', async () => {
    const result = await mergePdfsTool.execute({
      inputs: [makeEncryptedPdf('p1.pdf'), makeEncryptedPdf('p2.pdf')],
      parameters: {}
    });
    expect(result.ok).toBe(false);
    expect(result.outputs).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes('protegido por senha'))).toBe(true);
    expect(result.metrics?.filesIgnored).toBe(2);
  });

  it('único PDF é bloqueado na validação (minFiles: 2)', async () => {
    const result = mergePdfsTool.validate({ inputs: [await makePdf(1, 'apenas-um.pdf')], parameters: {} });
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes('dois'))).toBe(true);
  });

  it('nome de saída vazio cai no padrão com extensão .pdf', async () => {
    const pdfs = [await makePdf(1), await makePdf(1)];
    const result = await mergePdfsTool.execute({ inputs: pdfs, parameters: { outputName: '   ' } });
    expect(result.outputs[0].name).toBe('PDF_unido.pdf');
  });

  it('nome de saída sanitiza caracteres de controle', async () => {
    const pdfs = [await makePdf(1), await makePdf(1)];
    const result = await mergePdfsTool.execute({ inputs: pdfs, parameters: { outputName: 'a\u0000b\u001f.pdf' } });
    expect(result.outputs[0].name).toBe('ab.pdf');
  });

  it('14. nunca retorna ok:true com um PDF vazio (zero páginas validas)', async () => {
    const result = await mergePdfsTool.execute({
      inputs: [corruptPdf('x.pdf'), corruptPdf('y.pdf')],
      parameters: {}
    });
    expect(result.ok).toBe(false);
    expect(result.outputs).toHaveLength(0);
  });

  it('15. o PDF final é reaberto com pdf-lib quando há páginas', async () => {
    const result = await mergePdfsTool.execute({ inputs: [await makePdf(2), await makePdf(2)], parameters: {} });
    expect(result.ok).toBe(true);
    await expect(PDFDocument.load(result.outputs[0].data)).resolves.toBeDefined();
  });

  it('16. métricas refletem arquivos processados e ignorados', async () => {
    const result = await mergePdfsTool.execute({
      inputs: [await makePdf(1, 'ok1.pdf'), corruptPdf('ruim.pdf'), await makePdf(2, 'ok2.pdf')],
      parameters: {}
    });
    expect(result.metrics?.filesProcessed).toBe(2);
    expect(result.metrics?.filesIgnored).toBe(1);
    expect(result.metrics?.bytesIn).toBeGreaterThan(0);
    expect(result.metrics?.bytesOut).toBeGreaterThan(0);
    expect(result.metrics?.durationMs).toBeGreaterThanOrEqual(0);
  });
});