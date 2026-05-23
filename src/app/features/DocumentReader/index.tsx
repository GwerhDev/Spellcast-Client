import s from '../../components/DocumentReader/index.module.css';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { JSX } from 'react';
import { useZoom } from '../../../hooks/useZoom';
import { ZoomOverlay } from '../../components/Zoom/ZoomOverlay';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faEdit, faFilePdf, faGear, faExpand, faCompress, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { RootState } from '../../../store';
import { goToPage, setCurrentSentenceIndex, setShowReaderSettings } from '../../../store/pdfReaderSlice';
import { pageBackgrounds } from '../../../config/assets';
import { Spinner } from '../../components/Spinner';
import { IconButton } from '../../components/Buttons/IconButton';
import { SearcherButton } from '../../components/DocumentReader/Searcher/SearcherButton';
import { PageList } from '../../components/DocumentCreateForm/PageList';
import type { JSONContent } from '../../../magictext';
import { MagicTextEditor } from '../../../magictext';
import { useLanguage } from '../../../i18n';

const emptyContent: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

const safeParseJSON = (str: string): JSONContent => {
  if (!str) return emptyContent;
  try {
    return JSON.parse(str);
  } catch {
    return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: str }] }] };
  }
};

export const DocumentReader = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const {
    currentPage, totalPages, currentPageText, documentTitle, documentId,
    isLoaded, currentSentenceIndex, fitToWidth,
  } = useSelector((state: RootState) => state.pdfReader);
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const { isPlaying } = useSelector((state: RootState) => state.browserPlayer);
  const { activePageBgId } = useSelector((state: RootState) => state.userLibrary);
  const activeBg = pageBackgrounds.find(b => b.id === activePageBgId) ?? null;
  const activePageBgCss = activeBg?.cssValue ?? null;
  const pageBgVars = {
    ...(activePageBgCss ? { background: activePageBgCss } : {}),
    ...(activeBg?.textColor ? { '--page-text-color': activeBg.textColor } : {}),
    ...(activeBg?.highlightColor ? { '--page-highlight': activeBg.highlightColor } : {}),
    ...(activeBg?.sentenceHoverColor ? { '--page-sentence-hover': activeBg.sentenceHoverColor } : {}),
  } as React.CSSProperties;
  const [editedText, setEditedText] = useState<JSONContent>(emptyContent);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const paperBgRef = useRef<HTMLDivElement>(null);
  const playerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { zoom, showIndicator, adjustZoom, resetZoom, ZOOM_STEP } = useZoom(paperBgRef);

  const pageAttrs = editedText?.attrs as { pageWidth?: number; pageHeight?: number; displayWidth?: number; displayHeight?: number; marginTop?: number; marginRight?: number; marginBottom?: number; marginLeft?: number } | undefined;
  const paperWidth = pageAttrs?.displayWidth ?? 800;
  const paperMinHeight = pageAttrs?.displayHeight ?? (pageAttrs?.pageWidth && pageAttrs?.pageHeight
    ? Math.round((pageAttrs.pageHeight / pageAttrs.pageWidth) * paperWidth)
    : 1131);
  const pageMargins = {
    marginTop: pageAttrs?.marginTop ?? 48,
    marginRight: pageAttrs?.marginRight ?? 64,
    marginBottom: pageAttrs?.marginBottom ?? 48,
    marginLeft: pageAttrs?.marginLeft ?? 64,
  };

  useEffect(() => {
    document.body.classList.toggle('fullscreen-reader', isFullscreen);
    return () => document.body.classList.remove('fullscreen-reader');
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const showPlayer = () => {
      document.body.classList.add('fullscreen-player-visible');
      if (playerTimerRef.current) clearTimeout(playerTimerRef.current);
      playerTimerRef.current = setTimeout(() => {
        document.body.classList.remove('fullscreen-player-visible');
      }, 2000);
    };
    document.addEventListener('mousemove', showPlayer);
    return () => {
      document.removeEventListener('mousemove', showPlayer);
      document.body.classList.remove('fullscreen-player-visible');
      if (playerTimerRef.current) clearTimeout(playerTimerRef.current);
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (isLoaded && currentPage) dispatch(goToPage(currentPage));
  }, [dispatch, currentPage, isLoaded]);

  useEffect(() => {
    setEditedText(safeParseJSON(currentPageText));
  }, [currentPageText]);

  useEffect(() => {
    if (selectedVoice.type !== 'browser' || currentSentenceIndex < 0) return;
    const container = fitToWidth ? scrollContainerRef.current : paperBgRef.current;
    if (!container) return;
    const highlighted = container.querySelector(`.${s.highlight}`) as HTMLElement | null;
    if (!highlighted) return;
    const TOP_MARGIN = 32;
    const BOTTOM_MARGIN = 80;
    const containerRect = container.getBoundingClientRect();
    const elemRect = highlighted.getBoundingClientRect();
    const elemTop = elemRect.top - containerRect.top + container.scrollTop;
    const elemBottom = elemRect.bottom - containerRect.top + container.scrollTop;
    const visibleBottom = container.scrollTop + container.clientHeight;
    if (elemBottom + BOTTOM_MARGIN > visibleBottom) {
      container.scrollTo({ top: elemBottom + BOTTOM_MARGIN - container.clientHeight, behavior: 'smooth' });
    } else if (elemTop - TOP_MARGIN < container.scrollTop) {
      container.scrollTo({ top: Math.max(0, elemTop - TOP_MARGIN), behavior: 'smooth' });
    }
  }, [currentSentenceIndex, isPlaying, selectedVoice.type, fitToWidth]);

  useEffect(() => {
    if (selectedVoice.type === 'browser') return;
    const container = fitToWidth ? scrollContainerRef.current : paperBgRef.current;
    if (container) container.scrollTop = 0;
  }, [currentPage, selectedVoice.type, fitToWidth]);

  const handleEdit = () => { navigate(`/editor/${documentId}/${currentPage}`); };
  const handleSentenceClick = (clickedIndex: number) => {
    if (selectedVoice.type !== 'browser') return;
    dispatch(setCurrentSentenceIndex(clickedIndex));
  };

  const renderFormattedSentences = (fit: boolean) => {
    if (!editedText?.content) return null;
    let sentIdx = 0;
    return editedText.content.map((node, nIdx) => {
      if (node.type === 'image') {
        const attrs = node.attrs as { src?: string; alt?: string | null; title?: string | null };
        if (!attrs.src) return null;
        return <img key={nIdx} src={attrs.src} alt={attrs.alt ?? ''} title={attrs.title ?? undefined} className={s.readerImage} />;
      }
      if (node.type === 'horizontalRule') return <hr key={nIdx} className={s.horizontalRule} />;
      if (node.type !== 'paragraph' && node.type !== 'heading') return null;

      type CharMark = { bold: boolean; italic: boolean };
      const charMarks: CharMark[] = [];
      const rawText = (node.content || [])
        .map((c) => {
          const text = c.type === 'text' ? ((c as { text?: string }).text || '') : c.type === 'hardBreak' ? (fit ? ' ' : '\n') : '';
          const marks = c.type === 'text' ? ((c as { marks?: { type: string }[] }).marks || []) : [];
          const bold = marks.some(m => m.type === 'bold');
          const italic = marks.some(m => m.type === 'italic');
          for (let i = 0; i < text.length; i++) charMarks.push({ bold, italic });
          return text;
        })
        .join('');

      if (!rawText.trim()) return <p key={nIdx} className={s.emptyBlock} />;

      const nodeSentences = rawText.split(fit ? /(?<=[.!?])\s*/ : /(?<=[.!?])/).filter(Boolean);
      const level = node.type === 'heading' ? ((node.attrs as { level?: number })?.level ?? 1) : 0;
      const Tag = (node.type === 'heading' ? `h${level}` : 'p') as keyof JSX.IntrinsicElements;
      const nodeAttrs = node.attrs as { marginLeft?: number; textAlign?: string } | undefined;
      const sentBlockStyle: React.CSSProperties = {
        whiteSpace: 'pre-wrap',
        ...(nodeAttrs?.textAlign ? { textAlign: nodeAttrs.textAlign as React.CSSProperties['textAlign'] } : {}),
        ...(nodeAttrs?.marginLeft ? { marginLeft: `${nodeAttrs.marginLeft}px` } : {}),
      };

      let sentOffset = 0;
      const spans = nodeSentences.map((sentence) => {
        let sentStart: number;
        if (fit) {
          const found = rawText.indexOf(sentence, sentOffset);
          sentStart = found >= sentOffset ? found : sentOffset;
        } else {
          sentStart = sentOffset;
        }
        const sentEnd = sentStart + sentence.length;
        sentOffset = sentEnd;
        if (fit) while (sentOffset < rawText.length && /\s/.test(rawText[sentOffset])) sentOffset++;

        const parts: React.ReactNode[] = [];
        let i = sentStart;
        while (i < sentEnd) {
          const m = charMarks[i] ?? { bold: false, italic: false };
          let j = i + 1;
          while (j < sentEnd) {
            const m2 = charMarks[j] ?? { bold: false, italic: false };
            if (m2.bold !== m.bold || m2.italic !== m.italic) break;
            j++;
          }
          const slice = rawText.slice(i, j);
          let el: React.ReactNode = slice;
          if (m.bold && m.italic) el = <strong><em>{slice}</em></strong>;
          else if (m.bold) el = <strong>{slice}</strong>;
          else if (m.italic) el = <em>{slice}</em>;
          parts.push(<React.Fragment key={i}>{el}</React.Fragment>);
          i = j;
        }

        const idx = sentIdx++;
        return (
          <span
            key={idx}
            className={idx === currentSentenceIndex ? s.highlight : s.sentence}
            onClick={() => handleSentenceClick(idx)}
          >
            {parts}{' '}
          </span>
        );
      });
      return <Tag key={nIdx} className={s.readerBlock} style={sentBlockStyle}>{spans}</Tag>;
    });
  };

  const renderBody = () => {
    if (!isLoaded) {
      return <div data-testid="document-reader-loading" className={s.container}><Spinner isLoading message={t.common.loading} /></div>;
    }

    const paperSheet = (children: React.ReactNode) => (
      <div
        className={s.paperSheet}
        style={{
          ...pageBgVars,
          width: `${paperWidth}px`,
          minHeight: `${paperMinHeight}px`,
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          paddingTop: pageMargins.marginTop,
          paddingRight: pageMargins.marginRight,
          paddingBottom: pageMargins.marginBottom,
          paddingLeft: pageMargins.marginLeft,
          '--margin-top': `${pageMargins.marginTop}px`,
          '--margin-right': `${pageMargins.marginRight}px`,
          '--margin-bottom': `${pageMargins.marginBottom}px`,
          '--margin-left': `${pageMargins.marginLeft}px`,
        } as React.CSSProperties}
      >
        {children}
      </div>
    );

    const wrapperStyle: React.CSSProperties = {
      width: `${paperWidth * zoom}px`,
      height: `${paperMinHeight * zoom}px`,
    };

    if (selectedVoice.type === 'browser') {
      if (!fitToWidth) {
        return (
          <div ref={paperBgRef} className={s.paperBackground}>
            <div className={s.zoomWrapper} style={wrapperStyle}>
              {paperSheet(renderFormattedSentences(false))}
            </div>
          </div>
        );
      }
      return (
        <div ref={scrollContainerRef} className={`${s.textContainer} ${s.readerContent}`} style={Object.keys(pageBgVars).length ? pageBgVars : undefined}>
          {renderFormattedSentences(true)}
        </div>
      );
    }

    if (!fitToWidth) {
      return (
        <div ref={paperBgRef} className={s.paperBackground}>
          <div className={s.zoomWrapper} style={wrapperStyle}>
            {paperSheet(
              <MagicTextEditor key={currentPage} editable={false} content={editedText} inputType="json" contentClassName={s.editorContent} />
            )}
          </div>
        </div>
      );
    }
    return (
      <div ref={scrollContainerRef} className={`${s.textContainer} ${s.readerContent}`} style={Object.keys(pageBgVars).length ? pageBgVars : undefined}>
        <MagicTextEditor key={currentPage} editable={false} content={editedText} inputType="json" contentClassName={s.editorContent} />
      </div>
    );
  };

  return (
    <div data-testid="document-reader" className={s.pdfReaderContainer}>
      <div className={`${s.pageInfoContainer} reader-top-bar`}>
        <span className={s.headerControls}>
          <IconButton variant='transparent' icon={faArrowLeft} onClick={() => documentId ? navigate(`/document/${documentId}`) : navigate(-1)} />
          {isLoaded && <SearcherButton />}
        </span>
        <div className={s.titleContainer}>
          <FontAwesomeIcon icon={faFilePdf} />
          {documentTitle}
        </div>
        <div className={s.controlsContainer}>
          {isLoaded && <IconButton icon={faInfoCircle} variant='transparent' />}
          {isLoaded && <IconButton icon={faEdit} variant='transparent' onClick={handleEdit} />}
          {isLoaded && <IconButton icon={faGear} variant='transparent' onClick={() => dispatch(setShowReaderSettings(true))} />}
          {isLoaded && <IconButton icon={isFullscreen ? faCompress : faExpand} variant='transparent' onClick={() => setIsFullscreen(prev => !prev)} />}
        </div>
      </div>
      <div className={s.bodyWrapper}>
        <div className={s.contentArea}>
          {renderBody()}
          {!fitToWidth && (
            <ZoomOverlay
              zoom={zoom}
              showIndicator={showIndicator}
              onZoomIn={() => adjustZoom(ZOOM_STEP)}
              onZoomOut={() => adjustZoom(-ZOOM_STEP)}
              onReset={resetZoom}
            />
          )}
        </div>
        <AnimatePresence>
          {isLoaded && !isFullscreen && (
            <motion.div
              className={s.pagesContainer}
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
            >
              <PageList
                pages={Array.from({ length: totalPages }, () => '')}
                currentPage={currentPage - 1}
                onPageClick={(idx) => dispatch(goToPage(idx + 1))}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
