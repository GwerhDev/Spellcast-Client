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
} from '../../../store/spellReaderSlice';
import { PlaybackControls } from './PlaybackControls';
import { VolumeControls } from '../../components/Players/BrowserPlayer/VolumeControls/VolumeControls';
import { VoiceSelectorButton } from '../../components/Players/shared/VoiceSelectorButton/VoiceSelectorButton';
import { PlayerConfigButton } from '../../components/Players/shared/PlayerConfigButton/PlayerConfigButton';
import { useNavigate } from 'react-router-dom';
import { setSelectedVoice } from '../../../store/voiceSlice';
import { getSpellById } from '../../../db';
import { useAppSelector } from '../../../store/hooks';
import { faScroll } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Waveform } from '../../components/Waveform/Waveform';
import { SpellDetailModal } from '../../components/Modals/SpellDetailModal';
import { addSignalNotice } from '../../../store/signalSlice';
import { SILENT_AUDIO_SRC } from '../../../config/consts';

interface PlayerProps {
  showVoiceSelectorModal: React.Dispatch<SetStateAction<boolean>>;
  showPlayerConfigModal: React.Dispatch<SetStateAction<boolean>>;
}

// ── ARCHITECTURE (TCORE-81) ────────────────────────────────────────────────
//
// Every path that can change whether the engine is speaking -- the on-screen
// button, the headset/OS media keys, the attention guard's inactivity
// timeout, the "resume from here" request, the anti-freeze nudge, the volume
// slider drag -- pushes ONE event onto a single FIFO queue instead of
// touching speechSynthesis or Redux's isPlaying directly. One async runner
// drains that queue strictly one event at a time: it never starts processing
// event N+1 until event N's handler has fully finished, including any await
// on the engine's own callback (onpause/onresume/onend). That await is what
// replaces every timer/poll/confirmation-window this file used to have --
// it's not a guess at how long the browser needs, it's the browser itself
// telling us it's done, whenever that actually happens.
//
// This is what makes "wait exactly as long as the engine needs, never less,
// never a guessed budget" possible: two events can never race each other
// over the engine or over isPlaying, because there is structurally only ever
// one event being handled at a time. Redux's isPlaying is written from
// exactly one place -- the end of whichever handler just ran -- never from a
// reactive effect watching isPlaying itself, never from a poll.

type EngineEvent =
  | { type: 'CLICK_PLAY' }
  | { type: 'CLICK_PAUSE' }
  | { type: 'HEADSET_PLAY' }
  | { type: 'HEADSET_PAUSE' }
  | { type: 'ATTENTION_PAUSE' }
  | { type: 'RESUME_REQUESTED' }
  | { type: 'TOGGLE_REQUESTED' }
  | { type: 'VOLUME_DRAG_START' }
  | { type: 'VOLUME_DRAG_END' }
  | { type: 'CONTENT_CHANGED' } // sentence/page/spell changed under us
  | { type: 'SENTENCE_ENDED'; utterance: SpeechSynthesisUtterance } // the engine's own onend fired
  | { type: 'FREEZE_NUDGE' };

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
    externalPauseSeq,
  } = useSelector((state: RootState) => state.browserPlayer);
  const {
    isLoaded,
    totalPages,
    currentPage,
    spellId,
    spellTitle,
    sentences,
    currentSentenceIndex,
  } = useSelector((state: RootState) => state.spellReader);
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
  const volumeWasPlayingRef = useRef(false);

  const handleTitle = () => navigate(`/spell/${spellId}/reader`);
  const handleSearcher = () => dispatch(setShowSearcher(true));
  const handlePrevious = () => { if (isLoaded) dispatch(goToPreviousPage()); };
  const handleNext = () => { if (isLoaded) dispatch(goToNextPage()); };
  const isPrevDisabled = isLoaded ? currentPage === 1 : true;
  const isNextDisabled = isLoaded ? currentPage === totalPages : true;

  // Mirrors of Redux/props state for the queue runner below, which is a
  // stable-identity async function (created once) and must always read the
  // LATEST render's values, never the ones captured when it was created.
  const latestRef = useRef({
    isPlaying, voice, volume, masterVolume, sentences, currentSentenceIndex,
    currentPage, totalPages, isLoaded, autoPlayOnLoad,
  });
  latestRef.current = {
    isPlaying, voice, volume, masterVolume, sentences, currentSentenceIndex,
    currentPage, totalPages, isLoaded, autoPlayOnLoad,
  };

  // Whether the cover fetch below has SETTLED for the current spell -- either
  // a real cover arrived, or it's confirmed there isn't one. Gates the very
  // first autoplay-triggered CLICK_PLAY (see the content-tracking effect
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
    // resolves, spellTitle/currentPage (synchronous Redux state, already
    // updated) pair with a stale coverUrl still holding the last spell's
    // image. The Media Session metadata effect below rebuilds its
    // MediaMetadata from both together, so that window is exactly when the
    // OS widget can show the new spell's title next to the old spell's
    // artwork.
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
    // Never write metadata before the cover fetch has settled -- this effect
    // fires unconditionally on mount (coverUrl still null at that point,
    // regardless of the coverSettled gate on the play-trigger effect below),
    // so without this guard it still sent the OS an incomplete first
    // snapshot (no artwork) right as real playback started -- exactly the
    // moment Chrome decides whether to adopt this page's own media session
    // at all, observed to sometimes leave it stuck on its generic default
    // ("chrome-extension" control) for one or two page turns afterward.
    if (!coverSettled) return;
    applyMediaSessionMetadata();
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spellTitle, currentPage, totalPages, coverUrl, isLoaded, t, coverSettled]);

  // ── Single event queue: the only writer of isPlaying / the only caller of
  // speechSynthesis.speak()/pause()/resume()/cancel() and the silent anchor.
  // Strictly serial: drainQueue never starts handling the next event until
  // the current one's handler (including every await inside it) is done.
  // Crucially, a handler's await is only ever for a SHORT engine
  // confirmation (paused/resumed/started) -- never for "the whole sentence
  // finished speaking", which can take many seconds. If it awaited that, a
  // CLICK_PAUSE arriving mid-sentence would sit stuck in the queue behind it
  // instead of pausing immediately. Instead, starting a sentence fires
  // speak() and returns right away; the engine's own onend (whenever it
  // actually fires, seconds later) enqueues a SENTENCE_ENDED event like
  // anything else, so a pause queued in the meantime runs the instant the
  // queue gets to it, not after the sentence happens to finish.
  const queueRef = useRef<EngineEvent[]>([]);
  const processingRef = useRef(false);

  const drainQueue = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    while (queueRef.current.length > 0) {
      const event = queueRef.current.shift()!;
      try {
        await handleEventRef.current(event);
      } catch (err) {
        console.error('[BrowserPlayer] engine event handler threw:', event.type, err);
      }
    }
    processingRef.current = false;
  };

  const enqueue = (event: EngineEvent) => {
    queueRef.current.push(event);
    void drainQueue();
  };

  // Chrome's ~15s continuous-speech freeze workaround (FREEZE_NUDGE in
  // handleEvent) -- but timed from when the CURRENT utterance actually
  // started, not a blanket "every 14s while playing" interval. BrowserPlayer
  // speaks sentence by sentence, cancelling and starting a fresh utterance
  // for each one -- most sentences are well under 15s, so a blanket timer
  // fired a real pause()+resume() cycle on the live engine every ~14s
  // REGARDLESS of how many short sentences had already restarted the clock,
  // audibly cutting normal reading for no reason (the freeze this exists to
  // prevent can only happen within a single continuous utterance). Rearmed
  // on every new utterance and after every actual nudge, so a genuinely
  // long single sentence still gets protected.
  const freezeNudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearFreezeNudgeTimer = () => {
    if (freezeNudgeTimerRef.current) {
      clearTimeout(freezeNudgeTimerRef.current);
      freezeNudgeTimerRef.current = null;
    }
  };
  const armFreezeNudgeTimer = () => {
    clearFreezeNudgeTimer();
    freezeNudgeTimerRef.current = setTimeout(() => enqueue({ type: 'FREEZE_NUDGE' }), 14_000);
  };

  // Media Session's play/pause handlers must stay idempotent (always-play,
  // always-pause), mirroring AudioPlayer: Bluetooth/OS media controls can
  // fire play and pause in quick succession for a single physical button
  // press. Both just enqueue -- the queue's own handler checks `playing`
  // freshly when it actually runs, so a stray double-fire is a no-op, not a
  // wrong toggle.
  const registerMediaSessionHandlers = () => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => enqueue({ type: 'HEADSET_PLAY' }));
    navigator.mediaSession.setActionHandler('pause', () => enqueue({ type: 'HEADSET_PAUSE' }));
    navigator.mediaSession.setActionHandler('nexttrack', handleNext);
    navigator.mediaSession.setActionHandler('previoustrack', handlePrevious);
  };

  // handleEvent (defined below, after the engine primitives it uses) closes
  // over per-render values via latestRef, but drainQueue above is defined
  // before it in source order and must always call the CURRENT render's
  // handleEvent -- not the one captured when drainQueue happened to be
  // created -- hence this ref indirection instead of a forward reference.
  const handleEventRef = useRef<(event: EngineEvent) => Promise<void>>(async () => {});

  // ── Real, awaited engine primitives ─────────────────────────────────────
  // Each of these waits for the browser's OWN callback confirming the change
  // actually landed, instead of guessing a duration. No timer, no poll: the
  // await settles exactly when the engine says so, however long that takes
  // -- but only ever for a short pause/resume/start confirmation, never for
  // how long a sentence takes to finish being spoken (see above).
  const engineSpeakSentence = (text: string): void => {
    // Deliberately NOT calling applyMediaSessionMetadata() here: title/
    // artist/cover never change between sentences on the same page, and the
    // dedicated effect above already keeps metadata in sync on every REAL
    // change (spellTitle/currentPage/totalPages/coverUrl), including
    // running before this function is ever reached for a fresh page (same
    // render, declared earlier). Reassigning a brand-new MediaMetadata on
    // every single sentence -- which is what this function used to do,
    // unconditionally -- was observed to make real Chrome's OS/MPRIS bridge
    // repeatedly reconsider session ownership and often lose it to its own
    // generic default, flickering the OS widget every time a sentence
    // changed. Metadata now has exactly one writer: the dedicated effect.
    //
    // Also deliberately NOT reasserting the action handlers here anymore
    // (tried both gated-to-page-changes and unconditional-every-utterance):
    // neither actually fixed the OS widget fighting a network TTS voice for
    // control, and reasserting-every-utterance made things audibly WORSE --
    // periodic cuts in the speech itself, not just a cosmetic widget issue.
    // Handlers are registered once at mount only (see the effect below);
    // widget/headset robustness across a long session is a real trade-off
    // against not touching the live engine's surroundings every sentence.
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    activeUtteranceRef.current = utterance;
    const { voice: v, volume: vol, masterVolume: mv } = latestRef.current;
    if (v) utterance.voice = v;
    utterance.volume = vol * mv;

    utterance.onend = () => enqueue({ type: 'SENTENCE_ENDED', utterance });
    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return; // superseded by a newer speak()/cancel() -- that event owns what happens next
      if (e.error === 'text-too-long') {
        const mid = Math.floor(text.length / 2);
        const split = text.lastIndexOf(' ', mid);
        const pivot = split > 0 ? split : mid;
        pendingSplitRef.current = { remainder: text.slice(pivot).trimStart() };
        engineSpeakSentence(text.slice(0, pivot).trimEnd());
        return;
      }
      enqueue({ type: 'SENTENCE_ENDED', utterance }); // treat unknown engine errors as "done with this sentence"
    };

    window.speechSynthesis.speak(utterance);
    armFreezeNudgeTimer(); // clock starts over for THIS utterance
  };

  // Set only by the text-too-long split above: the SENTENCE_ENDED handler
  // checks this to know the utterance that just ended was only the first
  // half of a sentence, and the real second half still needs to be spoken
  // before actually advancing to the next sentence index.
  const pendingSplitRef = useRef<{ remainder: string } | null>(null);

  // Awaits the engine's own onpause/onresume event -- not a guessed delay for
  // HOW LONG the engine needs, so the queue runner genuinely knows the
  // engine reached the state we asked for before it lets the next queued
  // event run.
  //
  // ENGINE_EVENT_SAFETY_TIMEOUT_MS below is NOT a confirmation window or a
  // guess at engine timing -- utterance.onpause/onresume are documented as
  // unreliable across real browsers (some never fire them at all for a
  // given pause()/resume() call, independently of how long the engine
  // takes). Without a bound, a browser that never fires the event leaves
  // this promise -- and the entire queue behind it, including every future
  // play/pause click -- permanently stuck. This bound exists ONLY to survive
  // an event that may structurally never come, not to arbitrate a race
  // between two writers (there is only ever one: this awaited call itself).
  const ENGINE_EVENT_SAFETY_TIMEOUT_MS = 500;

  const engineAwaitPause = (): Promise<void> => {
    const utterance = activeUtteranceRef.current;
    if (!utterance || !window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        utterance.onpause = prevOnPause;
        resolve();
      };
      const prevOnPause = utterance.onpause;
      utterance.onpause = (ev) => {
        prevOnPause?.call(utterance, ev);
        settle();
      };
      window.speechSynthesis.pause();
      setTimeout(settle, ENGINE_EVENT_SAFETY_TIMEOUT_MS);
    });
  };

  const engineAwaitResume = (): Promise<void> => {
    const utterance = activeUtteranceRef.current;
    if (!utterance || !window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        utterance.onresume = prevOnResume;
        resolve();
      };
      const prevOnResume = utterance.onresume;
      utterance.onresume = (ev) => {
        prevOnResume?.call(utterance, ev);
        settle();
      };
      window.speechSynthesis.resume();
      setTimeout(settle, ENGINE_EVENT_SAFETY_TIMEOUT_MS);
    });
  };

  // Starts speaking the current sentence (if any) without awaiting how long
  // that takes -- see engineSpeakSentence above. Returns immediately once
  // the engine has been told what to say, freeing the queue to process
  // whatever comes next (a pause, a headset event, anything) while the
  // sentence is still being spoken.
  const startSpeakingCurrentSentence = (): void => {
    const { sentences: sents, currentSentenceIndex: idx, currentPage: page, totalPages: total } = latestRef.current;
    if (sents.length === 0 || idx < 0 || idx >= sents.length) {
      if (page < total) { dispatch(goToNextPage()); return; }
      dispatch(stop());
      dispatch(setCurrentSentenceIndex(0));
      return;
    }
    engineSpeakSentence(sents[idx]);
  };

  const startPlayingFromCurrentSentence = (): void => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    silentAudioRef.current?.play().catch(() => {});
    dispatch(play());
    startSpeakingCurrentSentence();
  };

  const stopEngineAndConfirmPaused = async (): Promise<void> => {
    clearFreezeNudgeTimer(); // genuinely paused -- nothing to nudge until resumed
    silentAudioRef.current?.pause();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    await engineAwaitPause();
  };

  const handleEvent = async (event: EngineEvent): Promise<void> => {
    const { isPlaying: playing, sentences: sents, currentSentenceIndex: idx } = latestRef.current;

    switch (event.type) {
      case 'CLICK_PLAY':
      case 'HEADSET_PLAY':
      case 'RESUME_REQUESTED': {
        if (playing) return;
        if (event.type === 'HEADSET_PLAY') dispatch(addSignalNotice({ message: t.player.playedFromHeadset }));
        if (sents.length === 0 || idx < 0 || idx >= sents.length) { dispatch(play()); return; }
        // A pause (CLICK_PAUSE/HEADSET_PAUSE/ATTENTION_PAUSE) never clears
        // activeUtteranceRef -- the utterance is still loaded in the engine,
        // just paused. If a plain CLICK_PLAY/HEADSET_PLAY called speak() on
        // a brand-new utterance here instead of resume()-ing this one, the
        // real engine (still sitting in its own paused state from the
        // earlier pause) would silently never start speaking the new one --
        // most browsers require an explicit resume() to leave paused, speak()
        // alone doesn't. Applies to all three event types alike: whichever
        // one asked, if something is still loaded, resume it instead of
        // starting fresh.
        if (activeUtteranceRef.current) {
          dispatch(play());
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
          silentAudioRef.current?.play().catch(() => {});
          await engineAwaitResume();
          armFreezeNudgeTimer(); // clock starts over from the resume point
          return;
        }
        startPlayingFromCurrentSentence();
        return;
      }

      case 'CLICK_PAUSE':
      case 'HEADSET_PAUSE': {
        if (!playing) return;
        if (event.type === 'HEADSET_PAUSE') dispatch(addSignalNotice({ message: t.player.pausedFromHeadset }));
        dispatch(pause());
        await stopEngineAndConfirmPaused();
        return;
      }

      case 'ATTENTION_PAUSE': {
        // requestExternalPause already set isPlaying: false in the SAME
        // dispatch that queued this event (unlike a click, which dispatches
        // pause() only once its handler runs) -- so `playing` above is
        // already false by the time this is processed. Whether there's
        // actually anything to pause on the engine is asked directly instead.
        if (!window.speechSynthesis.speaking && !activeUtteranceRef.current) return;
        await stopEngineAndConfirmPaused();
        return;
      }

      case 'TOGGLE_REQUESTED': {
        await handleEvent(playing ? { type: 'CLICK_PAUSE' } : { type: 'CLICK_PLAY' });
        return;
      }

      case 'VOLUME_DRAG_START': {
        volumeWasPlayingRef.current = playing && !!activeUtteranceRef.current && window.speechSynthesis.speaking;
        if (volumeWasPlayingRef.current) { clearFreezeNudgeTimer(); await engineAwaitPause(); }
        return;
      }

      case 'VOLUME_DRAG_END': {
        if (!volumeWasPlayingRef.current) return;
        volumeWasPlayingRef.current = false;
        await engineAwaitResume();
        armFreezeNudgeTimer();
        return;
      }

      case 'CONTENT_CHANGED': {
        // Page/sentence/spell changed for a reason OTHER than a sentence
        // finishing on its own (manual page nav, a fresh spell mounting,
        // etc.) -- SENTENCE_ENDED below is what handles the "just finished
        // speaking, advance to the next one" case. If we're mid-utterance,
        // drop it and speak whatever is now current instead.
        if (!playing) return;
        activeUtteranceRef.current = null;
        window.speechSynthesis.cancel();
        startSpeakingCurrentSentence();
        return;
      }

      case 'SENTENCE_ENDED': {
        // Ignore an onend that fired for an utterance that isn't the one we
        // still think is active -- it was already superseded by a newer
        // speak()/cancel() (a pause, a content change, a fresh play), and
        // that event already decided what happens next.
        if (activeUtteranceRef.current !== event.utterance) return;
        activeUtteranceRef.current = null;

        if (pendingSplitRef.current) {
          const { remainder } = pendingSplitRef.current;
          pendingSplitRef.current = null;
          engineSpeakSentence(remainder);
          return;
        }

        if (!playing) return; // paused while this sentence was speaking
        dispatch(setCurrentSentenceIndex(idx + 1));
        // The content-tracking effect below reacts to that dispatch by
        // enqueueing CONTENT_CHANGED, which is what actually starts
        // speaking the next sentence -- kept as one single path for
        // "content changed, speak what's current" instead of duplicating
        // that logic here.
        return;
      }

      case 'FREEZE_NUDGE': {
        // Chrome's SpeechSynthesis engine can silently freeze after ~15s of
        // continuous speech. Nudging pause immediately followed by resume
        // keeps it alive. Routed through the same queue as everything else,
        // so it can never race a real pause/resume: if a CLICK_PAUSE is
        // sitting right after this in the queue, this nudge finishes first
        // (awaiting the real onpause/onresume) and the pause runs on a
        // genuinely settled, non-paused engine -- never the other way round.
        if (!playing || !window.speechSynthesis.speaking || window.speechSynthesis.paused) return;
        await engineAwaitPause();
        // A real pause/resume may have been queued and already run while
        // this nudge's pause was landing -- don't resume if so.
        if (!latestRef.current.isPlaying) return;
        await engineAwaitResume();
        armFreezeNudgeTimer(); // still the same utterance -- protect again in case it runs even longer
        return;
      }
    }
  };
  handleEventRef.current = handleEvent;

  // ── Content tracking: page/sentence/spell changes enqueue CONTENT_CHANGED
  // instead of ever touching the engine directly. Whether that event does
  // anything depends entirely on isPlaying at the moment the queue actually
  // gets to it (read fresh from latestRef, not captured here), so a
  // page/sentence change that lands while paused is a no-op. Runs on mount
  // too (React always runs a useEffect at least once) -- which is exactly
  // what's needed for a spell mounted with autoPlayOnLoad already true (the
  // "play from a list card" path): there is no earlier render to compare
  // against, mounting IS the change.
  useEffect(() => {
    if (autoPlayOnLoad) {
      // Wait for the cover fetch to settle before ever starting to speak --
      // see coverSettled above. This effect just re-runs (still a no-op)
      // every time something in its deps changes until coverSettled flips
      // true, then proceeds exactly once. Not a timer: it's driven by the
      // real fetch's own completion, whenever that actually happens.
      if (!coverSettled) return;
      dispatch(setAutoPlayOnLoad(false));
      enqueue({ type: 'CLICK_PLAY' });
      return;
    }
    enqueue({ type: 'CONTENT_CHANGED' });
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSentenceIndex, sentences, isLoaded, currentPage, spellId, autoPlayOnLoad, coverSettled]);

  const handleTogglePlayPause = () => enqueue({ type: 'TOGGLE_REQUESTED' });

  // External callers (attention guard) that need to toggle/resume playback
  // from outside this component route through these two seq counters --
  // never speechSynthesis directly -- so they can't become a second writer
  // of engine state. Each seq bump enqueues exactly one event.
  const toggleSeqRef = useRef(toggleSeq);
  useEffect(() => {
    if (toggleSeq !== toggleSeqRef.current) {
      toggleSeqRef.current = toggleSeq;
      enqueue({ type: 'TOGGLE_REQUESTED' });
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggleSeq]);

  const resumeSeqRef = useRef(resumeSeq);
  useEffect(() => {
    if (resumeSeq !== resumeSeqRef.current) {
      resumeSeqRef.current = resumeSeq;
      enqueue({ type: 'RESUME_REQUESTED' });
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeSeq]);

  // requestExternalPause (attention guard's inactivity timeout) already sets
  // isPlaying: false itself; this seq bump is just what tells the queue to
  // actually run the pause on the engine, the same as a click would.
  const externalPauseSeqRef = useRef(externalPauseSeq);
  useEffect(() => {
    if (externalPauseSeq !== externalPauseSeqRef.current) {
      externalPauseSeqRef.current = externalPauseSeq;
      enqueue({ type: 'ATTENTION_PAUSE' });
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalPauseSeq]);

  // Baseline registration for when nothing has spoken yet (e.g. a spell
  // mounted paused) -- see registerMediaSessionHandlers above for why this
  // alone isn't enough and engineSpeakSentence reasserts it too.
  useEffect(() => {
    registerMediaSessionHandlers();
    if (!('mediaSession' in navigator)) return;
    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
    };
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // The freeze-nudge timer itself is armed/cleared/re-armed at each real
  // utterance start/pause/resume (see armFreezeNudgeTimer above) -- this
  // effect only guarantees cleanup on unmount, not a recurring poll.
  useEffect(() => () => clearFreezeNudgeTimer(), []);

  const handleVolumePointerDown = () => enqueue({ type: 'VOLUME_DRAG_START' });
  const handleVolumePointerUp = () => enqueue({ type: 'VOLUME_DRAG_END' });

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

  const volumePercentage = volume * 100;

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
                ? <img data-testid="browser-player-cover" src={coverUrl} alt="" className={s.cover} />
                : <div data-testid="browser-player-cover-placeholder" className={s.coverIcon}><FontAwesomeIcon icon={faScroll} /></div>
              }
              {isPlaying && (
                <div className={s.coverWaveOverlay}>
                  <Waveform active bars={4} height={14} color="white" />
                </div>
              )}
            </div>
            {isLoaded && (
              <div className={s.spellDetails}>
                <p data-testid="browser-player-title" title={spellTitle || ''} onClick={spellId ? handleTitle : undefined} style={spellId ? undefined : { cursor: 'default' }}>{spellTitle}</p>
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
