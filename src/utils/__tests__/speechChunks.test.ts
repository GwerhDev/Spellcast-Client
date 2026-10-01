import { describe, it, expect } from 'vitest';
import {
  splitIntoSpeechChunks, speechChunkBudget,
  DEFAULT_CHARS_PER_SECOND, TARGET_CHUNK_SECONDS, MIN_CHUNK_CHARS, MAX_CHUNK_CHARS,
} from '../speechChunks';

const words = (n: number, prefix = 'w') => Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`).join(' ');

describe('speechChunkBudget', () => {
  it('sizes a piece to take the target time at the voice\'s pace', () => {
    expect(speechChunkBudget(14)).toBe(14 * TARGET_CHUNK_SECONDS);
  });

  it('before the voice is timed, uses a pace slow voices keep up with', () => {
    expect(speechChunkBudget()).toBe(DEFAULT_CHARS_PER_SECOND * TARGET_CHUNK_SECONDS);
  });

  it('stays within its bounds, however fast or slow the voice', () => {
    expect(speechChunkBudget(1)).toBe(MIN_CHUNK_CHARS);
    expect(speechChunkBudget(500)).toBe(MAX_CHUNK_CHARS);
  });
});

describe('splitIntoSpeechChunks', () => {
  it('leaves a sentence short enough as it is', () => {
    expect(splitIntoSpeechChunks('A short sentence.', 80)).toEqual(['A short sentence.']);
  });

  it('has nothing to say for an empty one', () => {
    expect(splitIntoSpeechChunks('   ')).toEqual([]);
  });

  it('splits a long sentence into pieces within the budget, losing no word', () => {
    const text = words(100);
    const chunks = splitIntoSpeechChunks(text, 80);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach(chunk => expect(chunk.length).toBeLessThanOrEqual(80));
    expect(chunks.join(' ')).toBe(text);
  });

  it('a faster voice gets bigger pieces: fewer of them', () => {
    const text = words(100);
    expect(splitIntoSpeechChunks(text, 160).length).toBeLessThan(splitIntoSpeechChunks(text, 80).length);
  });

  it('never leaves a piece too short to stand on its own', () => {
    // Just over the budget: the cut is moved back so the last piece isn't a word or two.
    const text = words(22);
    const chunks = splitIntoSpeechChunks(text, text.length - 3);
    chunks.forEach(chunk => expect(chunk.length).toBeGreaterThanOrEqual(Math.round((text.length - 3) * 0.3)));
  });

  it('cuts where a reader would breathe: after a clause before a comma', () => {
    const ws = words(40).split(' ');
    ws[6] += ',';
    ws[9] += ';';
    ws[13] += ',';
    const [first] = splitIntoSpeechChunks(ws.join(' '), 80);
    expect(first.endsWith('w10;')).toBe(true);
  });

  it('takes the latest comma within reach when there is no stronger break', () => {
    const ws = words(40).split(' ');
    ws[6] += ',';
    ws[13] += ',';
    const [first] = splitIntoSpeechChunks(ws.join(' '), 80);
    expect(first.endsWith('w14,')).toBe(true);
  });

  it('a dash standing between two words is a clause break too', () => {
    const ws = words(40).split(' ');
    ws.splice(10, 0, '-');
    ws[13] += ',';
    const [first] = splitIntoSpeechChunks(ws.join(' '), 80);
    expect(first.endsWith('w10 -')).toBe(true);
  });

  it('with no punctuation at all, cuts between two words', () => {
    const chunks = splitIntoSpeechChunks(words(40), 80);
    expect(chunks.every(chunk => /^w\d+( w\d+)*$/.test(chunk))).toBe(true);
  });

  it('a single word longer than the budget is a piece of its own, never cut', () => {
    const long = 'x'.repeat(120);
    const chunks = splitIntoSpeechChunks(`${words(10)} ${long} ${words(10, 'y')}`, 80);
    expect(chunks).toContain(long);
  });
});
