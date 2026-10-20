import { describe, it, expect } from 'vitest';
import type { JSONContent } from '@tiptap/core';
import { commonAncestor, diffSpells, isAncestor, isSameSpell, mergeSpells, type SpellSnapshot } from '../spellDiff';

const p = (text: string): JSONContent => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const page = (...blocks: (string | JSONContent)[]): JSONContent => ({ type: 'doc', attrs: { marginTop: 48 }, content: blocks.map(b => (typeof b === 'string' ? p(b) : b)) });
const snap = (pages: JSONContent[], over: Partial<SpellSnapshot> = {}): SpellSnapshot => ({ title: 'T', cover: 'c1', originalPages: 'o1', pages, ...over });

const P1 = page('one'), P2 = page('two'), P3 = page('three');

describe('diffSpells', () => {
  it('nothing differs between equal states', () => {
    expect(isSameSpell(snap([P1, P2]), snap([P1, P2]))).toBe(true);
    // Key order inside a node doesn't make it different.
    const reordered: JSONContent = { content: P1.content, attrs: { marginTop: 48 }, type: 'doc' };
    expect(isSameSpell(snap([P1]), snap([reordered]))).toBe(true);
  });

  it('inserting a page at the start does not mark the others changed', () => {
    const diff = diffSpells(snap([P1, P2, P3]), snap([page('new'), P1, P2, P3]));
    expect(diff.pages.map(d => d.kind)).toEqual(['added', 'same', 'same', 'same']);
  });

  it('pages removed, moved and changed, in the newer order, each removed where it was', () => {
    const [P4, P5, P6] = [page('four'), page('five'), page('six')];
    const diff = diffSpells(snap([P1, P2, P3, P4, P5, P6]), snap([P1, page('three, edited'), P4, P5, P2]));
    expect(diff.pages).toEqual([
      { kind: 'same', from: 0, to: 0 },
      { kind: 'changed', from: 2, to: 1, blocks: [{ kind: 'changed', from: 0, to: 0 }], layoutChanged: false },
      { kind: 'same', from: 3, to: 2 },
      { kind: 'same', from: 4, to: 3 },
      { kind: 'removed', from: 5 },
      { kind: 'moved', from: 1, to: 4 },
    ]);
  });

  it("a changed page's blocks, aligned the same way, and its layout", () => {
    const before = page('a', 'b', 'c');
    const after: JSONContent = { ...page('new', 'a', 'b2', 'c'), attrs: { marginTop: 0 } };
    const [entry] = diffSpells(snap([before]), snap([after])).pages;
    expect(entry.kind).toBe('changed');
    if (entry.kind !== 'changed') return;
    expect(entry.blocks.map(b => b.kind)).toEqual(['added', 'same', 'changed', 'same']);
    expect(entry.layoutChanged).toBe(true);
  });

  it('details field by field, tags as a set, cover and original pages as a whole', () => {
    const diff = diffSpells(
      snap([P1], { title: 'Old', author: 'Ann', tags: ['a', 'b'] }),
      snap([P1], { title: 'New', author: 'Ann', description: 'Now described', tags: ['b', 'c'], cover: 'c2', originalPages: 'o1' }),
    );
    expect(diff.details).toEqual([
      { field: 'title', from: 'Old', to: 'New' },
      { field: 'description', from: undefined, to: 'Now described' },
    ]);
    expect(diff.tags).toEqual({ added: ['c'], removed: ['a'] });
    expect(diff.cover).toEqual({ from: 'c1', to: 'c2' });
    expect(diff.originalPages).toBeNull();
  });
});

describe('commonAncestor', () => {
  // s1 ← s2 ← s3 (source)      s2 ← d1 ← d2 (draft)      m: a merge of s3 and d1
  const parents: Record<string, string[]> = { s1: [], s2: ['s1'], s3: ['s2'], d1: ['s2'], d2: ['d1'], m: ['s3', 'd1'] };
  const parentsOf = (id: string) => parents[id];

  it('is the most recent seal two versions share', () => {
    expect(commonAncestor('s3', 'd2', parentsOf)).toBe('s2');
    expect(commonAncestor('m', 'd2', parentsOf)).toBe('d1');
  });

  it('is one of them when it comes before the other (nothing to merge: move it forward)', () => {
    expect(commonAncestor('s2', 'd2', parentsOf)).toBe('s2');
    expect(isAncestor('s2', 'd2', parentsOf)).toBe(true);
    expect(isAncestor('d2', 's2', parentsOf)).toBe(false);
  });

  it('is null for seals with nothing in common', () => {
    expect(commonAncestor('s3', 'x', (id) => (id === 'x' ? [] : parents[id]))).toBeNull();
  });
});

describe('mergeSpells', () => {
  it('takes what changed on one side only, and what changed the same on both', () => {
    const base = snap([P1, P2, P3], { title: 'T', author: 'Ann' });
    const ours = snap([P1, page('two, ours'), P3], { title: 'T', author: 'Bea' });
    const theirs = snap([page('new'), P1, P2, P3], { title: 'Retitled', author: 'Bea' });
    const { merged, dissonances } = mergeSpells(base, ours, theirs);
    expect(dissonances).toEqual([]);
    expect(merged.title).toBe('Retitled');
    expect(merged.author).toBe('Bea');
    expect(merged.pages).toEqual([page('new'), P1, page('two, ours'), P3]);
  });

  it('a page removed on one side and edited on the other is a dissonance', () => {
    const base = snap([P1, P2, P3]);
    const { merged, dissonances } = mergeSpells(base, snap([P1, P3]), snap([P1, page('two, edited'), P3]));
    expect(merged.pages).toEqual([P1, P3]);
    expect(dissonances).toEqual([{ part: 'page', at: 1, base: P2, ours: null, theirs: page('two, edited') }]);
  });

  it('a page edited on both sides in different blocks merges by blocks', () => {
    const base = snap([page('a', 'b', 'c')]);
    const { merged, dissonances } = mergeSpells(base, snap([page('a2', 'b', 'c')]), snap([page('a', 'b', 'c2')]));
    expect(dissonances).toEqual([]);
    expect(merged.pages).toEqual([page('a2', 'b', 'c2')]);
  });

  it('the same block changed differently on each side, or removed on one and edited on the other, is a dissonance', () => {
    const base = snap([P1, page('a', 'b', 'c')]);
    const ours = snap([P1, page('a', 'b-ours', 'c2')]);
    const theirs = snap([P1, page('a', 'b-theirs')]);
    const { merged, dissonances } = mergeSpells(base, ours, theirs);
    expect(merged.pages[1]).toEqual(page('a', 'b-ours', 'c2'));
    expect(dissonances).toEqual([
      { part: 'block', page: 1, at: 1, base: p('b'), ours: p('b-ours'), theirs: p('b-theirs') },
      { part: 'block', page: 1, at: 2, base: p('c'), ours: p('c2'), theirs: null },
    ]);
  });

  it("a page's layout changed differently on each side is a dissonance", () => {
    const base = snap([page('a', 'b')]);
    const ours = snap([{ ...page('a2', 'b'), attrs: { marginTop: 10 } }]);
    const theirs = snap([{ ...page('a', 'b2'), attrs: { marginTop: 20 } }]);
    const { dissonances } = mergeSpells(base, ours, theirs);
    expect(dissonances).toEqual([{ part: 'pageLayout', page: 0, base: { marginTop: 48 }, ours: { marginTop: 10 }, theirs: { marginTop: 20 } }]);
  });

  it('details, the cover and the original pages changed differently on each side are dissonances', () => {
    const base = snap([P1], { title: 'T', cover: 'c1', originalPages: 'o1' });
    const { merged, dissonances } = mergeSpells(base,
      snap([P1], { title: 'Ours', cover: 'c-ours', originalPages: 'o2' }),
      snap([P1], { title: 'Theirs', cover: 'c-theirs', originalPages: 'o1' }));
    expect(merged).toMatchObject({ title: 'Ours', cover: 'c-ours', originalPages: 'o2' });
    expect(dissonances).toEqual([
      { part: 'detail', field: 'title', base: 'T', ours: 'Ours', theirs: 'Theirs' },
      { part: 'cover', base: 'c1', ours: 'c-ours', theirs: 'c-theirs' },
    ]);
  });

  it('tags merge as a set: each side’s additions added, removals removed', () => {
    const { merged, dissonances } = mergeSpells(
      snap([P1], { tags: ['a', 'b', 'c'] }),
      snap([P1], { tags: ['a', 'c', 'ours'] }),
      snap([P1], { tags: ['b', 'c', 'theirs'] }),
    );
    expect(merged.tags).toEqual(['c', 'ours', 'theirs']);
    expect(dissonances).toEqual([]);
  });
});
