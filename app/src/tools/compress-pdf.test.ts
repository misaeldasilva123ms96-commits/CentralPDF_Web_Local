import { describe, expect, it } from 'vitest';
import { compressPdfTool } from './compress-pdf';

describe('compressPdfTool (planejada)', () => {
  it('rejeita validação sem arquivos', () => {
    expect(compressPdfTool.validate({ inputs: [], parameters: {} }).ok).toBe(false);
  });

  it('rejeita qualidade inválida', () => {
    const result = compressPdfTool.validate({
      inputs: [{ id: 'file-1', name: 'a.pdf', size: 10, mimeType: 'application/pdf', data: new ArrayBuffer(10) }],
      parameters: { quality: 'extremo' }
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('Qualidade');
  });

  it('avisa quando o arquivo não parece um PDF', () => {
    const result = compressPdfTool.validate({
      inputs: [{ id: 'file-2', name: 'a.txt', size: 6, mimeType: 'text/plain', data: new TextEncoder().encode('olá').buffer }],
      parameters: {}
    });
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => w.includes('a.txt'))).toBe(true);
  });

  it('é anunciada como planned', () => {
    expect(compressPdfTool.availability).toBe('planned');
    expect(compressPdfTool.parametersSchema.properties?.quality).toBeDefined();
  });

  it('lança erro ao executar (ainda não implementada)', async () => {
    await expect(
      compressPdfTool.execute({
        inputs: [{ id: 'file-3', name: 'a.pdf', size: 10, mimeType: 'application/pdf', data: new ArrayBuffer(10) }],
        parameters: {}
      })
    ).rejects.toThrow('não está disponível');
  });
});