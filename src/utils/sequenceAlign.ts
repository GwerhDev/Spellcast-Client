// Two sequences aligned by content, and three merged: what spell pages and the blocks of a page
// are compared and merged with (see spellDiff). Items are known by a key (their content): equal
// keys are the same item, wherever they sit.
//
// Aligning `a` to `b`:
//   1. the longest run of items equal in both, in order, are anchors ("same"), as the lines git
//      keeps: inserting an item at the start doesn't touch the others;
//   2. an item left over on both sides with the same content moved ("moved");
//   3. what's left between two anchors is paired by position ("changed"), the rest is added to
//      `b` or removed from `a`.

export type AlignKind = 'same' | 'moved' | 'changed';

export interface AlignedPair {
  kind: AlignKind;
  from: number;
  to: number;
}

export interface Alignment {
  pairs: AlignedPair[];
  // Each `a` index's pair (null: removed); each `b` index's pair (null: added).
  byFrom: (AlignedPair | null)[];
  byTo: (AlignedPair | null)[];
}

// The longest common subsequence's index pairs (Myers' O((N+M)D) diff), common start and end
// taken off first.
const commonPairs = (a: string[], b: string[]): [number, number][] => {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }

  const pairs: [number, number][] = [];
  for (let i = 0; i < start; i++) pairs.push([i, i]);
  for (const [i, j] of myers(a.slice(start, endA), b.slice(start, endB))) pairs.push([i + start, j + start]);
  for (let k = 0; endA + k < a.length; k++) pairs.push([endA + k, endB + k]);
  return pairs;
};

const myers = (a: string[], b: string[]): [number, number][] => {
  const n = a.length;
  const m = b.length;
  if (n === 0 || m === 0) return [];
  const max = n + m;
  const offset = max;
  const v = new Int32Array(2 * max + 2);
  // Each step's furthest x per diagonal, kept to walk back the path.
  const trace: Int32Array[] = [];
  let end = -1;
  for (let d = 0; d <= max && end < 0; d++) {
    trace.push(v.slice(offset - d, offset + d + 2));
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]) ? v[offset + k + 1] : v[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) { x++; y++; }
      v[offset + k] = x;
      if (x >= n && y >= m) { end = d; break; }
    }
  }
  // Walk back from the end, keeping the diagonal runs (matches).
  const pairs: [number, number][] = [];
  let x = n;
  let y = m;
  for (let d = end; d >= 0; d--) {
    const prev = trace[d];
    const at = (k: number) => prev[k + d];
    const k = x - y;
    const prevK = k === -d || (k !== d && at(k - 1) < at(k + 1)) ? k + 1 : k - 1;
    const prevX = d === 0 ? 0 : at(prevK);
    const prevY = d === 0 ? 0 : prevX - prevK;
    while (x > prevX && y > prevY) { x--; y--; pairs.push([x, y]); }
    x = prevX;
    y = prevY;
  }
  return pairs.reverse();
};

/** Aligns `a` to `b` by their items' keys (see the top of this file). */
export function alignByContent(a: string[], b: string[]): Alignment {
  const byFrom: (AlignedPair | null)[] = a.map(() => null);
  const byTo: (AlignedPair | null)[] = b.map(() => null);
  const pairs: AlignedPair[] = [];
  const link = (kind: AlignKind, from: number, to: number) => {
    const pair = { kind, from, to };
    pairs.push(pair);
    byFrom[from] = pair;
    byTo[to] = pair;
  };

  const anchors = commonPairs(a, b);
  for (const [i, j] of anchors) link('same', i, j);

  // Moved: left over on both sides with the same content (the first ones first).
  const leftover = new Map<string, number[]>();
  b.forEach((key, j) => { if (!byTo[j]) leftover.set(key, [...(leftover.get(key) ?? []), j]); });
  a.forEach((key, i) => {
    if (byFrom[i]) return;
    const j = leftover.get(key)?.shift();
    if (j !== undefined) link('moved', i, j);
  });

  // Changed: what's left between two anchors, paired by position.
  const bounds: [number, number][] = [[-1, -1], ...anchors, [a.length, b.length]];
  for (let g = 0; g + 1 < bounds.length; g++) {
    const [fromA, fromB] = bounds[g];
    const [toA, toB] = bounds[g + 1];
    const gapA: number[] = [];
    const gapB: number[] = [];
    for (let i = fromA + 1; i < toA; i++) if (!byFrom[i]) gapA.push(i);
    for (let j = fromB + 1; j < toB; j++) if (!byTo[j]) gapB.push(j);
    for (let p = 0; p < Math.min(gapA.length, gapB.length); p++) link('changed', gapA[p], gapB[p]);
  }

  pairs.sort((p, q) => p.to - q.to);
  return { pairs, byFrom, byTo };
}

// ── Three-way merge ──

export type MergeConflictKind =
  // Changed differently on each side.
  | 'changedBoth'
  // Removed on one side, changed on the other.
  | 'removedChanged';

export interface MergeConflict<T> {
  kind: MergeConflictKind;
  // Where it is in the merged items (ours, kept for now) or would go (when ours removed it).
  at: number;
  base: T;
  // null: removed on that side.
  ours: T | null;
  theirs: T | null;
}

export interface SequenceMerge<T> {
  // The merged items, ours kept where they conflict.
  items: T[];
  conflicts: MergeConflict<T>[];
}

type Slot =
  | { from: 'base'; i: number }
  | { from: 'ours'; j: number }
  | { from: 'theirs'; j: number };

/**
 * Merges `ours` and `theirs`, both changed from `base`: what changed on one side only is taken,
 * what changed the same on both too; an item changed differently on each side goes to
 * `bothChanged` (which merges it, or says it can't); one removed on one side and changed on the
 * other is a conflict. Order: ours, with theirs' additions and moves placed after the item
 * before them in theirs.
 */
export function mergeSequences<T>(
  base: T[], ours: T[], theirs: T[], key: (item: T) => string,
  bothChanged: (base: T, ours: T, theirs: T, at: number) => { item: T; conflict: boolean },
): SequenceMerge<T> {
  const baseKeys = base.map(key);
  const toOurs = alignByContent(baseKeys, ours.map(key));
  const toTheirs = alignByContent(baseKeys, theirs.map(key));

  // Ours' order: its items from base, and its additions.
  const slots: Slot[] = ours.map((_, j) => {
    const pair = toOurs.byTo[j];
    return pair ? { from: 'base', i: pair.from } : { from: 'ours', j };
  });
  const slotOf = (i: number) => slots.findIndex(slot => slot.from === 'base' && slot.i === i);

  // An item ours removed but theirs changed stays as a placeholder (where it was), for the
  // conflict to say where theirs would go.
  const removedOurs = new Set<number>();
  base.forEach((_, i) => {
    if (toOurs.byFrom[i] || toTheirs.byFrom[i]?.kind !== 'changed') return;
    removedOurs.add(i);
    let before = -1;
    for (let p = i - 1; p >= 0 && before < 0; p--) before = slotOf(p);
    slots.splice(before + 1, 0, { from: 'base', i });
  });

  // Theirs' additions and theirs-only moves, after the item before them in theirs.
  const placeAfterTheirsPredecessor = (j: number, slot: Slot) => {
    let at = 0;
    for (let k = j - 1; k >= 0; k--) {
      const pair = toTheirs.byTo[k];
      const index = pair ? slotOf(pair.from) : slots.findIndex(s => s.from === 'theirs' && s.j === k);
      if (index >= 0) { at = index + 1; break; }
    }
    slots.splice(at, 0, slot);
  };
  const oursAdded = new Set(ours.filter((_, j) => !toOurs.byTo[j]).map(key));
  theirs.forEach((item, j) => {
    const pair = toTheirs.byTo[j];
    if (!pair) {
      // Added the same on both sides: once.
      if (!oursAdded.has(key(item))) placeAfterTheirsPredecessor(j, { from: 'theirs', j });
      return;
    }
    if (pair.kind === 'moved' && toOurs.byFrom[pair.from]?.kind === 'same') {
      const index = slotOf(pair.from);
      if (index >= 0) slots.splice(index, 1);
      placeAfterTheirsPredecessor(j, { from: 'base', i: pair.from });
    }
  });

  const items: T[] = [];
  const conflicts: MergeConflict<T>[] = [];
  for (const slot of slots) {
    if (slot.from === 'ours') { items.push(ours[slot.j]); continue; }
    if (slot.from === 'theirs') { items.push(theirs[slot.j]); continue; }
    const i = slot.i;
    const o = toOurs.byFrom[i];
    const t = toTheirs.byFrom[i];
    const oursItem = o ? (o.kind === 'changed' ? ours[o.to] : base[i]) : null;
    const theirsItem = t ? (t.kind === 'changed' ? theirs[t.to] : base[i]) : null;
    if (removedOurs.has(i)) {
      conflicts.push({ kind: 'removedChanged', at: items.length, base: base[i], ours: null, theirs: theirsItem });
      continue;
    }
    if (!t) {
      // Removed in theirs: gone, unless ours changed it.
      if (o?.kind === 'changed') {
        conflicts.push({ kind: 'removedChanged', at: items.length, base: base[i], ours: oursItem, theirs: null });
        items.push(oursItem!);
      }
      continue;
    }
    const oursChanged = o?.kind === 'changed';
    const theirsChanged = t.kind === 'changed';
    if (!oursChanged && !theirsChanged) items.push(base[i]);
    else if (!theirsChanged) items.push(oursItem!);
    else if (!oursChanged) items.push(theirsItem!);
    else if (key(oursItem!) === key(theirsItem!)) items.push(oursItem!);
    else {
      const at = items.length;
      const merged = bothChanged(base[i], oursItem!, theirsItem!, at);
      if (merged.conflict) conflicts.push({ kind: 'changedBoth', at, base: base[i], ours: oursItem, theirs: theirsItem });
      items.push(merged.item);
    }
  }
  return { items, conflicts };
}
