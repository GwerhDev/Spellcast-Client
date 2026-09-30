import { describe, it, expect } from 'vitest';
import { countSpellWords, estimateListeningMinutes, WORDS_PER_MINUTE } from '../spellStats';

// Pages as the app stores them: one Tiptap document per page.
const doc = (...content: object[]) => ({ type: 'doc', content });
const paragraph = (...content: object[]) => ({ type: 'paragraph', content });
const text = (value: string, marks?: object[]) => ({ type: 'text', text: value, ...(marks ? { marks } : {}) });

describe('countSpellWords', () => {
  it('counts the text nodes of every Tiptap page', () => {
    const pages = [
      doc(paragraph(text('The first page.'))),
      doc({ type: 'heading', attrs: { level: 1 }, content: [text('Two')] }, paragraph(text('more words here'))),
      doc({ type: 'image', attrs: { src: 'data:image/png;base64,AAAA' } }),
    ];
    expect(countSpellWords(JSON.stringify(pages))).toBe(7);
  });

  it('keeps a word split by marks as one word, and separates blocks and hard breaks', () => {
    const pages = [
      doc(
        paragraph(text('spell'), text('book', [{ type: 'bold' }]), { type: 'hardBreak' }, text('next')),
        { type: 'bulletList', content: [
          { type: 'listItem', content: [paragraph(text('one'))] },
          { type: 'listItem', content: [paragraph(text('two'))] },
        ] },
      ),
    ];
    expect(countSpellWords(JSON.stringify(pages))).toBe(4);
  });

  it('still reads a page stored as an HTML string, ignoring markup and entities', () => {
    expect(countSpellWords(JSON.stringify(['<p>The first&nbsp;page.</p>']))).toBe(3);
  });

  it('ignores punctuation-only tokens', () => {
    expect(countSpellWords(JSON.stringify([doc(paragraph(text('Hello — world !')))]))).toBe(2);
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
