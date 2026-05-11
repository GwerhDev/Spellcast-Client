import s from './BrowserPlayer.module.css';
import { useEffect, useState, useRef, SetStateAction } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../store';
import {
  setVolume,
  stop,
  play,
  setVoice,
  pause,
  setAutoPlayOnLoad,
} from '../../../../store/browserPlayerSlice';

import {
  goToNextPage,
  goToPreviousPage,
  setShowPageSelector,
  setCurrentSentenceIndex,
} from '../../../../store/pdfReaderSlice';
import { PlaybackControls } from './PlaybackControls/PlaybackControls';
import { VolumeControls } from './VolumeControls/VolumeControls';
import { VoiceSelectorButton } from './VoiceSelectorButton/VoiceSelectorButton';
import { PlayerConfigButton } from './PlayerConfigButton/PlayerConfigButton';
import { useNavigate } from 'react-router-dom';
import { setSelectedVoice } from 'store/voiceSlice';
import { getDocumentById } from '../../../../db';
import { useAppSelector } from '../../../../store/hooks';
import defaultCover from '../../../../assets/default-img.png';

interface PlayerProps {
  showVoiceSelectorModal: React.Dispatch<SetStateAction<boolean>>;
  showPlayerConfigModal: React.Dispatch<SetStateAction<boolean>>;
}

export const BrowserPlayer: React.FC<PlayerProps> = ({ showVoiceSelectorModal, showPlayerConfigModal }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    voice,
    volume,
    isPlaying,
    autoPlayOnLoad,
  } = useSelector((state: RootState) => state.browserPlayer);
  const {
    isLoaded,
    totalPages,
    currentPage,
    documentId,
    documentTitle,
    sentences,
    currentSentenceIndex,
  } = useSelector((state: RootState) => state.pdfReader);
  const { selectedVoice } = useSelector((state: RootState) => state.voice);

  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const volumeButtonRef = useRef<HTMLButtonElement>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { userData } = useAppSelector((state) => state.session);

  // Prevent advancing on stale empty sentences before PdfProcessor loads the new page
  const waitingForSentencesRef = useRef(false);
  useEffect(() => { waitingForSentencesRef.current = true; }, [currentPage]);
  useEffect(() => { waitingForSentencesRef.current = false; }, [sentences]);
  const volumePercentage = volume * 100;

  const handleTitle = () => {
    navigate(`/document/${documentId}/reader`);
  };

  const handlePageSelector = () => {
    dispatch(setShowPageSelector(true));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showVolumeSlider &&
        volumeSliderRef.current &&
        !volumeSliderRef.current.contains(event.target as Node) &&
        volumeButtonRef.current &&
        !volumeButtonRef.current.contains(event.target as Node)
      ) {
        setShowVolumeSlider(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showVolumeSlider]);

  useEffect(() => {
    let url: string | null = null;
    if (documentId && userData?.id) {
      getDocumentById(documentId, userData.id).then(doc => {
        if (doc?.cover) {
          url = URL.createObjectURL(doc.cover);
          setCoverUrl(url);
        } else {
          setCoverUrl(null);
        }
      });
    } else {
      setCoverUrl(null);
    }
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [documentId, userData?.id]);

  const speakSentence = (text: string, onEnd: () => void, onStart?: () => void, isRetry = false) => {
    const utterance = new SpeechSynthesisUtterance(text);
    if (!isRetry) activeUtteranceRef.current = utterance;
    if (voice) utterance.voice = voice;
    utterance.volume = volume;

    let lastBoundaryIndex = 0;
    utterance.onboundary = (e) => {
      if (e.name === 'word') lastBoundaryIndex = e.charIndex;
    };

    if (!isRetry && onStart) utterance.onstart = onStart;

    const tryResume = () => {
      if (lastBoundaryIndex > 0 && lastBoundaryIndex < text.length * 0.85) {
        const remaining = text.slice(lastBoundaryIndex).trimStart();
        if (remaining.length > 5) {
          speakSentence(remaining, onEnd, undefined, true);
          return true;
        }
      }
      return false;
    };

    utterance.onend = () => {
      if (!isRetry && activeUtteranceRef.current !== utterance) return;
      if (text.length > 100 && tryResume()) return;
      onEnd();
    };

    utterance.onerror = (e) => {
      if (!isRetry && activeUtteranceRef.current !== utterance) return;
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      if (e.error === 'not-allowed') {
        handleStop();
        return;
      }
      if (e.error === 'text-too-long') {
        const mid = Math.floor(text.length / 2);
        const split = text.lastIndexOf(' ', mid);
        const pivot = split > 0 ? split : mid;
        speakSentence(text.slice(0, pivot).trimEnd(), () => {
          speakSentence(text.slice(pivot).trimStart(), onEnd, undefined, true);
        }, undefined, true);
        return;
      }
      if (!tryResume()) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Chrome bug workaround: speechSynthesis freezes silently after ~14s without this
  useEffect(() => {
    if (!isPlaying) return window.speechSynthesis.pause();
    window.speechSynthesis.resume();

  }, [isPlaying]);

  useEffect(() => {
    // This effect triggers the start of sentence-based playback once sentences are set
    activeUtteranceRef.current = null;
    window.speechSynthesis.cancel();

    if (isLoaded && currentSentenceIndex > -1) {
      if (sentences.length === 0 || currentSentenceIndex >= sentences.length) {
        if (isPlaying && !waitingForSentencesRef.current) {
          if (currentPage < totalPages) return handleNext();
          return handleStop();
        }
        return;
      }

      if (!isPlaying) {
        if (autoPlayOnLoad) {
          dispatch(setAutoPlayOnLoad(false));
          dispatch(play());
        } else {
          return;
        }
      }

      speakSentence(
        sentences[currentSentenceIndex],
        () => dispatch(setCurrentSentenceIndex(currentSentenceIndex + 1)),
        () => handlePlay(),
      );
    }
    //eslint-disable-next-line
  }, [currentSentenceIndex, sentences, isLoaded, currentPage, autoPlayOnLoad]);

  const handleTogglePlayPause = () => {
    if (isPlaying) {
      window.speechSynthesis.pause();
      dispatch(pause());
      return;
    }
    if (sentences.length === 0) {
      dispatch(play());
      if (currentPage < totalPages) handleNext();
      else handleStop();
      return;
    }
    if (window.speechSynthesis.paused) {
      handlePlay();
      return;
    }
    speakSentence(
      sentences[currentSentenceIndex],
      () => dispatch(setCurrentSentenceIndex(currentSentenceIndex + 1)),
      () => handlePlay(),
    );
    dispatch(play());
  };

  const handleStop = () => {
    activeUtteranceRef.current = null;
    dispatch(stop());
    dispatch(setCurrentSentenceIndex(0));
    window.speechSynthesis.cancel();
  };

  const handlePlay = () => {
    dispatch(play());
    window.speechSynthesis.resume();
  };

  const handlePrevious = () => {
    if (isLoaded) {
      dispatch(goToPreviousPage());
    }
  };

  const handleNext = () => {
    if (isLoaded) {
      dispatch(goToNextPage());
    }
  };


  const isPrevDisabled = isLoaded ? currentPage === 1 : true;
  const isNextDisabled = isLoaded ? currentPage === totalPages : true;

  useEffect(() => {
    const handleVoicesChanged = () => {
      const voices = window.speechSynthesis.getVoices();

      if (selectedVoice.type === 'browser') {
        const storedBrowserVoice = voices.find(v => v.name === selectedVoice.value);
        if (storedBrowserVoice) {
          dispatch(setVoice(storedBrowserVoice));
        } else if (voices.length > 0) {
          // Fallback to default browser voice if stored one is not found
          const defaultVoice = voices.find(v => v.default);
          dispatch(setVoice(defaultVoice || voices[0]));
          // Also update Redux state to reflect the actual voice being used
          dispatch(setSelectedVoice({ value: (defaultVoice || voices[0]).name, type: 'browser' }));
        }
      }
    };
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    handleVoicesChanged();
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    };
  }, [dispatch, voice, selectedVoice]);

  return (
    <div className={s.outterContainer}>
      <div className={s.container}>
        <div className={s.audioPlayerContainer}>
          <section className={s.leftSection}>
            <img
              src={coverUrl ?? defaultCover}
              alt=""
              className={s.cover}
              onError={(e) => { (e.target as HTMLImageElement).src = defaultCover; }}
            />
            {isLoaded && (
              <div className={s.documentDetails}>
                <p title={documentTitle || ""} onClick={documentId ? handleTitle : undefined} style={documentId ? undefined : { cursor: 'default' }}>{documentTitle}</p>
                {documentId && <small onClick={handlePageSelector}>Page {currentPage} of {totalPages}</small>}
              </div>
            )}
          </section>

          <PlaybackControls
            disabled={!isLoaded}
            handleNext={handleNext}
            handlePrevious={handlePrevious}
            isPrevDisabled={isPrevDisabled}
            isNextDisabled={isNextDisabled}
            handleTogglePlayPause={handleTogglePlayPause}
          />

          <div className={s.rightSection}>
            <VoiceSelectorButton onClick={() => showVoiceSelectorModal(true)} />
            <PlayerConfigButton onClick={() => showPlayerConfigModal(true)} />
            <VolumeControls
              volume={volume}
              volumePercentage={volumePercentage}
              showVolumeSlider={showVolumeSlider}
              setShowVolumeSlider={setShowVolumeSlider}
              volumeSliderRef={volumeSliderRef}
              volumeButtonRef={volumeButtonRef}
              setVolume={(vol) => dispatch(setVolume(vol))}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

