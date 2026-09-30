import { describe, it, expect } from 'vitest';
import { countSpellWords, estimateListeningMinutes, WORDS_PER_MINUTE } from '../spellStats';

describe('countSpellWords', () => {
  it('counts the words of every page, ignoring markup and entities', () => {
    const pages = ['<p>The first&nbsp;page.</p>', '<h1>Two</h1><p>more <strong>words</strong> here</p>', '<img src="data:image/png;base64,AAAA" />'];
    expect(countSpellWords(JSON.stringify(pages))).toBe(7);
  });

  it('ignores punctuation-only tokens', () => {
    expect(countSpellWords(JSON.stringify(['<p>Hello — world !</p>']))).toBe(2);
  });

  it('is null for missing or unreadable pages', () => {
    expect(countSpellWords(undefined)).toBeNull();
    expect(countSpellWords('not json')).toBeNull();
    expect(countSpellWords(JSON.stringify({ page: 1 }))).toBeNull();
  });
});

describe('estimateListeningMinutes', () => {
  it('rounds to whole minutes at the reading pace, with a one-minute floor', () => {
    expect(estimateListeningMinutes(0)).toBe(0);
    expect(estimateListeningMinutes(10)).toBe(1);
    expect(estimateListeningMinutes(WORDS_PER_MINUTE * 90)).toBe(90);
  });
});
