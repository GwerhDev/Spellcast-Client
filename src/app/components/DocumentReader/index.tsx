import s from './index.module.css';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { textToSpeechService } from '../../../services/tts';
import { setPlaylist, play, resetAudioPlayer } from '../../../store/audioPlayerSlice';
import { PageSelector } from './PageSelector/PageSelector';
import { IconButton } from '../Buttons/IconButton';
import { faArrowLeft, faEdit, faSave, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { PageSelectorModal } from '../Modals/PageSelectorModal';
import { setPageText } from '../../../store/pdfReaderSlice';
import { setSentencesAndPlay, stop } from '../../../store/browserPlayerSlice';

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
  const { currentPage, isLoaded, pages, documentId, hasInitialPageSet } = useSelector((state: RootState) => state.pdfReader);
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const { sentences: browserSentences, currentSentenceIndex, isPlaying: isBrowserPlaying } = useSelector((state: RootState) => state.browserPlayer);

  const currentPageText = pages[currentPage] || '';
  const localSentences = getSentences(currentPageText);

  const [editedText, setEditedText] = useState(currentPageText || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isPageSelectorModalOpen, setIsPageSelectorModalOpen] = useState(false);

  const prevCurrentPageRef = useRef(currentPage);
  const textContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prevCurrentPageRef.current !== currentPage && isLoaded) {
      dispatch(resetAudioPlayer());
      dispatch(stop());
    }
    prevCurrentPageRef.current = currentPage;
  }, [currentPage, isLoaded, dispatch]);

  useEffect(() => {
    setEditedText(currentPageText);
  }, [currentPageText]);

  const handleGenerateAudio = useCallback(async (textToGenerate: string, pageNumber: number) => {
    if (selectedVoice.type === 'browser') {
      const sentences = getSentences(textToGenerate);
      dispatch(setSentencesAndPlay({ sentences, text: textToGenerate }));
    } else {
      try {
        const audioUrl = await textToSpeechService({ text: textToGenerate, voice: selectedVoice.value });
        dispatch(setPlaylist({ playlist: [audioUrl], startIndex: 0, sourceType: 'pdfPage', pdfPageNumber: pageNumber }));
        dispatch(play());
      } catch (error) {
        console.error('Failed to generate audio for page', error);
      }
    }
  }, [dispatch, selectedVoice]);

  const hasInitiatedReadForPage = useRef<string | null>(null); // Tracks the pageKey for which read was initiated

  useEffect(() => {
    // Reset the initiated read status when currentPage or documentId changes
    hasInitiatedReadForPage.current = null;
  }, [currentPage, documentId]);

  useEffect(() => {
    const pageKey = `${currentPage}-${documentId}`;

    // Conditions for initiating read:
    // 1. Document is loaded
    // 2. Initial page has been set (either default 1 or saved page)
    // 3. Not in editing mode
    // 4. Document ID is valid
    // 5. Current page text is available
    // 6. Audio has not yet been initiated for this specific pageKey
    if (isLoaded && hasInitialPageSet && !isEditing && documentId && currentPageText && hasInitiatedReadForPage.current !== pageKey) {
      hasInitiatedReadForPage.current = pageKey; // Mark that we are initiating read for this page

      const timeoutId = setTimeout(() => {
        handleGenerateAudio(currentPageText, currentPage);
      }, 100); // Small delay to allow DOM to render

      return () => {
        clearTimeout(timeoutId);
        // If the component unmounts or dependencies change before timeout,
        // we might want to reset hasInitiatedReadForPage.current if it matches pageKey
        if (hasInitiatedReadForPage.current === pageKey) {
            hasInitiatedReadForPage.current = null;
        }
      };
    }
  }, [isLoaded, hasInitialPageSet, currentPage, documentId, currentPageText, isEditing, handleGenerateAudio]);

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