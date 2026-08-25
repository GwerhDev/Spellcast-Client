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

// ── ARCHITECTURE (TCORE-81 rewrite from scratch) ──────────────────────────────
//
// isPlaying (Redux, browserPlayerSlice) is the ONLY source of truth for "is this
// player playing". Every other piece of state -- the button icon, SoundBackground,
// the waveform, Media Session's playbackState -- is purely derived from it. There
// is exactly ONE effect that reacts to isPlaying and commands the engine (the
// "engine driver" below); it never reads engine state to decide anything, only
// writes to it. There is exactly ONE effect allowed to write isPlaying FROM
// observed engine state (the "engine watcher" poll below) -- e.g. a headset
// pausing speechSynthesis directly at the OS level, with no click or
// mediaSession action handler ever firing on our side. Every other function in
// this file (handlePlay, handlePause, the mediaSession action handlers) does
// nothing but dispatch to Redux; none of them ever call speechSynthesis.pause()/
// resume() or touch the anchor directly. This eliminates the multi-writer races
// that plagued every earlier version of this file: previously up to three
// different effects/handlers could all call speechSynthesis.pause()/resume()
// or dispatch(play()/pause()) independently, stepping on each other in ways that
// only showed up as "the state changes a thousand times, everything flickers".
//
// speechSynthesis has no HTMLMediaElement of its own. Without one actually
// playing, Chrome/Edge don't reliably route hardware/OS media-key events to this
// tab's Media Session -- a silent, looping WAV anchors the session the same way
// AudioPlayer's real, audible <audio> does.
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

  // Speaks one sentence. Purely "tell the engine what to say next" -- it never
  // touches Redux except via the two callbacks the caller supplies (onEnd,
  // called when this sentence finishes; the caller decides what that means).
  // The engine driver effect below is the only place that decides play vs.
  // pause; this function never checks or sets isPlaying.
  const speakSentence = (text: string, onEnd: () => void, isRetry = false): void => {
    const utterance = new SpeechSynthesisUtterance(text);
    if (!isRetry) activeUtteranceRef.current = utterance;
    if (voice) utterance.voice = voice;
    utterance.volume = volume * masterVolume;

    utterance.onend = () => {
      if (!isRetry && activeUtteranceRef.current !== utterance) return;
      onEnd();
    };

    utterance.onerror = (e) => {
      if (!isRetry && activeUtteranceRef.current !== utterance) return;
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      if (e.error === 'not-allowed') { handleStop(); return; }
      if (e.error === 'text-too-long') {
        const mid = Math.floor(text.length / 2);
        const split = text.lastIndexOf(' ', mid);
        const pivot = split > 0 ? split : mid;
        speakSentence(text.slice(0, pivot).trimEnd(), () => {
          speakSentence(text.slice(pivot).trimStart(), onEnd, true);
        }, true);
        return;
      }
      onEnd();
    };

    window.speechSynthesis.speak(utterance);
  };

  // ── ENGINE DRIVER (the only writer of engine state from Redux) ─────────────
  // Reacts to isPlaying and commands speechSynthesis + the silent anchor + Media
  // Session playbackState. Never reads speechSynthesis.paused/.speaking to
  // decide anything -- it only ever writes, in one direction, from Redux to the
  // engine. Declared once, with no other effect in this file allowed to call
  // speechSynthesis.pause()/resume() directly.
  useEffect(() => {
    if (isPlaying) {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      silentAudioRef.current?.play().catch(() => {});
    } else {
      window.speechSynthesis.pause();
      silentAudioRef.current?.pause();
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // ── ENGINE WATCHER (the only writer of isPlaying from observed engine state) ─
  // speechSynthesis's own utterance onpause/onresume events aren't reliably
  // fired by every browser for pauses/resumes that didn't originate from our
  // own JS call (headset/OS media keys included), so this poll is the actual
  // source of truth for "did something external change what the engine is
  // doing" -- running at all times, in both directions, rather than only while
  // expecting one particular transition. Two consecutive matching reads (1s)
  // before acting, since `speaking` legitimately blips false for a moment in
  // the normal gap between one utterance's onend and the next one's speak()
  // call -- a single read can't tell that apart from a real external change,
  // but a real change holds past that gap while the normal transition doesn't.
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
      if (confirmCount === 2 && engineSpeaking !== isPlayingRef.current) {
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

  // Declared BEFORE the sentence effect below on purpose: React runs a
  // component's effects in declaration order after each render, and the
  // sentence effect below is what calls window.speechSynthesis.speak() for the
  // very first utterance. When BrowserPlayer mounts already isPlaying/
  // autoPlayOnLoad: true (e.g. play started from a list card, where the spell
  // only finishes loading -- and this component only mounts -- after the
  // click), both effects fire in the same first-render pass. If metadata were
  // declared after the sentence effect, speak() would run BEFORE
  // navigator.mediaSession.metadata was ever set, letting the OS grab/settle
  // the session with blank metadata -- the title never showing in the OS media
  // widget, portrait-only, even though speech and hardware controls work fine
  // (TCORE-81, confirmed via the OS media widget in earlier testing; lost once
  // in the from-scratch rewrite and restored here).
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: spellTitle ?? '',
      artist: isLoaded ? `${t.spell.page} ${currentPage} ${t.spell.of} ${totalPages}` : '',
      album: 'Spellcast',
      artwork: coverUrl ? [{ src: coverUrl, type: 'image/jpeg' }] : [],
    });
  }, [spellTitle, currentPage, totalPages, coverUrl, isLoaded, t]);

  // Reacts to a new sentence becoming current (page change, spell load, or the
  // previous sentence ending). Only ever tells the engine what to speak, or
  // asks Redux to advance page/stop/start -- never touches speechSynthesis
  // pause/resume itself: the engine driver effect above is what actually
  // starts/stops sound in reaction to isPlaying. autoPlayOnLoad is consumed
  // HERE and only here, as a one-shot "the caller (reader, spell detail modal,
  // etc.) wants this spell to start playing once it's ready" signal -- reduced
  // immediately to a single dispatch(play()), never read anywhere else in this
  // file, so it can't become a second, competing source of truth for isPlaying.
  useEffect(() => {
    activeUtteranceRef.current = null;
    window.speechSynthesis.cancel();

    if (!isLoaded || currentSentenceIndex < 0) return;

    if (sentences.length === 0 || currentSentenceIndex >= sentences.length) {
      // Cover/blank page: nothing to speak here -- advance automatically only
      // while actually playing, mirroring AudioPlayer's identical branch.
      if (isPlaying || autoPlayOnLoad) {
        if (currentPage < totalPages) dispatch(goToNextPage());
        else if (isPlaying) handleStop();
      }
      return;
    }

    if (!isPlaying && !autoPlayOnLoad) return;
    if (autoPlayOnLoad) dispatch(setAutoPlayOnLoad(false));

    speakSentence(
      sentences[currentSentenceIndex],
      () => dispatch(setCurrentSentenceIndex(currentSentenceIndex + 1)),
    );
    if (!isPlaying) dispatch(play());
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSentenceIndex, sentences, isLoaded, currentPage, autoPlayOnLoad]);

  const handleStop = () => {
    activeUtteranceRef.current = null;
    dispatch(stop());
    dispatch(setCurrentSentenceIndex(0));
    window.speechSynthesis.cancel();
  };

  // handlePlay/handlePause below ONLY ever dispatch to Redux. The one exception
  // -- calling speakSentence() directly here instead of just dispatching
  // play() -- covers "starting fresh": if nothing has been spoken yet for the
  // current sentence (no utterance in flight), simply flipping isPlaying to
  // true wouldn't make the sentence effect above call speakSentence() again,
  // since that effect only reacts to currentSentenceIndex/sentences/isLoaded/
  // currentPage changing, none of which change here. This mirrors AudioPlayer's
  // handlePlay calling fetchAndPlay() directly in the equivalent situation.
  const handlePlay = () => {
    if (isPlaying) return;
    if (silentAudioRef.current) silentAudioRef.current.play().catch(() => {});
    if (sentences.length === 0 || currentSentenceIndex < 0) {
      dispatch(play());
      return;
    }
    if (!activeUtteranceRef.current) {
      speakSentence(
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

  // External callers (attention guard) that need to toggle/resume playback from
  // outside this component route through these two seq counters rather than a
  // prop/ref, since they don't have a reference to this component's instance.
  // Both funnel through handleTogglePlayPause/speakSentence -- the same single
  // paths every other caller in this file uses -- so they can't become a
  // separate writer of engine state.
  const toggleSeqRef = useRef(toggleSeq);
  useEffect(() => {
    if (toggleSeq !== toggleSeqRef.current) {
      toggleSeqRef.current = toggleSeq;
      handleTogglePlayPause();
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggleSeq]);

  // requestResume (browserPlayerSlice) already sets isPlaying: true itself, so
  // the engine driver effect will resume/no-op the engine on its own; this only
  // supplies fresh speech content for the current sentence, since
  // speechSynthesis.resume() is unreliable if the utterance was canceled
  // mid-pause (e.g. by the attention guard's own dispatch(pause())).
  const resumeSeqRef = useRef(resumeSeq);
  useEffect(() => {
    if (resumeSeq === resumeSeqRef.current) return;
    resumeSeqRef.current = resumeSeq;
    window.speechSynthesis.cancel();
    if (sentences.length === 0 || currentSentenceIndex < 0 || currentSentenceIndex >= sentences.length) return;
    speakSentence(
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
    window.speechSynthesis.cancel();
    speakSentence(
      sentences[currentSentenceIndex],
      () => dispatch(setCurrentSentenceIndex(currentSentenceIndex + 1)),
    );
  };

  // ── Media Session registration and metadata: pure derived state, no logic ──
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
