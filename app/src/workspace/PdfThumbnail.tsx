import { useEffect, useRef, useState } from 'react';
import { loadPdf } from '../tools/pdf-engine';

interface PdfThumbnailProps {
  data: ArrayBuffer;
  name: string;
  onPageCount?: (pages: number) => void;
}

export function PdfThumbnail({ data, name, onPageCount }: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let destroy: (() => Promise<void>) | undefined;

    if (import.meta.env.MODE === 'test') {
      setFailed(true);
      return undefined;
    }

    void (async () => {
      try {
        const loaded = await loadPdf(data.slice(0));
        destroy = loaded.destroy;
        if (cancelled) return;
        onPageCount?.(loaded.document.numPages);
        const page = await loaded.document.getPage(1);
        try {
          const canvas = canvasRef.current;
          const context = canvas?.getContext('2d');
          if (!canvas || !context || cancelled) return;
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(1.35, 260 / Math.max(baseViewport.width, 1));
          const viewport = page.getViewport({ scale });
          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          await page.render({ canvas, canvasContext: context, viewport, background: '#ffffff' }).promise;
        } finally {
          page.cleanup();
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (destroy) void destroy();
    };
  }, [data, onPageCount]);

  return (
    <div className={`cp-pdf-thumbnail${failed ? ' is-fallback' : ''}`}>
      <canvas ref={canvasRef} aria-label={`Prévia da primeira página de ${name}`} />
      {failed && <span aria-hidden="true">PDF</span>}
    </div>
  );
}
