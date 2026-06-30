import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { pause as pauseAudio, requestTogglePlay as toggleAudio } from 'store/audioPlayerSlice';
import { pause as pauseBrowser, requestResume as resumeBrowser } from 'store/browserPlayerSlice';
import { setShowAttentionGuard } from 'store/pdfReaderSlice';

export function useAttentionGuard() {
  const dispatch = useAppDispatch();

  const attentionGuardEnabled = useAppSelector(s => s.pdfReader.attentionGuardEnabled);
  const attentionGuardInterval = useAppSelector(s => s.pdfReader.attentionGuardInterval);
  const showAttentionGuard = useAppSelector(s => s.pdfReader.showAttentionGuard);

  const aiIsPlaying = useAppSelector(s => s.audioPlayer.isPlaying);
  const browserIsPlaying = useAppSelector(s => s.browserPlayer.isPlaying);
  const isAnyPlaying = aiIsPlaying || browserIsPlaying;

  const aiToggleSeq = useAppSelector(s => s.audioPlayer.toggleSeq);
  const browserToggleSeq = useAppSelector(s => s.browserPlayer.toggleSeq);
  const activitySeq = useAppSelector(s => s.pdfReader.activitySeq);
  const currentPage = useAppSelector(s => s.pdfReader.currentPage);

  const selectedVoiceType = useAppSelector(s => s.voice.selectedVoice?.type);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a ref to latest values so the setTimeout callback is never stale
  const stateRef = useRef({ attentionGuardEnabled, attentionGuardInterval, isAnyPlaying, showAttentionGuard });
  stateRef.current = { attentionGuardEnabled, attentionGuardInterval, isAnyPlaying, showAttentionGuard };

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    clearTimer();
    const ms = stateRef.current.attentionGuardInterval * 60_000;
    timerRef.current = setTimeout(() => {
      dispatch(pauseAudio());
      dispatch(pauseBrowser());
      window.speechSynthesis.pause();
      dispatch(setShowAttentionGuard(true));
    }, ms);
  };

  // Start/stop timer whenever playback state or guard config changes
  useEffect(() => {
    if (!attentionGuardEnabled) {
      clearTimer();
      return;
    }
    if (isAnyPlaying && !showAttentionGuard) {
      startTimer();
    } else {
      clearTimer();
    }
    return clearTimer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnyPlaying, attentionGuardEnabled, attentionGuardInterval, showAttentionGuard]);

  // Reset timer on any user activity signal
  useEffect(() => {
    if (!stateRef.current.attentionGuardEnabled || !stateRef.current.isAnyPlaying || stateRef.current.showAttentionGuard) return;
    startTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiToggleSeq, browserToggleSeq, activitySeq, currentPage]);

  const handleContinue = () => {
    dispatch(setShowAttentionGuard(false));
    if (selectedVoiceType === 'browser') {
      dispatch(resumeBrowser());
    } else {
      dispatch(toggleAudio());
    }
  };

  return { showModal: showAttentionGuard, handleContinue };
}
