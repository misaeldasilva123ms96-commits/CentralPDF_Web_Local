import { describe, expect, it } from 'vitest';
import { compressPdfTool } from './compress-pdf';

describe('compressPdfTool (planejada)', () => {
  it('bloqueia a validação sem arquivos', () => {
    expect(compressPdfTool.validate({ inputs: [], parameters: {} }).ok).toBe(false);
  });

  it('bloqueia qualidade inválida', () => {
    const result = compressPdfTool.validate({
      inputs: [{ id: 'file-1', name: 'a.pdf', size: 10, mimeType: 'application/pdf', data: new ArrayBuffer(10) }],
      parameters: { quality: 'extremo' }
    });
    expect(result.ok).toBe(false);
  });

  it('avisa como planejada quando o arquivo não parece um PDF', () => {
    const result = compressPdfTool.validate({
      inputs: [{ id: 'file-2', name: 'a.txt', size: 6, mimeType: 'text/plain', data: new TextEncoder().encode('olá').buffer }],
      parameters: {}
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('Ferramenta planejada');
    expect(result.warnings.some((w) => w.includes('a.txt'))).toBe(false);
  });

  it('é anunciada como planned e nunca aceita execução', () => {
    expect(compressPdfTool.availability).toBe('planned');
    expect(compressPdfTool.parametersSchema.properties?.quality).toBeDefined();
    const result = compressPdfTool.validate({
      inputs: [{ id: 'file-3', name: 'a.pdf', size: 10, mimeType: 'application/pdf', data: new ArrayBuffer(10) }],
      parameters: { quality: 'high' }
    });
    expect(result.ok).toBe(false);
  });

  it('lança erro ao executar (ainda não implementada)', async () => {
    await expect(
      compressPdfTool.execute({
        inputs: [{ id: 'file-4', name: 'a.pdf', size: 10, mimeType: 'application/pdf', data: new ArrayBuffer(10) }],
        parameters: {}
      })
    ).rejects.toThrow('não está disponível');
  });
});