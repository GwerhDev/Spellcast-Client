import { describe, it, expect, vi } from 'vitest';
import { resolveCoverFrameId, getCoverFrameAsset, getCoverFrameStyle, getCoverFrameCorners } from '../coverFrame';
import { coverFrames } from '../../config/assets';
import type { CoverFrame } from '../../config/assets';

// TCORE-123: resolveCoverFrameId is the one place Spell.coverFrameId's three-state
// fallback gets resolved -- every render site (SpellCard, SpellDetail, the audio/browser
// players, SpellDetailModal, EditorPickerCard) depends on this exact rule.
describe('resolveCoverFrameId', () => {
  it('falls back to the global default when the spell never made an explicit choice (undefined)', () => {
    expect(resolveCoverFrameId(undefined, 'gilded')).toBe('gilded');
    expect(resolveCoverFrameId(undefined, null)).toBeNull();
  });

  it('keeps the spell\'s explicit "no border" (null) even when a global default is set', () => {
    expect(resolveCoverFrameId(null, 'gilded')).toBeNull();
  });

  it('keeps the spell\'s own explicit pick even when a different global default is set', () => {
    expect(resolveCoverFrameId('other-border', 'gilded')).toBe('other-border');
  });
});

describe('getCoverFrameAsset', () => {
  it('returns undefined for null (no border)', () => {
    expect(getCoverFrameAsset(null)).toBeUndefined();
  });

  it('returns undefined for an unknown id', () => {
    expect(getCoverFrameAsset('does-not-exist')).toBeUndefined();
  });

  it('returns the matching asset for a known id', () => {
    expect(getCoverFrameAsset('grimoire')).toEqual(coverFrames.find(b => b.id === 'grimoire'));
  });
});

describe('getCoverFrameStyle', () => {
  it('returns an empty style for null (no border)', () => {
    expect(getCoverFrameStyle(null)).toEqual({});
  });

  it('returns an empty style for an unknown id', () => {
    expect(getCoverFrameStyle('does-not-exist')).toEqual({});
  });

  // The real catalog's one asset ('grimoire') uses the corner/medallion mechanism with an
  // edgeColor -- so getCoverFrameStyle returns a border built from that edgeColor (see the
  // mutual-exclusivity block below for how the two mechanisms interact).
  it('returns a border built from edgeColor for the real catalog\'s grimoire frame', () => {
    const asset = coverFrames.find(b => b.id === 'grimoire')!;
    expect(getCoverFrameStyle('grimoire')).toEqual({
      border: `3px solid ${asset.edgeColor}`,
      boxSizing: 'border-box',
    });
  });
});

// TCORE-123: cornerImageUrl+edgeColor+medallionImageUrl and cssValue/boxShadow are
// mutually exclusive mechanisms (see CoverFrame's own comment in config/assets/types.ts)
// -- a corner-piece frame renders its own fixed-size corner/medallion layer
// (CoverFrameCorners) plus a plain edgeColor border for the straight edges, while a
// cssValue frame renders only a CSS border, never both.
describe('getCoverFrameCorners', () => {
  it('returns null for null (no frame)', () => {
    expect(getCoverFrameCorners(null)).toBeNull();
  });

  it('returns null for an unknown id', () => {
    expect(getCoverFrameCorners('does-not-exist')).toBeNull();
  });

  it('returns the corner/medallion config for the real catalog\'s grimoire frame', () => {
    const asset = coverFrames.find(b => b.id === 'grimoire')!;
    expect(getCoverFrameCorners('grimoire')).toEqual({
      cornerImageUrl: asset.cornerImageUrl,
      edgeColor: asset.edgeColor,
      medallionImageUrl: asset.medallionImageUrl,
    });
  });
});

describe('corner vs. cssValue border mechanisms are mutually exclusive', () => {
  it('getCoverFrameStyle builds the border from edgeColor for a frame that has a cornerImageUrl, ignoring cssValue', () => {
    const cornerAsset = {
      id: 'corner-test',
      name: 'Corner Test',
      description: '',
      category: 'cover-frame',
      unlockMethod: 'free',
      cssValue: '3px solid red', // should be ignored -- cornerImageUrl + edgeColor wins
      cornerImageUrl: '/frames/corner-test.svg',
      edgeColor: '#123456',
      thumbnail: '#fff',
      tags: [],
    } as CoverFrame;
    const getAssetSpy = vi.spyOn(coverFrames, 'find');
    getAssetSpy.mockReturnValueOnce(cornerAsset);
    expect(getCoverFrameStyle('corner-test')).toEqual({
      border: '3px solid #123456',
      boxSizing: 'border-box',
    });
    getAssetSpy.mockRestore();
  });

  it('getCoverFrameCorners returns null for a frame with only cssValue (no cornerImageUrl)', () => {
    const borderAsset = {
      id: 'border-test-corners',
      name: 'Border Test',
      description: '',
      category: 'cover-frame',
      unlockMethod: 'free',
      cssValue: '3px solid #c9a24a',
      thumbnail: '#c9a24a',
      tags: [],
    } as CoverFrame;
    const getAssetSpy = vi.spyOn(coverFrames, 'find');
    getAssetSpy.mockReturnValueOnce(borderAsset);
    expect(getCoverFrameCorners('border-test-corners')).toBeNull();
    getAssetSpy.mockRestore();
  });

  // The real catalog no longer has a plain cssValue-only frame (grimoire uses the
  // corner/medallion mechanism) -- a synthetic asset keeps this mechanism itself covered.
  it('getCoverFrameStyle applies border + box-sizing (and boxShadow) for a frame with only cssValue', () => {
    const borderAsset = {
      id: 'border-test',
      name: 'Border Test',
      description: '',
      category: 'cover-frame',
      unlockMethod: 'free',
      cssValue: '3px solid #c9a24a',
      boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.35)',
      thumbnail: '#c9a24a',
      tags: [],
    } as CoverFrame;
    const getAssetSpy = vi.spyOn(coverFrames, 'find');
    getAssetSpy.mockReturnValueOnce(borderAsset);
    const style = getCoverFrameStyle('border-test');
    expect(style.border).toBe(borderAsset.cssValue);
    expect(style.boxSizing).toBe('border-box');
    expect(style.boxShadow).toBe(borderAsset.boxShadow);
    getAssetSpy.mockRestore();
  });
});
