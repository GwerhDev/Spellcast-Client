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

  const pageAttrs = editedText?.attrs as { pageWidth?: number; pageHeight?: number } | undefined;
  const paperMinHeight = pageAttrs?.pageWidth && pageAttrs?.pageHeight
    ? Math.round((pageAttrs.pageHeight / pageAttrs.pageWidth) * 800)
    : 1131;

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

  const renderFormattedContent = (fit: boolean) => {
    if (!editedText?.content) return null;

    return editedText.content.map((node, nIdx) => {
      if (node.type === 'image') {
        const src = (node.attrs as { src?: string })?.src;
        if (!src) return null;
        return <img key={nIdx} src={src} alt="" className={s.readerImage} />;
      }

      if (node.type !== 'paragraph' && node.type !== 'heading') return null;

      const nodeContent = node.content || [];
      if (!nodeContent.length) return <p key={nIdx} className={s.emptyBlock} />;

      const level = node.type === 'heading' ? ((node.attrs as { level?: number })?.level ?? 1) : 0;
      const Tag = (node.type === 'heading' ? `h${level}` : 'p') as keyof JSX.IntrinsicElements;
      const marginLeft = (node.attrs as { marginLeft?: number })?.marginLeft;
      const blockStyle = marginLeft ? { marginLeft: `${marginLeft}px` } : undefined;

      const inlineContent = nodeContent.map((child, cIdx) => {
        if (child.type === 'hardBreak') return fit ? <span key={cIdx}> </span> : <br key={cIdx} />;
        if (child.type !== 'text') return null;

        const text = (child as { type: string; text?: string; marks?: { type: string }[] }).text || '';
        const marks = (child as { type: string; text?: string; marks?: { type: string }[] }).marks || [];
        const isBold = marks.some(m => m.type === 'bold');
        const isItalic = marks.some(m => m.type === 'italic');

        if (isBold && isItalic) return <strong key={cIdx}><em>{text}</em></strong>;
        if (isBold) return <strong key={cIdx}>{text}</strong>;
        if (isItalic) return <em key={cIdx}>{text}</em>;
        return <span key={cIdx}>{text}</span>;
      });

      return <Tag key={nIdx} className={s.readerBlock} style={blockStyle}>{inlineContent}</Tag>;
    });
  };

  const renderFormattedSentences = (fit: boolean) => {
    if (!editedText?.content) return null;

    let sentIdx = 0;

    return editedText.content.map((node, nIdx) => {
      if (node.type === 'image') {
        const src = (node.attrs as { src?: string })?.src;
        if (!src) return null;
        return <img key={nIdx} src={src} alt="" className={s.readerImage} />;
      }

      if (node.type !== 'paragraph' && node.type !== 'heading') return null;

      const nodeText = (node.content || [])
        .map((c) => {
          if (c.type === 'text') return (c as { type: string; text?: string }).text || '';
          if (c.type === 'hardBreak') return fit ? ' ' : '\n';
          return '';
        })
        .join('')
        .trim();

      if (!nodeText) return <p key={nIdx} className={s.emptyBlock} />;

      const nodeSentences = nodeText.split(fit ? /(?<=[.!?])\s*/ : /(?<=[.!?])/).filter(Boolean);
      const level = node.type === 'heading' ? ((node.attrs as { level?: number })?.level ?? 1) : 0;
      const Tag = (node.type === 'heading' ? `h${level}` : 'p') as keyof JSX.IntrinsicElements;
      const marginLeftSent = (node.attrs as { marginLeft?: number })?.marginLeft;
      const sentBlockStyle = marginLeftSent ? { marginLeft: `${marginLeftSent}px` } : undefined;

      const spans = nodeSentences.map((sentence) => {
        const idx = sentIdx++;
        return (
          <span
            key={idx}
            className={idx === currentSentenceIndex ? s.highlight : s.sentence}
            onClick={() => handleSentenceClick(idx)}
          >
            {sentence}{' '}
          </span>
        );
      });

      return <Tag key={nIdx} className={s.readerBlock} style={sentBlockStyle}>{spans}</Tag>;
    });
  };

  const renderBody = () => {
    if (!isLoaded) {
      return <div className={s.container}><Spinner isLoading message={t.common.loading} /></div>;
    }

    const paperSheet = (children: React.ReactNode) => (
      <div
        className={`${s.paperSheet} ${s.readerContent} ${s.pdfMode}`}
        style={{
          minHeight: `${paperMinHeight}px`,
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
        }}
      >
        {children}
      </div>
    );

    const wrapperStyle = { width: `${800 * zoom}px`, minHeight: `${paperMinHeight * zoom}px` };

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
            {paperSheet(renderFormattedContent(false))}
          </div>
        </div>
      );
    }

    return (
      <div ref={scrollContainerRef} className={`${s.textContainer} ${s.readerContent}`}>
        {renderFormattedContent(true)}
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
