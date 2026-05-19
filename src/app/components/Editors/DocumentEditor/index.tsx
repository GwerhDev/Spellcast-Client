import s from './index.module.css';
import React, { useState, useEffect, useRef } from 'react';
import { MagicTextEditor, VerticalRuler } from '../../../../magictext';
import type { JSONContent, TTSMark, TTSPlayPayload } from '../../../../magictext';
import type { PageMargins } from '../../../../magictext';
import { useZoom } from '../../../../hooks/useZoom';
import { ZoomOverlay } from '../../Zoom/ZoomOverlay';

export type { PageMargins };

export const PAPER_WIDTH = 800;

export const DEFAULT_MARGINS: PageMargins = {
  marginTop: 48,
  marginRight: 64,
  marginBottom: 48,
  marginLeft: 64,
};

interface DocumentEditorProps {
  pageNumber: number;
  pageContent: JSONContent;
  onPageContentChange: (newContent: JSONContent) => void;
  margins?: PageMargins;
  onMarginsChange?: (margins: PageMargins) => void;
  ttsMarks?: TTSMark[];
  ttsInflections?: string[];
  onTTSPlay?: (payload: TTSPlayPayload) => void;
  onTTSStop?: () => void;
  ttsPlaying?: boolean;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  pageNumber,
  pageContent,
  onPageContentChange,
  margins,
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
    if (fromEditorRef.current) {
      fromEditorRef.current = false;
      return;
    }
    setContent(pageContent);
  }, [pageContent, pageNumber]);

  const attrs = pageContent?.attrs as { pageWidth?: number; pageHeight?: number } | undefined;
  const paperHeight = attrs?.pageWidth && attrs?.pageHeight
    ? Math.round((attrs.pageHeight / attrs.pageWidth) * PAPER_WIDTH)
    : 1131;

  const activeMargins = margins ?? DEFAULT_MARGINS;

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
          setContent(preserved);
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
          paperWidth: PAPER_WIDTH,
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
                <div
                  className={s.zoomWrapper}
                  style={{
                    width: `${PAPER_WIDTH * zoom}px`,
                    height: `${paperHeight * zoom}px`,
                  }}
                >
                  <div
                    className={s.paperSheet}
                    style={{
                      minHeight: `${paperHeight}px`,
                      paddingTop: activeMargins.marginTop,
                      paddingRight: activeMargins.marginRight,
                      paddingBottom: activeMargins.marginBottom,
                      paddingLeft: activeMargins.marginLeft,
                      '--margin-top': `${activeMargins.marginTop}px`,
                      '--margin-right': `${activeMargins.marginRight}px`,
                      '--margin-bottom': `${activeMargins.marginBottom}px`,
                      '--margin-left': `${activeMargins.marginLeft}px`,
                      transform: `scale(${zoom})`,
                      transformOrigin: 'top center',
                    } as React.CSSProperties}
                  >
                    {editorContent}
                  </div>
                </div>
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
