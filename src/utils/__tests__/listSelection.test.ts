import { describe, it, expect } from 'vitest';
import { clickItem, boxSelect, emptySelection } from '../listSelection';

const order = ['a', 'b', 'c', 'd', 'e', 'f'];
const toggle = { toggle: true, range: false };
const range = { toggle: false, range: true };

describe('clickItem', () => {
  it('Ctrl+click adds an item, and takes it out again', () => {
    const one = clickItem(emptySelection, order, 'c', toggle);
    expect(one).toEqual({ selected: ['c'], anchor: 'c' });
    const two = clickItem(one, order, 'e', toggle);
    expect(two.selected).toEqual(['c', 'e']);
    expect(clickItem(two, order, 'c', toggle).selected).toEqual(['e']);
  });

  it('Shift+click adds the run from the anchor, forward or back', () => {
    const start = clickItem(emptySelection, order, 'b', toggle);
    expect(clickItem(start, order, 'e', range).selected).toEqual(['b', 'c', 'd', 'e']);
    const back = clickItem(emptySelection, order, 'e', toggle);
    expect(clickItem(back, order, 'b', range).selected.sort()).toEqual(['b', 'c', 'd', 'e']);
  });

  it('keeps the anchor, so the next Shift+click redraws from it', () => {
    const start = clickItem(emptySelection, order, 'b', toggle);
    const run = clickItem(start, order, 'd', range);
    expect(run.anchor).toBe('b');
  });

  it('takes a run out when its anchor was taken out', () => {
    const all = { selected: [...order], anchor: null };
    const offC = clickItem(all, order, 'c', toggle); // c out, anchor c
    expect(clickItem(offC, order, 'e', range).selected).toEqual(['a', 'b', 'f']);
  });

  it('a Shift+click with no anchor yet is a plain toggle', () => {
    expect(clickItem(emptySelection, order, 'd', range)).toEqual({ selected: ['d'], anchor: 'd' });
  });
});

describe('boxSelect', () => {
  it('is what the box touches, or that added to what was selected', () => {
    expect(boxSelect([], ['d', 'b'], order)).toEqual(['b', 'd']);
    expect(boxSelect(['f'], ['b', 'c'], order)).toEqual(['b', 'c', 'f']);
  });
});
