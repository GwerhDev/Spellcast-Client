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

// speechSynthesis has no HTMLMediaElement of its own. Without one actually playing,
// Chrome/Edge (and others) don't reliably route hardware/OS media-key events (e.g.
// headset play/pause) to this page's Media Session at all -- our action handlers can
// be set but simply never get called, and the OS's own media control surface pauses/
// resumes on its own timeline instead (TCORE-81: this is why the on-screen button
// never flips and speech resumes on its own after a few seconds -- the browser voice
// path has nothing anchoring the Media Session, unlike AudioPlayer's real <audio>).
// A silent, looping 100ms WAV playing for as long as we're "playing" gives the
// browser a real media element to anchor the session to, so hardware controls reach
// our setActionHandler('play'/'pause', ...) handlers like they do for AudioPlayer.
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

  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [showDocDetail, setShowDocDetail] = useState(false);
  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const volumeButtonRef = useRef<HTMLButtonElement>(null);
  const silentAudioRef = useRef<HTMLAudioElement>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSpeechPausedRef = useRef(false);
  const pausedAtRef = useRef<number | null>(null);
  const volumeDragPausedRef = useRef(false);
  const nudgePausedRef = useRef(false);
  // Mirror of `isPlaying` for the utterance onpause/onresume handlers below, which
  // are set once per utterance and would otherwise close over a stale value.
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
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
  // Media Session's play/pause handlers need idempotent refs (always-play,
  // always-pause), same as AudioPlayer (TCORE-81) -- routing them through the
  // isPlaying-dependent toggle lets a double-fired Bluetooth/OS event apply the
  // same branch twice and land on the opposite of what the user pressed.
  const playRef = useRef<() => void>(() => { });
  const pauseRef = useRef<() => void>(() => { });
  const volumePercentage = volume * 100;

  const handleTitle = () => {
    navigate(`/spell/${spellId}/reader`);
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

  const speakSentence = (text: string, onEnd: () => void, onStart?: () => void, isRetry = false) => {
    const utterance = new SpeechSynthesisUtterance(text);
    if (!isRetry) {
      activeUtteranceRef.current = utterance;
      isSpeechPausedRef.current = false;
      pausedAtRef.current = null;
    }
    if (voice) utterance.voice = voice;
    utterance.volume = volume * masterVolume;

    if (!isRetry && onStart) utterance.onstart = onStart;

    // Keep Redux in sync with the engine's real pause/resume state (TCORE-81).
    // These fire for ANY pause/resume of the engine, regardless of who triggered
    // it -- including headset/OS media keys that pause speechSynthesis directly
    // without going through our mediaSession action handlers. Without this,
    // isPlaying can stay stuck at `true` after an external pause: the on-screen
    // button never flips, and once anything re-triggers the sentence effect
    // (TCORE-81) it sees isPlaying still true and resumes speaking on its own.
    // nudgePausedRef skips the internal anti-freeze pause+resume nudge below, and
    // isSpeechPausedRef skips our own handlePause (which already dispatches).
    utterance.onpause = () => {
      if (!isRetry && activeUtteranceRef.current !== utterance) return;
      if (nudgePausedRef.current || isSpeechPausedRef.current) return;
      if (isPlayingRef.current) dispatch(pause());
    };
    utterance.onresume = () => {
      if (!isRetry && activeUtteranceRef.current !== utterance) return;
      if (nudgePausedRef.current) { nudgePausedRef.current = false; return; }
      if (!isPlayingRef.current) dispatch(play());
    };

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

  // isPlaying is the master switch the engine must follow in both directions:
  // pause it when we stop, and resume it when we start again. Before this, only
  // the pause() half was reactive -- resuming only ever happened inside
  // handlePlay's own click-time check of window.speechSynthesis.paused, so any
  // path that flipped isPlaying back to true without going through that exact
  // check (a headset press landing while the engine hadn't finished settling
  // into "paused" yet, the Chrome freeze bug, etc.) left the voice stuck silent
  // with nothing to notice and correct it (TCORE-81).
  useEffect(() => {
    if (isPlaying) {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    } else {
      window.speechSynthesis.pause();
    }
  }, [isPlaying]);

  // Keep the silent anchor element (see SILENT_AUDIO_SRC above) playing in lockstep
  // with isPlaying, so the OS/hardware media session stays anchored to a real,
  // currently-playing media element for as long as we are. This reactive path
  // covers programmatic play (autoPlayOnLoad, attention guard resume, etc.) where
  // there's no click to call playSilentAnchor() from synchronously; handlePlay
  // below also calls it directly for the direct-click case, since a play() call
  // arriving only via this effect can get silently autoplay-blocked (TCORE-81).
  useEffect(() => {
    if (!silentAudioRef.current) return;
    if (isPlaying) {
      silentAudioRef.current.play().catch(() => {});
    } else {
      silentAudioRef.current.pause();
    }
  }, [isPlaying]);

  // Warm up the Media Session on the very first real user gesture anywhere on
  // the page, not just the first click on this player's own play button.
  // Reported symptom (TCORE-81): the headset only starts receiving signals
  // after two full click-driven play/pause cycles on the on-screen button --
  // Chrome appears to need a settled play->pause->play cycle with playbackState
  // + setPositionState reported before it commits to routing hardware signals
  // to this tab. Running that cycle on the anchor as soon as the user first
  // interacts with the page at all (before they've necessarily touched the
  // player) means it's already warmed up by the time they do reach for play.
  // Browsers require a real gesture for the anchor's own play() to succeed, so
  // this can't run any earlier than the user's first click/keydown/touch.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    let warmed = false;
    const warmUp = () => {
      if (warmed || isPlaying) return;
      warmed = true;
      document.removeEventListener('pointerdown', warmUp);
      document.removeEventListener('keydown', warmUp);
      const anchor = silentAudioRef.current;
      if (!anchor) return;
      anchor.play().then(() => {
        navigator.mediaSession.playbackState = 'playing';
        if (navigator.mediaSession.setPositionState && anchor.duration && !Number.isNaN(anchor.duration)) {
          navigator.mediaSession.setPositionState({
            duration: anchor.duration,
            playbackRate: anchor.playbackRate,
            position: Math.min(anchor.currentTime, anchor.duration),
          });
        }
        setTimeout(() => {
          if (!isPlayingRef.current) {
            anchor.pause();
            navigator.mediaSession.playbackState = 'paused';
          }
        }, 300);
      }).catch(() => {});
    };
    document.addEventListener('pointerdown', warmUp);
    document.addEventListener('keydown', warmUp);
    return () => {
      document.removeEventListener('pointerdown', warmUp);
      document.removeEventListener('keydown', warmUp);
    };
    //eslint-disable-next-line
  }, []);

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
      () => dispatch(play()),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeSeq]);

  // Workaround for the Chrome SpeechSynthesis bug where the engine silently
  // freezes after ~15s of continuous speech. Nudging pause/resume keeps it alive.
  // nudgePausedRef tells the utterance's onpause/onresume handlers (above) and the
  // polling fallback (below) that this particular pause/resume pair is internal
  // and expected, so they don't mistake it for an externally-triggered pause (e.g.
  // headset controls) and sync Redux to a transient state. Cleared synchronously
  // right after resume() rather than relying on the utterance's onresume event,
  // since that event isn't guaranteed to fire in every browser (same reliability
  // gap as onpause, see the polling fallback below) and a stuck `true` here would
  // permanently blind that fallback to real external pauses afterwards.
  // Also acts as the safety net for isPlaying/engine desyncs: if we think we're
  // playing but the engine is sitting paused with nothing queued (the reactive
  // resume() in the isPlaying effect above fired too early, got dropped, or the
  // engine froze on it), this tick catches it and forces a resume rather than
  // leaving the voice silently stuck until the next unrelated state change.
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      if (window.speechSynthesis.paused && !window.speechSynthesis.speaking) {
        window.speechSynthesis.resume();
        return;
      }
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        nudgePausedRef.current = true;
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
        nudgePausedRef.current = false;
      }
    }, 14_000);
    return () => clearInterval(id);
  }, [isPlaying]);

  // Fallback sync for external pauses the utterance's onpause event doesn't
  // reliably fire for (TCORE-81): some browsers only emit onpause when
  // speechSynthesis.pause() was called from our own JS, not when audio output
  // stops at the hardware/OS level via headset controls -- silently leaving
  // Redux's isPlaying stuck at `true` with nothing to correct it. This polls the
  // engine's actual paused/speaking state while we think we're playing and
  // corrects Redux if it disagrees, independent of whether onpause ever fired.
  // Requires two consecutive "stopped" reads (2s) before acting, since `speaking`
  // legitimately blips false for a moment during the normal engine gap between
  // one utterance ending and the next one's speak() call landing -- a single read
  // can't tell that apart from a real external pause, but a real pause stays
  // stopped past that gap while a normal transition doesn't.
  useEffect(() => {
    if (!isPlaying) return;
    let consecutiveStops = 0;
    const id = setInterval(() => {
      if (nudgePausedRef.current || isSpeechPausedRef.current) { consecutiveStops = 0; return; }
      const engineStopped = window.speechSynthesis.paused || !window.speechSynthesis.speaking;
      if (!engineStopped) { consecutiveStops = 0; return; }
      consecutiveStops += 1;
      if (consecutiveStops >= 2 && isPlayingRef.current) dispatch(pause());
    }, 1_000);
    return () => clearInterval(id);
  }, [isPlaying, dispatch]);

  // Symmetric fallback for the paused side: makes isPlaying follow the engine's
  // real state instead of only ever pushing our state onto it. Needed because
  // the headset can call speechSynthesis.resume() directly on the engine
  // (or the browser can resume it on its own once the Media Session eventually
  // arms) without ever reaching our mediaSession 'play' action handler -- Redux
  // would stay stuck at isPlaying: false forever with the voice audibly
  // speaking and the on-screen button/background never reflecting it
  // (TCORE-81). Same two-consecutive-reads debounce as the pause-side poll,
  // for the same reason: a single read can't tell a real resume from the
  // normal gap between an utterance's onend and the next speak() call.
  useEffect(() => {
    if (isPlaying) return;
    let consecutiveSpeaking = 0;
    const id = setInterval(() => {
      if (nudgePausedRef.current) { consecutiveSpeaking = 0; return; }
      const engineSpeaking = window.speechSynthesis.speaking && !window.speechSynthesis.paused;
      if (!engineSpeaking) { consecutiveSpeaking = 0; return; }
      consecutiveSpeaking += 1;
      if (consecutiveSpeaking >= 2 && !isPlayingRef.current) {
        isSpeechPausedRef.current = false;
        pausedAtRef.current = null;
        dispatch(play());
      }
    }, 1_000);
    return () => clearInterval(id);
  }, [isPlaying, dispatch]);

  useEffect(() => {
    activeUtteranceRef.current = null;
    isSpeechPausedRef.current = false;
    pausedAtRef.current = null;
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
        () => dispatch(play()),
      );
    }
    //eslint-disable-next-line
  }, [currentSentenceIndex, sentences, isLoaded, currentPage, autoPlayOnLoad]);

  const handleStop = () => {
    activeUtteranceRef.current = null;
    pausedAtRef.current = null;
    dispatch(stop());
    dispatch(setCurrentSentenceIndex(0));
    window.speechSynthesis.cancel();
  };

  // Browsers only allow <audio>.play() to bypass autoplay blocking when it runs
  // synchronously inside a real user gesture (click/keypress) call stack. The
  // isPlaying-reactive effect below covers programmatic resumes (autoPlayOnLoad,
  // attention guard, etc.), but a click handler that only dispatches Redux and lets
  // that effect call .play() asynchronously can get silently blocked -- promise
  // rejection swallowed, mediaSession left unanchored, hardware controls stop
  // working, with no visible error (TCORE-81). Calling it here too, inside the
  // click's own call stack, is what makes the anchor reliably get play permission.
  const playSilentAnchor = () => {
    if (!silentAudioRef.current) return;
    silentAudioRef.current.play().catch(() => {});
  };

  const handlePlay = () => {
    if (isPlaying) return;
    playSilentAnchor();
    if (sentences.length === 0) {
      dispatch(play());
      if (currentPage < totalPages) handleNext();
      else handleStop();
      return;
    }
    // Resume if the Web Speech API is already paused (including when paused externally
    // by the attention guard via dispatch(pause()) without going through this handler).
    // Chrome doesn't guarantee holding onto a paused utterance indefinitely -- after
    // sitting paused for a while it can silently drop it while still reporting
    // `paused === true`, so resume() on it does nothing and playback never comes
    // back (TCORE-81: "dejo pasar un rato en pausa y no retoma"). Past a minute
    // paused, don't trust resume() -- speak the current sentence fresh instead.
    const pausedTooLong = pausedAtRef.current !== null && Date.now() - pausedAtRef.current > 60_000;
    if (!pausedTooLong && (isSpeechPausedRef.current || window.speechSynthesis.paused)) {
      isSpeechPausedRef.current = false;
      pausedAtRef.current = null;
      window.speechSynthesis.resume();
      dispatch(play());
      return;
    }
    isSpeechPausedRef.current = false;
    pausedAtRef.current = null;
    window.speechSynthesis.cancel();
    speakSentence(
      sentences[currentSentenceIndex],
      () => dispatch(setCurrentSentenceIndex(currentSentenceIndex + 1)),
      () => dispatch(play()),
    );
    dispatch(play());
  };

  const handlePause = () => {
    if (!isPlaying) return;
    isSpeechPausedRef.current = true;
    pausedAtRef.current = Date.now();
    window.speechSynthesis.pause();
    dispatch(pause());
  };

  const handleTogglePlayPause = () => {
    if (isPlaying) handlePause();
    else handlePlay();
  };
  togglePlayPauseRef.current = handleTogglePlayPause;
  playRef.current = handlePlay;
  pauseRef.current = handlePause;

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
      () => dispatch(play()),
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
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play',           () => { dispatch(addSignalNotice({ message: t.player.playedFromHeadset })); playRef.current(); });
    navigator.mediaSession.setActionHandler('pause',          () => { dispatch(addSignalNotice({ message: t.player.pausedFromHeadset })); pauseRef.current(); });
    navigator.mediaSession.setActionHandler('nexttrack',      handleNext);
    navigator.mediaSession.setActionHandler('previoustrack',  handlePrevious);

    return () => {
      navigator.mediaSession.setActionHandler('play',          null);
      navigator.mediaSession.setActionHandler('pause',         null);
      navigator.mediaSession.setActionHandler('nexttrack',     null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
    };
    //eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title:  spellTitle ?? '',
      artist: isLoaded ? `${t.spell.page} ${currentPage} ${t.spell.of} ${totalPages}` : '',
      album:  'Spellcast',
      artwork: coverUrl ? [{ src: coverUrl, type: 'image/jpeg' }] : [],
    });
  }, [spellTitle, currentPage, totalPages, coverUrl, isLoaded, t]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // AudioPlayer calls setPositionState on its real <audio>; BrowserPlayer never
  // did, since spoken sentences have no fixed duration/position of their own.
  // Using the silent anchor's own duration/currentTime here: a fully "armed"
  // Media Session that hardware keys are reliably routed to may need this call
  // in addition to playbackState, not just a playing media element (TCORE-81:
  // matches the reported "needs two full click cycles before the headset
  // starts working" -- position state was never being reported at all before).
  useEffect(() => {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
    const anchor = silentAudioRef.current;
    if (!anchor || !anchor.duration || Number.isNaN(anchor.duration)) return;
    navigator.mediaSession.setPositionState({
      duration: anchor.duration,
      playbackRate: anchor.playbackRate,
      position: Math.min(anchor.currentTime, anchor.duration),
    });
  }, [isPlaying]);

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
