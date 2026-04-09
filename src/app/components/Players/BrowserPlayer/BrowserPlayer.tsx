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

const MAX_UTTERANCE_LEN = 150;

const splitIntoChunks = (text: string, maxLen: number): string[] => {
  if (text.length <= maxLen) return [text];
  const breakPoints = [', ', '; ', ': '];
  for (const bp of breakPoints) {
    const idx = text.lastIndexOf(bp, maxLen);
    if (idx > maxLen / 3) {
      const before = text.slice(0, idx + bp.length - 1).trim();
      const after = text.slice(idx + bp.length).trim();
      return [...splitIntoChunks(before, maxLen), ...splitIntoChunks(after, maxLen)];
    }
  }
  const idx = text.lastIndexOf(' ', maxLen);
  if (idx > 0) {
    return [...splitIntoChunks(text.slice(0, idx), maxLen), ...splitIntoChunks(text.slice(idx + 1), maxLen)];
  }
  return [text.slice(0, maxLen), ...splitIntoChunks(text.slice(maxLen), maxLen)];
};

export const BrowserPlayer: React.FC<PlayerProps> = ({ showVoiceSelectorModal }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    voice,
    volume,
    isPlaying,
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
    navigate(`/document/local/${documentId}`);
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

  const speakChunk = (chunks: string[], index: number, onEnd: () => void, onStart?: () => void) => {
    if (index >= chunks.length) { onEnd(); return; }
    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    if (voice) utterance.voice = voice;
    utterance.volume = volume;
    if (index === 0 && onStart) utterance.onstart = onStart;
    utterance.onend = () => speakChunk(chunks, index + 1, onEnd);
    window.speechSynthesis.speak(utterance);
  };

  const speakSentence = (text: string, onEnd: () => void, onStart?: () => void) => {
    speakChunk(splitIntoChunks(text, MAX_UTTERANCE_LEN), 0, onEnd, onStart);
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

      speakSentence(
        sentences[currentSentenceIndex],
        () => dispatch(setCurrentSentenceIndex(currentSentenceIndex + 1)),
        () => handlePlay(),
      );
    }
    //eslint-disable-next-line
  }, [currentSentenceIndex, sentences, isLoaded, currentPage]);

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

