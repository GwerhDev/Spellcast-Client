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
import { VoiceSelectorButton } from '../../components/Players/shared/VoiceSelectorButton/VoiceSelectorButton';
import { PlayerConfigButton } from '../../components/Players/shared/PlayerConfigButton/PlayerConfigButton';
import { useNavigate } from 'react-router-dom';
import { setSelectedVoice } from '../../../store/voiceSlice';
import { getSpellById } from '../../../db';
import { useAppSelector } from '../../../store/hooks';
import { faFilePdf } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Waveform } from '../../components/Waveform/Waveform';
import { SpellDetailModal } from '../../components/Modals/SpellDetailModal';
import { addSignalNotice } from '../../../store/signalSlice';

interface PlayerProps {
  showVoiceSelectorModal: React.Dispatch<SetStateAction<boolean>>;
  showPlayerConfigModal: React.Dispatch<SetStateAction<boolean>>;
}

// ── ARCHITECTURE (TCORE-81) ────────────────────────────────────────────────
//
// Two separate concerns, kept structurally apart so neither can ever leak
// into the other:
//
// 1. WHAT to say. "Which sentence is current" is content, decided by the
//    sentence-tracking effect and handlePlay/resumeSeq/volume-drag-resume.
//    None of them ever call speechSynthesis.speak()/cancel()/pause()/
//    resume(), or touch the silent anchor <audio>, or set Media Session's
//    playbackState. They only ever write pendingUtteranceRef (what text
//    should be current) and dispatch to Redux.
//
// 2. WHETHER the engine is actually making sound. isPlaying (Redux,
//    browserPlayerSlice) is the ONLY source of truth for this -- the button
//    icon, SoundBackground, the waveform, and Media Session's playbackState
//    are all purely derived from it. There is exactly ONE effect, the
//    "engine driver" below, that reacts to isPlaying (and to
//    pendingUtteranceRef changing) and is the ONLY code in this file allowed
//    to call speechSynthesis.speak()/cancel()/pause()/resume() or touch the
//    silent anchor. This is what makes external control surfaces (a headset,
//    a Linux media widget, any OS-level "now playing" control) always see
//    and drive the SAME state the on-screen button does: they can only ever
//    reach the engine through navigator.mediaSession's action handlers,
//    which only ever dispatch to Redux, which the engine driver then
//    reflects onto the real engine -- never the other way around, and never
//    a shortcut straight to the utterance.
//
// There is exactly ONE effect allowed to write isPlaying FROM observed
// engine state (the "engine watcher" poll below) -- e.g. if some OS-level
// control ever did reach speechSynthesis directly, bypassing Media Session
// entirely (a platform quirk we can't prevent from JS), this reconciles
// Redux with whatever the engine ends up doing, so the button/background
// never drift from what's actually audible for long.
//
// speechSynthesis has no HTMLMediaElement of its own. Without one actually
// playing, Chrome/Edge don't reliably route hardware/OS media-key events to
// this tab's Media Session -- a silent, looping WAV anchors the session the
// same way AudioPlayer's real, audible <audio> does.
const SILENT_AUDIO_SRC = 'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';

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
    spellId,
    spellTitle,
    sentences,
    currentSentenceIndex,
  } = useSelector((state: RootState) => state.pdfReader);
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const { userData } = useAppSelector((state) => state.session);
  const { activeSoundBgId, soundBgVolume, masterVolume } = useAppSelector((state) => state.userLibrary);

  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [showDocDetail, setShowDocDetail] = useState(false);

  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const volumeButtonRef = useRef<HTMLButtonElement>(null);
  const silentAudioRef = useRef<HTMLAudioElement>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const volumeDragPausedRef = useRef(false);
  const volumePercentage = volume * 100;

  // What the engine driver should currently have loaded/speaking. Written by
  // WHAT-to-say code (never read by it afterward beyond that write); read
  // only by the engine driver effect below, which is the only code that ever
  // turns this into a real speechSynthesis.speak() call. `token` changes on
  // every write (even to the same text, e.g. a fresh retry) so the driver
  // effect -- which depends on [pendingToken] -- always re-evaluates even if
  // React would otherwise bail out on an unchanged object reference.
  const pendingUtteranceRef = useRef<{ text: string; onEnd: () => void } | null>(null);
  const [pendingToken, setPendingToken] = useState(0);
  const setPendingUtterance = (text: string, onEnd: () => void) => {
    pendingUtteranceRef.current = { text, onEnd };
    setPendingToken((n) => n + 1);
  };
  const clearPendingUtterance = () => {
    pendingUtteranceRef.current = null;
    setPendingToken((n) => n + 1);
  };

  // Mirrors of Redux/props state for closures that outlive a single render
  // (utterance callbacks, mediaSession action handlers, interval callbacks) --
  // read-only snapshots, never written to by anything but their own useEffect.
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const handleTitle = () => navigate(`/spell/${spellId}/reader`);
  const handleSearcher = () => dispatch(setShowSearcher(true));
  const handlePrevious = () => { if (isLoaded) dispatch(goToPreviousPage()); };
  const handleNext = () => { if (isLoaded) dispatch(goToNextPage()); };
  const isPrevDisabled = isLoaded ? currentPage === 1 : true;
  const isNextDisabled = isLoaded ? currentPage === totalPages : true;

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
    if (spellId && userData?.id) {
      getSpellById(spellId, userData.id).then(doc => {
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
  }, [spellId, userData?.id]);

  // Applies Media Session metadata synchronously. Called both reactively (the
  // effect below) AND from the engine driver right before it ever calls
  // speak(), so metadata is GUARANTEED applied before any speak() call
  // reaches the engine -- not dependent on effect declaration order, which
  // is an implicit guarantee a future refactor could silently break again
  // (TCORE-81: the OS media widget showing no title, portrait-only, has
  // already recurred once after being "fixed" only by effect ordering).
  const applyMediaSessionMetadata = () => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: spellTitle ?? '',
      artist: isLoaded ? `${t.spell.page} ${currentPage} ${t.spell.of} ${totalPages}` : '',
      album: 'Spellcast',
      artwork: coverUrl ? [{ src: coverUrl, type: 'image/jpeg' }] : [],
    });
  };

  useEffect(() => {
    applyMediaSessionMetadata();
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spellTitle, currentPage, totalPages, coverUrl, isLoaded, t]);

  // ── ENGINE DRIVER (the ONLY code that ever touches speechSynthesis or the
  // silent anchor) ────────────────────────────────────────────────────────
  // Reacts to isPlaying and to what's pending (pendingToken/pendingUtteranceRef).
  // Never reads speechSynthesis.paused/.speaking to decide anything -- it only
  // ever writes, from Redux + pending content to the engine:
  //   - Not playing -> pause the engine, pause the anchor, done.
  //   - Playing, and the currently-loaded utterance already matches
  //     pendingUtteranceRef -> just resume if the engine reports paused.
  //   - Playing, and nothing loaded (or it doesn't match pending) -> cancel
  //     whatever was there and speak the pending text fresh.
  useEffect(() => {
    if (!isPlaying) {
      window.speechSynthesis.pause();
      silentAudioRef.current?.pause();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
      return;
    }

    silentAudioRef.current?.play().catch(() => {});
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';

    const pending = pendingUtteranceRef.current;
    if (!pending) {
      window.speechSynthesis.cancel();
      activeUtteranceRef.current = null;
      return;
    }

    if (activeUtteranceRef.current?.text === pending.text) {
      // Already the right content loaded -- just make sure it's not paused.
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      return;
    }

    applyMediaSessionMetadata();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(pending.text);
    activeUtteranceRef.current = utterance;
    if (voice) utterance.voice = voice;
    utterance.volume = volume * masterVolume;

    utterance.onend = () => {
      if (activeUtteranceRef.current !== utterance) return;
      activeUtteranceRef.current = null;
      pending.onEnd();
    };

    utterance.onerror = (e) => {
      if (activeUtteranceRef.current !== utterance) return;
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      if (e.error === 'not-allowed') { handleStop(); return; }
      if (e.error === 'text-too-long') {
        const mid = Math.floor(pending.text.length / 2);
        const split = pending.text.lastIndexOf(' ', mid);
        const pivot = split > 0 ? split : mid;
        setPendingUtterance(pending.text.slice(0, pivot).trimEnd(), () => {
          setPendingUtterance(pending.text.slice(pivot).trimStart(), pending.onEnd);
        });
        return;
      }
      activeUtteranceRef.current = null;
      pending.onEnd();
    };

    window.speechSynthesis.speak(utterance);
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, pendingToken]);

  // ── ENGINE WATCHER (the only writer of isPlaying from observed engine state) ─
  // speechSynthesis's own utterance onpause/onresume events aren't reliably
  // fired by every browser for pauses/resumes that didn't originate from our
  // own JS call, so this poll reconciles Redux with whatever the engine is
  // actually doing, in both directions, at all times.
  //
  // Confirmation windows differ by direction on purpose. Going from "stopped"
  // to "speaking" only ever needs to survive the normal sub-second engine
  // startup latency, so 2 consecutive reads (~1-2s) is plenty. Going from
  // "speaking" to "stopped" is different: the gap between one utterance's
  // onend firing and the driver effect actually re-running with the next
  // pending utterance is a full React cycle (dispatch(setCurrentSentenceIndex)
  // -> re-render -> sentence effect -> setPendingUtterance -> re-render ->
  // driver effect -> speak()), which under real browser load can take longer
  // than a couple of seconds. A confirmation window too tight for that made
  // this poll mistake the normal inter-sentence gap for a real external pause
  // and dispatch(pause()) on its own, mid-reading (TCORE-81). 5 consecutive
  // reads (~5s) gives that cycle real room without meaningfully delaying a
  // genuine external pause.
  useEffect(() => {
    let lastObserved: boolean | null = null;
    let confirmCount = 0;
    const id = setInterval(() => {
      const engineSpeaking = window.speechSynthesis.speaking && !window.speechSynthesis.paused;
      if (engineSpeaking === lastObserved) {
        confirmCount += 1;
      } else {
        lastObserved = engineSpeaking;
        confirmCount = 1;
      }
      const requiredConfirmations = engineSpeaking ? 2 : 5;
      if (confirmCount === requiredConfirmations && engineSpeaking !== isPlayingRef.current) {
        dispatch(engineSpeaking ? play() : pause());
      }
    }, 1_000);
    return () => clearInterval(id);
  }, [dispatch]);

  // Workaround for the Chrome SpeechSynthesis bug where the engine silently
  // freezes after ~15s of continuous speech. Nudging pause/resume keeps it
  // alive. This never dispatches to Redux and never decides play vs. pause --
  // it only nudges the engine, and only while we already believe we're
  // playing; the engine watcher poll above is what reconciles Redux with
  // whatever the engine ends up doing afterward, so this can't race it.
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

  // Reacts to a new sentence becoming current (page change, spell load, or the
  // previous sentence ending). Only ever decides WHAT text should be current
  // -- via setPendingUtterance/clearPendingUtterance -- or asks Redux to
  // advance page/stop/start. Never touches speechSynthesis or the anchor
  // directly; the engine driver above is what actually turns "pending" into
  // real sound, only while isPlaying. autoPlayOnLoad is consumed HERE and
  // only here, as a one-shot signal, reduced immediately to a single
  // dispatch(play()), never read anywhere else in this file.
  useEffect(() => {
    if (!isLoaded || currentSentenceIndex < 0) {
      clearPendingUtterance();
      return;
    }

    if (sentences.length === 0 || currentSentenceIndex >= sentences.length) {
      clearPendingUtterance();
      // Cover/blank page: nothing to speak here -- advance automatically only
      // while actually playing, mirroring AudioPlayer's identical branch.
      if (isPlaying || autoPlayOnLoad) {
        if (currentPage < totalPages) dispatch(goToNextPage());
        else if (isPlaying) handleStop();
      }
      return;
    }

    if (!isPlaying && !autoPlayOnLoad) { clearPendingUtterance(); return; }
    if (autoPlayOnLoad) dispatch(setAutoPlayOnLoad(false));

    setPendingUtterance(
      sentences[currentSentenceIndex],
      () => dispatch(setCurrentSentenceIndex(currentSentenceIndex + 1)),
    );
    if (!isPlaying) dispatch(play());
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSentenceIndex, sentences, isLoaded, currentPage, autoPlayOnLoad]);

  const handleStop = () => {
    clearPendingUtterance();
    dispatch(stop());
    dispatch(setCurrentSentenceIndex(0));
  };

  // handlePlay/handlePause below ONLY ever dispatch to Redux (and, for
  // handlePlay's "starting fresh" case, set what's pending) -- never touch
  // the engine directly. The engine driver effect is what actually turns
  // isPlaying + pending content into real sound.
  const handlePlay = () => {
    if (isPlaying) return;
    // Cover/blank page: nothing to speak -- just dispatch play() and let the
    // sentence effect's own cover-page branch (isPlaying now true) advance
    // the page, exactly like the reader's own "starting on a cover" case.
    if (sentences.length === 0 || currentSentenceIndex < 0 || currentSentenceIndex >= sentences.length) {
      dispatch(play());
      return;
    }
    if (!pendingUtteranceRef.current) {
      setPendingUtterance(
        sentences[currentSentenceIndex],
        () => dispatch(setCurrentSentenceIndex(currentSentenceIndex + 1)),
      );
    }
    dispatch(play());
  };

  const handlePause = () => {
    if (!isPlaying) return;
    dispatch(pause());
  };

  const handleTogglePlayPause = () => {
    if (isPlaying) handlePause(); else handlePlay();
  };

  // External callers (attention guard) that need to toggle/resume playback
  // from outside this component route through these two seq counters rather
  // than a prop/ref, since they don't have a reference to this component's
  // instance. Both funnel through handleTogglePlayPause/setPendingUtterance
  // -- never the engine directly -- so they can't become a separate writer
  // of engine state.
  const toggleSeqRef = useRef(toggleSeq);
  useEffect(() => {
    if (toggleSeq !== toggleSeqRef.current) {
      toggleSeqRef.current = toggleSeq;
      handleTogglePlayPause();
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggleSeq]);

  // requestResume (browserPlayerSlice) already sets isPlaying: true itself;
  // this just makes sure fresh content is pending for the current sentence
  // (the engine driver's "already matches -> just resume" check is keyed on
  // text equality, so re-supplying the same sentence here is a safe no-op if
  // nothing actually needs to restart, and forces a fresh speak() if the
  // engine had silently dropped the utterance while paused).
  const resumeSeqRef = useRef(resumeSeq);
  useEffect(() => {
    if (resumeSeq === resumeSeqRef.current) return;
    resumeSeqRef.current = resumeSeq;
    if (sentences.length === 0 || currentSentenceIndex < 0 || currentSentenceIndex >= sentences.length) return;
    activeUtteranceRef.current = null; // force the driver to treat this as new content
    setPendingUtterance(
      sentences[currentSentenceIndex],
      () => dispatch(setCurrentSentenceIndex(currentSentenceIndex + 1)),
    );
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeSeq]);

  // Media Session's play/pause handlers must stay idempotent (always-play,
  // always-pause) rather than routed through the isPlaying-dependent toggle,
  // mirroring AudioPlayer: Bluetooth/OS media controls can fire play and pause
  // in quick succession for a single physical button press, and two toggle
  // calls reading the same stale isPlaying closure would apply the same branch
  // twice and land on the opposite of what the user pressed. Refs updated every
  // render (no dependency array) so mediaSession always invokes the latest
  // closure, never a stale one from the render it was registered in.
  const handlePlayRef = useRef(handlePlay);
  const handlePauseRef = useRef(handlePause);
  useEffect(() => {
    handlePlayRef.current = handlePlay;
    handlePauseRef.current = handlePause;
  });

  // Volume-slider drag: a purely cosmetic pause/resume of the anchor+engine
  // while dragging, not an isPlaying change -- kept out of Redux on purpose so
  // it can't be mistaken for a real user pause by any external control
  // surface. Still goes through the same handlePlay-adjacent path (re-supply
  // pending content, force a fresh speak) rather than inventing a third way
  // to touch the engine.
  const handleVolumePointerDown = () => {
    if (activeUtteranceRef.current && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      volumeDragPausedRef.current = true;
    }
  };

  const handleVolumePointerUp = () => {
    if (!volumeDragPausedRef.current) return;
    volumeDragPausedRef.current = false;
    if (!activeUtteranceRef.current) return;
    activeUtteranceRef.current = null;
    setPendingUtterance(
      sentences[currentSentenceIndex],
      () => dispatch(setCurrentSentenceIndex(currentSentenceIndex + 1)),
    );
  };

  // ── Media Session registration: the ONLY path any external control
  // surface (headset, OS "now playing" widget, Linux media controls) has
  // into this player. play/pause here always dispatch to Redux via
  // handlePlayRef/handlePauseRef -- never touch speechSynthesis or the
  // utterance directly -- so an external control can never bypass isPlaying
  // as the single source of truth, regardless of platform.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => {
      dispatch(addSignalNotice({ message: t.player.playedFromHeadset }));
      handlePlayRef.current();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      dispatch(addSignalNotice({ message: t.player.pausedFromHeadset }));
      handlePauseRef.current();
    });
    navigator.mediaSession.setActionHandler('nexttrack', handleNext);
    navigator.mediaSession.setActionHandler('previoustrack', handlePrevious);
    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
    };
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    return () => window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
  }, [dispatch, voice, selectedVoice]);

  return (
    <>
      <SpellDetailModal
        spellId={spellId ?? null}
        show={showDocDetail}
        onClose={() => setShowDocDetail(false)}
      />
      <div data-testid="browser-player" className={s.container}>
        <audio ref={silentAudioRef} src={SILENT_AUDIO_SRC} loop />
        <div className={s.audioPlayerContainer}>
          <section className={s.leftSection}>
            <div
              className={s.coverWrap}
              onClick={spellId ? () => setShowDocDetail(true) : undefined}
              style={spellId ? { cursor: 'pointer' } : undefined}
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
              <div className={s.spellDetails}>
                <p title={spellTitle || ''} onClick={spellId ? handleTitle : undefined} style={spellId ? undefined : { cursor: 'default' }}>{spellTitle}</p>
                {spellId && <small onClick={handleSearcher}>{t.spell.page} {currentPage} {t.spell.of} {totalPages}</small>}
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
