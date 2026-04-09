import s from './index.module.css';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faEdit, faFilePdf, faSave, faXmark, faGear } from '@fortawesome/free-solid-svg-icons';
import { RootState } from '../../../store';
import { goToPage, setPageText, setCurrentSentenceIndex } from '../../../store/pdfReaderSlice';
import { resetBrowserPlayer } from '../../../store/browserPlayerSlice';
import { Spinner } from '../Spinner';
import { IconButton } from '../Buttons/IconButton';
import { PageSelector } from './PageSelector/PageSelector';
import { SimpleEditor } from '../Tiptap/components/tiptap-templates/simple/simple-editor';
import { JSONContent } from '@tiptap/core';

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
  const {
    currentPage,
    currentPageText,
    documentTitle,
    isLoaded,
    currentSentenceIndex,
  } = useSelector((state: RootState) => state.pdfReader);
  const { selectedVoice, } = useSelector((state: RootState) => state.voice);
  const [editedText, setEditedText] = useState<JSONContent>(emptyContent);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [fitToWidth, setFitToWidth] = useState(() => {
    const stored = localStorage.getItem('reader:fitToWidth');
    return stored === null ? true : stored === 'true';
  });
  const [showSettings, setShowSettings] = useState(false);
  const textContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoaded && currentPage) {
      dispatch(goToPage(currentPage));
    }
  }, [dispatch, currentPage, isLoaded]);

  useEffect(() => {
    setEditedText(safeParseJSON(currentPageText));
  }, [currentPageText]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    dispatch(resetBrowserPlayer());
    dispatch(setPageText({ text: JSON.stringify(editedText) }));
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(safeParseJSON(currentPageText));
    setIsEditing(false);
  };

  const handleTextChange = (e: JSONContent) => {
    setEditedText(e);
  };

  const handleSentenceClick = (clickedIndex: number) => {
    if (selectedVoice.type !== 'browser' || isEditing) return;
    dispatch(setCurrentSentenceIndex(clickedIndex));
  };

  const renderFormattedContent = (fit: boolean) => {
    if (!editedText?.content) return null;

    return editedText.content.map((node, nIdx) => {
      if (node.type !== 'paragraph' && node.type !== 'heading') return null;

      const nodeContent = node.content || [];
      if (!nodeContent.length) return <p key={nIdx} className={s.emptyBlock} />;

      const level = node.type === 'heading' ? ((node.attrs as { level?: number })?.level ?? 1) : 0;
      const Tag = (node.type === 'heading' ? `h${level}` : 'p') as keyof JSX.IntrinsicElements;

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

      return <Tag key={nIdx} className={s.readerBlock}>{inlineContent}</Tag>;
    });
  };

  const renderFormattedSentences = (fit: boolean) => {
    if (!editedText?.content) return null;

    let sentIdx = 0;

    return editedText.content.map((node, nIdx) => {
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

      return <Tag key={nIdx} className={s.readerBlock}>{spans}</Tag>;
    });
  };

  const renderBody = () => {
    if (!isLoaded) {
      return <Spinner isLoading message="Loading..." />;
    }

    if (isEditing) {
      return (
        <SimpleEditor
          isEditable={true}
          content={editedText}
          onContentChange={handleTextChange}
          wrapContent={(content) => (
            <div className={s.paperBackground}>
              <div className={s.paperSheet}>
                {content}
              </div>
            </div>
          )}
        />
      );
    }

    if (selectedVoice.type === 'browser') {
      if (!fitToWidth) {
        return (
          <div ref={textContainerRef} className={s.paperBackground}>
            <div className={`${s.paperSheet} ${s.readerContent} ${s.pdfMode}`}>
              {renderFormattedSentences(false)}
            </div>
          </div>
        );
      }
      return (
        <div ref={textContainerRef} className={`${s.textContainer} ${s.readerContent}`}>
          {renderFormattedSentences(true)}
        </div>
      );
    }

    if (!fitToWidth) {
      return (
        <div className={s.paperBackground}>
          <div className={`${s.paperSheet} ${s.readerContent} ${s.pdfMode}`}>
            {renderFormattedContent(false)}
          </div>
        </div>
      );
    }

    return (
      <div className={`${s.textContainer} ${s.readerContent}`}>
        {renderFormattedContent(true)}
      </div>
    );
  };

  return (
    <div className={s.pdfReaderContainer}>
      <div className={s.pageInfoContainer}>
        <span className={s.headerControls}>
          <Link to={'/'}>
            <IconButton variant='transparent' icon={faArrowLeft} />
          </Link>
          {isLoaded && <PageSelector />}
        </span>
        <div className={s.titleContainer}>
          <FontAwesomeIcon icon={faFilePdf} />
          {documentTitle} {isEditing && "(editing)"}
        </div>
        <div className={s.controlsContainer}>
          {isLoaded && isEditing ? (
            <>
              <IconButton icon={faSave} variant='transparent' onClick={handleSave} />
              <IconButton icon={faXmark} variant='transparent' onClick={handleCancel} />
            </>
          ) : (
            <>
              {isLoaded && <IconButton icon={faEdit} variant='transparent' onClick={handleEdit} />}
              {isLoaded && (
                <IconButton
                  icon={faGear}
                  variant='transparent'
                  onClick={() => setShowSettings(prev => !prev)}
                />
              )}
            </>
          )}
        </div>
      </div>
      <div className={s.bodyWrapper}>
        {renderBody()}
        {showSettings && !isEditing && (
          <div className={s.settingsPanel}>
            <p className={s.settingsPanelTitle}>Display</p>
            <button
              className={fitToWidth ? s.settingsOptionActive : s.settingsOption}
              onClick={() => { setFitToWidth(true); localStorage.setItem('reader:fitToWidth', 'true'); }}
            >
              Fit to width
            </button>
            <button
              className={!fitToWidth ? s.settingsOptionActive : s.settingsOption}
              onClick={() => { setFitToWidth(false); localStorage.setItem('reader:fitToWidth', 'false'); }}
            >
              View as PDF
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
