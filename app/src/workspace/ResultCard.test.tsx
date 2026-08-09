import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { ResultCard } from './ResultCard';
import type { ToolResult } from '../core/types';

let nextUrl = 1;
const created: string[] = [];
const revoked: string[] = [];

function stubBlobUrls(): void {
  nextUrl = 1;
  created.length = 0;
  revoked.length = 0;
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: () => {
      const url = `blob:url-${nextUrl}`;
      nextUrl += 1;
      created.push(url);
      return url;
    }
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    value: (url: string) => {
      revoked.push(url);
    }
  });
}

function output(name: string, bytes = 8): ToolResult['outputs'][number] {
  return {
    name,
    mimeType: 'application/pdf',
    kind: 'pdf',
    data: new Uint8Array(bytes).buffer
  };
}

function resultWith(outputs: ToolResult['outputs'][number][]): ToolResult {
  return {
    ok: true,
    outputs,
    warnings: [],
    metrics: { durationMs: 10, bytesIn: 100, bytesOut: 50, pages: 1 }
  };
}

beforeEach(() => {
  stubBlobUrls();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ResultCard — Blob URLs fora do render', () => {
  it('gera uma URL para uma única saída após o commit', () => {
    render(
      <ResultCard status="succeeded" result={resultWith([output('a.pdf')])} toolName="Juntar PDFs" onReprocess={() => undefined} />
    );
    expect(created).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Baixar a.pdf' })).toHaveAttribute('href', 'blob:url-1');
  });

  it('gera uma URL para cada uma das três saídas', () => {
    render(
      <ResultCard
        status="succeeded"
        result={resultWith([output('a.png'), output('b.png'), output('c.png')])}
        toolName="PDF para imagens"
        onReprocess={() => undefined}
      />
    );
    expect(created).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Baixar a.png' })).toHaveAttribute('href', 'blob:url-1');
    expect(screen.getByRole('link', { name: 'Baixar c.png' })).toHaveAttribute('href', 'blob:url-3');
  });

  it('revoga todas as URLs ao desmontar', () => {
    const { unmount } = render(
      <ResultCard
        status="succeeded"
        result={resultWith([output('a.pdf'), output('b.pdf')])}
        toolName="Juntar PDFs"
        onReprocess={() => undefined}
      />
    );
    expect(revoked).toHaveLength(0);
    unmount();
    expect(revoked).toEqual(created);
    expect(revoked).toHaveLength(2);
  });

  it('trocar o resultado revoga as URLs antigas', () => {
    const first = resultWith([output('primeiro.pdf')]);
    const second = resultWith([output('segundo.pdf')]);
    const { rerender } = render(
      <ResultCard status="succeeded" result={first} toolName="Juntar PDFs" onReprocess={() => undefined} />
    );
    expect(created).toHaveLength(1);

    rerender(<ResultCard status="succeeded" result={second} toolName="Juntar PDFs" onReprocess={() => undefined} />);
    expect(revoked).toEqual(['blob:url-1']);
    expect(created).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Baixar segundo.pdf' })).toHaveAttribute('href', 'blob:url-2');
  });

  it('mantém a URL estável entre renders sem recriar (evita loop)', () => {
    const result = resultWith([output('a.pdf')]);
    const { rerender } = render(
      <ResultCard status="succeeded" result={result} toolName="Juntar PDFs" onReprocess={() => undefined} />
    );
    rerender(<ResultCard status="succeeded" result={result} toolName="Juntar PDFs" onReprocess={() => undefined} />);
    expect(created).toHaveLength(1);
  });

  it('StrictMode não deixa URLs órfãs após montagem dupla e desmontagem', () => {
    const { unmount } = render(
      <StrictMode>
        <ResultCard status="succeeded" result={resultWith([output('a.pdf')])} toolName="Juntar PDFs" onReprocess={() => undefined} />
      </StrictMode>
    );
    unmount();
    const orphaned = created.filter((url) => !revoked.includes(url));
    expect(orphaned).toHaveLength(0);
    expect(created.length).toBeGreaterThan(0);
  });

  it('falha não gera URL nem botão de download', () => {
    render(<ResultCard status="failed" error="Falhou" toolName="Juntar PDFs" onReprocess={() => undefined} />);
    expect(created).toHaveLength(0);
    expect(screen.queryByRole('link', { name: /Baixar/ })).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('cancelamento não gera URL', () => {
    render(<ResultCard status="cancelled" toolName="Juntar PDFs" onReprocess={() => undefined} />);
    expect(created).toHaveLength(0);
    expect(screen.queryByRole('link', { name: /Baixar/ })).not.toBeInTheDocument();
  });

  it('resultado sem saída não cria botão de download nem URL', () => {
    render(<ResultCard status="succeeded" result={resultWith([])} toolName="Juntar PDFs" onReprocess={() => undefined} />);
    expect(created).toHaveLength(0);
    expect(screen.queryByRole('link', { name: /Baixar/ })).not.toBeInTheDocument();
  });
});