import { useEffect, useRef, useState } from 'react';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import s from './index.module.css';
import type { OriginalPdf } from '../../../hooks/useOriginalPdf';
import { Spinner } from '../Spinner';
import { useLanguage } from '../../../i18n';

interface OriginalPdfSheetProps {
  // The spell's original PDF as it's being read, or null when the spell has none.
  original: OriginalPdf | null;
  // The page being edited (1-based): the PDF's page of the same number.
  pageNumber: number;
  // The spell page's sheet (unscaled px) and the editor's zoom: the PDF page is drawn as
  // wide as it, at the same zoom, so the two compare side by side.
  width: number;
  height: number;
  zoom: number;
}

// A page of the original PDF as a sheet beside (or behind) the one being edited. Drawn at
// its on-screen size (sharp on high-density screens), again when the zoom changes; the
// last drawing stays, dimmed, until the next one is ready.
export const OriginalPdfSheet = ({ original, pageNumber, width, height, zoom }: OriginalPdfSheetProps) => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(false);
  // The PDF page's own height for this width, once it's known (its proportions may not
  // be the spell page's).
  const [pageHeight, setPageHeight] = useState<number | null>(null);
  const pdf = original?.status === 'ready' ? original.pdf : null;
  const pageExists = !!pdf && pageNumber >= 1 && pageNumber <= pdf.numPages;
  const cssWidth = Math.round(width * zoom);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!pdf || !pageExists || !canvas || cssWidth <= 0) return;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    let cancelled = false;
    setRendering(true);
    pdf.getPage(pageNumber).then(page => {
      if (cancelled) return;
      const dpr = window.devicePixelRatio || 1;
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      setPageHeight(Math.round(viewport.height / dpr));
      task = page.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas });
      return task.promise;
    })
      .catch(() => { /* a drawing cancelled by the next one */ })
      .finally(() => { if (!cancelled) setRendering(false); });
    return () => { cancelled = true; task?.cancel(); };
  }, [pdf, pageExists, pageNumber, cssWidth]);

  const status = !original
    ? t.spell.noOriginalPdf
    : original.status === 'loading'
    ? <Spinner isLoading />
    : original.status === 'error'
      ? <><FontAwesomeIcon icon={faTriangleExclamation} />{t.spell.originalLoadError}</>
      : !pageExists ? t.spell.originalPageMissing : null;

  return (
    <div
      data-testid="original-pdf-sheet"
      className={s.sheet}
      style={{ width: cssWidth, height: pageExists && pageHeight ? pageHeight : Math.round(height * zoom) }}
    >
      {pageExists && (
        <canvas
          ref={canvasRef}
          data-testid="original-pdf-canvas"
          className={`${s.canvas} ${rendering ? s.canvasRendering : ''}`}
        />
      )}
      {status && <div data-testid={pageExists ? undefined : 'original-pdf-status'} className={s.status}>{status}</div>}
    </div>
  );
};
