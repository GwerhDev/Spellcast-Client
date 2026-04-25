import s from './AudioPlayer.module.css';
import { useRef, useEffect, useState, SetStateAction } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../store';
import {
  setVolume,
  setCurrentTime,
  setDuration,
  playNext,
  playPrevious,
  play,
  pause,
  setAutoPlayOnLoad,
} from '../../../../store/audioPlayerSlice';
import { goToNextPage, goToPreviousPage, setShowPageSelector } from '../../../../store/pdfReaderSlice';
import { PlaybackControls } from './PlaybackControls/PlaybackControls';
import { VolumeControls } from './VolumeControls/VolumeControls';
import { VoiceSelectorButton } from './VoiceSelectorButton/VoiceSelectorButton';
import { textToSpeechService } from 'services/tts';
import { getCachedAudio, setCachedAudio } from 'db/audioCache';
import { getDocumentById } from '../../../../db';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../../store/hooks';

interface PlayerProps {
  showVoiceSelectorModal: React.Dispatch<SetStateAction<boolean>>;
}

export const AudioPlayer: React.FC<PlayerProps> = ({ showVoiceSelectorModal }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    volume,
    playlist,
    duration,
    isPlaying,
    currentTime,
    currentTrackIndex,
    autoPlayOnLoad,
  } = useSelector((state: RootState) => state.audioPlayer);
  const {
    isLoaded,
    documentId,
    totalPages,
    currentPage,
    documentTitle,
    currentPageText,
  } = useSelector((state: RootState) => state.pdfReader);
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const { userData } = useAppSelector((state) => state.session);

  const [lastVolume, setLastVolume] = useState(volume);
  const [isMobile, setIsMobile] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [showMobileVolumeSlider, setShowMobileVolumeSlider] = useState(false);

  const pageAudioReadyRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);
  const mobileVolumeSliderRef = useRef<HTMLDivElement>(null);
  const mobileVolumeButtonRef = useRef<HTMLButtonElement>(null);

  const currentTrackUrl = currentTrackIndex !== null ? playlist[currentTrackIndex] : null;
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercentage = volume * 100;

  useEffect(() => {
    const abortMain = abortControllerRef;
    const abortPrefetch = prefetchAbortRef;
    const blobUrl = currentBlobUrlRef;
    return () => {
      abortMain.current?.abort();
      abortPrefetch.current?.abort();
      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    };
  }, []);

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
    if (audioRef.current) {
      if (currentTrackUrl) {
        audioRef.current.src = currentTrackUrl;
        audioRef.current.load();
        if (isPlaying && pageAudioReadyRef.current) {
          audioRef.current.play().catch(e => console.error("Error playing audio:", e));
        }
      } else {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    }
    //eslint-disable-next-line
  }, [currentTrackUrl]);

  useEffect(() => {
    if (!audioRef.current || !pageAudioReadyRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(e => console.error("Error playing audio:", e));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current && !isPlaying && currentTime === 0) {
      audioRef.current.currentTime = 0;
    }
  }, [isPlaying, currentTime]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      dispatch(setCurrentTime(audioRef.current.currentTime));
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      dispatch(setDuration(audioRef.current.duration));
    }
  };

  const handleEnded = () => {
    if (isLoaded) {
      if (currentPage < totalPages) {
        dispatch(goToNextPage());
      }
    } else {
      dispatch(playNext());
    }
  };

  const handlePrevious = () => {
    if (isLoaded) {
      dispatch(goToPreviousPage());
    } else {
      dispatch(playPrevious());
    }
  };

  const handleNext = () => {
    if (isLoaded) {
      dispatch(goToNextPage());
    } else {
      dispatch(playNext());
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

  const loadAudio = (blob: Blob) => {
    if (currentBlobUrlRef.current) URL.revokeObjectURL(currentBlobUrlRef.current);
    const url = URL.createObjectURL(blob);
    currentBlobUrlRef.current = url;
    audioRef.current!.src = url;
    audioRef.current!.load();
    pageAudioReadyRef.current = true;
  };

  const prefetchNextPage = async (nextPage: number) => {
    if (!documentId || !userData?.id) return;
    const cached = await getCachedAudio(documentId, nextPage, selectedVoice.value);
    if (cached) return;

    const controller = new AbortController();
    prefetchAbortRef.current = controller;
    try {
      const doc = await getDocumentById(documentId, userData.id);
      if (controller.signal.aborted || !doc?.pagesContent) return;
      const pages = JSON.parse(doc.pagesContent) as unknown[];
      const pageText = pages[nextPage - 1];
      if (!pageText) return;
      const blob = await textToSpeechService(
        { text: JSON.stringify(pageText), voice: selectedVoice.value },
        controller.signal
      );
      if (!controller.signal.aborted) {
        setCachedAudio(documentId, nextPage, selectedVoice.value, blob);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      console.error('Prefetch error:', e);
    }
  };

  const fetchAndPlay = async (text: string) => {
    const shouldPlay = isPlaying || autoPlayOnLoad;

    abortControllerRef.current?.abort();
    prefetchAbortRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    pageAudioReadyRef.current = false;
    setIsFetching(true);
    if (audioRef.current) audioRef.current.currentTime = 0;
    dispatch(setCurrentTime(0));
    dispatch(setDuration(0));

    try {
      let blob: Blob | null = documentId
        ? await getCachedAudio(documentId, currentPage, selectedVoice.value)
        : null;

      if (controller.signal.aborted) return;

      if (!blob) {
        blob = await textToSpeechService({ text, voice: selectedVoice.value }, controller.signal);
        if (!controller.signal.aborted && documentId) {
          setCachedAudio(documentId, currentPage, selectedVoice.value, blob);
        }
      }

      if (!controller.signal.aborted) {
        loadAudio(blob);
        if (shouldPlay) {
          dispatch(play());
          audioRef.current!.play().catch(e => console.error("Error playing audio:", e));
        }
        if (currentPage < totalPages) prefetchNextPage(currentPage + 1);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      console.error(e);
    } finally {
      if (!controller.signal.aborted) setIsFetching(false);
    }
  };

  const handleTogglePlayPause = () => {
    if (isFetching) return;
    if (isPlaying) {
      dispatch(pause());
      return;
    }
    if (selectedVoice.type === 'ai' && !pageAudioReadyRef.current) {
      fetchAndPlay(currentPageText);
      return;
    }
    dispatch(play());
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleTitle = () => {
    navigate(`/document/${documentId}/reader`);
  };

  const handlePageSelector = () => {
    dispatch(setShowPageSelector(true));
  };

  const isPrevDisabled = isLoaded ? currentPage === 1 : currentTrackIndex === 0;
  const isNextDisabled = isLoaded ? currentPage === totalPages : currentTrackIndex === (playlist.length - 1);

  useEffect(() => {
    if (selectedVoice.type !== 'ai' || !currentPageText) return;
    if (autoPlayOnLoad) dispatch(setAutoPlayOnLoad(false));
    fetchAndPlay(currentPageText);
    //eslint-disable-next-line
  }, [currentPageText]);

  return (
    <div className={s.outterContainer}>
      <div className={s.container}>
        <div className={s.audioPlayerContainer}>
          <audio
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
          />
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
            audioRef={audioRef}
            currentTime={currentTime}
            duration={duration}
            progressPercentage={progressPercentage}
            handlePrevious={handlePrevious}
            handleNext={handleNext}
            isPlaying={isPlaying}
            isFetching={isFetching}
            isPrevDisabled={isPrevDisabled}
            isNextDisabled={isNextDisabled}
            currentTrackIndex={currentTrackIndex}
            formatTime={formatTime}
            togglePlayPause={handleTogglePlayPause}
            setCurrentTime={(time) => dispatch(setCurrentTime(time))}
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
      </div>
    </div>
  );
};
