// Chrome's speech engine freezes after about 15s of one utterance speaking without a break.
// A sentence spoken as a few shorter utterances never gets there: each one starts the count
// over. This splits a long sentence into pieces that take well under that to say, cut where
// a reader would breathe -- after a semicolon, colon, dash or comma -- and otherwise between
// two words, never inside one.
//
// How long a piece takes depends on the voice (and the words), so its size is a budget in
// characters -- which tracks speaking time far better than a word count -- that the player
// sizes from how fast the voice in use actually speaks (see speechChunkBudget).

// How long a piece should take to say: under the ~15s freeze with room to spare for any voice,
// yet long enough that most sentences are said whole and a long one is cut only a few times.
export const TARGET_CHUNK_SECONDS = 12;
// Before the voice in use has been timed: a pace slow voices still keep up with.
export const DEFAULT_CHARS_PER_SECOND = 11;
// No budget outside these, however fast or slow a voice turns out to be.
export const MIN_CHUNK_CHARS = 90;
export const MAX_CHUNK_CHARS = 320;
// No piece shorter than this share of the budget, so a cut never leaves a word or two
// hanging on their own.
const MIN_SHARE = 0.3;

// Where to cut, best first: the end of a clause, then of a phrase.
const STRONG_BREAK = /[;:—–]$|^-$/;
const SOFT_BREAK = /[,)\]]$/;

// The size of a piece, in characters, for a voice speaking this many characters a second.
export const speechChunkBudget = (charsPerSecond = DEFAULT_CHARS_PER_SECOND) =>
  Math.round(Math.min(MAX_CHUNK_CHARS, Math.max(MIN_CHUNK_CHARS, charsPerSecond * TARGET_CHUNK_SECONDS)));

export const splitIntoSpeechChunks = (text: string, maxChars = speechChunkBudget()): string[] => {
  const clean = text.trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const minChars = Math.round(maxChars * MIN_SHARE);
  const chunks: string[] = [];
  let rest = clean.split(/\s+/);
  while (rest.join(' ').length > maxChars) {
    // The places a piece could end: after word i, with the piece within the budget and
    // neither it nor what's left too short.
    const total = rest.join(' ').length;
    const candidates: number[] = [];
    let length = -1;
    for (let i = 0; i < rest.length - 1; i++) {
      length += rest[i].length + 1;
      if (length > maxChars) break;
      if (length >= minChars && total - length - 1 >= minChars) candidates.push(i);
    }
    const latest = (pattern: RegExp) => [...candidates].reverse().find(i => pattern.test(rest[i]));
    // With no place within the budget (a very long word), the piece ends after its first word.
    const at = latest(STRONG_BREAK) ?? latest(SOFT_BREAK) ?? candidates.at(-1) ?? 0;
    chunks.push(rest.slice(0, at + 1).join(' '));
    rest = rest.slice(at + 1);
  }
  if (rest.length) chunks.push(rest.join(' '));
  return chunks;
};
