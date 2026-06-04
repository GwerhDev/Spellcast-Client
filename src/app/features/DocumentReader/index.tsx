import s from '../../components/DocumentReader/index.module.css';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useZoom } from '../../../hooks/useZoom';
import { ZoomOverlay } from '../../components/Zoom/ZoomOverlay';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faEdit, faFilePdf, faGear, faExpand, faCompress, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { RootState } from '../../../store';
import { goToPage, setCurrentSentenceIndex, setShowReaderSettings } from '../../../store/pdfReaderSlice';
import { setPendingSeek } from '../../../store/audioPlayerSlice';
import { pageBackgrounds } from '../../../config/assets';
import { Spinner } from '../../components/Spinner';
import { IconButton } from '../../components/Buttons/IconButton';
import { SearcherButton } from '../../components/DocumentReader/Searcher/SearcherButton';
import { PageList } from '../../components/DocumentCreateForm/PageList';
import { TTSDocumentReader, type JSONContent } from '../../../magictext';
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
  const { timeline: aiTimeline, currentTime: aiCurrentTime, isPlaying: aiIsPlaying } = useSelector((state: RootState) => state.audioPlayer);
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

  const activeSentenceIndex = React.useMemo(() => {
    if (selectedVoice.type !== 'ai' || aiTimeline.length === 0) return currentSentenceIndex;
    const ms = aiCurrentTime * 1000;
    for (let i = 0; i < aiTimeline.length; i++) {
      if (ms < aiTimeline[i].end) return i;
    }
    return aiTimeline.length - 1;
  }, [selectedVoice.type, aiTimeline, aiCurrentTime, currentSentenceIndex]);

  useEffect(() => {
    if (activeSentenceIndex < 0) return;
    const playing = selectedVoice.type === 'ai' ? aiIsPlaying : isPlaying;
    if (!playing) return;
    const container = fitToWidth ? scrollContainerRef.current : paperBgRef.current;
    if (!container) return;
    const highlighted = container.querySelector(`[data-sentence-index="${activeSentenceIndex}"]`) as HTMLElement | null;
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
  }, [activeSentenceIndex, isPlaying, aiIsPlaying, selectedVoice.type, fitToWidth]);

  useEffect(() => {
    if (selectedVoice.type === 'browser') return;
    const container = fitToWidth ? scrollContainerRef.current : paperBgRef.current;
    if (container) container.scrollTop = 0;
  }, [currentPage, selectedVoice.type, fitToWidth]);

  const handleEdit = () => { navigate(`/editor/${documentId}/${currentPage}`); };
  const handleSentenceClick = (clickedIndex: number) => {
    if (selectedVoice.type === 'browser') {
      dispatch(setCurrentSentenceIndex(clickedIndex));
    } else if (aiTimeline.length > 0 && aiTimeline[clickedIndex]) {
      dispatch(setPendingSeek(aiTimeline[clickedIndex].start));
    }
  };

  const documentBody = (
    <TTSDocumentReader
      content={editedText}
      currentSentenceIndex={activeSentenceIndex}
      onSentenceClick={handleSentenceClick}
    />
  );

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
          '--paper-height': `${paperMinHeight}px`,
        } as React.CSSProperties}
      >
        {children}
      </div>
    );

    const wrapperStyle: React.CSSProperties = {
      width: `${paperWidth * zoom}px`,
      height: `${paperMinHeight * zoom}px`,
    };

    if (!fitToWidth) {
      return (
        <div ref={paperBgRef} className={s.paperBackground}>
          <div className={s.zoomWrapper} style={wrapperStyle}>
            {paperSheet(documentBody)}
          </div>
        </div>
      );
    }
    return (
      <div ref={scrollContainerRef} className={`${s.textContainer} ${s.readerContent}`} style={Object.keys(pageBgVars).length ? pageBgVars : undefined}>
        {documentBody}
      </div>
    );
  };

  return (
    <div data-testid="document-reader" className={s.pdfReaderContainer}>
      <div className={`${s.pageInfoContainer} reader-top-bar`}>
        <span className={s.headerControls}>
          <IconButton variant='transparent' icon={faArrowLeft} title={t.common.back} onClick={() => documentId ? navigate(`/document/${documentId}`) : navigate(-1)} />
          {isLoaded && <SearcherButton />}
        </span>
        <div className={s.titleContainer}>
          <FontAwesomeIcon icon={faFilePdf} />
          {documentTitle}
        </div>
        <div className={s.controlsContainer}>
          {isLoaded && <IconButton icon={faInfoCircle} variant='transparent' title={t.reader.documentInfo} />}
          {isLoaded && <IconButton icon={faEdit} variant='transparent' title={t.document.editDocument} onClick={handleEdit} />}
          {isLoaded && <IconButton icon={faGear} variant='transparent' title={t.reader.readerSettings} onClick={() => dispatch(setShowReaderSettings(true))} />}
          {isLoaded && <IconButton icon={isFullscreen ? faCompress : faExpand} variant='transparent' title={isFullscreen ? t.reader.exitFullscreen : t.reader.enterFullscreen} onClick={() => setIsFullscreen(prev => !prev)} />}
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
