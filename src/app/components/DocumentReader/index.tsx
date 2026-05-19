import s from './index.module.css';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { JSX } from 'react';
import { useZoom } from '../../../hooks/useZoom';
import { ZoomOverlay } from '../Zoom/ZoomOverlay';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faEdit, faFilePdf, faGear, faExpand, faCompress, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { RootState } from '../../../store';
import { goToPage, setCurrentSentenceIndex, setShowReaderSettings } from '../../../store/pdfReaderSlice';
import { Spinner } from '../Spinner';
import { IconButton } from '../Buttons/IconButton';
import { SearcherButton } from './Searcher/SearcherButton';
import { PageList } from '../DocumentCreateForm/PageList';
import type { JSONContent } from '../../../magictext';
import { MagicTextEditor } from '../../../magictext';
import { useLanguage } from '../../../i18n';

const emptyContent: JSONContent = {
  type: 'doc',
  content: [{
    type: 'paragraph',
  }]
};

const safeParseJSON = (str: string): JSONContent => {
  if (!str) {
    return emptyContent;
  }
  try {
    const parsed = JSON.parse(str);
    return parsed;
  } catch {
    return {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'text',
          text: str,
        }]
      }]
    };
  }
};

export const DocumentReader = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const {
    currentPage,
    totalPages,
    currentPageText,
    documentTitle,
    documentId,
    isLoaded,
    currentSentenceIndex,
    fitToWidth,
  } = useSelector((state: RootState) => state.pdfReader);
  const { selectedVoice, } = useSelector((state: RootState) => state.voice);
  const { isPlaying } = useSelector((state: RootState) => state.browserPlayer);
  const [editedText, setEditedText] = useState<JSONContent>(emptyContent);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const paperBgRef = useRef<HTMLDivElement>(null);
  const playerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { zoom, showIndicator, adjustZoom, resetZoom, ZOOM_STEP } = useZoom(paperBgRef);

  const pageAttrs = editedText?.attrs as { pageWidth?: number; pageHeight?: number; marginTop?: number; marginRight?: number; marginBottom?: number; marginLeft?: number } | undefined;
  const paperMinHeight = pageAttrs?.pageWidth && pageAttrs?.pageHeight
    ? Math.round((pageAttrs.pageHeight / pageAttrs.pageWidth) * 800)
    : 1131;
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
    if (isLoaded && currentPage) {
      dispatch(goToPage(currentPage));
    }
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



  const handleEdit = () => {
    navigate(`/editor/${documentId}/${currentPage}`);
  };

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

      if (node.type === 'horizontalRule') {
        return <hr key={nIdx} className={s.horizontalRule} />;
      }

      if (node.type !== 'paragraph' && node.type !== 'heading') return null;

      const hasText = (node.content || []).some(c => c.type === 'text' && (c as { text?: string }).text?.trim());
      if (!hasText) return <p key={nIdx} className={s.emptyBlock} />;

      const level = node.type === 'heading' ? ((node.attrs as { level?: number })?.level ?? 1) : 0;
      const Tag = (node.type === 'heading' ? `h${level}` : 'p') as keyof JSX.IntrinsicElements;
      const marginLeftSent = (node.attrs as { marginLeft?: number })?.marginLeft;
      const sentBlockStyle: React.CSSProperties = {
        whiteSpace: 'pre-wrap',
        ...(marginLeftSent ? { marginLeft: `${marginLeftSent}px` } : {}),
      };

      const spans: React.ReactNode[] = [];
      for (const c of (node.content || [])) {
        if (c.type === 'hardBreak') {
          spans.push(fit ? ' ' : <br key={`br-${sentIdx}`} />);
          continue;
        }
        if (c.type !== 'text') continue;
        const text = (c as { text?: string }).text || '';
        if (!text) continue;

        const marks = (c as { marks?: { type: string }[] }).marks || [];
        const isBold = marks.some(m => m.type === 'bold');
        const isItalic = marks.some(m => m.type === 'italic');

        const parts = text.split(fit ? /(?<=[.!?])\s*/ : /(?<=[.!?])/).filter(Boolean);
        for (let j = 0; j < parts.length; j++) {
          const part = parts[j];
          const idx = sentIdx++;
          let inner: React.ReactNode = part;
          if (isBold && isItalic) inner = <strong><em>{part}</em></strong>;
          else if (isBold) inner = <strong>{part}</strong>;
          else if (isItalic) inner = <em>{part}</em>;
          spans.push(
            <span
              key={idx}
              className={idx === currentSentenceIndex ? s.highlight : s.sentence}
              onClick={() => handleSentenceClick(idx)}
            >
              {inner}{' '}
            </span>
          );
        }
      }

      return <Tag key={nIdx} className={s.readerBlock} style={sentBlockStyle}>{spans}</Tag>;
    });
  };

  const renderBody = () => {
    if (!isLoaded) {
      return <div className={s.container}><Spinner isLoading message={t.common.loading} /></div>;
    }

    const paperSheet = (children: React.ReactNode) => (
      <div
        className={s.paperSheet}
        style={{
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
      width: `${800 * zoom}px`,
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
        <div ref={scrollContainerRef} className={`${s.textContainer} ${s.readerContent}`}>
          {renderFormattedSentences(true)}
        </div>
      );
    }

    if (!fitToWidth) {
      return (
        <div ref={paperBgRef} className={s.paperBackground}>
          <div className={s.zoomWrapper} style={wrapperStyle}>
            {paperSheet(
              <MagicTextEditor
                key={currentPage}
                editable={false}
                content={editedText}
                inputType="json"
                contentClassName={s.editorContent}
              />
            )}
          </div>
        </div>
      );
    }

    return (
      <div ref={scrollContainerRef} className={`${s.textContainer} ${s.readerContent}`}>
        <MagicTextEditor
          key={currentPage}
          editable={false}
          content={editedText}
          inputType="json"
          contentClassName={s.editorContent}
        />
      </div>
    );
  };

  return (
    <div className={s.pdfReaderContainer}>
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
  )
}
