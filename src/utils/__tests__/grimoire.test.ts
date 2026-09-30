import { describe, it, expect } from 'vitest';
import { isInCasterGrimoire } from '../grimoire';

describe('isInCasterGrimoire', () => {
  it("is true for a spell stored for this caster, even across id types", () => {
    expect(isInCasterGrimoire('user-1', 'user-1')).toBe(true);
    expect(isInCasterGrimoire(42 as unknown as string, '42')).toBe(true);
  });

  it("is false for someone else's spell or without a caster", () => {
    expect(isInCasterGrimoire('user-2', 'user-1')).toBe(false);
    expect(isInCasterGrimoire('user-1', undefined)).toBe(false);
    expect(isInCasterGrimoire(undefined, undefined)).toBe(false);
  });
});
