import { describe, it, expect } from 'vitest';
import type { JSONContent } from '@tiptap/core';
import { canKeepBoth, commonAncestor, commonAncestors, diffSpells, resolveMerge, MergeResolutionError, isAncestor, isSameSpell, mergeSpells, type SpellSnapshot } from '../spellDiff';

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

  // Between two anchors a page pairs with the one it's most like, not merely the one in its
  // place: a page inserted right before an edited one isn't taken for it.
  it('a page inserted next to an edited one: the new one added, the edited one changed', () => {
    const chapter = page('Chapter one', 'The quick fox jumps over the dog.');
    const diff = diffSpells(snap([chapter, P2]), snap([page('A new prologue.'), page('Chapter one', 'The slow fox jumps over the dog.'), P2]));
    expect(diff.pages.map(d => d.kind)).toEqual(['added', 'changed', 'same']);
    const changed = diff.pages[1];
    expect(changed.kind === 'changed' && changed.blocks.map(b => b.kind)).toEqual(['same', 'changed']);
  });

  it('pages with nothing in common are one removed and another added, not one changed', () => {
    const diff = diffSpells(snap([P1, page('Entirely different words here'), P3]), snap([P1, page('Nothing alike at all'), P3]));
    expect(diff.pages.map(d => d.kind)).toEqual(['same', 'removed', 'added', 'same']);
  });

  // "Update from the PDF" reads every page again: none the same, no anchors. Fast all the same.
  it('a big spell with every page changed is compared quickly, each page against the one in its place', () => {
    const words = (seed: number) => Array.from({ length: 40 }, (_, k) => `w${(seed * 7 + k) % 500}`).join(' ');
    const pages = (edited: boolean) => Array.from({ length: 300 }, (_, i) => page(...Array.from({ length: 8 }, (_, b) => `${words(i * 8 + b)}${edited ? ' edited' : ''}`)));
    const started = performance.now();
    const diff = diffSpells(snap(pages(false)), snap(pages(true)));
    expect(performance.now() - started).toBeLessThan(1500);
    expect(diff.pages.every((d, i) => d.kind === 'changed' && d.from === i && d.to === i)).toBe(true);
  });

  it("a changed page's blocks, aligned the same way, and its layout", () => {
    const before = page('a', 'the second line', 'c');
    const after: JSONContent = { ...page('new', 'a', 'the second line, edited', 'c'), attrs: { marginTop: 0 } };
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

  // A: X → Y → W. C branches off Y with Z. B: X → p1, then merges C (M: p1 + Z). Going back from
  // M, X is reached before Y -- but Y is the most recent seal they share.
  it('is the most recent shared seal even with a merge in between, not the first one reached', () => {
    const history: Record<string, string[]> = { X: [], Y: ['X'], W: ['Y'], Z: ['Y'], p1: ['X'], M: ['p1', 'Z'] };
    expect(commonAncestor('W', 'M', id => history[id])).toBe('Y');
    expect(commonAncestor('M', 'W', id => history[id])).toBe('Y');
  });

  // With an older base, a change undone on one side looks one-sided and is lost without a
  // dissonance; with the right one, it's a dissonance (or taken), never silently dropped.
  it('merging from that seal keeps a change undone on one side', () => {
    const history: Record<string, string[]> = { X: [], Y: ['X'], W: ['Y'], Z: ['Y'], p1: ['X'], M: ['p1', 'Z'] };
    const states: Record<string, SpellSnapshot> = {
      X: snap([P1], { title: 'v0' }), Y: snap([P1], { title: 'v1' }),
      W: snap([P1], { title: 'v0' }), M: snap([P1], { title: 'v1' }),
    };
    const base = commonAncestor('W', 'M', id => history[id])!;
    expect(mergeSpells(states[base], states.W, states.M).merged.title).toBe('v0');
  });

  // Each line merged the other's work (criss-cross): two seals are equally recent.
  it('are all the most recent shared seals when there is more than one', () => {
    const history: Record<string, string[]> = { X: [], A1: ['X'], B1: ['X'], A2: ['A1', 'B1'], B2: ['B1', 'A1'] };
    expect(commonAncestors('A2', 'B2', id => history[id]).sort()).toEqual(['A1', 'B1']);
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
    const base = snap([P1, page('a', 'second part', 'third part')]);
    const ours = snap([P1, page('a', 'second part, ours', 'third part, edited')]);
    const theirs = snap([P1, page('a', 'second part, theirs')]);
    const { merged, dissonances } = mergeSpells(base, ours, theirs);
    expect(merged.pages[1]).toEqual(page('a', 'second part, ours', 'third part, edited'));
    expect(dissonances).toEqual([
      { part: 'block', page: 1, at: 1, base: p('second part'), ours: p('second part, ours'), theirs: p('second part, theirs') },
      { part: 'block', page: 1, at: 2, base: p('third part'), ours: p('third part, edited'), theirs: null },
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

describe('resolveMerge', () => {
  it('needs every dissonance resolved', () => {
    const merge = mergeSpells(snap([P1], { title: 'T' }), snap([P1], { title: 'Ours' }), snap([P1], { title: 'Theirs' }));
    expect(() => resolveMerge(merge, [])).toThrow(MergeResolutionError);
  });

  it('keeps ours or takes theirs, for details, the cover and the original pages', () => {
    const merge = mergeSpells(
      snap([P1], { title: 'T', author: 'Ann', cover: 'c0' }),
      snap([P1], { title: 'Ours', author: 'Ours A', cover: 'c-ours' }),
      snap([P1], { title: 'Theirs', author: 'Theirs A', cover: 'c-theirs' }),
    );
    const fields = merge.dissonances.map(d => (d.part === 'detail' ? d.field : d.part));
    expect(fields).toEqual(['title', 'author', 'cover']);
    const resolved = resolveMerge(merge, ['theirs', 'ours', 'theirs']);
    expect(resolved).toMatchObject({ title: 'Theirs', author: 'Ours A', cover: 'c-theirs' });
  });

  it('a page removed on one side and edited on the other: kept, or gone, where it was', () => {
    const edited = page('two, edited');
    // Ours removed it, theirs edited it.
    const removedOurs = mergeSpells(snap([P1, P2, P3]), snap([P1, P3]), snap([P1, edited, P3]));
    expect(resolveMerge(removedOurs, ['ours']).pages).toEqual([P1, P3]);
    expect(resolveMerge(removedOurs, ['theirs']).pages).toEqual([P1, edited, P3]);
    // Ours edited it, theirs removed it.
    const removedTheirs = mergeSpells(snap([P1, P2, P3]), snap([P1, edited, P3]), snap([P1, P3]));
    expect(resolveMerge(removedTheirs, ['ours']).pages).toEqual([P1, edited, P3]);
    expect(resolveMerge(removedTheirs, ['theirs']).pages).toEqual([P1, P3]);
  });

  it('a block changed on both sides: ours, theirs, or both (ours first)', () => {
    const merge = mergeSpells(snap([page('a', 'second part')]), snap([page('a', 'second part, ours')]), snap([page('a', 'second part, theirs')]));
    expect(canKeepBoth(merge.dissonances[0])).toBe(true);
    expect(resolveMerge(merge, ['theirs']).pages).toEqual([page('a', 'second part, theirs')]);
    expect(resolveMerge(merge, ['both']).pages).toEqual([page('a', 'second part, ours', 'second part, theirs')]);
  });

  it("a block removed on one side and edited on the other can't keep both", () => {
    const merge = mergeSpells(snap([page('a', 'third part')]), snap([page('a', 'third part, edited')]), snap([page('a')]));
    expect(canKeepBoth(merge.dissonances[0])).toBe(false);
    expect(() => resolveMerge(merge, ['both'])).toThrow(MergeResolutionError);
    expect(resolveMerge(merge, ['theirs']).pages).toEqual([page('a')]);
    expect(resolveMerge(merge, ['ours']).pages).toEqual([page('a', 'third part, edited')]);
  });

  it('resolves several blocks and pages together, each where it was', () => {
    const base = snap([P1, page('a', 'second part', 'third part'), P2, P3]);
    const ours = snap([P1, page('a', 'second part, ours', 'third part, ours'), P3]);
    const theirs = snap([P1, page('a', 'second part, theirs', 'third part, theirs'), page('two, edited'), P3]);
    const merge = mergeSpells(base, ours, theirs);
    expect(merge.dissonances.map(d => d.part)).toEqual(['page', 'block', 'block']);
    const resolved = resolveMerge(merge, ['theirs', 'both', 'theirs']);
    expect(resolved.pages).toEqual([P1, page('a', 'second part, ours', 'second part, theirs', 'third part, theirs'), page('two, edited'), P3]);
  });

  // Dissonances in the same place: one about what's there in the merge (ours kept it) and one
  // putting back in front of it what ours removed -- or several put back there. Every choice
  // comes out as chosen, each element where it was.
  describe('dissonances in the same place', () => {
    const ONE = 'The old house stood at the end of the lane, dark for many years.';
    const TWO = 'Nobody in the village remembered who had lived there before.';
    const THREE = 'Its door was painted white, and the paint was peeling off.';
    const FOUR = 'One winter night a light was seen in the upper window.';
    const edit = (text: string, side: string) => `${text} Edited by ${side}.`;
    type Choice = 'ours' | 'theirs' | 'both';
    // For each dissonance (by what it's about), what it leaves in the result for each choice.
    const check = (merge: ReturnType<typeof mergeSpells>, keyOf: (d: typeof merge.dissonances[number]) => string,
      leaves: Record<string, Partial<Record<Choice, unknown[]>>>, build: (parts: Record<string, unknown[]>) => unknown) => {
      const keys = merge.dissonances.map(keyOf);
      expect([...keys].sort()).toEqual(Object.keys(leaves).sort());
      const combos = keys.reduce<Choice[][]>((acc, key) =>
        acc.flatMap(combo => (Object.keys(leaves[key]) as Choice[]).map(choice => [...combo, choice])), [[]]);
      for (const combo of combos) {
        const parts = Object.fromEntries(keys.map((key, k) => [key, leaves[key][combo[k]]!]));
        expect({ combo, result: resolveMerge(merge, combo) }).toEqual({ combo, result: build(parts) });
      }
    };
    // What a dissonance is about: TWO or THREE, as its text starts.
    const textIn = (node: JSONContent): string => node.text ?? (node.content ?? []).map(textIn).join('');
    const about = (d: Parameters<typeof canKeepBoth>[0]) => (textIn(((d as { theirs: JSONContent | null }).theirs ?? (d as { ours: JSONContent }).ours)).startsWith(TWO) ? 'two' : 'three');

    it('a block ours removed and theirs edited, before one both edited', () => {
      const merge = mergeSpells(
        snap([page(ONE, TWO, THREE)]),
        snap([page(ONE, edit(THREE, 'ours'))]),
        snap([page(ONE, edit(TWO, 'theirs'), edit(THREE, 'theirs'))]),
      );
      check(merge, about, {
        two: { ours: [], theirs: [edit(TWO, 'theirs')] },
        three: { ours: [edit(THREE, 'ours')], theirs: [edit(THREE, 'theirs')], both: [edit(THREE, 'ours'), edit(THREE, 'theirs')] },
      }, parts => ({ ...merge.merged, pages: [page(ONE, ...(parts.two as string[]), ...(parts.three as string[]))] }));
    });

    it('a block ours removed and theirs edited, before one theirs removed and ours edited', () => {
      const merge = mergeSpells(
        snap([page(ONE, TWO, THREE)]),
        snap([page(ONE, edit(THREE, 'ours'))]),
        snap([page(ONE, edit(TWO, 'theirs'))]),
      );
      check(merge, about, {
        two: { ours: [], theirs: [edit(TWO, 'theirs')] },
        three: { ours: [edit(THREE, 'ours')], theirs: [] },
      }, parts => ({ ...merge.merged, pages: [page(ONE, ...(parts.two as string[]), ...(parts.three as string[]))] }));
    });

    it('several blocks ours removed and theirs edited, put back in their order', () => {
      const merge = mergeSpells(
        snap([page(ONE, TWO, THREE, FOUR)]),
        snap([page(ONE, FOUR)]),
        snap([page(ONE, edit(TWO, 'theirs'), edit(THREE, 'theirs'), FOUR)]),
      );
      check(merge, about, {
        two: { ours: [], theirs: [edit(TWO, 'theirs')] },
        three: { ours: [], theirs: [edit(THREE, 'theirs')] },
      }, parts => ({ ...merge.merged, pages: [page(ONE, ...(parts.two as string[]), ...(parts.three as string[]), FOUR)] }));
    });

    it('a page ours removed and theirs edited, before one theirs removed and ours edited', () => {
      const [p1, p2, p3] = [page(ONE), page(TWO), page(THREE)];
      const merge = mergeSpells(
        snap([p1, p2, p3]),
        snap([p1, page(edit(THREE, 'ours'))]),
        snap([p1, page(edit(TWO, 'theirs'))]),
      );
      check(merge, about, {
        two: { ours: [], theirs: [page(edit(TWO, 'theirs'))] },
        three: { ours: [page(edit(THREE, 'ours'))], theirs: [] },
      }, parts => ({ ...merge.merged, pages: [p1, ...parts.two, ...parts.three] }));
    });

    it('several pages ours removed and theirs edited, put back in their order', () => {
      const [p1, p2, p3, p4] = [page(ONE), page(TWO), page(THREE), page(FOUR)];
      const merge = mergeSpells(
        snap([p1, p2, p3, p4]),
        snap([p1, p4]),
        snap([p1, page(edit(TWO, 'theirs')), page(edit(THREE, 'theirs')), p4]),
      );
      check(merge, about, {
        two: { ours: [], theirs: [page(edit(TWO, 'theirs'))] },
        three: { ours: [], theirs: [page(edit(THREE, 'theirs'))] },
      }, parts => ({ ...merge.merged, pages: [p1, ...parts.two, ...parts.three, p4] }));
    });
  });
});
