import s from './index.module.css';
import React, { useState, useEffect, useRef } from 'react';
import { MagicTextEditor, VerticalRuler } from '../../../../magictext';
import type { JSONContent, TTSMark, TTSPlayPayload } from '../../../../magictext';
import { useZoom } from '../../../../hooks/useZoom';
import { pageFrame, type PageMargins } from '../../../../utils/spellPage';
import { ZoomOverlay } from '../../Zoom/ZoomOverlay';
import { PaperSheet } from '../../PaperSheet/PaperSheet';

export type { PageMargins };

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
}) => {
  const [content, setContent] = useState<JSONContent>(pageContent);
  const paperBgRef = useRef<HTMLDivElement>(null);
  const { zoom, showIndicator, adjustZoom, resetZoom, ZOOM_STEP } = useZoom(paperBgRef);
  const fromEditorRef = useRef(false);

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

  return (
    <div className={s.root}>
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
        ruler={{
          enabled: true,
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
              <VerticalRuler
                paperHeight={paperHeight}
                marginTop={activeMargins.marginTop}
                marginBottom={activeMargins.marginBottom}
                onMarginTopChange={v => onMarginsChange?.({ ...activeMargins, marginTop: v })}
                onMarginBottomChange={v => onMarginsChange?.({ ...activeMargins, marginBottom: v })}
                zoom={zoom}
                paperOffsetTop={32}
              />
              <div className={s.paperCenter}>
                {/* The theme's own paper: the caster's page background is the reader's alone. */}
                <PaperSheet key={pageNumber} frame={frame} zoom={zoom}>
                  {editorContent}
                </PaperSheet>
              </div>
            </div>
          </div>
        )}
      />
      <ZoomOverlay
        zoom={zoom}
        showIndicator={showIndicator}
        onZoomIn={() => adjustZoom(ZOOM_STEP)}
        onZoomOut={() => adjustZoom(-ZOOM_STEP)}
        onReset={resetZoom}
      />
    </div>
  );
};
