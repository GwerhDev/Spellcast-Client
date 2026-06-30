import { describe, it, expect } from 'vitest';
import reducer, { setMinimized, toggleMinimized } from '../desktopSlice';

const initial = { minimized: false };

describe('desktopSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initial);
  });

  it('setMinimized sets the value directly', () => {
    expect(reducer(initial, setMinimized(true)).minimized).toBe(true);
    expect(reducer({ minimized: true }, setMinimized(false)).minimized).toBe(false);
  });

  it('toggleMinimized flips the flag', () => {
    expect(reducer(initial, toggleMinimized()).minimized).toBe(true);
    expect(reducer({ minimized: true }, toggleMinimized()).minimized).toBe(false);
  });
});
