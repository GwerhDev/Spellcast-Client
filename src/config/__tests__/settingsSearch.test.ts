import { describe, it, expect } from 'vitest';
import { isOffered, matchesQuery, settingsSearchEntries } from '../settingsSearch';

const entry = (key: string) => settingsSearchEntries.find(e => e.key === key)!;

describe('settingsSearch', () => {
  it('finds a setting by its name, what it is for, or its keywords, every word of the query', () => {
    const texts = { label: 'Appearance', desc: 'Theme, language and 3D mode.', keywords: 'dark light' };
    expect(matchesQuery(texts, 'appear')).toBe(true);
    expect(matchesQuery(texts, 'language')).toBe(true);
    expect(matchesQuery(texts, 'DARK theme')).toBe(true);
    expect(matchesQuery(texts, 'dark voice')).toBe(false);
    expect(matchesQuery(texts, '  ')).toBe(true);
  });

  it("offers the reader's settings only with a Spell open, the editor's only in the editor", () => {
    const nowhere = { spellOpen: false, inEditor: false };
    expect(isOffered(entry('readerSettings'), nowhere)).toBe(false);
    expect(isOffered(entry('readerSettings'), { ...nowhere, spellOpen: true })).toBe(true);
    expect(isOffered(entry('editorSettings'), nowhere)).toBe(false);
    expect(isOffered(entry('editorSettings'), { ...nowhere, inEditor: true })).toBe(true);
    expect(isOffered(entry('playerSettings'), nowhere)).toBe(true);
    expect(isOffered(entry('appearance'), nowhere)).toBe(true);
  });

  it('opens each setting somewhere: a route or a panel', () => {
    for (const e of settingsSearchEntries) expect(Boolean(e.path) !== Boolean(e.panel)).toBe(true);
  });
});
