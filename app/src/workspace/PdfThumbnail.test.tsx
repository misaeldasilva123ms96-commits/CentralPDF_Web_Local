import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PdfThumbnail } from './PdfThumbnail';

const { loadPdfMock } = vi.hoisted(() => ({ loadPdfMock: vi.fn() }));

vi.mock('../tools/pdf-engine', () => ({
  loadPdf: loadPdfMock
}));

function loadedPdf() {
  const cancel = vi.fn();
  const cleanup = vi.fn();
  const destroy = vi.fn(async () => undefined);
  const renderPage = vi.fn(() => ({ promise: Promise.resolve(), cancel }));
  const page = {
    getViewport: ({ scale }: { scale: number }) => ({ width: 200 * scale, height: 300 * scale }),
    render: renderPage,
    cleanup
  };
  return {
    loaded: { document: { numPages: 3, getPage: vi.fn(async () => page) }, destroy },
    cancel,
    cleanup,
    destroy,
    renderPage
  };
}

beforeEach(() => {
  vi.stubEnv('MODE', 'development');
  loadPdfMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('PdfThumbnail', () => {
  it('não recarrega o PDF quando apenas o callback muda', async () => {
    const pdf = loadedPdf();
    loadPdfMock.mockResolvedValue(pdf.loaded);
    const firstCallback = vi.fn();
    const data = new ArrayBuffer(16);
    const { rerender } = render(
      <PdfThumbnail data={data} name="arquivo.pdf" fileId="file-1" onPageCount={firstCallback} />
    );

    await waitFor(() => expect(firstCallback).toHaveBeenCalledWith('file-1', 3));
    const secondCallback = vi.fn();
    rerender(<PdfThumbnail data={data} name="arquivo.pdf" fileId="file-1" onPageCount={secondCallback} />);

    expect(loadPdfMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('img', { name: 'Prévia da primeira página de arquivo.pdf' })).toBeInTheDocument();
  });

  it('cancela a renderização em andamento ao desmontar', async () => {
    const pdf = loadedPdf();
    loadPdfMock.mockResolvedValue(pdf.loaded);
    const { unmount } = render(<PdfThumbnail data={new ArrayBuffer(16)} name="arquivo.pdf" />);
    await waitFor(() => expect(pdf.renderPage).toHaveBeenCalled());

    unmount();
    expect(pdf.cancel).toHaveBeenCalledOnce();
    expect(pdf.destroy).toHaveBeenCalledOnce();
  });

  it('anuncia o estado alternativo quando a prévia falha', async () => {
    loadPdfMock.mockRejectedValue(new Error('PDF inválido'));
    render(<PdfThumbnail data={new ArrayBuffer(16)} name="invalido.pdf" />);

    expect(await screen.findByRole('img', { name: 'Prévia indisponível para invalido.pdf' })).toBeInTheDocument();
    expect(screen.getByText('PDF')).toHaveAttribute('aria-hidden', 'true');
  });
});
