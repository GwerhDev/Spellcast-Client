import s from './index.module.css';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { faArrowLeft, faEdit, faSave, faXmark } from '@fortawesome/free-solid-svg-icons';
import { RootState } from '../../../store';
import { resetAudioPlayer } from '../../../store/audioPlayerSlice';
import { setSentencesAndPlay } from '../../../store/browserPlayerSlice';
import { setPageText, setContinuousPlay } from '../../../store/pdfReaderSlice';
import { IconButton } from '../Buttons/IconButton';
import { PageSelector } from './PageSelector/PageSelector';
import { PageSelectorModal } from '../Modals/PageSelectorModal';


const getSentences = (text: string): string[] => {
  if (!text) {
    return [];
  }
  // Split the text after any period, exclamation mark, or question mark.
  const sentences = text.split(/(?<=[.!?])/);

  // The split might leave empty strings or strings with only whitespace in the array,
  // so we filter those out and trim the results.
  return sentences.filter(s => s.trim().length > 0);
};

export const DocumentReader = () => {
  const dispatch = useDispatch();
  const {
    currentPage,
    isLoaded,
    pages,
    playbackTrigger,
    isContinuousPlayActive,
  } = useSelector((state: RootState) => state.pdfReader);
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const { sentences: browserSentences, currentSentenceIndex, isPlaying: isBrowserPlaying } = useSelector((state: RootState) => state.browserPlayer);

  const currentPageText = pages[currentPage] || '';
  const localSentences = getSentences(currentPageText);

  const [editedText, setEditedText] = useState(currentPageText || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isPageSelectorModalOpen, setIsPageSelectorModalOpen] = useState(false);

  const textContainerRef = useRef<HTMLDivElement>(null);
  const playbackTriggerRef = useRef(playbackTrigger);

  useEffect(() => {
    setEditedText(currentPageText);
  }, [currentPageText]);

  // Effect to handle the first play request from the global player
  useEffect(() => {
    if (playbackTrigger > playbackTriggerRef.current) {
      playbackTriggerRef.current = playbackTrigger;
      if (!isContinuousPlayActive) {
        dispatch(setContinuousPlay(true));
      }
    }
  }, [playbackTrigger, isContinuousPlayActive, currentPageText, currentPage, dispatch]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    const newText = textContainerRef.current?.innerText || editedText;
    dispatch(resetAudioPlayer());
    dispatch(setPageText({ pageNumber: currentPage, text: newText }));
    setEditedText(newText);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(currentPageText || '');
    setIsEditing(false);
  };

  const handleTextChange = (e: React.FormEvent<HTMLDivElement>) => {
    setEditedText(e.currentTarget.innerText);
  };

  const handleSentenceClick = (clickedIndex: number) => {
    if (selectedVoice.type !== 'browser' || isEditing) return;

    window.speechSynthesis.cancel();

    dispatch(setSentencesAndPlay({ sentences: localSentences, text: currentPageText, startIndex: clickedIndex }));
  };

  const renderContent = () => {
    if (isEditing) {
      return editedText;
    }

    if (selectedVoice.type === 'browser') {
      const sentencesToRender = isBrowserPlaying ? browserSentences : localSentences;
      return sentencesToRender.map((sentence, index) => (
        <span
          key={index}
          className={isBrowserPlaying && index === currentSentenceIndex ? s.highlight : s.sentence}
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
      <PageSelectorModal
        show={isPageSelectorModalOpen}
        onClose={() => setIsPageSelectorModalOpen(false)}
      />
      <div className={s.pageInfoContainer}>
        <span className={s.headerControls}>
          <Link to={'/'}>
            <IconButton variant='transparent' icon={faArrowLeft} />
          </Link>
          {isLoaded && <PageSelector onClick={() => setIsPageSelectorModalOpen(true)} />}
        </span>
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
          <p>Loading page...</p>
        )}
      </div>
    </div>
  )
}