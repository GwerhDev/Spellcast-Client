import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import reducer, { addSignalNotice, removeSignalNotice, clearSignalNotices } from '../signalSlice';

const initial = { notices: [] as { id: string; message: string }[] };

describe('signalSlice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initial);
  });

  it('addSignalNotice appends a notice with a generated id', () => {
    vi.setSystemTime(1000);
    const state = reducer(initial, addSignalNotice({ message: 'Playback paused from your headset' }));
    expect(state.notices).toEqual([{ id: '1000', message: 'Playback paused from your headset' }]);
  });

  it('addSignalNotice appends without disturbing existing notices', () => {
    vi.setSystemTime(1000);
    const withOne = reducer(initial, addSignalNotice({ message: 'First' }));
    vi.setSystemTime(2000);
    const withTwo = reducer(withOne, addSignalNotice({ message: 'Second' }));
    expect(withTwo.notices).toEqual([
      { id: '1000', message: 'First' },
      { id: '2000', message: 'Second' },
    ]);
  });

  it('removeSignalNotice removes only the matching id', () => {
    const state = {
      notices: [
        { id: '1', message: 'A' },
        { id: '2', message: 'B' },
      ],
    };
    expect(reducer(state, removeSignalNotice('1')).notices).toEqual([{ id: '2', message: 'B' }]);
  });

  it('removeSignalNotice is a no-op for an id that is not present', () => {
    const state = { notices: [{ id: '1', message: 'A' }] };
    expect(reducer(state, removeSignalNotice('missing')).notices).toEqual(state.notices);
  });

  it('clearSignalNotices empties the list', () => {
    const state = { notices: [{ id: '1', message: 'A' }, { id: '2', message: 'B' }] };
    expect(reducer(state, clearSignalNotices()).notices).toEqual([]);
  });
});
