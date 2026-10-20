import type { JSONContent } from '@tiptap/core';
import { alignByContent, mergeSequences, type MergeConflict } from './sequenceAlign';

// What two states of a spell differ in, and the three-way merge of two of them from their common
// ancestor -- pure: no UI, no storage. The states are a seal's files or the work not sealed yet,
// read into a SpellSnapshot by the caller.
//
// - Details field by field; tags as a set.
// - The cover and the original pages as a whole (each known by its content's hash).
// - Pages aligned by content: identical pages are anchors, so pages added, removed, moved and
//   changed are told apart, and a page inserted at the start doesn't mark the others changed.
//   Between two anchors, a page is paired with the one it's most like (words and images in
//   common), not merely the one in its place: a page inserted next to an edited one isn't taken
//   for it. A changed page is compared by its top-level blocks (paragraph, heading, image,
//   columns, box, table), aligned the same way.

export interface SpellSnapshot {
  title: string;
  description?: string;
  author?: string;
  language?: string;
  tags?: string[];
  // Its content's hash, or null when there's none.
  cover: string | null;
  originalPages: string | null;
  // Each a page (a doc node), as a seal's files write it (spellFormat's writeWork): its images
  // as spell-asset: references, not the images themselves. A page is compared whole by its
  // content, and a scanned spell's images in base64 would make that hundreds of MB each time.
  pages: JSONContent[];
}

export const DETAIL_FIELDS = ['title', 'description', 'author', 'language'] as const;
export type DetailField = typeof DETAIL_FIELDS[number];

// A node's identity: its content, written the same way every time (keys sorted).
const keyOf = (node: unknown): string => JSON.stringify(node, (_key, value) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map(k => [k, (value as Record<string, unknown>)[k]]))
    : value);

const blocksOf = (page: JSONContent): JSONContent[] => page.content ?? [];

// What a node holds, as words (and its images, each a "word"), to tell how alike two are.
const wordsOf = (node: JSONContent): string[] => {
  if (node.type === 'text') return (node.text ?? '').toLowerCase().split(/[\s\p{P}]+/u).filter(Boolean);
  if (node.type === 'image') return [`image:${String(node.attrs?.src ?? '')}`];
  return (node.content ?? []).flatMap(wordsOf);
};

// Each node's words, counted once: a gap compares every item with every other one, and
// reading a page's words again for each pair is what made a big gap slow.
interface WordCounts { counts: Map<string, number>; total: number }
const countedWords = new WeakMap<JSONContent, WordCounts>();
const wordCountsOf = (node: JSONContent): WordCounts => {
  let known = countedWords.get(node);
  if (!known) {
    const counts = new Map<string, number>();
    const words = wordsOf(node);
    for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
    known = { counts, total: words.length };
    countedWords.set(node, known);
  }
  return known;
};

// How alike two nodes are: the words they share over the words they have (Dice), 1 when both
// have none (two empty pages, or the same image).
const alike = (a: JSONContent, b: JSONContent): number => {
  const wa = wordCountsOf(a);
  const wb = wordCountsOf(b);
  if (!wa.total && !wb.total) return 1;
  const [small, large] = wa.counts.size <= wb.counts.size ? [wa.counts, wb.counts] : [wb.counts, wa.counts];
  let shared = 0;
  for (const [word, count] of small) shared += Math.min(count, large.get(word) ?? 0);
  return (2 * shared) / (wa.total + wb.total);
};
const layoutOf = (page: JSONContent): string => keyOf(page.attrs ?? {});

// ── Differences ──

export type BlockDiff =
  | { kind: 'same' | 'moved'; from: number; to: number }
  | { kind: 'changed'; from: number; to: number }
  | { kind: 'added'; to: number }
  | { kind: 'removed'; from: number };

export type PageDiff =
  | { kind: 'same' | 'moved'; from: number; to: number }
  | { kind: 'changed'; from: number; to: number; blocks: BlockDiff[]; layoutChanged: boolean }
  | { kind: 'added'; to: number }
  | { kind: 'removed'; from: number };

export interface SpellDiff {
  details: { field: DetailField; from?: string; to?: string }[];
  tags: { added: string[]; removed: string[] };
  cover: { from: string | null; to: string | null } | null;
  originalPages: { from: string | null; to: string | null } | null;
  // In the order of the newer state, each removed item where it was.
  pages: PageDiff[];
}

type Diffed = BlockDiff;

// Two sequences' differences, in `b`'s order, each removed item after the one before it in `a`.
const diffSequence = (a: JSONContent[], b: JSONContent[]): Diffed[] => {
  const { pairs, byFrom } = alignByContent(a.map(keyOf), b.map(keyOf), (i, j) => alike(a[i], b[j]));
  const order: { at: number; entry: Diffed }[] = pairs.map(pair => ({ at: pair.to, entry: { kind: pair.kind, from: pair.from, to: pair.to } as Diffed }));
  a.forEach((_, i) => {
    if (byFrom[i]) return;
    let at = -0.5;
    for (let p = i - 1; p >= 0; p--) { const pair = byFrom[p]; if (pair) { at = pair.to + 0.5; break; } }
    // Several removed after the same item keep their order (the sort is stable).
    order.push({ at, entry: { kind: 'removed', from: i } });
  });
  b.forEach((_, j) => { if (!pairs.some(pair => pair.to === j)) order.push({ at: j, entry: { kind: 'added', to: j } }); });
  return order.sort((x, y) => x.at - y.at).map(x => x.entry);
};

const tagSet = (tags?: string[]) => new Set(tags ?? []);

/** What `to` differs in from `from`. */
export function diffSpells(from: SpellSnapshot, to: SpellSnapshot): SpellDiff {
  const details = DETAIL_FIELDS
    .filter(field => (from[field] ?? '') !== (to[field] ?? ''))
    .map(field => ({ field, from: from[field], to: to[field] }));
  const fromTags = tagSet(from.tags);
  const toTags = tagSet(to.tags);
  const pages = diffSequence(from.pages, to.pages).map((entry): PageDiff => {
    if (entry.kind !== 'changed') return entry;
    const a = from.pages[entry.from];
    const b = to.pages[entry.to];
    return {
      ...entry,
      blocks: diffSequence(blocksOf(a), blocksOf(b)),
      layoutChanged: layoutOf(a) !== layoutOf(b),
    };
  });
  return {
    details,
    tags: { added: [...toTags].filter(tag => !fromTags.has(tag)), removed: [...fromTags].filter(tag => !toTags.has(tag)) },
    cover: from.cover !== to.cover ? { from: from.cover, to: to.cover } : null,
    originalPages: from.originalPages !== to.originalPages ? { from: from.originalPages, to: to.originalPages } : null,
    pages,
  };
}

/** Whether nothing differs. */
export const isSameSpell = (a: SpellSnapshot, b: SpellSnapshot): boolean => {
  const diff = diffSpells(a, b);
  return !diff.details.length && !diff.tags.added.length && !diff.tags.removed.length && !diff.cover && !diff.originalPages
    && diff.pages.every(page => page.kind === 'same');
};

// ── Common ancestor ──

// A seal and every seal it comes from, nearest first.
const lineOf = (from: readonly string[], parentsOf: (id: string) => readonly string[] | undefined): string[] => {
  const seen = new Set<string>();
  const queue = [...from];
  const line: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    line.push(id);
    queue.push(...(parentsOf(id) ?? []));
  }
  return line;
};

/**
 * The most recent seals two seals have in common (as git's merge-base): every seal both come
 * from, but none that another of them comes from too. Usually one; more when each line merged
 * the other's work ("criss-cross"). Not simply the first shared seal reached walking back from
 * one side: past a merge that can be an older one, and merging from it loses changes silently.
 */
export function commonAncestors(a: string, b: string, parentsOf: (id: string) => readonly string[] | undefined): string[] {
  const ofA = new Set(lineOf([a], parentsOf));
  const shared = lineOf([b], parentsOf).filter(id => ofA.has(id));
  // What any shared seal comes from: older than it, so not among the most recent.
  const older = new Set(lineOf(shared.flatMap(id => parentsOf(id) ?? []), parentsOf));
  return shared.filter(id => !older.has(id));
}

/**
 * The most recent seal two seals have in common (one of them, if it's the other's ancestor);
 * of several (see commonAncestors), the one nearest `b`. null: none.
 */
export function commonAncestor(a: string, b: string, parentsOf: (id: string) => readonly string[] | undefined): string | null {
  return commonAncestors(a, b, parentsOf)[0] ?? null;
}

/** Whether `ancestor` is `seal` itself or one of the seals it comes from. */
export const isAncestor = (ancestor: string, seal: string, parentsOf: (id: string) => readonly string[] | undefined): boolean =>
  commonAncestor(ancestor, seal, parentsOf) === ancestor;

// ── Three-way merge ──

// The same part changed differently on each side. `ours` is what the merge holds for now.
export type Dissonance =
  | { part: 'detail'; field: DetailField; base?: string; ours?: string; theirs?: string }
  | { part: 'cover' | 'originalPages'; base: string | null; ours: string | null; theirs: string | null }
  // A page removed on one side and changed on the other (null: removed there). `at`: where it
  // is (or would go) in the merged pages.
  | { part: 'page'; at: number; base: JSONContent; ours: JSONContent | null; theirs: JSONContent | null }
  // A block changed differently on each side, or removed on one and changed on the other: in
  // merged page `page`, at block `at`.
  | { part: 'block'; page: number; at: number; base: JSONContent; ours: JSONContent | null; theirs: JSONContent | null }
  // A page's layout (its size and margins) changed differently on each side.
  | { part: 'pageLayout'; page: number; base: JSONContent['attrs']; ours: JSONContent['attrs']; theirs: JSONContent['attrs'] };

export interface SpellMerge {
  // The merged state: everything taken that merges, ours wherever there's a dissonance.
  merged: SpellSnapshot;
  dissonances: Dissonance[];
}

// A value changed on one side only, or the same on both, is taken; changed differently, it's a
// dissonance (ours kept).
const mergeValue = <V,>(base: V, ours: V, theirs: V, same: (a: V, b: V) => boolean = (a, b) => a === b) => {
  if (same(ours, theirs)) return { value: ours, dissonant: false };
  if (same(base, ours)) return { value: theirs, dissonant: false };
  if (same(base, theirs)) return { value: ours, dissonant: false };
  return { value: ours, dissonant: true };
};

/**
 * Merges `theirs` into `ours`, both from `base` (their common ancestor): what changed on one
 * side only and what changed the same is taken; what changed differently on each side comes
 * back as dissonances, ours held for now.
 */
export function mergeSpells(base: SpellSnapshot, ours: SpellSnapshot, theirs: SpellSnapshot): SpellMerge {
  const dissonances: Dissonance[] = [];
  const merged: SpellSnapshot = { ...ours };

  for (const field of DETAIL_FIELDS) {
    const result = mergeValue(base[field] ?? '', ours[field] ?? '', theirs[field] ?? '');
    if (field === 'title') merged.title = result.value;
    else merged[field] = result.value || undefined;
    if (result.dissonant) dissonances.push({ part: 'detail', field, base: base[field], ours: ours[field], theirs: theirs[field] });
  }

  // Tags as a set: each side's additions added and removals removed.
  const baseTags = tagSet(base.tags);
  const oursTags = tagSet(ours.tags);
  const theirsTags = tagSet(theirs.tags);
  const tags = [...(ours.tags ?? [])];
  for (const tag of theirs.tags ?? []) if (!baseTags.has(tag) && !oursTags.has(tag)) tags.push(tag);
  merged.tags = tags.filter(tag => !(baseTags.has(tag) && !theirsTags.has(tag)));
  if (!merged.tags.length && !ours.tags) merged.tags = undefined;

  for (const part of ['cover', 'originalPages'] as const) {
    const result = mergeValue(base[part], ours[part], theirs[part]);
    merged[part] = result.value;
    if (result.dissonant) dissonances.push({ part, base: base[part], ours: ours[part], theirs: theirs[part] });
  }

  // Pages; a page changed on both sides is merged by its blocks (and its layout).
  const blockDissonances: { page: number; conflicts: MergeConflict<JSONContent>[] }[] = [];
  const layoutDissonances: Dissonance[] = [];
  const pages = mergeSequences(base.pages, ours.pages, theirs.pages, keyOf, (basePage, oursPage, theirsPage, at) => {
    const blocks = mergeSequences(blocksOf(basePage), blocksOf(oursPage), blocksOf(theirsPage), keyOf,
      (_b, oursBlock) => ({ item: oursBlock, conflict: true }), alike);
    if (blocks.conflicts.length) blockDissonances.push({ page: at, conflicts: blocks.conflicts });
    const layout = mergeValue(basePage.attrs ?? {}, oursPage.attrs ?? {}, theirsPage.attrs ?? {}, (a, b) => keyOf(a) === keyOf(b));
    if (layout.dissonant) layoutDissonances.push({ part: 'pageLayout', page: at, base: basePage.attrs, ours: oursPage.attrs, theirs: theirsPage.attrs });
    const page: JSONContent = { ...oursPage, content: blocks.items };
    if (Object.keys(layout.value).length || oursPage.attrs) page.attrs = layout.value;
    return { item: page, conflict: false };
  }, alike);
  merged.pages = pages.items;
  for (const conflict of pages.conflicts) {
    dissonances.push({ part: 'page', at: conflict.at, base: conflict.base, ours: conflict.ours, theirs: conflict.theirs });
  }
  for (const { page, conflicts } of blockDissonances) {
    for (const conflict of conflicts) dissonances.push({ part: 'block', page, at: conflict.at, base: conflict.base, ours: conflict.ours, theirs: conflict.theirs });
  }
  dissonances.push(...layoutDissonances);

  return { merged, dissonances };
}

// ── Resolving dissonances ──

// How a dissonance is resolved: keep ours, keep theirs, or (a block changed on both sides)
// keep both, ours first.
export type Resolution = 'ours' | 'theirs' | 'both';

/** Whether a dissonance can keep both sides: a block changed differently on each side. */
export const canKeepBoth = (dissonance: Dissonance): boolean =>
  dissonance.part === 'block' && dissonance.ours !== null && dissonance.theirs !== null;

export class MergeResolutionError extends Error {}

/**
 * The merged state with each dissonance resolved as chosen (`resolutions[i]` for
 * `merge.dissonances[i]`). Every one needs a resolution: nothing is merged with a dissonance
 * left open.
 */
export function resolveMerge(merge: SpellMerge, resolutions: (Resolution | undefined)[]): SpellSnapshot {
  const { dissonances } = merge;
  if (dissonances.some((_, i) => !resolutions[i])) throw new MergeResolutionError('Every dissonance needs a resolution.');
  dissonances.forEach((dissonance, i) => {
    if (resolutions[i] === 'both' && !canKeepBoth(dissonance)) throw new MergeResolutionError('Only a block changed on both sides can keep both.');
  });

  const result: SpellSnapshot = { ...merge.merged, pages: merge.merged.pages.map(page => ({ ...page, content: [...(page.content ?? [])] })) };
  const indexed = dissonances.map((dissonance, i) => ({ dissonance, resolution: resolutions[i]!, i }));

  for (const { dissonance, resolution } of indexed) {
    if (resolution === 'ours') continue;
    if (dissonance.part === 'detail') {
      if (dissonance.field === 'title') result.title = dissonance.theirs ?? '';
      else result[dissonance.field] = dissonance.theirs || undefined;
    } else if (dissonance.part === 'cover' || dissonance.part === 'originalPages') {
      result[dissonance.part] = dissonance.theirs;
    } else if (dissonance.part === 'pageLayout') {
      result.pages[dissonance.page] = { ...result.pages[dissonance.page], attrs: dissonance.theirs };
    }
  }

  // Blocks, then pages: a block's place is in the merged pages as they are, before pages are
  // put in or taken out. Last place first, so an earlier one stays where it is. In one place,
  // what's there already (replaced, taken out, kept with theirs after it) goes before what's
  // put back in front of it (removed on our side), and those put back the last one first, so
  // they end up in their order.
  const putBack = (d: { ours: unknown }) => d.ours === null;
  const byPlace = <T extends { at: number; i: number; dissonance: { ours: unknown } }>(items: T[]) => [...items].sort((a, b) =>
    b.at - a.at || Number(putBack(a.dissonance)) - Number(putBack(b.dissonance)) || b.i - a.i);
  const blocks = indexed.filter((x): x is { dissonance: Extract<Dissonance, { part: 'block' }>; resolution: Resolution; i: number } => x.dissonance.part === 'block');
  for (const { dissonance, resolution } of byPlace(blocks.map(x => ({ ...x, at: x.dissonance.page * 1e6 + x.dissonance.at })))) {
    if (resolution === 'ours') continue;
    const content = result.pages[dissonance.page].content!;
    if (resolution === 'both') content.splice(dissonance.at + 1, 0, dissonance.theirs!);
    // Ours removed it: theirs goes where it was. Theirs removed it: it goes. Else theirs instead.
    else if (dissonance.ours === null) content.splice(dissonance.at, 0, dissonance.theirs!);
    else if (dissonance.theirs === null) content.splice(dissonance.at, 1);
    else content[dissonance.at] = dissonance.theirs;
  }
  const pages = indexed.filter((x): x is { dissonance: Extract<Dissonance, { part: 'page' }>; resolution: Resolution; i: number } => x.dissonance.part === 'page');
  for (const { dissonance, resolution } of byPlace(pages.map(x => ({ ...x, at: x.dissonance.at })))) {
    if (resolution === 'ours') continue;
    if (dissonance.ours === null) result.pages.splice(dissonance.at, 0, dissonance.theirs!);
    else result.pages.splice(dissonance.at, 1);
  }
  return result;
}

