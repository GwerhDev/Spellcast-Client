import { describe, it, expect } from 'vitest';
import reducer, {
  play,
  pause,
  stop,
  setVoice,
  setVolume,
  resetBrowserPlayer,
  setAutoPlayOnLoad,
  requestTogglePlay,
} from '../browserPlayerSlice';

const initial = { isPlaying: false, voice: null, volume: 1, autoPlayOnLoad: false, toggleSeq: 0 };

describe('browserPlayerSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initial);
  });

  it('play sets isPlaying to true', () => {
    const state = reducer(initial, play());
    expect(state.isPlaying).toBe(true);
  });

  it('pause sets isPlaying to false', () => {
    const state = reducer({ ...initial, isPlaying: true }, pause());
    expect(state.isPlaying).toBe(false);
  });

  it('stop sets isPlaying to false', () => {
    const state = reducer({ ...initial, isPlaying: true }, stop());
    expect(state.isPlaying).toBe(false);
  });

  it('setVolume clamps to [0, 1]', () => {
    expect(reducer(initial, setVolume(0.5)).volume).toBe(0.5);
    expect(reducer(initial, setVolume(2)).volume).toBe(1);
    expect(reducer(initial, setVolume(-1)).volume).toBe(0);
  });

  it('setAutoPlayOnLoad sets the flag', () => {
    expect(reducer(initial, setAutoPlayOnLoad(true)).autoPlayOnLoad).toBe(true);
    expect(reducer(initial, setAutoPlayOnLoad(false)).autoPlayOnLoad).toBe(false);
  });

  it('setVoice stores the voice', () => {
    const voice = { name: 'English' } as SpeechSynthesisVoice;
    expect(reducer(initial, setVoice(voice)).voice).toEqual(voice);
    expect(reducer({ ...initial, voice }, setVoice(null)).voice).toBeNull();
  });

  it('requestTogglePlay increments toggleSeq', () => {
    const s1 = reducer(initial, requestTogglePlay());
    expect(s1.toggleSeq).toBe(1);
    const s2 = reducer(s1, requestTogglePlay());
    expect(s2.toggleSeq).toBe(2);
  });

  it('resetBrowserPlayer resets state but preserves autoPlayOnLoad', () => {
    const playing = { isPlaying: true, voice: { name: 'X' } as SpeechSynthesisVoice, volume: 0.3, autoPlayOnLoad: true, toggleSeq: 5 };
    const reset = reducer(playing, resetBrowserPlayer());
    expect(reset.isPlaying).toBe(false);
    expect(reset.voice).toBeNull();
    expect(reset.volume).toBe(1);
    expect(reset.toggleSeq).toBe(0);
    expect(reset.autoPlayOnLoad).toBe(true);
  });

  it('resetBrowserPlayer without autoPlayOnLoad set keeps it false', () => {
    const state = { ...initial, isPlaying: true, volume: 0.5 };
    const reset = reducer(state, resetBrowserPlayer());
    expect(reset.autoPlayOnLoad).toBe(false);
  });
});
