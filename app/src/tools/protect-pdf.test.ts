import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildEncryptArgv, protectPdfTool, resolveOwnerPassword } from './protect-pdf';
import type { FileInput } from '../core/types';

let nextId = 1;

async function makePdf(pages: number, name = 'contrato.pdf'): Promise<FileInput> {
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

describe('buildEncryptArgv', () => {
  it('monta comando --encrypt com user e owner password e chave 256', () => {
    const argv = buildEncryptArgv('segredo123', 'adm456', {
      allowPrinting: false,
      allowCopying: false,
      allowEditing: false
    });
    expect(argv).toContain('--encrypt');
    expect(argv).toContain('segredo123');
    expect(argv).toContain('adm456');
    expect(argv).toContain('256');
  });

  it('mapeia restrições negadas para none/n', () => {
    const argv = buildEncryptArgv('senha123', 'senha123', {
      allowPrinting: false,
      allowCopying: false,
      allowEditing: false
    });
    expect(argv).toContain('--print');
    expect(argv[argv.indexOf('--print') + 1]).toBe('none');
    expect(argv[argv.indexOf('--extract') + 1]).toBe('n');
    expect(argv[argv.indexOf('--modify') + 1]).toBe('none');
  });

  it('mapeia restrições permitidas para full/y/all', () => {
    const argv = buildEncryptArgv('senha123', 'senha123', {
      allowPrinting: true,
      allowCopying: true,
      allowEditing: true
    });
    expect(argv[argv.indexOf('--print') + 1]).toBe('full');
    expect(argv[argv.indexOf('--extract') + 1]).toBe('y');
    expect(argv[argv.indexOf('--modify') + 1]).toBe('all');
  });
});

describe('protectPdfTool', () => {
  it('rejeita validação sem arquivos', () => {
    expect(protectPdfTool.validate({ inputs: [], parameters: {} }).ok).toBe(false);
  });

  it('rejeita senha com menos de 4 caracteres', () => {
    const result = protectPdfTool.validate({
      inputs: [corruptPdf('a.pdf')],
      parameters: { password: 'abc' }
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('4');
  });

  it('aceita senha válida', () => {
    const result = protectPdfTool.validate({
      inputs: [corruptPdf('a.pdf')],
      parameters: { password: 'ab12cd' }
    });
    expect(result.ok).toBe(true);
  });

  it('rejeita mais de um arquivo', () => {
    const result = protectPdfTool.validate({
      inputs: [corruptPdf('a.pdf'), corruptPdf('b.pdf')],
      parameters: { password: 'ab12cd' }
    });
    expect(result.ok).toBe(false);
  });

  it('falha com ok:false gracioso quando o ambiente não tem Worker (exige navegador)', async () => {
    const input = await makePdf(1);
    const result = await protectPdfTool.execute({
      inputs: [input],
      parameters: { password: 'ab12cd34' }
    });
    expect(result.ok).toBe(false);
    expect(result.outputs).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes('navegador'))).toBe(true);
    expect(result.metrics?.bytesOut).toBe(0);
  });

  it('executa duas vezes com o mesmo FileInput e ambas chegam ao mesmo resultado', async () => {
    const input = await makePdf(1);
    const first = await protectPdfTool.execute({
      inputs: [input],
      parameters: { password: 'ab12cd34' }
    });
    const second = await protectPdfTool.execute({
      inputs: [input],
      parameters: { password: 'ab12cd34' }
    });
    expect(first.ok).toBe(false);
    expect(second.ok).toBe(false);
    expect(second.outputs).toHaveLength(0);
    expect(second.warnings.some((w) => w.includes('navegador'))).toBe(true);
    expect(second.metrics?.bytesOut).toBe(0);
    expect(input.data.byteLength).toBeGreaterThan(0);
  });

  it('rejeita senha que começa com hífen (proteção de argv)', () => {
    const result = protectPdfTool.validate({
      inputs: [corruptPdf('a.pdf')],
      parameters: { password: '--force' }
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('"-"'))).toBe(true);
  });

  it('rejeita owner password que começa com hífen', () => {
    const result = protectPdfTool.validate({
      inputs: [corruptPdf('a.pdf')],
      parameters: { password: 'ab12cd', ownerPassword: '--admin' }
    });
    expect(result.ok).toBe(false);
  });

  it('rejeita owner password com espaço antes de hífen (normalização executada)', () => {
    const result = protectPdfTool.validate({
      inputs: [corruptPdf('a.pdf')],
      parameters: { password: 'ab12cd', ownerPassword: '  --admin' }
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('"-"'))).toBe(true);
  });

  it('é anotada como WASM e experimental no catálogo', () => {
    expect(protectPdfTool.availability).toBe('experimental');
    expect(protectPdfTool.runtime).toEqual(['BROWSER_WASM']);
    expect(protectPdfTool.parametersSchema.required).toContain('password');
  });
});

describe('resolveOwnerPassword', () => {
  it('usa a senha de abertura quando owner password não é informado', () => {
    expect(resolveOwnerPassword('segredo123', undefined)).toBe('segredo123');
  });

  it('usa a senha de abertura quando owner password vem em branco (default do esquema)', () => {
    expect(resolveOwnerPassword('segredo123', '')).toBe('segredo123');
    expect(resolveOwnerPassword('segredo123', '   ')).toBe('segredo123');
  });

  it('mantém owner password informado', () => {
    expect(resolveOwnerPassword('segredo123', 'adm456')).toBe('adm456');
  });
});