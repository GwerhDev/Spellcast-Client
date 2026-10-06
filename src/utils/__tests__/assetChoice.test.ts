import { describe, it, expect } from 'vitest';
import { resolveAssetChoice } from '../assetChoice';

describe('resolveAssetChoice', () => {
  it("follows the caster's default when the spell never picked", () => {
    expect(resolveAssetChoice(undefined, 'parchment')).toBe('parchment');
    expect(resolveAssetChoice(undefined, null)).toBeNull();
  });

  it("the spell's own pick wins over the default, none included", () => {
    expect(resolveAssetChoice('warm-linen', 'parchment')).toBe('warm-linen');
    expect(resolveAssetChoice(null, 'parchment')).toBeNull();
  });
});
