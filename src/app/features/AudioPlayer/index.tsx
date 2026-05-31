import s from '../../components/Players/AudioPlayer/AudioPlayer.module.css';
import { useLanguage } from '../../../i18n';
import { useRef, useEffect, useState, SetStateAction } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import {
  setVolume,
  setCurrentTime,
  setDuration,
  playNext,
  playPrevious,
  play,
  pause,
  setAutoPlayOnLoad,
  setAiTimeline,
  clearPendingSeek,
} from '../../../store/audioPlayerSlice';
import { setSoundBgVolume, setMasterVolume } from '../../../store/userLibrarySlice';
import { goToNextPage, goToPreviousPage, setShowSearcher } from '../../../store/pdfReaderSlice';
import { PlaybackControls } from '../../components/Players/AudioPlayer/PlaybackControls/PlaybackControls';
import { VolumeControls } from '../../components/Players/AudioPlayer/VolumeControls/VolumeControls';
import { VoiceSelectorButton } from '../../components/Players/AudioPlayer/VoiceSelectorButton/VoiceSelectorButton';
import { PlayerConfigButton } from '../../components/Players/AudioPlayer/PlayerConfigButton/PlayerConfigButton';
import { textToSpeechService, type TimelineEntry } from '../../../services/tts';
import { getCachedAudio, setCachedAudio } from '../../../db/audioCache';
import { getDocumentById } from '../../../db';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import { faFilePdf } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface PlayerProps {
  showVoiceSelectorModal: React.Dispatch<SetStateAction<boolean>>;
  showPlayerConfigModal: React.Dispatch<SetStateAction<boolean>>;
}

export const AudioPlayer: React.FC<PlayerProps> = ({ showVoiceSelectorModal, showPlayerConfigModal }) => {
  const { t } = useLanguage();
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
    pendingSeekMs,
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
  const { activeSoundBgId, soundBgVolume, masterVolume } = useAppSelector((state) => state.userLibrary);

  const [isFetching, setIsFetching] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const pageAudioReadyRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);
  const aiTimelineRef = useRef<TimelineEntry[]>([]);
  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const volumeButtonRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (audioRef.current) {
      if (currentTrackUrl) {
        audioRef.current.src = currentTrackUrl;
        audioRef.current.load();
        if (isPlaying && pageAudioReadyRef.current) {
          audioRef.current.play().catch(e => console.error('Error playing audio:', e));
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
      audioRef.current.play().catch(e => console.error('Error playing audio:', e));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume * masterVolume;
    }
  }, [volume, masterVolume]);

  useEffect(() => {
    if (audioRef.current && !isPlaying && currentTime === 0) {
      audioRef.current.currentTime = 0;
    }
  }, [isPlaying, currentTime]);

  useEffect(() => {
    if (pendingSeekMs === null || !audioRef.current || !pageAudioReadyRef.current) return;
    audioRef.current.currentTime = pendingSeekMs / 1000;
    dispatch(clearPendingSeek());
  }, [pendingSeekMs, dispatch]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    dispatch(setCurrentTime(audioRef.current.currentTime));
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      dispatch(setDuration(audioRef.current.duration));
      pageAudioReadyRef.current = true;
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error('Error playing audio:', e));
      }
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
    if (cached?.timeline.length) return;

    const controller = new AbortController();
    prefetchAbortRef.current = controller;
    try {
      const doc = await getDocumentById(documentId, userData.id);
      if (controller.signal.aborted || !doc?.pagesContent) return;
      const pages = JSON.parse(doc.pagesContent) as unknown[];
      const pageText = pages[nextPage - 1];
      if (!pageText) return;
      const { blob, timeline } = await textToSpeechService(
        { text: JSON.stringify(pageText), voice: selectedVoice.value },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setCachedAudio(documentId, nextPage, selectedVoice.value, blob, timeline);
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
      const cachedResult = documentId
        ? await getCachedAudio(documentId, currentPage, selectedVoice.value)
        : null;
      let blob: Blob | null = cachedResult?.blob ?? null;

      if (controller.signal.aborted) return;

      if (cachedResult && cachedResult.timeline.length > 0) {
        aiTimelineRef.current = cachedResult.timeline;
        dispatch(setAiTimeline(cachedResult.timeline));
      } else {
        const result = await textToSpeechService({ text, voice: selectedVoice.value }, controller.signal);
        if (controller.signal.aborted) return;
        blob = result.blob;
        aiTimelineRef.current = result.timeline;
        dispatch(setAiTimeline(result.timeline));
        if (documentId) setCachedAudio(documentId, currentPage, selectedVoice.value, blob, result.timeline);
      }
      if (!controller.signal.aborted) {
        loadAudio(blob!);
        if (shouldPlay) {
          dispatch(play());
          audioRef.current!.play().catch(e => console.error('Error playing audio:', e));
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

  const handleSearcher = () => {
    dispatch(setShowSearcher(true));
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
    <div data-testid="audio-player" className={s.outterContainer}>
      <div className={s.container}>
        <div className={s.audioPlayerContainer}>
          <audio
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
          />
          <section className={s.leftSection}>
            {coverUrl
              ? <img src={coverUrl} alt="" className={s.cover} />
              : <div className={s.coverIcon}><FontAwesomeIcon icon={faFilePdf} /></div>
            }
            {isLoaded && (
              <div className={s.documentDetails}>
                <p title={documentTitle || ''} onClick={documentId ? handleTitle : undefined} style={documentId ? undefined : { cursor: 'default' }}>{documentTitle}</p>
                {documentId && <small onClick={handleSearcher}>{t.document.page} {currentPage} {t.document.of} {totalPages}</small>}
              </div>
            )}
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

          <div className={s.rightSection}>
            <VoiceSelectorButton onClick={() => showVoiceSelectorModal(true)} />
            <VolumeControls
              volume={volume}
              volumePercentage={volumePercentage}
              showVolumeSlider={showVolumeSlider}
              setShowVolumeSlider={setShowVolumeSlider}
              volumeSliderRef={volumeSliderRef}
              volumeButtonRef={volumeButtonRef}
              setVolume={(vol) => dispatch(setVolume(vol))}
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
    </div>
  );
};
