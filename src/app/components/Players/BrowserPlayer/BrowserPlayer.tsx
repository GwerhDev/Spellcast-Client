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
import { useNavigate } from 'react-router-dom';
import { setSelectedVoice } from 'store/voiceSlice';

interface PlayerProps {
  showVoiceSelectorModal: React.Dispatch<SetStateAction<boolean>>;
}


export const BrowserPlayer: React.FC<PlayerProps> = ({ showVoiceSelectorModal }) => {
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

  const [lastVolume, setLastVolume] = useState(volume);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showMobileVolumeSlider, setShowMobileVolumeSlider] = useState(false);
  const mobileVolumeSliderRef = useRef<HTMLDivElement>(null);
  const mobileVolumeButtonRef = useRef<HTMLButtonElement>(null);
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

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
    const checkIsMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    };
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showMobileVolumeSlider &&
        mobileVolumeSliderRef.current &&
        !mobileVolumeSliderRef.current.contains(event.target as Node) &&
        mobileVolumeButtonRef.current &&
        !mobileVolumeButtonRef.current.contains(event.target as Node)
      ) {
        setShowMobileVolumeSlider(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMobileVolumeSlider]);

  const speakSentence = (text: string, onEnd: () => void, onStart?: () => void, isRetry = false) => {
    const utterance = new SpeechSynthesisUtterance(text);
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
      if (text.length > 100 && tryResume()) return;
      onEnd();
    };

    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled' || e.error === 'not-allowed') return;
      if (e.error === 'text-too-long') {
        // Browser rejected the text — split at midpoint word boundary
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
    if (!isPlaying) return;
    const id = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
    return () => clearInterval(id);
  }, [isPlaying]);

  useEffect(() => {
    // This effect triggers the start of sentence-based playback once sentences are set
    window.speechSynthesis.cancel();

    if (isLoaded && currentSentenceIndex > -1) {
      if (sentences.length === 0 || currentSentenceIndex >= sentences.length) {
        if (isPlayingRef.current && !waitingForSentencesRef.current) {
          if (currentPage < totalPages) return handleNext();
          return handleStop();
        }
        return;
      }

      if (!isPlayingRef.current) {
        if (autoPlayOnLoad) {
          dispatch(setAutoPlayOnLoad(false));
          isPlayingRef.current = true;
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
      isPlayingRef.current = true;
      dispatch(play());
      if (currentPage < totalPages) handleNext();
      else handleStop();
      return;
    }
    speakSentence(
      sentences[currentSentenceIndex],
      () => dispatch(setCurrentSentenceIndex(currentSentenceIndex + 1)),
      () => handlePlay(),
    );
    handlePlay();
  };

  const handleStop = () => {
    dispatch(stop());
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

  const handleVolumeToggle = () => {
    if (volume === 0) {
      dispatch(setVolume(lastVolume === 0 ? 1 : lastVolume));
    } else {
      setLastVolume(volume);
      dispatch(setVolume(0));
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
    <div className={s.audioPlayerContainer}>
      <section className={s.leftSection}>
        <VoiceSelectorButton onClick={() => showVoiceSelectorModal(true)} />
        {
          isLoaded &&
          <div className={s.documentDetails}>
            <p title={documentTitle || ""} onClick={handleTitle}>{documentTitle}</p>
            <small onClick={handlePageSelector}>Page {currentPage} of {totalPages}</small>
          </div>
        }
      </section>

      <PlaybackControls
        disabled={!isLoaded}
        handleNext={handleNext}
        handlePrevious={handlePrevious}
        isPrevDisabled={isPrevDisabled}
        isNextDisabled={isNextDisabled}
        handleTogglePlayPause={handleTogglePlayPause}
      />

      <VolumeControls
        volume={volume}
        handleVolumeToggle={handleVolumeToggle}
        volumePercentage={volumePercentage}
        isMobile={isMobile}
        showMobileVolumeSlider={showMobileVolumeSlider}
        setShowMobileVolumeSlider={setShowMobileVolumeSlider}
        mobileVolumeSliderRef={mobileVolumeSliderRef}
        mobileVolumeButtonRef={mobileVolumeButtonRef}
        setVolume={(vol) => dispatch(setVolume(vol))}
      />
    </div>
  );
};

