import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { pause as pauseAudio, requestTogglePlay as toggleAudio } from 'store/audioPlayerSlice';
import { requestExternalPause as pauseBrowser, requestResume as resumeBrowser } from 'store/browserPlayerSlice';
import { setShowAttentionGuard } from 'store/spellReaderSlice';

export function useAttentionGuard() {
  const dispatch = useAppDispatch();

  const attentionGuardEnabled = useAppSelector(s => s.spellReader.attentionGuardEnabled);
  const attentionGuardInterval = useAppSelector(s => s.spellReader.attentionGuardInterval);
  const showAttentionGuard = useAppSelector(s => s.spellReader.showAttentionGuard);

  const aiIsPlaying = useAppSelector(s => s.audioPlayer.isPlaying);
  const browserIsPlaying = useAppSelector(s => s.browserPlayer.isPlaying);
  const isAnyPlaying = aiIsPlaying || browserIsPlaying;

  // The caster's own actions: play/pause requests, a sentence clicked, a page turned by hand
  // (see recordReaderActivity). The reading turning its own pages is not one of them.
  const aiToggleSeq = useAppSelector(s => s.audioPlayer.toggleSeq);
  const browserToggleSeq = useAppSelector(s => s.browserPlayer.toggleSeq);
  const activitySeq = useAppSelector(s => s.spellReader.activitySeq);

  const selectedVoiceType = useAppSelector(s => s.voice.selectedVoice?.type);

  // Playback time since the caster's last action, measured from timestamps: playing time adds
  // up across pauses in playback (isPlaying can drop for an instant between sentences or
  // pages) without starting over, and a timer a background tab runs late can't shorten or
  // stretch it. `elapsedRef` is what was played before the current stretch; `since` is when
  // the current stretch started (null while not counting).
  const elapsedRef = useRef(0);
  const sinceRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const counting = attentionGuardEnabled && isAnyPlaying && !showAttentionGuard;
  const limitMs = attentionGuardInterval * 60_000;
  const stateRef = useRef({ counting, limitMs });
  stateRef.current = { counting, limitMs };

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const played = () => elapsedRef.current + (sinceRef.current !== null ? Date.now() - sinceRef.current : 0);

  const fire = () => {
    clearTimer();
    dispatch(pauseAudio());
    // BrowserPlayer owns the only path allowed to touch speechSynthesis --
    // requestExternalPause bumps externalPauseSeq, which BrowserPlayer
    // enqueues as a real ATTENTION_PAUSE event on its single event queue,
    // same as a click or a headset pause. Calling speechSynthesis.pause()
    // here directly would be a second, unserialized writer of engine state.
    dispatch(pauseBrowser());
    dispatch(setShowAttentionGuard(true));
  };

  // Waits out what's left of the limit; once the wait is over, fires if that much has really
  // been played (otherwise waits out the rest).
  const arm = () => {
    clearTimer();
    if (!stateRef.current.counting) return;
    const left = stateRef.current.limitMs - played();
    if (left <= 0) { fire(); return; }
    timerRef.current = setTimeout(arm, left);
  };

  // Counting while playing (and enabled, the guard not up); not counting keeps what was played.
  useEffect(() => {
    if (counting) {
      if (sinceRef.current === null) sinceRef.current = Date.now();
    } else if (sinceRef.current !== null) {
      elapsedRef.current += Date.now() - sinceRef.current;
      sinceRef.current = null;
    }
    arm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counting, limitMs]);

  // From the caster's last action (or the guard being turned off or answered), it starts over.
  const startOver = () => {
    elapsedRef.current = 0;
    sinceRef.current = stateRef.current.counting ? Date.now() : null;
    arm();
  };
  useEffect(() => {
    startOver();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiToggleSeq, browserToggleSeq, activitySeq, attentionGuardEnabled]);

  // A tab coming back to the front: the timer may have been held back while it was hidden.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') arm(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { document.removeEventListener('visibilitychange', onVisible); clearTimer(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = () => {
    elapsedRef.current = 0;
    sinceRef.current = null;
    dispatch(setShowAttentionGuard(false));
    if (selectedVoiceType === 'browser') {
      dispatch(resumeBrowser());
    } else {
      dispatch(toggleAudio());
    }
  };

  return { showModal: showAttentionGuard, handleContinue };
}
