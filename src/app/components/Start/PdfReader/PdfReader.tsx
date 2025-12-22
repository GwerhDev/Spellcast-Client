import s from './PdfReader.module.css';
import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { textToSpeechService } from '../../../../services/tts';
import { setPlaylist, play, resetAudioPlayer } from '../../../../store/audioPlayerSlice';
import { PageSelector } from './PageSelector/PageSelector';
import { IconButton } from '../../Buttons/IconButton';
import { faArrowLeft, faEdit, faSave, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { PageSelectorModal } from '../../Modals/PageSelectorModal';
import { setPageText } from '../../../../store/pdfReaderSlice';
import { setText as setBrowserText, play as playBrowserAudio } from '../../../../store/browserPlayerSlice';

export const PdfReader = () => {
  const dispatch = useDispatch();
  const { currentPage, isLoaded, pages } = useSelector((state: RootState) => state.pdfReader);
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const { sentences, currentSentenceIndex, isPlaying: isBrowserPlaying } = useSelector((state: RootState) => state.browserPlayer);

  const currentPageText = pages[currentPage] || '';

  const [editedText, setEditedText] = useState(currentPageText || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isPageSelectorModalOpen, setIsPageSelectorModalOpen] = useState(false);

  const prevCurrentPageRef = useRef(currentPage);
  const textContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prevCurrentPageRef.current !== currentPage && isLoaded) {
      dispatch(resetAudioPlayer());
    }
    prevCurrentPageRef.current = currentPage;
  }, [currentPage, isLoaded, dispatch]);

  useEffect(() => {
    setEditedText(currentPageText);
  }, [currentPageText]);

  const handleGenerateAudio = async (textToGenerate: string, pageNumber: number) => {
    if (selectedVoice === 'browser') {
        dispatch(setBrowserText(textToGenerate));
        dispatch(playBrowserAudio());
    } else {
        try {
            const audioUrl = await textToSpeechService({ text: textToGenerate, voice: selectedVoice });
            dispatch(setPlaylist({ playlist: [audioUrl], startIndex: 0, sourceType: 'pdfPage', pdfPageNumber: pageNumber }));
            dispatch(play());
        } catch (error) {
            console.error('Failed to generate audio for page', error);
        }
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    const newText = textContainerRef.current?.innerText || editedText;
    dispatch(resetAudioPlayer());
    dispatch(setPageText({ pageNumber: currentPage, text: newText }));
    setEditedText(newText);
    setIsEditing(false);
    handleGenerateAudio(newText, currentPage);
  };

  const handleCancel = () => {
    setEditedText(currentPageText || '');
    setIsEditing(false);
  };

  const handleTextChange = (e: React.FormEvent<HTMLDivElement>) => {
    setEditedText(e.currentTarget.innerText);
  };

  const renderContent = () => {
    if (isBrowserPlaying && sentences.length > 0) {
      return sentences.map((sentence, index) => (
        <span key={index} className={index === currentSentenceIndex ? s.highlight : ''}>
          {sentence}
        </span>
      ));
    }
    return isEditing ? editedText : currentPageText || 'Extracted text will appear here...';
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
        className={s.textContainer}
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
