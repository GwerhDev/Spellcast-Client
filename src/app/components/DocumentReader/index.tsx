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
import { setPageText, setContinuousPlay } from '../../../store/pdfReaderSlice';
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
  const {
    currentPage,
    isLoaded,
    pages,
    documentId,
    hasInitialPageSet,
    playbackTrigger,
    isContinuousPlayActive,
  } = useSelector((state: RootState) => state.pdfReader);
  const { title: documentTitle } = useSelector((state: RootState) => state.document);
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const { sentences: browserSentences, currentSentenceIndex, isPlaying: isBrowserPlaying } = useSelector((state: RootState) => state.browserPlayer);

  const currentPageText = pages[currentPage] || '';
  const localSentences = getSentences(currentPageText);

  const [editedText, setEditedText] = useState(currentPageText || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isPageSelectorModalOpen, setIsPageSelectorModalOpen] = useState(false);

  const prevCurrentPageRef = useRef(currentPage);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const titleAudioRef = useRef<HTMLAudioElement | null>(null); // For AI voice title playback
  const playbackTriggerRef = useRef(playbackTrigger);

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
    // Stop any title playback before starting page playback
    window.speechSynthesis.cancel();
    if (titleAudioRef.current) {
        titleAudioRef.current.pause();
    }

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

  const hasReadTitle = useRef(false);

  // Cleanup effect for title audio
  useEffect(() => {
      return () => {
          window.speechSynthesis.cancel();
          if (titleAudioRef.current) {
              titleAudioRef.current.pause();
              titleAudioRef.current = null;
          }
      };
  }, []);


  useEffect(() => {
      if (isLoaded && hasInitialPageSet && documentTitle && !hasReadTitle.current) {
          hasReadTitle.current = true;

          // Stop any currently playing audio from the main player
          dispatch(stop());
          dispatch(resetAudioPlayer());

          const titleText = `${documentTitle}`;

          if (selectedVoice.type === 'browser') {
              const utterance = new SpeechSynthesisUtterance(titleText);
              const voices = window.speechSynthesis.getVoices();
              const voice = voices.find(v => v.voiceURI === selectedVoice.value);
              if (voice) {
                  utterance.voice = voice;
              }
              window.speechSynthesis.speak(utterance);
          } else {
              const playAITitle = async () => {
                  try {
                      const audioUrl = await textToSpeechService({ text: titleText, voice: selectedVoice.value });
                      const audio = new Audio(audioUrl);
                      titleAudioRef.current = audio;
                      audio.play().catch(e => console.error("Title audio play failed", e));
                  } catch (error) {
                      console.error('Failed to generate title audio', error);
                  }
              };
              playAITitle();
          }
      }
  }, [isLoaded, hasInitialPageSet, documentTitle, selectedVoice, dispatch]);

  useEffect(() => {
      hasReadTitle.current = false;
      dispatch(setContinuousPlay(false));
  }, [documentId, dispatch]);

  // Effect to handle the first play request from the global player
  useEffect(() => {
    if (playbackTrigger > playbackTriggerRef.current) {
      playbackTriggerRef.current = playbackTrigger;
      if (!isContinuousPlayActive) {
        dispatch(setContinuousPlay(true));
      }
      handleGenerateAudio(currentPageText, currentPage);
    }
  }, [playbackTrigger, isContinuousPlayActive, currentPageText, currentPage, dispatch, handleGenerateAudio]);

  // Effect for continuous playback on page change
  useEffect(() => {
    if (isContinuousPlayActive && isLoaded && currentPage !== prevCurrentPageRef.current) {
      handleGenerateAudio(currentPageText, currentPage);
    }
  }, [currentPage, isContinuousPlayActive, isLoaded, currentPageText, handleGenerateAudio]);

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