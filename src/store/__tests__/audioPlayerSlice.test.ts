import { describe, it, expect } from 'vitest';
import reducer, {
  setPlaylist,
  play,
  pause,
  stop,
  togglePlayPause,
  playNext,
  playPrevious,
  setVolume,
  setCurrentTime,
  setDuration,
  setAutoPlayOnLoad,
  setPendingSeek,
  clearPendingSeek,
  requestTogglePlay,
  resetAudioPlayer,
} from '../audioPlayerSlice';

const initial = {
  playlist: [] as string[],
  currentTrackIndex: null as number | null,
  isPlaying: false,
  volume: 1,
  currentTime: 0,
  duration: 0,
  sourceType: 'playlist' as const,
  autoPlayOnLoad: false,
  timeline: [] as never[],
  pendingSeekMs: null as number | null,
  toggleSeq: 0,
};

describe('audioPlayerSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initial);
  });

  it('play sets isPlaying to true', () => {
    expect(reducer(initial, play()).isPlaying).toBe(true);
  });

  it('pause sets isPlaying to false', () => {
    expect(reducer({ ...initial, isPlaying: true }, pause()).isPlaying).toBe(false);
  });

  it('stop sets isPlaying to false and resets currentTime', () => {
    const state = reducer({ ...initial, isPlaying: true, currentTime: 30 }, stop());
    expect(state.isPlaying).toBe(false);
    expect(state.currentTime).toBe(0);
  });

  it('togglePlayPause flips isPlaying', () => {
    expect(reducer(initial, togglePlayPause()).isPlaying).toBe(true);
    expect(reducer({ ...initial, isPlaying: true }, togglePlayPause()).isPlaying).toBe(false);
  });

  it('setPlaylist loads tracks and resets playback state', () => {
    const urls = ['a.mp3', 'b.mp3'];
    const state = reducer(initial, setPlaylist({ playlist: urls }));
    expect(state.playlist).toEqual(urls);
    expect(state.currentTrackIndex).toBe(0);
    expect(state.isPlaying).toBe(false);
    expect(state.currentTime).toBe(0);
  });

  it('setPlaylist with startIndex picks the right track', () => {
    const state = reducer(initial, setPlaylist({ playlist: ['a.mp3', 'b.mp3', 'c.mp3'], startIndex: 2 }));
    expect(state.currentTrackIndex).toBe(2);
  });

  it('setPlaylist with empty list sets currentTrackIndex to null', () => {
    const state = reducer(initial, setPlaylist({ playlist: [] }));
    expect(state.currentTrackIndex).toBeNull();
  });

  it('playNext advances to next track', () => {
    const loaded = { ...initial, playlist: ['a.mp3', 'b.mp3'], currentTrackIndex: 0, isPlaying: true };
    const state = reducer(loaded, playNext());
    expect(state.currentTrackIndex).toBe(1);
    expect(state.isPlaying).toBe(true);
    expect(state.currentTime).toBe(0);
  });

  it('playNext at end of playlist stops playback', () => {
    const loaded = { ...initial, playlist: ['a.mp3', 'b.mp3'], currentTrackIndex: 1, isPlaying: true };
    const state = reducer(loaded, playNext());
    expect(state.isPlaying).toBe(false);
  });

  it('playPrevious goes to previous track', () => {
    const loaded = { ...initial, playlist: ['a.mp3', 'b.mp3'], currentTrackIndex: 1, isPlaying: true };
    const state = reducer(loaded, playPrevious());
    expect(state.currentTrackIndex).toBe(0);
    expect(state.isPlaying).toBe(true);
  });

  it('playPrevious at start stops playback', () => {
    const loaded = { ...initial, playlist: ['a.mp3', 'b.mp3'], currentTrackIndex: 0, isPlaying: true };
    const state = reducer(loaded, playPrevious());
    expect(state.isPlaying).toBe(false);
  });

  it('setVolume clamps to [0, 1]', () => {
    expect(reducer(initial, setVolume(0.5)).volume).toBe(0.5);
    expect(reducer(initial, setVolume(3)).volume).toBe(1);
    expect(reducer(initial, setVolume(-1)).volume).toBe(0);
  });

  it('setCurrentTime updates currentTime', () => {
    expect(reducer(initial, setCurrentTime(42)).currentTime).toBe(42);
  });

  it('setDuration updates duration', () => {
    expect(reducer(initial, setDuration(120)).duration).toBe(120);
  });

  it('setAutoPlayOnLoad sets the flag', () => {
    expect(reducer(initial, setAutoPlayOnLoad(true)).autoPlayOnLoad).toBe(true);
  });

  it('setPendingSeek and clearPendingSeek', () => {
    const seeked = reducer(initial, setPendingSeek(5000));
    expect(seeked.pendingSeekMs).toBe(5000);
    expect(reducer(seeked, clearPendingSeek()).pendingSeekMs).toBeNull();
  });

  it('requestTogglePlay increments toggleSeq', () => {
    const s1 = reducer(initial, requestTogglePlay());
    expect(s1.toggleSeq).toBe(1);
    expect(reducer(s1, requestTogglePlay()).toggleSeq).toBe(2);
  });

  it('resetAudioPlayer clears playlist and playback state', () => {
    const playing = { ...initial, playlist: ['a.mp3'], currentTrackIndex: 0, isPlaying: true, currentTime: 15, volume: 0.5 };
    const reset = reducer(playing, resetAudioPlayer());
    expect(reset.playlist).toEqual([]);
    expect(reset.currentTrackIndex).toBeNull();
    expect(reset.isPlaying).toBe(false);
    expect(reset.currentTime).toBe(0);
    expect(reset.volume).toBe(1);
  });
});
