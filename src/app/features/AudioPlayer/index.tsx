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
import { goToNextPage, goToPreviousPage, setShowSearcher } from '../../../store/spellReaderSlice';
import { PlaybackControls } from '../../components/Players/AudioPlayer/PlaybackControls/PlaybackControls';
import { VolumeControls } from '../../components/Players/AudioPlayer/VolumeControls/VolumeControls';
import { VoiceSelectorButton } from '../../components/Players/shared/VoiceSelectorButton/VoiceSelectorButton';
import { PlayerConfigButton } from '../../components/Players/shared/PlayerConfigButton/PlayerConfigButton';
import { textToSpeechService, wrapPlainText, TtsError, type TimelineEntry } from '../../../services/tts';
import type { JSONContent } from '@tiptap/core';
import { addApiResponse } from '../../../store/apiResponsesSlice';
import { addSignalNotice } from '../../../store/signalSlice';
import type { CredentialError } from '../../components/Players/shared/VoiceSelectorButton/VoiceSelectorButton';
import { getCachedAudio, setCachedAudio, AUDIO_CACHE_VERSION } from '../../../db/audioCache';
import { getSpellById } from '../../../db';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import { faFilePdf } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Waveform } from '../../components/Waveform/Waveform';
import { SpellDetailModal } from '../../components/Modals/SpellDetailModal';
import { SILENT_AUDIO_SRC } from '../../../config/consts';

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
    toggleSeq,
  } = useSelector((state: RootState) => state.audioPlayer);
  const {
    isLoaded,
    spellId,
    totalPages,
    currentPage,
    spellTitle,
    currentPageText,
    sentences,
  } = useSelector((state: RootState) => state.spellReader);
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const { userData } = useAppSelector((state) => state.session);
  const { activeSoundBgId, soundBgVolume, masterVolume } = useAppSelector((state) => state.userLibrary);

  const [isFetching, setIsFetching] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [credentialError, setCredentialError] = useState<CredentialError | null>(null);
  const [showDocDetail, setShowDocDetail] = useState(false);
  // The page whose audio is actually loaded and audible right now -- distinct
  // from spellReader's `currentPage`, which updates the instant the user
  // navigates, before that page's audio has finished being fetched/
  // synthesized. Only this drives the OS Media Session metadata below, so
  // the lock-screen/notification "Page N" never gets ahead of what's
  // actually playing (TCORE-81). The in-app page label intentionally still
  // uses the live `currentPage` -- that one is a navigation indicator, not
  // a now-playing indicator, and updating it instantly on click is correct.
  const [audioReadyPage, setAudioReadyPage] = useState<number | null>(null);

  const pageAudioReadyRef = useRef(false);
  // Tracks the user's actual play/pause intent, independently of Redux's
  // isPlaying -- which fetchAndPlay forces to false while synthesizing/
  // loading new audio, so the UI doesn't show "playing" over silence.
  // Every play/pause entry point (click, headset, toggle) reads and writes
  // THIS ref; fetchAndPlay reads it fresh at the moment its async work
  // resolves, instead of a stale local snapshot taken before the fetch
  // started. Without this, a pause requested while a fetch was in flight
  // got silently reverted once the fetch completed (TCORE-81): isPlaying
  // was already forced to false by the fetch itself, so a pause request
  // arriving mid-fetch had nothing left to "undo" in Redux and was dropped
  // on the floor, then fetchAndPlay's own stale intent snapshot resumed
  // playback regardless of what the user had actually asked for meanwhile.
  const wantsToPlayRef = useRef(isPlaying);
  const abortControllerRef = useRef<AbortController | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);
  const aiTimelineRef = useRef<TimelineEntry[]>([]);
  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const volumeButtonRef = useRef<HTMLButtonElement>(null);
  // Real, always-audible anchor kept in sync with intent (wantsToPlayRef),
  // NOT with Redux's isPlaying -- isPlaying is silenced during the AI
  // synthesis fetch, which is exactly the window this anchor needs to cover.
  // See SILENT_AUDIO_SRC for why this exists at all (Chromium media-session
  // OS-widget adoption needs a real playing element, not just correct
  // metadata).
  const silentAudioRef = useRef<HTMLAudioElement>(null);
  const setWantsToPlay = (value: boolean) => {
    wantsToPlayRef.current = value;
    if (value) silentAudioRef.current?.play().catch(() => {});
    else silentAudioRef.current?.pause();
  };

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

  // Whether the cover fetch below has SETTLED for the current spell -- either
  // a real cover arrived, or it's confirmed there isn't one. Gates the very
  // first autoplay-triggered fetchAndPlay (see the content-tracking effects
  // further down) so the FIRST navigator.mediaSession.metadata this spell
  // ever sends the OS already has everything, instead of an incomplete
  // snapshot (no artwork) that a later, corrected write isn't reliably
  // resyncing to the OS widget on its own.
  const [coverSettled, setCoverSettled] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    // Clear the PREVIOUS spell's cover immediately, before this spell's own
    // fetch even starts -- otherwise, for the entire window until it
    // resolves, spellTitle/audioReadyPage (already updated) pair with a
    // stale coverUrl still holding the last spell's image in the Media
    // Session metadata effect below, so the OS widget can show the new
    // spell's title next to the old spell's artwork.
    setCoverUrl(null);
    setCoverSettled(false);
    if (spellId && userData?.id) {
      getSpellById(spellId, userData.id).then(doc => {
        if (cancelled) return;
        if (doc?.cover) {
          url = URL.createObjectURL(doc.cover);
          setCoverUrl(url);
        }
        setCoverSettled(true);
      });
    } else {
      setCoverSettled(true); // nothing to wait for
    }
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [spellId, userData?.id]);

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
    if (!spellId || !userData?.id) return;
    const cached = await getCachedAudio(spellId, nextPage, selectedVoice.value);
    if (cached?.timeline.length) return;

    const controller = new AbortController();
    prefetchAbortRef.current = controller;
    try {
      const doc = await getSpellById(spellId, userData.id);
      if (controller.signal.aborted || !doc?.pagesContent) return;
      const pages = JSON.parse(doc.pagesContent) as JSONContent[];
      const pageDoc = pages[nextPage - 1];
      if (!pageDoc) return;
      const { blob, timeline } = await textToSpeechService(
        { doc: pageDoc, voice: selectedVoice.value },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setCachedAudio(spellId, nextPage, selectedVoice.value, blob, timeline);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      console.error('Prefetch error:', e);
    }
  };

  // Callers set wantsToPlayRef BEFORE calling this (their own snapshot of
  // "should this resume once ready", e.g. isPlaying || autoPlayOnLoad at
  // the moment they decided to fetch) -- fetchAndPlay itself never
  // computes or overwrites that intent, only reads it, so a pause/play
  // requested while this is still in flight (via handlePause/handlePlay,
  // which write the same ref) is never lost to a stale value captured
  // before the async work started.
  const fetchAndPlay = async (text: string) => {
    abortControllerRef.current?.abort();
    prefetchAbortRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    pageAudioReadyRef.current = false;
    setIsFetching(true);
    if (wantsToPlayRef.current) dispatch(pause());
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    dispatch(setCurrentTime(0));
    dispatch(setDuration(0));

    try {
      const cachedResult = spellId
        ? await getCachedAudio(spellId, currentPage, selectedVoice.value)
        : null;
      let blob: Blob | null = cachedResult?.blob ?? null;

      if (controller.signal.aborted) return;

      // No more client-side segment count to compare against the cached timeline length —
      // the backend now parses the doc tree itself. AUDIO_CACHE_VERSION alone gates
      // invalidation (bumped whenever the request/parsing contract changes).
      const cacheValid = cachedResult &&
        cachedResult.cacheVersion === AUDIO_CACHE_VERSION &&
        cachedResult.timeline.length > 0;

      if (cacheValid) {
        aiTimelineRef.current = cachedResult.timeline;
        dispatch(setAiTimeline(cachedResult.timeline));
      } else {
        let doc: JSONContent;
        try {
          doc = JSON.parse(text) as JSONContent;
        } catch {
          doc = wrapPlainText(text);
        }
        const result = await textToSpeechService({ doc, voice: selectedVoice.value }, controller.signal);
        if (controller.signal.aborted) return;
        blob = result.blob;
        aiTimelineRef.current = result.timeline;
        dispatch(setAiTimeline(result.timeline));
        if (spellId) setCachedAudio(spellId, currentPage, selectedVoice.value, blob, result.timeline);
      }
      if (!controller.signal.aborted) {
        loadAudio(blob!);
        setAudioReadyPage(currentPage);
        if (wantsToPlayRef.current) {
          dispatch(play());
          audioRef.current!.play().catch(e => console.error('Error playing audio:', e));
        }
        if (currentPage < totalPages) prefetchNextPage(currentPage + 1);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      console.error(e);
      if (e instanceof TtsError) {
        if (e.status === 429) {
          setCredentialError('quota');
          dispatch(addApiResponse({ message: 'Azure credential has run out of quota. Open voice settings to update it.', type: 'error' }));
        } else if (e.status === 403 || e.status === 401) {
          setCredentialError('auth');
          dispatch(addApiResponse({ message: 'Azure credential is invalid or unauthorized. Open voice settings to update it.', type: 'error' }));
        } else {
          dispatch(addApiResponse({ message: 'Audio synthesis failed. Try again or change the voice credential.', type: 'error' }));
        }
      }
    } finally {
      if (!controller.signal.aborted) setIsFetching(false);
    }
  };

  const handlePlay = () => {
    // Always record the intent, even while a fetch for this same page is
    // already in flight -- that fetch's own resolution reads this ref
    // fresh (see fetchAndPlay above), so a play requested after an
    // accidental/earlier pause mid-fetch still resumes once ready, without
    // starting a second, overlapping fetch.
    setWantsToPlay(true);
    if (isPlaying) return;
    if (sentences.length === 0) {
      if (currentPage < totalPages) {
        dispatch(setAutoPlayOnLoad(true));
        dispatch(goToNextPage());
      }
      return;
    }
    if (selectedVoice.type === 'ai' && !pageAudioReadyRef.current) {
      if (!isFetching) fetchAndPlay(currentPageText);
      return;
    }
    dispatch(play());
  };

  const handlePause = () => {
    // Always record the intent -- including mid-fetch, when isPlaying is
    // already forced to false by fetchAndPlay itself and there is nothing
    // left in Redux to "undo": without this, a pause requested while
    // audio was still being fetched had no effect at all and playback
    // resumed regardless once the fetch completed (TCORE-81).
    setWantsToPlay(false);
    if (!isPlaying) return;
    dispatch(pause());
  };

  const handleTogglePlayPause = () => {
    // Reads intent, not Redux's isPlaying -- during a fetch, isPlaying is
    // already false (silenced by fetchAndPlay), which would otherwise make
    // a pause click during that window get misread as "not playing, so
    // play" and swallowed by handlePlay's own isFetching guard instead of
    // ever registering as a pause.
    if (wantsToPlayRef.current) handlePause();
    else handlePlay();
  };

  // Media Session's play/pause handlers must stay idempotent (always-play,
  // always-pause) rather than routed through the isPlaying-dependent toggle above.
  // Bluetooth/OS media controls can fire play and pause in quick succession for a
  // single physical button press (TCORE-81) -- two toggle calls reading the same
  // stale `isPlaying` closure apply the same branch twice and land on the opposite
  // of what the user pressed, which is what "reverts itself" looked like.
  const handlePlayRef = useRef(handlePlay);
  const handlePauseRef = useRef(handlePause);
  const handleTogglePlayPauseRef = useRef(handleTogglePlayPause);
  useEffect(() => {
    handlePlayRef.current = handlePlay;
    handlePauseRef.current = handlePause;
    handleTogglePlayPauseRef.current = handleTogglePlayPause;
  });
  useEffect(() => {
    if (!toggleSeq) return;
    handleTogglePlayPauseRef.current();
  }, [toggleSeq]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleTitle = () => {
    navigate(`/spell/${spellId}/reader`);
  };

  const handleSearcher = () => {
    dispatch(setShowSearcher(true));
  };

  const isPrevDisabled = isLoaded ? currentPage === 1 : currentTrackIndex === 0;
  const isNextDisabled = isLoaded ? currentPage === totalPages : currentTrackIndex === (playlist.length - 1);

  useEffect(() => {
    setCredentialError(null);
    if (selectedVoice.type !== 'ai' || !currentPageText || sentences.length === 0) return;
    // Also runs on mount (selectedVoice.value always "changes" from nothing
    // on the first render) -- gated the same way as the content-tracking
    // effect below, so a fresh autoplay-triggered mount doesn't fetch/play
    // through THIS path before the cover has settled either.
    if (autoPlayOnLoad && !coverSettled) return;
    // Switching AI voice mid-read: stop the previous voice's audio and restart the
    // current page from the top with the new one (fetchAndPlay already checks the
    // per-voice cache before synthesizing, and preserves play/pause via `isPlaying`).
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setWantsToPlay(isPlaying || autoPlayOnLoad);
    fetchAndPlay(currentPageText);
    //eslint-disable-next-line
  }, [selectedVoice.value, coverSettled]);

  useEffect(() => {
    if (selectedVoice.type !== 'ai' || !currentPageText) return;
    // Cover pages (see injectCoverIntoPages in pdfUtils) carry no readable text, so
    // `sentences` comes back empty -- skip straight to the next page instead of
    // synthesizing/playing empty audio.
    if (sentences.length === 0) {
      if (isPlaying || autoPlayOnLoad) {
        if (currentPage < totalPages) dispatch(goToNextPage());
      }
      return;
    }
    // Wait for the cover fetch to settle before the very FIRST
    // autoplay-triggered fetch -- see coverSettled above. An ongoing page
    // turn while already playing is unaffected: coverSettled is already
    // true by then for this spell (it only resets on a spell/user change).
    if (autoPlayOnLoad && !coverSettled) return;
    setWantsToPlay(isPlaying || autoPlayOnLoad);
    if (autoPlayOnLoad) dispatch(setAutoPlayOnLoad(false));
    fetchAndPlay(currentPageText);
    //eslint-disable-next-line
  }, [currentPageText, sentences, coverSettled]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play',           () => { dispatch(addSignalNotice({ message: t.player.playedFromHeadset })); handlePlayRef.current(); });
    navigator.mediaSession.setActionHandler('pause',          () => { dispatch(addSignalNotice({ message: t.player.pausedFromHeadset })); handlePauseRef.current(); });
    navigator.mediaSession.setActionHandler('nexttrack',      handleNext);
    navigator.mediaSession.setActionHandler('previoustrack',  handlePrevious);

    return () => {
      navigator.mediaSession.setActionHandler('play',          null);
      navigator.mediaSession.setActionHandler('pause',         null);
      navigator.mediaSession.setActionHandler('nexttrack',     null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
    };
  }, []);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    // artist uses audioReadyPage, NOT the live currentPage -- currentPage
    // flips the instant the user navigates, before that page's audio has
    // actually finished loading, so the OS lock-screen/notification could
    // show "Page 5" while page 4's audio was still the only thing audible
    // (TCORE-81).
    navigator.mediaSession.metadata = new MediaMetadata({
      title:  spellTitle ?? '',
      artist: isLoaded && audioReadyPage !== null ? `${t.spell.page} ${audioReadyPage} ${t.spell.of} ${totalPages}` : '',
      album:  'Spellcast',
      artwork: coverUrl ? [{ src: coverUrl, type: 'image/jpeg' }] : [],
    });
  }, [spellTitle, audioReadyPage, totalPages, coverUrl]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (duration <= 0) return;

    navigator.mediaSession.setPositionState({
      duration,
      playbackRate: audioRef.current?.playbackRate ?? 1,
      position: Math.min(currentTime, duration),
    });
  }, [currentTime, duration]);

  return (
    <>
      <SpellDetailModal
        spellId={spellId ?? null}
        show={showDocDetail}
        onClose={() => setShowDocDetail(false)}
      />
      <div data-testid="audio-player" className={s.container}>
        <div className={s.audioPlayerContainer}>
          <audio
            data-testid="audio-player-media"
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
          />
          <audio data-testid="audio-player-silent-anchor" ref={silentAudioRef} src={SILENT_AUDIO_SRC} loop />
          <section className={s.leftSection}>
            <div
              className={s.coverWrap}
              onClick={spellId ? () => setShowDocDetail(true) : undefined}
              style={spellId ? { cursor: 'pointer' } : undefined}
            >
              {coverUrl
                ? <img data-testid="audio-player-cover" src={coverUrl} alt="" className={s.cover} />
                : <div data-testid="audio-player-cover-placeholder" className={s.coverIcon}><FontAwesomeIcon icon={faFilePdf} /></div>
              }
              {isPlaying && (
                <div className={s.coverWaveOverlay}>
                  <Waveform active bars={4} height={14} color="white" />
                </div>
              )}
            </div>
            {isLoaded && (
              <div className={s.spellDetails}>
                <p data-testid="audio-player-title" title={spellTitle || ''} onClick={spellId ? handleTitle : undefined} style={spellId ? undefined : { cursor: 'default' }}>{spellTitle}</p>
                {spellId && <small onClick={handleSearcher}>{t.spell.page} {currentPage} {t.spell.of} {totalPages}</small>}
              </div>
            )}
            <VoiceSelectorButton onClick={() => showVoiceSelectorModal(true)} credentialError={credentialError} />
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
    </>
  );
};
