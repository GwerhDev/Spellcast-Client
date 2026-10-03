import { describe, it, expect } from 'vitest';
import { applyQuickStart } from '../quickStart';
import type { Spell } from '../../interfaces';

const spell = (title: string, createdAt: string, currentPage = 0): Spell => ({
  id: title, title, createdAt: new Date(createdAt), userId: 'u',
  progress: { currentPage, pagesProgress: [], lastReadSentenceIndex: 0 },
});
const titles = (spells: Spell[]) => spells.map(s => s.title);

const all = [
  spell('Beta', '2026-01-01', 3),
  spell('alpha', '2026-03-01'),
  spell('Gamma', '2026-02-01', 1),
];

describe('applyQuickStart', () => {
  it('latest: every spell, newest first', () => {
    expect(titles(applyQuickStart(all, ['last']))).toEqual(['alpha', 'Gamma', 'Beta']);
  });

  it('latest and in progress: the ones being read, newest first', () => {
    expect(titles(applyQuickStart(all, ['last', 'inProgress']))).toEqual(['Gamma', 'Beta']);
  });

  it('in progress alone: the ones being read, by title', () => {
    expect(titles(applyQuickStart(all, ['inProgress']))).toEqual(['Beta', 'Gamma']);
  });

  it('no filter: every spell, by title (ignoring case)', () => {
    expect(titles(applyQuickStart(all, []))).toEqual(['alpha', 'Beta', 'Gamma']);
  });

  it('leaves the list it was given alone', () => {
    const copy = [...all];
    applyQuickStart(all, ['last']);
    expect(all).toEqual(copy);
  });
});
