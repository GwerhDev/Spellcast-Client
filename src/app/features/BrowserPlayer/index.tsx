import s from '../../components/Players/BrowserPlayer/BrowserPlayer.module.css';
import { useLanguage } from '../../../i18n';
import { useEffect, useState, useRef, SetStateAction } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import {
  setVolume,
  stop,
  play,
  setVoice,
  pause,
  setAutoPlayOnLoad,
  requestResume,
} from '../../../store/browserPlayerSlice';
import { setSoundBgVolume, setMasterVolume } from '../../../store/userLibrarySlice';
import {
  goToNextPage,
  goToPreviousPage,
  setShowSearcher,
  setCurrentSentenceIndex,
} from '../../../store/pdfReaderSlice';
import { PlaybackControls } from './PlaybackControls';
import { VolumeControls } from '../../components/Players/BrowserPlayer/VolumeControls/VolumeControls';
import { VoiceSelectorButton } from '../../components/Players/BrowserPlayer/VoiceSelectorButton/VoiceSelectorButton';
import { PlayerConfigButton } from '../../components/Players/BrowserPlayer/PlayerConfigButton/PlayerConfigButton';
import { useNavigate } from 'react-router-dom';
import { setSelectedVoice } from '../../../store/voiceSlice';
import { getDocumentById } from '../../../db';
import { useAppSelector } from '../../../store/hooks';
import { faFilePdf } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Waveform } from '../../components/Waveform/Waveform';
import { DocumentDetailModal } from '../../components/Modals/DocumentDetailModal';

interface PlayerProps {
  showVoiceSelectorModal: React.Dispatch<SetStateAction<boolean>>;
  showPlayerConfigModal: React.Dispatch<SetStateAction<boolean>>;
}

export const BrowserPlayer: React.FC<PlayerProps> = ({ showVoiceSelectorModal, showPlayerConfigModal }) => {
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    voice,
    volume,
    isPlaying,
    autoPlayOnLoad,
    toggleSeq,
    resumeSeq,
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
  const [showDocDetail, setShowDocDetail] = useState(false);
  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const volumeButtonRef = useRef<HTMLButtonElement>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSpeechPausedRef = useRef(false);
  const volumeDragPausedRef = useRef(false);
  const { userData } = useAppSelector((state) => state.session);
  const { activeSoundBgId, soundBgVolume, masterVolume } = useAppSelector((state) => state.userLibrary);

  const waitingForSentencesRef = useRef(false);
  useEffect(() => { waitingForSentencesRef.current = true; }, [currentPage]);
  useEffect(() => { waitingForSentencesRef.current = false; }, [sentences]);

  const togglePlayPauseRef = useRef<() => void>(() => { });
  useEffect(() => {
    if (!toggleSeq) return;
    togglePlayPauseRef.current();
  }, [toggleSeq]);
  const volumePercentage = volume * 100;

  const handleTitle = () => {
    navigate(`/document/${documentId}/reader`);
  };

  const handleSearcher = () => {
    dispatch(setShowSearcher(true));
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
    if (!isRetry) {
      activeUtteranceRef.current = utterance;
      isSpeechPausedRef.current = false;
    }
    if (voice) utterance.voice = voice;
    utterance.volume = volume * masterVolume;

    if (!isRetry && onStart) utterance.onstart = onStart;

    utterance.onend = () => {
      if (!isRetry && activeUtteranceRef.current !== utterance) return;
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
      onEnd();
    };

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!isPlaying) window.speechSynthesis.pause();
  }, [isPlaying]);

  // Dedicated resume path for attention guard: always cancel + relaunch from current index.
  // speechSynthesis.resume() is unreliable if the utterance was canceled mid-pause.
  useEffect(() => {
    if (!resumeSeq) return;
    window.speechSynthesis.cancel();
    isSpeechPausedRef.current = false;
    if (sentences.length === 0 || currentSentenceIndex >= sentences.length) return;
    speakSentence(
      sentences[currentSentenceIndex],
      () => dispatch(setCurrentSentenceIndex(currentSentenceIndex + 1)),
      () => handlePlay(),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeSeq]);

  // Workaround for the Chrome SpeechSynthesis bug where the engine silently
  // freezes after ~15s of continuous speech. Nudging pause/resume keeps it alive.
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 14_000);
    return () => clearInterval(id);
  }, [isPlaying]);

  useEffect(() => {
    activeUtteranceRef.current = null;
    isSpeechPausedRef.current = false;
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
      isSpeechPausedRef.current = true;
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
    // Resume if the Web Speech API is already paused (including when paused externally
    // by the attention guard via dispatch(pause()) without going through this handler).
    if (isSpeechPausedRef.current || window.speechSynthesis.paused) {
      isSpeechPausedRef.current = false;
      window.speechSynthesis.resume();
      dispatch(play());
      return;
    }
    speakSentence(
      sentences[currentSentenceIndex],
      () => dispatch(setCurrentSentenceIndex(currentSentenceIndex + 1)),
      () => handlePlay(),
    );
    dispatch(play());
  };
  togglePlayPauseRef.current = handleTogglePlayPause;

  const handleStop = () => {
    activeUtteranceRef.current = null;
    dispatch(stop());
    dispatch(setCurrentSentenceIndex(0));
    window.speechSynthesis.cancel();
  };

  const handlePlay = () => {
    dispatch(play());
  };

  const handleVolumePointerDown = () => {
    if (activeUtteranceRef.current && !isSpeechPausedRef.current && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      volumeDragPausedRef.current = true;
    }
  };

  const handleVolumePointerUp = () => {
    if (!volumeDragPausedRef.current) return;
    volumeDragPausedRef.current = false;
    if (!activeUtteranceRef.current) return;
    window.speechSynthesis.cancel();
    speakSentence(
      sentences[currentSentenceIndex],
      () => dispatch(setCurrentSentenceIndex(currentSentenceIndex + 1)),
      () => handlePlay(),
    );
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
          const defaultVoice = voices.find(v => v.default);
          dispatch(setVoice(defaultVoice || voices[0]));
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
    <>
      <DocumentDetailModal
        documentId={documentId ?? null}
        show={showDocDetail}
        onClose={() => setShowDocDetail(false)}
      />
      <div data-testid="browser-player" className={s.container}>
        <div className={s.audioPlayerContainer}>
          <section className={s.leftSection}>
            <div
              className={s.coverWrap}
              onClick={documentId ? () => setShowDocDetail(true) : undefined}
              style={documentId ? { cursor: 'pointer' } : undefined}
            >
              {coverUrl
                ? <img src={coverUrl} alt="" className={s.cover} />
                : <div className={s.coverIcon}><FontAwesomeIcon icon={faFilePdf} /></div>
              }
              {isPlaying && (
                <div className={s.coverWaveOverlay}>
                  <Waveform active bars={4} height={14} color="white" />
                </div>
              )}
            </div>
            {isLoaded && (
              <div className={s.documentDetails}>
                <p title={documentTitle || ''} onClick={documentId ? handleTitle : undefined} style={documentId ? undefined : { cursor: 'default' }}>{documentTitle}</p>
                {documentId && <small onClick={handleSearcher}>{t.document.page} {currentPage} {t.document.of} {totalPages}</small>}
              </div>
            )}
            <VoiceSelectorButton onClick={() => showVoiceSelectorModal(true)} />
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
            <VolumeControls
              volume={volume}
              volumePercentage={volumePercentage}
              showVolumeSlider={showVolumeSlider}
              setShowVolumeSlider={setShowVolumeSlider}
              volumeSliderRef={volumeSliderRef}
              volumeButtonRef={volumeButtonRef}
              setVolume={(vol) => dispatch(setVolume(vol))}
              onSliderPointerDown={handleVolumePointerDown}
              onSliderPointerUp={handleVolumePointerUp}
              activeSoundBgId={activeSoundBgId}
              soundBgVolume={soundBgVolume}
              setSoundBgVolume={(v) => dispatch(setSoundBgVolume(v))}
              masterVolume={masterVolume}
              setMasterVolume={(v) => dispatch(setMasterVolume(v))}
            />
            <PlayerConfigButton onClick={() => showPlayerConfigModal(true)} />
          </div>
        </div>
      </div>
    </>
  );
};
