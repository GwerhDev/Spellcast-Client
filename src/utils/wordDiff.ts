import type { JSONContent } from '@tiptap/core';
import { alignByContent } from './sequenceAlign';

// A block's text, as it reads: its text nodes in order, a line break where the block breaks a
// line, each nested block (a list item, a column) on a line of its own. Images have no text.
export const textOf = (node: JSONContent): string => {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak') return '\n';
  const parts = (node.content ?? []).map(textOf);
  const nested = (node.content ?? []).some(child => child.content && child.type !== 'text');
  return parts.join(nested ? '\n' : '');
};

export interface WordSegment {
  text: string;
  kind: 'same' | 'added' | 'removed';
}

// Words and the spaces between them, each its own token (so a change of spacing alone shows).
const tokens = (text: string) => text.split(/(\s+)/).filter(Boolean);

/**
 * What `to` changed from `from`, word by word: the words both keep (in order) as they are, the
 * ones taken out before the ones put in where they differ.
 */
export function wordDiff(from: string, to: string): WordSegment[] {
  const a = tokens(from);
  const b = tokens(to);
  const kept = alignByContent(a, b).pairs.filter(pair => pair.kind === 'same').sort((p, q) => p.from - q.from);
  const segments: WordSegment[] = [];
  const push = (text: string, kind: WordSegment['kind']) => {
    const last = segments[segments.length - 1];
    if (last && last.kind === kind) last.text += text;
    else segments.push({ text, kind });
  };
  let i = 0;
  let j = 0;
  for (const pair of [...kept, { from: a.length, to: b.length }]) {
    for (; i < pair.from; i++) push(a[i], 'removed');
    for (; j < pair.to; j++) push(b[j], 'added');
    if (i < a.length && j < b.length) { push(a[i], 'same'); i++; j++; }
  }
  return segments;
}
