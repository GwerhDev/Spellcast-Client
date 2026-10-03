import type { Spell } from '../interfaces';
import type { QuickStartFilter } from '../store/altarSlice';

// The quick start's spells, its filters all applied at once: "in progress" keeps those
// being read (a page past the first reached, as the Grimoire's "reading" filter counts
// them); "last" puts the latest first. Without it they're in title order, so the row still
// reads in an order of its own.
export const applyQuickStart = (spells: Spell[], filters: QuickStartFilter[]): Spell[] => {
  const kept = filters.includes('inProgress')
    ? spells.filter(spell => (spell.progress?.currentPage ?? 0) > 0)
    : [...spells];
  return filters.includes('last')
    ? kept.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : kept.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
};
