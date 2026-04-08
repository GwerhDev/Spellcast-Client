import s from './index.module.css';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faEdit, faFilePdf, faSave, faXmark } from '@fortawesome/free-solid-svg-icons';
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
    sentences,
    currentSentenceIndex,
  } = useSelector((state: RootState) => state.pdfReader);
  const { selectedVoice, } = useSelector((state: RootState) => state.voice);
  const [editedText, setEditedText] = useState<JSONContent>(emptyContent);
  const [isEditing, setIsEditing] = useState<boolean>(false);
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

  const renderFormattedContent = () => {
    if (!editedText?.content) return null;

    return editedText.content.map((node, nIdx) => {
      if (node.type !== 'paragraph' && node.type !== 'heading') return null;

      const nodeContent = node.content || [];
      if (!nodeContent.length) return <p key={nIdx} className={s.emptyBlock} />;

      const level = node.type === 'heading' ? ((node.attrs as { level?: number })?.level ?? 1) : 0;
      const Tag = (node.type === 'heading' ? `h${level}` : 'p') as keyof JSX.IntrinsicElements;

      const inlineContent = nodeContent.map((child, cIdx) => {
        if (child.type === 'hardBreak') return <span key={cIdx}> </span>;
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

  const renderFormattedSentences = () => {
    if (!editedText?.content) return null;

    let sentIdx = 0;

    return editedText.content.map((node, nIdx) => {
      if (node.type !== 'paragraph' && node.type !== 'heading') return null;

      const nodeText = (node.content || [])
        .map((c) => (c.type === 'text' ? ((c as { type: string; text?: string }).text || '') : ''))
        .join('')
        .trim();

      if (!nodeText) return <p key={nIdx} className={s.emptyBlock} />;

      const nodeSentences = nodeText.split(/(?<=[.!?])\s*/).filter(Boolean);
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
        <SimpleEditor isEditable={true} content={editedText} onContentChange={handleTextChange} />
      );
    }

    if (selectedVoice.type === 'browser') {
      return (
        <div ref={textContainerRef} className={`${s.textContainer} ${s.readerContent}`}>
          {renderFormattedSentences()}
        </div>
      );
    }

    return (
      <div className={`${s.textContainer} ${s.readerContent}`}>
        {renderFormattedContent()}
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
            isLoaded && <IconButton icon={faEdit} variant='transparent' onClick={handleEdit} />
          )}
        </div>
      </div>
      {renderBody()}
    </div>
  )
}
