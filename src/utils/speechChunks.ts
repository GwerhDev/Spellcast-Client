// Chrome's speech engine freezes after about 15s of one utterance speaking without a break.
// A sentence spoken as a few shorter utterances never gets there: each one starts the count
// over. This splits a long sentence into pieces short enough for that (well under 15s at a
// normal reading pace), cut where a reader would breathe -- after a semicolon, colon, dash
// or comma -- and otherwise between two words, never inside one.

// At most this many words in a piece: about 10s at a usual 2.5-3 words a second.
export const MAX_CHUNK_WORDS = 28;
// No piece shorter than this, so a cut never leaves a word or two hanging on their own.
export const MIN_CHUNK_WORDS = 6;

// Where to cut, best first: the end of a clause, then of a phrase.
const STRONG_BREAK = /[;:—–]$|\s-$/;
const SOFT_BREAK = /[,)\]]$/;

export const splitIntoSpeechChunks = (
  text: string,
  maxWords = MAX_CHUNK_WORDS,
  minWords = MIN_CHUNK_WORDS,
): string[] => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim() ? [text.trim()] : [];

  const chunks: string[] = [];
  let rest = words;
  while (rest.length > maxWords) {
    // A cut after word `i` keeps words[0..i]; both sides at least minWords long.
    const last = Math.min(maxWords, rest.length - minWords) - 1;
    const first = minWords - 1;
    const cutAfter = (pattern: RegExp) => {
      for (let i = last; i >= first; i--) if (pattern.test(rest[i])) return i;
      return -1;
    };
    let at = cutAfter(STRONG_BREAK);
    if (at < 0) at = cutAfter(SOFT_BREAK);
    if (at < 0) at = Math.max(first, last);
    chunks.push(rest.slice(0, at + 1).join(' '));
    rest = rest.slice(at + 1);
  }
  if (rest.length) chunks.push(rest.join(' '));
  return chunks;
};
