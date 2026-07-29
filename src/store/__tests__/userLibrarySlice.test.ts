import { describe, it, expect, vi, beforeEach } from 'vitest';
import reducer, {
  unlockAsset,
  setActiveSoundBg,
  setActivePageBg,
  setActiveCompanion,
  setSoundBgVolume,
  setMasterVolume,
  moveCompanionModel,
  rotateCompanionModel,
  scaleCompanionModel,
  type CompanionPlacement,
} from '../userLibrarySlice';

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
  });
});

const basePlacement: CompanionPlacement = { x: 80, y: 80, rotationX: 0, rotationY: 0, scale: 1 };

const baseState = {
  unlockedIds: [] as string[],
  activeSoundBgId: null as string | null,
  activePageBgId: null as string | null,
  activeCompanionId: null as string | null,
  soundBgVolume: 0.35,
  masterVolume: 1,
  companionPlacements: {} as Record<string, CompanionPlacement>,
  version: 4,
};

describe('userLibrarySlice', () => {
  it('returns initial state with free assets unlocked', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state.activeSoundBgId).toBeNull();
    expect(state.activePageBgId).toBe('default');
    expect(state.activeCompanionId).toBeNull();
    expect(state.soundBgVolume).toBe(0.35);
    expect(state.masterVolume).toBe(1);
    expect(Array.isArray(state.unlockedIds)).toBe(true);
  });

  it('unlockAsset adds a new id', () => {
    const state = reducer({ ...baseState, unlockedIds: ['a'] }, unlockAsset('b'));
    expect(state.unlockedIds).toContain('b');
  });

  it('unlockAsset does not duplicate an existing id', () => {
    const state = reducer({ ...baseState, unlockedIds: ['a'] }, unlockAsset('a'));
    expect(state.unlockedIds.filter(id => id === 'a')).toHaveLength(1);
  });

  it('setActiveSoundBg sets and clears', () => {
    expect(reducer(baseState, setActiveSoundBg('rain')).activeSoundBgId).toBe('rain');
    expect(reducer({ ...baseState, activeSoundBgId: 'rain' }, setActiveSoundBg(null)).activeSoundBgId).toBeNull();
  });

  it('setActivePageBg sets and clears', () => {
    expect(reducer(baseState, setActivePageBg('dark')).activePageBgId).toBe('dark');
    expect(reducer({ ...baseState, activePageBgId: 'dark' }, setActivePageBg(null)).activePageBgId).toBeNull();
  });

  it('setActiveCompanion sets and clears', () => {
    expect(reducer(baseState, setActiveCompanion('cats')).activeCompanionId).toBe('cats');
    expect(reducer({ ...baseState, activeCompanionId: 'cats' }, setActiveCompanion(null)).activeCompanionId).toBeNull();
  });

  it('setSoundBgVolume clamps to [0, 1]', () => {
    expect(reducer(baseState, setSoundBgVolume(0.5)).soundBgVolume).toBe(0.5);
    expect(reducer(baseState, setSoundBgVolume(2)).soundBgVolume).toBe(1);
    expect(reducer(baseState, setSoundBgVolume(-1)).soundBgVolume).toBe(0);
  });

  it('setMasterVolume clamps to [0, 1]', () => {
    expect(reducer(baseState, setMasterVolume(0.7)).masterVolume).toBe(0.7);
    expect(reducer(baseState, setMasterVolume(5)).masterVolume).toBe(1);
    expect(reducer(baseState, setMasterVolume(-0.5)).masterVolume).toBe(0);
  });

  it('moveCompanionModel creates a placement from base on first move', () => {
    const state = reducer(baseState, moveCompanionModel({ key: 'cats:orange', dx: 10, dy: -5, base: basePlacement }));
    expect(state.companionPlacements['cats:orange']).toEqual({ ...basePlacement, x: 90, y: 75 });
  });

  it('moveCompanionModel accumulates on top of an existing placement', () => {
    const withPlacement = { ...baseState, companionPlacements: { 'cats:orange': { ...basePlacement, x: 90, y: 75 } } };
    const state = reducer(withPlacement, moveCompanionModel({ key: 'cats:orange', dx: 10, dy: 10, base: basePlacement }));
    expect(state.companionPlacements['cats:orange']).toEqual({ ...basePlacement, x: 100, y: 85 });
  });

  it('rotateCompanionModel accumulates rotation on both axes', () => {
    const state = reducer(baseState, rotateCompanionModel({ key: 'cats:orange', dRotationX: 0.1, dRotationY: 0.2, base: basePlacement }));
    expect(state.companionPlacements['cats:orange']).toEqual({ ...basePlacement, rotationX: 0.1, rotationY: 0.2 });
  });

  it('scaleCompanionModel clamps to the configured min/max', () => {
    const grown = reducer(baseState, scaleCompanionModel({ key: 'cats:orange', dScale: 5, base: basePlacement }));
    expect(grown.companionPlacements['cats:orange'].scale).toBe(2.5);

    const shrunk = reducer(baseState, scaleCompanionModel({ key: 'cats:orange', dScale: -5, base: basePlacement }));
    expect(shrunk.companionPlacements['cats:orange'].scale).toBe(0.4);
  });
});
