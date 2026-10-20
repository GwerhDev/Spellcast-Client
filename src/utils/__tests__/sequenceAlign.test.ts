import { describe, it, expect, vi } from 'vitest';
import { alignByContent, mergeSequences, MAX_SIMILARITY_PAIRS } from '../sequenceAlign';

const kinds = (a: string[], b: string[]) => alignByContent(a, b).byFrom.map(pair => (pair ? `${pair.kind}:${pair.to}` : 'removed'));

// A brute-force longest common subsequence length, to check the anchors against.
const lcsLength = (a: string[], b: string[]) => {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length];
};

describe('alignByContent', () => {
  it('identical sequences are all the same', () => {
    expect(kinds(['a', 'b', 'c'], ['a', 'b', 'c'])).toEqual(['same:0', 'same:1', 'same:2']);
  });

  it('an item inserted at the start leaves the others the same', () => {
    const { byFrom, byTo } = alignByContent(['a', 'b', 'c'], ['new', 'a', 'b', 'c']);
    expect(byFrom.map(p => p?.kind)).toEqual(['same', 'same', 'same']);
    expect(byTo[0]).toBeNull();
  });

  it('tells removed, moved and changed apart', () => {
    // (Each case with one longest run of equal items, so the anchors are unambiguous.)
    expect(kinds(['a', 'b', 'c', 'd'], ['a', 'c', 'd'])).toEqual(['same:0', 'removed', 'same:1', 'same:2']);
    expect(kinds(['a', 'b', 'c', 'd'], ['a', 'c', 'd', 'b'])).toEqual(['same:0', 'moved:3', 'same:1', 'same:2']);
    expect(kinds(['a', 'b', 'c', 'd'], ['a', 'b2', 'c', 'd'])).toEqual(['same:0', 'changed:1', 'same:2', 'same:3']);
  });

  it('pairs what is left between two anchors by position, the rest added or removed', () => {
    const { byFrom, byTo } = alignByContent(['a', 'x', 'y', 'b'], ['a', 'x2', 'b']);
    expect(byFrom.map(p => p?.kind ?? 'removed')).toEqual(['same', 'changed', 'removed', 'same']);
    expect(byTo.map(p => p?.kind ?? 'added')).toEqual(['same', 'changed', 'same']);
  });

  it('with a likeness, pairs what is left between anchors with what it is most like, in order', () => {
    // x is most like x2 (not y2, the one in its place); y is like nothing.
    const like: Record<string, string> = { x: 'x2' };
    const a = ['a', 'y', 'x', 'b'];
    const b = ['a', 'x2', 'b'];
    const { byFrom } = alignByContent(a, b, (i, j) => (like[a[i]] === b[j] ? 0.9 : 0));
    expect(byFrom.map(p => (p ? `${p.kind}:${p.to}` : 'removed'))).toEqual(['same:0', 'removed', 'changed:1', 'same:2']);
  });

  // Every item read again (nothing the same, no anchors): comparing each with each other one
  // would freeze the page; past the cap they're paired by position, likeness never asked.
  it('pairs a gap too big to compare item by item by position', () => {
    const n = Math.ceil(Math.sqrt(MAX_SIMILARITY_PAIRS)) + 10;
    const a = Array.from({ length: n }, (_, i) => `a${i}`);
    const b = Array.from({ length: n }, (_, i) => `b${i}`);
    const similarity = vi.fn(() => 0.9);
    const { byFrom } = alignByContent(a, b, similarity);
    expect(similarity).not.toHaveBeenCalled();
    expect(byFrom.every((pair, i) => pair?.kind === 'changed' && pair.to === i)).toBe(true);
  });

  it('its anchors are a longest common subsequence', () => {
    let seed = 7;
    const rand = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };
    for (let run = 0; run < 200; run++) {
      const a = Array.from({ length: Math.floor(rand() * 12) }, () => String.fromCharCode(97 + Math.floor(rand() * 4)));
      const b = Array.from({ length: Math.floor(rand() * 12) }, () => String.fromCharCode(97 + Math.floor(rand() * 4)));
      const { pairs } = alignByContent(a, b);
      const same = pairs.filter(p => p.kind === 'same');
      expect(same.length).toBe(lcsLength(a, b));
      // In order on both sides, and really equal.
      same.forEach((p, k) => {
        expect(a[p.from]).toBe(b[p.to]);
        if (k) { expect(p.from).toBeGreaterThan(same[k - 1].from); expect(p.to).toBeGreaterThan(same[k - 1].to); }
      });
    }
  });
});

describe('mergeSequences', () => {
  const merge = (base: string[], ours: string[], theirs: string[]) =>
    mergeSequences(base, ours, theirs, s => s, (_b, o) => ({ item: o, conflict: true }));

  it('takes what changed on one side only', () => {
    expect(merge(['a', 'b', 'c'], ['a', 'b2', 'c'], ['a', 'b', 'c', 'd']).items).toEqual(['a', 'b2', 'c', 'd']);
  });

  it("puts theirs' additions after the item before them in theirs", () => {
    expect(merge(['a', 'b', 'c'], ['a', 'b', 'c', 'o'], ['t', 'a', 'b', 't2', 'c']).items).toEqual(['t', 'a', 'b', 't2', 'c', 'o']);
  });

  it('an item added the same on both sides is there once', () => {
    expect(merge(['a'], ['a', 'x'], ['a', 'x']).items).toEqual(['a', 'x']);
  });

  it('removed on one side and unchanged on the other: removed', () => {
    const result = merge(['a', 'b', 'c'], ['a', 'c'], ['a', 'b', 'c']);
    expect(result.items).toEqual(['a', 'c']);
    expect(result.conflicts).toEqual([]);
  });

  it('removed on one side and changed on the other: a conflict, ours held', () => {
    const removedOurs = merge(['a', 'b', 'c'], ['a', 'c'], ['a', 'b2', 'c']);
    expect(removedOurs.items).toEqual(['a', 'c']);
    expect(removedOurs.conflicts).toEqual([{ kind: 'removedChanged', at: 1, base: 'b', ours: null, theirs: 'b2' }]);
    const removedTheirs = merge(['a', 'b', 'c'], ['a', 'b2', 'c'], ['a', 'c']);
    expect(removedTheirs.items).toEqual(['a', 'b2', 'c']);
    expect(removedTheirs.conflicts).toEqual([{ kind: 'removedChanged', at: 1, base: 'b', ours: 'b2', theirs: null }]);
  });

  it('changed differently on each side: a conflict; the same way: taken', () => {
    expect(merge(['a', 'b'], ['a', 'b1'], ['a', 'b2']).conflicts).toEqual([{ kind: 'changedBoth', at: 1, base: 'b', ours: 'b1', theirs: 'b2' }]);
    expect(merge(['a', 'b'], ['a', 'b1'], ['a', 'b1'])).toEqual({ items: ['a', 'b1'], conflicts: [] });
  });

  it("takes a move made only in theirs", () => {
    expect(merge(['a', 'b', 'c'], ['a', 'b', 'c'], ['c', 'a', 'b']).items).toEqual(['c', 'a', 'b']);
  });
});
