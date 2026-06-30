import { describe, it, expect, vi, beforeEach } from 'vitest';
import reducer, { unlockAsset, setActiveSoundBg, setActivePageBg, setSoundBgVolume, setMasterVolume } from '../userLibrarySlice';

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
  });
});

describe('userLibrarySlice', () => {
  it('returns initial state with free assets unlocked', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state.activeSoundBgId).toBeNull();
    expect(state.activePageBgId).toBe('default');
    expect(state.soundBgVolume).toBe(0.35);
    expect(state.masterVolume).toBe(1);
    expect(Array.isArray(state.unlockedIds)).toBe(true);
  });

  it('unlockAsset adds a new id', () => {
    const state = reducer({ unlockedIds: ['a'], activeSoundBgId: null, activePageBgId: null, soundBgVolume: 0.35, masterVolume: 1, version: 2 }, unlockAsset('b'));
    expect(state.unlockedIds).toContain('b');
  });

  it('unlockAsset does not duplicate an existing id', () => {
    const state = reducer({ unlockedIds: ['a'], activeSoundBgId: null, activePageBgId: null, soundBgVolume: 0.35, masterVolume: 1, version: 2 }, unlockAsset('a'));
    expect(state.unlockedIds.filter(id => id === 'a')).toHaveLength(1);
  });

  it('setActiveSoundBg sets and clears', () => {
    const base = { unlockedIds: [], activeSoundBgId: null, activePageBgId: null, soundBgVolume: 0.35, masterVolume: 1, version: 2 };
    expect(reducer(base, setActiveSoundBg('rain')).activeSoundBgId).toBe('rain');
    expect(reducer({ ...base, activeSoundBgId: 'rain' }, setActiveSoundBg(null)).activeSoundBgId).toBeNull();
  });

  it('setActivePageBg sets and clears', () => {
    const base = { unlockedIds: [], activeSoundBgId: null, activePageBgId: null, soundBgVolume: 0.35, masterVolume: 1, version: 2 };
    expect(reducer(base, setActivePageBg('dark')).activePageBgId).toBe('dark');
    expect(reducer({ ...base, activePageBgId: 'dark' }, setActivePageBg(null)).activePageBgId).toBeNull();
  });

  it('setSoundBgVolume clamps to [0, 1]', () => {
    const base = { unlockedIds: [], activeSoundBgId: null, activePageBgId: null, soundBgVolume: 0.35, masterVolume: 1, version: 2 };
    expect(reducer(base, setSoundBgVolume(0.5)).soundBgVolume).toBe(0.5);
    expect(reducer(base, setSoundBgVolume(2)).soundBgVolume).toBe(1);
    expect(reducer(base, setSoundBgVolume(-1)).soundBgVolume).toBe(0);
  });

  it('setMasterVolume clamps to [0, 1]', () => {
    const base = { unlockedIds: [], activeSoundBgId: null, activePageBgId: null, soundBgVolume: 0.35, masterVolume: 1, version: 2 };
    expect(reducer(base, setMasterVolume(0.7)).masterVolume).toBe(0.7);
    expect(reducer(base, setMasterVolume(5)).masterVolume).toBe(1);
    expect(reducer(base, setMasterVolume(-0.5)).masterVolume).toBe(0);
  });
});
