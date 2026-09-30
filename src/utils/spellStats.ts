// Reading figures derived from a spell's stored pages, for the spell detail. Pages are
// stored as a JSON array of Tiptap documents (see SpellUploadWorker/SpellEditForm); a plain
// HTML string is still read, in case an older record kept one. Pure: no DOM, so it runs
// the same in tests and in the app.

// A comfortable text-to-speech pace; the estimate is a rough guide, not a timer.
export const WORDS_PER_MINUTE = 160;

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ');

interface PageNode {
  type?: string;
  text?: string;
  content?: unknown;
}

// A Tiptap node's text: text nodes as-is, siblings joined directly (marks split a word
// into several text nodes), and every other node closed with a space so blocks, list items
// and hard breaks never glue two words together.
const nodeText = (node: unknown): string => {
  if (!node || typeof node !== 'object') return '';
  const { type, text, content } = node as PageNode;
  if (type === 'text') return typeof text === 'string' ? text : '';
  const inner = Array.isArray(content) ? content.map(nodeText).join('') : '';
  return `${inner} `;
};

const pageText = (page: unknown): string =>
  typeof page === 'string' ? stripHtml(page) : nodeText(page);

// Words across every page; null when the pages can't be read (unprocessed or malformed).
export const countSpellWords = (pagesContent: string | undefined): number | null => {
  if (!pagesContent) return null;
  let pages: unknown;
  try { pages = JSON.parse(pagesContent); } catch { return null; }
  if (!Array.isArray(pages)) return null;
  return pages.reduce<number>((total, page) => {
    const words = pageText(page).split(/\s+/).filter(word => /[\p{L}\p{N}]/u.test(word));
    return total + words.length;
  }, 0);
};

// Whole minutes it takes to listen to `words` at WORDS_PER_MINUTE (at least 1 for any text).
export const estimateListeningMinutes = (words: number): number =>
  words <= 0 ? 0 : Math.max(1, Math.round(words / WORDS_PER_MINUTE));
