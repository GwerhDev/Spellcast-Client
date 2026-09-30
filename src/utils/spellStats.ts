// Reading figures derived from a spell's stored pages (a JSON array of HTML strings), for
// the spell detail. Pure: no DOM, so it runs the same in tests and in the app.

// A comfortable text-to-speech pace; the estimate is a rough guide, not a timer.
export const WORDS_PER_MINUTE = 160;

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ');

// Words across every page; null when the pages can't be read (unprocessed or malformed).
export const countSpellWords = (pagesContent: string | undefined): number | null => {
  if (!pagesContent) return null;
  let pages: unknown;
  try { pages = JSON.parse(pagesContent); } catch { return null; }
  if (!Array.isArray(pages)) return null;
  return pages.reduce<number>((total, page) => {
    if (typeof page !== 'string') return total;
    const words = stripHtml(page).split(/\s+/).filter(word => /[\p{L}\p{N}]/u.test(word));
    return total + words.length;
  }, 0);
};

// Whole minutes it takes to listen to `words` at WORDS_PER_MINUTE (at least 1 for any text).
export const estimateListeningMinutes = (words: number): number =>
  words <= 0 ? 0 : Math.max(1, Math.round(words / WORDS_PER_MINUTE));
