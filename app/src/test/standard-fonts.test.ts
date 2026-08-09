import { describe, expect, it } from 'vitest';

/**
 * Exercita o wrapper de fetch do setup que serve as fontes padrão do PDF.js
 * a partir de `public/standard_fonts`. O setup é carregado antes de todos os
 * testes, então `globalThis.fetch` aqui já é o wrapper.
 */
describe('fetch wrapper — fontes padrão do PDF.js', () => {
  it('aceita caminho relativo iniciado por barra e serve a fonte com 200', async () => {
    const response = await fetch('/standard_fonts/LiberationSans-Regular.ttf');
    expect(response.status).toBe(200);
    const data = new Uint8Array(await response.arrayBuffer());
    expect(data.byteLength).toBeGreaterThan(0);
    expect(new TextDecoder('ascii').decode(data.slice(0, 4))).toBe('\u0000\u0001\u0000\u0000');
  });

  it('aceita URL absoluta e serve a mesma fonte', async () => {
    const response = await fetch('http://localhost/standard_fonts/LiberationSans-Regular.ttf');
    expect(response.status).toBe(200);
    const data = new Uint8Array(await response.arrayBuffer());
    expect(data.byteLength).toBeGreaterThan(0);
  });

  it('aceita entrada como Request e serve a fonte', async () => {
    const request = new Request('http://localhost/standard_fonts/LiberationSans-Regular.ttf');
    const response = await fetch(request);
    expect(response.status).toBe(200);
    const data = new Uint8Array(await response.arrayBuffer());
    expect(data.byteLength).toBeGreaterThan(0);
  });

  it('retorna 404 para fonte inexistente', async () => {
    const response = await fetch('/standard_fonts/NaoExiste.ttf');
    expect(response.status).toBe(404);
  });

  it('bloqueia tentativa de traversal no nome do arquivo', async () => {
    const response = await fetch('/standard_fonts/..%2F..%2Fetc%2Fpasswd');
    expect(response.status).toBe(404);
  });

  it('bloqueia separadores e percent-encoding no nome do arquivo', async () => {
    const response = await fetch('/standard_fonts/..%5C..%5Csecret.ttf');
    expect(response.status).toBe(404);
  });

  it('delega requisições que não são de fonte ao fetch original', async () => {
    await expect(fetch('http://localhost/outro/arquivo.txt')).rejects.toThrow();
  });
});
