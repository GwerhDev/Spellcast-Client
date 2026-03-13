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

  useEffect(() => {
    // This effect triggers the start of sentence-based playback once sentences are set
    window.speechSynthesis.cancel();

    if (isLoaded && sentences.length > 0 && currentSentenceIndex > -1) {
      if (currentSentenceIndex >= sentences.length) {
        if (currentPage < totalPages) return handleNext();
        return handleStop();
      }

      const utterance = new SpeechSynthesisUtterance(sentences[currentSentenceIndex]);
      if (voice) utterance.voice = voice;
      utterance.volume = volume;
      window.speechSynthesis.speak(utterance);

      utterance.onstart = () => {
        handlePlay();
      };

      utterance.onend = () => {
        dispatch(setCurrentSentenceIndex(currentSentenceIndex + 1));
      };
    }
    //eslint-disable-next-line
  }, [currentSentenceIndex, sentences, isLoaded, currentPage]);

  const handleTogglePlayPause = () => {
    if (isPlaying) {
      window.speechSynthesis.pause();
      dispatch(pause());
      return;
    };
    const utterance = new SpeechSynthesisUtterance(sentences[currentSentenceIndex]);
    if (voice) utterance.voice = voice;
    utterance.volume = volume;
    window.speechSynthesis.speak(utterance);

    utterance.onstart = () => {
      handlePlay();
    };

    utterance.onend = () => {
      dispatch(setCurrentSentenceIndex(currentSentenceIndex + 1));
    };
    handlePlay();
    return;
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

