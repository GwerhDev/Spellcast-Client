import { describe, it, expect } from 'vitest';
import { textOf, wordDiff } from '../wordDiff';

describe('wordDiff', () => {
  it('marks the words taken out and put in, keeping the rest', () => {
    expect(wordDiff('the quick brown fox', 'the slow brown fox jumps')).toEqual([
      { text: 'the ', kind: 'same' },
      { text: 'quick', kind: 'removed' },
      { text: 'slow', kind: 'added' },
      { text: ' brown fox', kind: 'same' },
      { text: ' jumps', kind: 'added' },
    ]);
  });

  it('all added, all removed, or nothing changed', () => {
    expect(wordDiff('', 'new text')).toEqual([{ text: 'new text', kind: 'added' }]);
    expect(wordDiff('old text', '')).toEqual([{ text: 'old text', kind: 'removed' }]);
    expect(wordDiff('same', 'same')).toEqual([{ text: 'same', kind: 'same' }]);
  });
});

describe('textOf', () => {
  it("reads a block's text, its line breaks and nested blocks on lines of their own", () => {
    expect(textOf({ type: 'paragraph', content: [{ type: 'text', text: 'one' }, { type: 'hardBreak' }, { type: 'text', text: 'two' }] })).toBe('one\ntwo');
    expect(textOf({ type: 'bulletList', content: [
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'b' }] }] },
    ] })).toBe('a\nb');
    expect(textOf({ type: 'image', attrs: { src: 'spell-asset:x.png' } })).toBe('');
  });
});
