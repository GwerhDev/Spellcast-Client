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
  const [editedText, setEditedText] = useState<string | null>('');
  const [isEditing, setIsEditing] = useState(false);
  const textContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoaded && currentPage) {
      dispatch(goToPage(currentPage));
    }
  }, [dispatch, currentPage, isLoaded]);

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

  const handleTextChange = (e: string) => {
    setEditedText(e);
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
      {
        isEditing
          ?
          <SimpleEditor content={currentPageText || ""} onContentChange={handleTextChange} />
          :
          <div
            ref={textContainerRef}
            className={s.textContainer}
            contentEditable={isEditing}
            suppressContentEditableWarning={true}
          >
            {isLoaded ? (
              renderContent()
            ) : (
              <Spinner isLoading message="Loading..." />
            )}
          </div>
      }
    </div>
  )
}