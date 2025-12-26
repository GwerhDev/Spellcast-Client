import s from './index.module.css';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faEdit, faFilePdf, faSave, faXmark } from '@fortawesome/free-solid-svg-icons';
import { RootState } from '../../../store';
import { goToPage, setPageText } from '../../../store/pdfReaderSlice';
import { setCurrentSentenceIndex, resetBrowserPlayer } from '../../../store/browserPlayerSlice';
import { Spinner } from '../Spinner';
import { IconButton } from '../Buttons/IconButton';
import { PageSelector } from './PageSelector/PageSelector';
import { getDocumentProgress } from '../../../db';

export const DocumentReader = () => {
  const dispatch = useDispatch();
  const {
    currentPageText,
    documentTitle,
    currentPage,
    documentId,
    isLoaded,
    pages,
  } = useSelector((state: RootState) => state.pdfReader);
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const { sentences, currentSentenceIndex } = useSelector((state: RootState) => state.browserPlayer);
  const [editedText, setEditedText] = useState<string | null>('');
  const [isEditing, setIsEditing] = useState(false);
  const textContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const handleProgress = async () => {
        const progress = await getDocumentProgress(documentId || "");
        if (progress?.currentPage) return dispatch(goToPage(progress.currentPage));
        return dispatch(goToPage(currentPage));
      }

      handleProgress();
  }, [pages, currentPage, dispatch, documentId]);

  useEffect(() => {
    setEditedText(currentPageText);
  }, [currentPageText]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    const newText = textContainerRef.current?.innerText || editedText || "";
    dispatch(resetBrowserPlayer());
    dispatch(setPageText({ text: newText }));
    setEditedText(newText);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(currentPageText || "");
    setIsEditing(false);
  };

  const handleTextChange = (e: React.FormEvent<HTMLDivElement>) => {
    setEditedText(e.currentTarget.innerText);
  };

  const handleSentenceClick = (clickedIndex: number) => {
    if (selectedVoice.type !== 'browser' || isEditing) return;
    dispatch(setCurrentSentenceIndex(clickedIndex));
  };

  const renderContent = () => {
    if (isEditing) {
      return editedText;
    }

    if (selectedVoice.type === 'browser') {
      return sentences.map((sentence, index) => (
        <span
          key={index}
          className={index === currentSentenceIndex ? s.highlight : s.sentence}
          onClick={() => handleSentenceClick(index)}
        >
          {sentence}
        </span>
      ));
    }

    return currentPageText || 'Extracted text will appear here...';
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
      <div
        ref={textContainerRef}
        className={`${s.textContainer} ${isEditing ? s.editing : ''}`}
        contentEditable={isEditing}
        onInput={handleTextChange}
        suppressContentEditableWarning={true}
      >
        {isLoaded ? (
          renderContent()
        ) : (
          <Spinner isLoading message="Loading..." />
        )}
      </div>
    </div>
  )
}