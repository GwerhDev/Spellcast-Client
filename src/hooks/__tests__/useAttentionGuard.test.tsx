import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import spellReaderReducer, { setAttentionGuardEnabled, setAttentionGuardInterval, recordReaderActivity, goToNextPage, setShowAttentionGuard, setSpellInfo } from '../../store/spellReaderSlice';
import audioPlayerReducer, { play as playAudio } from '../../store/audioPlayerSlice';
import browserPlayerReducer, { play as playBrowser, pause as pauseBrowserPlayer, requestTogglePlay as requestBrowserTogglePlay } from '../../store/browserPlayerSlice';
import voiceReducer, { setSelectedVoice } from '../../store/voiceSlice';
import { useAttentionGuard } from '../useAttentionGuard';

const makeStore = () => configureStore({
  reducer: combineReducers({
    spellReader: spellReaderReducer,
    audioPlayer: audioPlayerReducer,
    browserPlayer: browserPlayerReducer,
    voice: voiceReducer,
  }),
});

const renderGuard = (store: ReturnType<typeof makeStore>) =>
  renderHook(() => useAttentionGuard(), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });

const oneMinuteMs = 60_000;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useAttentionGuard', () => {
  it('fires after the configured interval while enabled and something is playing', async () => {
    const store = makeStore();
    store.dispatch(setAttentionGuardEnabled(true));
    store.dispatch(setAttentionGuardInterval(5));
    store.dispatch(playBrowser());

    const { result } = renderGuard(store);
    expect(result.current.showModal).toBe(false);

    await act(async () => { await vi.advanceTimersByTimeAsync(5 * oneMinuteMs); });

    expect(store.getState().spellReader.showAttentionGuard).toBe(true);
    expect(store.getState().audioPlayer.isPlaying).toBe(false);
    expect(store.getState().browserPlayer.isPlaying).toBe(false);
  });

  it('never starts the timer when the guard is disabled', async () => {
    const store = makeStore();
    store.dispatch(setAttentionGuardEnabled(false));
    store.dispatch(setAttentionGuardInterval(1));
    store.dispatch(playBrowser());

    renderGuard(store);
    await act(async () => { await vi.advanceTimersByTimeAsync(10 * oneMinuteMs); });

    expect(store.getState().spellReader.showAttentionGuard).toBe(false);
  });

  it('never starts the timer when nothing is playing', async () => {
    const store = makeStore();
    store.dispatch(setAttentionGuardEnabled(true));
    store.dispatch(setAttentionGuardInterval(1));
    // Neither player is playing.

    renderGuard(store);
    await act(async () => { await vi.advanceTimersByTimeAsync(10 * oneMinuteMs); });

    expect(store.getState().spellReader.showAttentionGuard).toBe(false);
  });

  it('does not re-fire (or re-pause) while the guard modal is already showing', async () => {
    const store = makeStore();
    store.dispatch(setAttentionGuardEnabled(true));
    store.dispatch(setAttentionGuardInterval(1));
    store.dispatch(playBrowser());

    renderGuard(store);
    await act(async () => { await vi.advanceTimersByTimeAsync(oneMinuteMs); });
    expect(store.getState().spellReader.showAttentionGuard).toBe(true);

    // Even if playback state flips while the modal is up, no second timer should start.
    act(() => { store.dispatch(playAudio()); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10 * oneMinuteMs); });
    expect(store.getState().spellReader.showAttentionGuard).toBe(true); // unchanged, no crash/loop
  });

  it('resets the timer on activity, so the guard fires from the LATEST activity, not the original start', async () => {
    const store = makeStore();
    store.dispatch(setAttentionGuardEnabled(true));
    store.dispatch(setAttentionGuardInterval(5));
    store.dispatch(playBrowser());

    renderGuard(store);

    // Halfway through the interval, the user does something (activitySeq bump).
    await act(async () => { await vi.advanceTimersByTimeAsync(2.5 * oneMinuteMs); });
    act(() => { store.dispatch(recordReaderActivity()); });

    // Advance by what WOULD have been the remainder of the original interval --
    // the guard must not have fired yet, since activity reset the clock.
    await act(async () => { await vi.advanceTimersByTimeAsync(2.5 * oneMinuteMs); });
    expect(store.getState().spellReader.showAttentionGuard).toBe(false);

    // Advance the rest of the way from the reset point.
    await act(async () => { await vi.advanceTimersByTimeAsync(2.5 * oneMinuteMs); });
    expect(store.getState().spellReader.showAttentionGuard).toBe(true);
  });

  // The reading turns its own pages: that's not the caster doing anything, so the count
  // goes on across them.
  it('fires N minutes into playback even as the reading turns several pages on its own', async () => {
    const store = makeStore();
    store.dispatch(setAttentionGuardEnabled(true));
    store.dispatch(setAttentionGuardInterval(4));
    store.dispatch(playBrowser());
    store.dispatch(setSpellInfo({ totalPages: 10 }));

    renderGuard(store);
    for (let k = 0; k < 3; k++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(oneMinuteMs); });
      act(() => { store.dispatch(goToNextPage()); });
    }
    expect(store.getState().spellReader.showAttentionGuard).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(oneMinuteMs); });
    expect(store.getState().spellReader.showAttentionGuard).toBe(true);
  });

  // isPlaying can drop for an instant between sentences or pages: the count holds through it.
  it('a blink in playback between sentences does not start the count over', async () => {
    const store = makeStore();
    store.dispatch(setAttentionGuardEnabled(true));
    store.dispatch(setAttentionGuardInterval(4));
    store.dispatch(playBrowser());

    renderGuard(store);
    await act(async () => { await vi.advanceTimersByTimeAsync(3 * oneMinuteMs); });
    act(() => { store.dispatch(pauseBrowserPlayer()); });
    act(() => { store.dispatch(playBrowser()); });
    await act(async () => { await vi.advanceTimersByTimeAsync(oneMinuteMs); });
    expect(store.getState().spellReader.showAttentionGuard).toBe(true);
  });

  // Time not playing doesn't count: N minutes of playback, not of the clock.
  it('counts only time spent playing', async () => {
    const store = makeStore();
    store.dispatch(setAttentionGuardEnabled(true));
    store.dispatch(setAttentionGuardInterval(4));
    store.dispatch(playBrowser());

    renderGuard(store);
    await act(async () => { await vi.advanceTimersByTimeAsync(2 * oneMinuteMs); });
    act(() => { store.dispatch(pauseBrowserPlayer()); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10 * oneMinuteMs); });
    act(() => { store.dispatch(playBrowser()); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1.5 * oneMinuteMs); });
    expect(store.getState().spellReader.showAttentionGuard).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(0.5 * oneMinuteMs); });
    expect(store.getState().spellReader.showAttentionGuard).toBe(true);
  });

  it('a play/pause request from the caster starts the count over', async () => {
    const store = makeStore();
    store.dispatch(setAttentionGuardEnabled(true));
    store.dispatch(setAttentionGuardInterval(4));
    store.dispatch(playBrowser());

    renderGuard(store);
    await act(async () => { await vi.advanceTimersByTimeAsync(3 * oneMinuteMs); });
    act(() => { store.dispatch(requestBrowserTogglePlay()); });
    await act(async () => { await vi.advanceTimersByTimeAsync(3 * oneMinuteMs); });
    expect(store.getState().spellReader.showAttentionGuard).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(oneMinuteMs); });
    expect(store.getState().spellReader.showAttentionGuard).toBe(true);
  });

  describe('handleContinue', () => {
    it('resumes the browser player when that is the selected voice type', async () => {
      const store = makeStore();
      store.dispatch(setSelectedVoice({ type: 'browser', value: 'default' }));
      store.dispatch(setShowAttentionGuard(true));

      const { result } = renderGuard(store);
      act(() => { result.current.handleContinue(); });

      expect(store.getState().spellReader.showAttentionGuard).toBe(false);
      // Only the request: the player's queue sets isPlaying once the voice really resumes.
      expect(store.getState().browserPlayer.resumeSeq).toBe(1);
      expect(store.getState().browserPlayer.isPlaying).toBe(false);
    });

    it('toggles the provider voice player when that is the selected voice type', async () => {
      const store = makeStore();
      store.dispatch(setSelectedVoice({ type: 'ai', value: 'some-voice' }));
      store.dispatch(setShowAttentionGuard(true));

      const { result } = renderGuard(store);
      act(() => { result.current.handleContinue(); });

      expect(store.getState().spellReader.showAttentionGuard).toBe(false);
      expect(store.getState().audioPlayer.toggleSeq).toBe(1);
    });
  });

  it('clears its pending timer on unmount, dispatching nothing afterward', async () => {
    const store = makeStore();
    store.dispatch(setAttentionGuardEnabled(true));
    store.dispatch(setAttentionGuardInterval(1));
    store.dispatch(playBrowser());

    const { unmount } = renderGuard(store);
    unmount();

    await act(async () => { await vi.advanceTimersByTimeAsync(10 * oneMinuteMs); });
    expect(store.getState().spellReader.showAttentionGuard).toBe(false);
  });
});
