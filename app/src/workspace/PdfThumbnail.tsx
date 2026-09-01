import { useEffect, useRef, useState } from 'react';
import { loadPdf } from '../tools/pdf-engine';

interface PdfThumbnailProps {
  data: ArrayBuffer;
  name: string;
  fileId?: string;
  onPageCount?: (fileId: string, pages: number) => void;
}

export function PdfThumbnail({ data, name, fileId, onPageCount }: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onPageCountRef = useRef(onPageCount);
  const fileIdRef = useRef(fileId);
  const [failed, setFailed] = useState(false);

  useEffect(() => { onPageCountRef.current = onPageCount; }, [onPageCount]);
  useEffect(() => { fileIdRef.current = fileId; }, [fileId]);

  useEffect(() => {
    let cancelled = false;
    let destroy: (() => Promise<void>) | undefined;
    let cancelRender: (() => void) | undefined;
    setFailed(false);

    if (import.meta.env.MODE === 'test') {
      setFailed(true);
      return undefined;
    }

    void (async () => {
      try {
        const loaded = await loadPdf(data);
        destroy = loaded.destroy;
        if (cancelled) return;
        if (fileIdRef.current) onPageCountRef.current?.(fileIdRef.current, loaded.document.numPages);
        const page = await loaded.document.getPage(1);
        try {
          const canvas = canvasRef.current;
          if (!canvas || cancelled) return;
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(1.35, 260 / Math.max(baseViewport.width, 1));
          const viewport = page.getViewport({ scale });
          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          const renderTask = page.render({ canvas, viewport, background: '#ffffff' });
          cancelRender = () => renderTask.cancel();
          await renderTask.promise;
        } finally {
          page.cleanup();
        }
      } catch (error) {
        if (!cancelled) {
          setFailed(true);
          if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
            console.warn('[pdf-ingest] thumbnail-failed', {
              stage: 'thumbnail', engine: 'pdfjs', errorName: error instanceof Error ? error.name : '',
              errorMessage: error instanceof Error ? error.message : String(error), fileName: name,
              fileSize: data.byteLength, runtime: 'vite'
            });
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelRender?.();
      if (destroy) void destroy();
    };
  }, [data]);

  return (
    <div className={`cp-pdf-thumbnail${failed ? ' is-fallback' : ''}`}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={failed ? `Prévia indisponível para ${name}` : `Prévia da primeira página de ${name}`}
      />
      {failed && <span aria-hidden="true">PDF</span>}
    </div>
  );
}
