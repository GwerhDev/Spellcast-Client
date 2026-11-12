import { useRef } from 'react';
import s from './index.module.css';
import { PdfToolbar, type PdfPanelOptions } from './PdfToolbar';
import { OriginalPdfSheet } from '../OriginalPdfSheet';
import { ZoomOverlay } from '../Zoom/ZoomOverlay';
import { OriginalPdfEmpty } from '../OriginalPdfEmpty';
import { useZoom } from '../../../hooks/useZoom';
import { useLanguage } from '../../../i18n';
import type { OriginalPdf } from '../../../hooks/useOriginalPdf';

export type { PdfPanelOptions };

interface OriginalPdfPanelProps {
  options: PdfPanelOptions;
  original: OriginalPdf | null;
  // The page being edited (1-based) and its sheet's size (unscaled px): the PDF's page of
  // the same number is drawn at that width, fitted to the panel.
  pageNumber: number;
  width: number;
  height: number;
}

// The original PDF beside the text editor, as a whole of its own: its toolbar (replacing
// the PDF, restoring the spell from it), its own scroll and its own zoom -- so the page and
// the PDF are read and zoomed apart, each as needed.
export const OriginalPdfPanel = ({ options, original, pageNumber, width, height }: OriginalPdfPanelProps) => {
  const { t } = useLanguage();
  const bodyRef = useRef<HTMLDivElement>(null);
  const { zoom, showIndicator, adjustZoom, resetZoom, ZOOM_STEP } = useZoom(bodyRef, { contentWidth: width, fitRef: bodyRef });
  const numPages = original?.status === 'ready' ? original.pdf.numPages : null;

  return (
    <section data-testid="original-pdf-panel" className={s.panel} aria-label={t.spell.originalPdf}>
      <PdfToolbar options={options} pageNumber={pageNumber} numPages={numPages} />
      <div className={s.bodyArea}>
        <div ref={bodyRef} className={s.body}>
          {options.hasOriginal ? (
            <OriginalPdfSheet original={original} pageNumber={pageNumber} width={width} height={height} zoom={zoom} />
          ) : (
            <OriginalPdfEmpty className={s.empty} busy={options.busy} onImport={options.onReplacePdf} />
          )}
        </div>
        {options.hasOriginal && (
          <ZoomOverlay
            zoom={zoom}
            showIndicator={showIndicator}
            onZoomIn={() => adjustZoom(ZOOM_STEP)}
            onZoomOut={() => adjustZoom(-ZOOM_STEP)}
            onReset={resetZoom}
          />
        )}
      </div>
    </section>
  );
};
