import s from './index.module.css';
import React, { useState, useEffect, useRef } from 'react';
import { MagicTextEditor, VerticalRuler } from '../../../../magictext';
import type { JSONContent, TTSMark, TTSPlayPayload } from '../../../../magictext';
import { useZoom } from '../../../../hooks/useZoom';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { pageFrame, type PageMargins } from '../../../../utils/spellPage';
import { ZoomOverlay } from '../../Zoom/ZoomOverlay';
import { PaperSheet } from '../../PaperSheet/PaperSheet';
import { OriginalPdfSheet } from '../../OriginalPdfSheet';
import { OriginalPdfPanel, type PdfPanelOptions } from '../../OriginalPdfPanel';
import { PdfToolbar } from '../../OriginalPdfPanel/PdfToolbar';
import { useOriginalPdf } from '../../../../hooks/useOriginalPdf';

export type { PageMargins, PdfPanelOptions };

// The original PDF opened beside the page: a panel of its own next to the text editor (its
// toolbar, scroll and zoom) while the editor has SIDE_MIN_WIDTH or more. With less room
// (a phone, a narrow window) the sheet turns over instead, the PDF's page on its back and
// the PDF's toolbar in the text toolbar's place.
const SIDE_MIN_WIDTH = 1000;
// How long the sheet takes to turn over (see .stageFlip's transition).
const FLIP_MS = 700;

interface SpellEditorProps {
  pageNumber: number;
  pageContent: JSONContent;
  onPageContentChange: (newContent: JSONContent) => void;
  onMarginsChange?: (margins: PageMargins) => void;
  ttsMarks?: TTSMark[];
  ttsInflections?: string[];
  onTTSPlay?: (payload: TTSPlayPayload) => void;
  onTTSStop?: () => void;
  ttsPlaying?: boolean;
  // The original PDF's side, open (with what its toolbar does), or null when it's closed.
  pdfPanel?: PdfPanelOptions | null;
}

export const SpellEditor: React.FC<SpellEditorProps> = ({
  pageNumber,
  pageContent,
  onPageContentChange,
  onMarginsChange,
  ttsMarks,
  ttsInflections,
  onTTSPlay,
  onTTSStop,
  ttsPlaying,
  pdfPanel = null,
}) => {
  const [content, setContent] = useState<JSONContent>(pageContent);
  const rootRef = useRef<HTMLDivElement>(null);
  const paperBgRef = useRef<HTMLDivElement>(null);
  const paperCenterRef = useRef<HTMLDivElement>(null);
  const fromEditorRef = useRef(false);
  // A phone's screen: a thinner gutter above the sheet (see .paperCenter), which the
  // vertical ruler lines up with, and never the PDF beside the page.
  const narrow = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    paperBgRef.current?.scrollTo({ top: 0 });
    if (fromEditorRef.current) {
      fromEditorRef.current = false;
      return;
    }
    setContent(pageContent);
  }, [pageContent, pageNumber]);

  const attrs = pageContent?.attrs;
  // The page's sheet: the same frame the reader draws it in (see pageFrame / PaperSheet).
  // Its margins are the page's own -- the rulers set them on it (onMarginsChange).
  const frame = pageFrame(pageContent, pageNumber - 1);
  const activeMargins = frame.margins;
  const paperWidth = frame.width;
  const paperHeight = frame.height;

  // The editor's own width: whether the PDF's panel fits beside the text editor.
  const [rootWidth, setRootWidth] = useState(0);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setRootWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The PDF's side as drawn: it outlasts pdfPanel while the sheet turns back to the
  // spell's side (the PDF's page stays on its back until then). Open, it's always the
  // latest options (what its toolbar does may change).
  const lastPanelRef = useRef(pdfPanel);
  if (pdfPanel) lastPanelRef.current = pdfPanel;
  const [retained, setRetained] = useState(!!pdfPanel);
  const panel = pdfPanel ?? (retained ? lastPanelRef.current : null);
  const sideBySide = !!panel && !narrow && rootWidth >= SIDE_MIN_WIDTH;
  const flipMode = !!panel && !sideBySide;
  const original = useOriginalPdf(panel?.hasOriginal ? panel.spellId : null);

  // Scaled down to fit the space beside the ruler when the sheet is wider (a phone).
  const { zoom, showIndicator, adjustZoom, resetZoom, ZOOM_STEP } = useZoom(paperBgRef, { contentWidth: paperWidth, fitRef: paperCenterRef });

  // Turned over to the PDF's page as the PDF's side opens, and back to the spell's as it
  // closes -- the header's PDF button is the one switch, both ways. Turning is a frame
  // after the PDF's side is there, so it's seen; closing, the PDF's side goes once the sheet
  // has turned back (at once beside the editor, where nothing turns).
  const [flipped, setFlipped] = useState(!!pdfPanel);
  const flipModeRef = useRef(flipMode);
  flipModeRef.current = flipMode;
  const open = !!pdfPanel;
  useEffect(() => {
    if (open) {
      setRetained(true);
      const frame = requestAnimationFrame(() => setFlipped(true));
      return () => cancelAnimationFrame(frame);
    }
    setFlipped(false);
    if (!flipModeRef.current) { setRetained(false); return; }
    const timer = setTimeout(() => setRetained(false), FLIP_MS);
    return () => clearTimeout(timer);
  }, [open]);
  const showsOriginal = flipMode && flipped;

  const stageClass = [s.stage, flipMode ? s.stageFlip : '', showsOriginal ? s.stageFlipped : ''].filter(Boolean).join(' ');

  return (
    <div ref={rootRef} data-testid="spell-editor" data-pdf={sideBySide ? 'side' : flipMode ? 'flip' : undefined} className={s.root}>
      {/* The same elements in every mode (only their classes change), so opening or closing
          the PDF's side never mounts the editor again. */}
      <div className={s.editorColumn}>
        <MagicTextEditor
          inputType="json"
          outputType="json"
          content={content}
          onChange={(newContent) => {
            fromEditorRef.current = true;
            const json = newContent as JSONContent;
            const preserved: JSONContent = attrs ? { ...json, attrs } : json;
            onPageContentChange(preserved);
          }}
          editable
          ttsMarks={ttsMarks}
          ttsInflections={ttsInflections}
          onTTSPlay={onTTSPlay}
          onTTSStop={onTTSStop}
          ttsPlaying={ttsPlaying}
          // Turned over to the PDF's page, the text toolbar gives its place to the PDF's.
          toolbarClassName={showsOriginal ? s.toolbarAway : undefined}
          ruler={{
            enabled: true,
            // Turned over to the PDF's page, the rulers (the spell page's margins) are out of
            // sight -- still taking their room, so the sheet doesn't move as it turns.
            hidden: showsOriginal,
            margins: activeMargins,
            paperWidth,
            paperHeight,
            onMarginsChange,
            zoom,
          }}
          wrapContent={(editorContent) => (
            <div className={s.paperBackground} ref={paperBgRef}>
              {/* Ruler at far-left + paper centered in remaining space */}
              <div className={s.contentRow}>
                <div className={s.vRulerSlot} style={showsOriginal ? { visibility: 'hidden' } : undefined}>
                  <VerticalRuler
                    paperHeight={paperHeight}
                    marginTop={activeMargins.marginTop}
                    marginBottom={activeMargins.marginBottom}
                    onMarginTopChange={v => onMarginsChange?.({ ...activeMargins, marginTop: v })}
                    onMarginBottomChange={v => onMarginsChange?.({ ...activeMargins, marginBottom: v })}
                    zoom={zoom}
                    paperOffsetTop={narrow ? 12 : 32}
                  />
                </div>
                <div className={s.paperCenter} ref={paperCenterRef}>
                  <div
                    data-testid="spell-editor-stage"
                    data-compare={flipMode ? 'flip' : undefined}
                    data-flipped={showsOriginal || undefined}
                    className={stageClass}
                  >
                    <div className={s.face} aria-hidden={showsOriginal || undefined}>
                      {/* The theme's own paper: the caster's page background is the reader's alone. */}
                      <PaperSheet key={pageNumber} frame={frame} zoom={zoom}>
                        {editorContent}
                      </PaperSheet>
                    </div>
                    {flipMode && (
                      <div className={`${s.face} ${s.faceBack}`} aria-hidden={!showsOriginal || undefined}>
                        <OriginalPdfSheet original={original} pageNumber={pageNumber} width={paperWidth} height={paperHeight} zoom={zoom} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        />
        {/* After the editor in the tree (so it never moves the editor), first on screen. */}
        {showsOriginal && panel && (
          <div className={s.flipToolbar}>
            <PdfToolbar options={panel} pageNumber={pageNumber} numPages={original?.status === 'ready' ? original.pdf.numPages : null} />
          </div>
        )}
        <ZoomOverlay
          zoom={zoom}
          showIndicator={showIndicator}
          onZoomIn={() => adjustZoom(ZOOM_STEP)}
          onZoomOut={() => adjustZoom(-ZOOM_STEP)}
          onReset={resetZoom}
        />
      </div>
      {sideBySide && panel && (
        <OriginalPdfPanel options={panel} original={original} pageNumber={pageNumber} width={paperWidth} height={paperHeight} />
      )}
    </div>
  );
};
