import { describe, it, expect } from 'vitest';
import { splitIntoSpeechChunks, MAX_CHUNK_WORDS, MIN_CHUNK_WORDS } from '../speechChunks';

const words = (n: number, prefix = 'w') => Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`).join(' ');
const count = (chunk: string) => chunk.split(' ').length;

describe('splitIntoSpeechChunks', () => {
  it('leaves a sentence short enough as it is', () => {
    expect(splitIntoSpeechChunks('A short sentence.')).toEqual(['A short sentence.']);
    expect(splitIntoSpeechChunks(words(MAX_CHUNK_WORDS))).toHaveLength(1);
  });

  it('has nothing to say for an empty one', () => {
    expect(splitIntoSpeechChunks('   ')).toEqual([]);
  });

  it('splits a long sentence into pieces no longer than the maximum, losing no word', () => {
    const text = words(100);
    const chunks = splitIntoSpeechChunks(text);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach(chunk => expect(count(chunk)).toBeLessThanOrEqual(MAX_CHUNK_WORDS));
    expect(chunks.join(' ')).toBe(text);
  });

  it('never leaves a piece too short to stand on its own', () => {
    const chunks = splitIntoSpeechChunks(words(MAX_CHUNK_WORDS + 2));
    chunks.forEach(chunk => expect(count(chunk)).toBeGreaterThanOrEqual(MIN_CHUNK_WORDS));
  });

  it('cuts where a reader would breathe: after a clause before a comma', () => {
    // Commas after word 10 and 20, a semicolon after word 15: the semicolon wins.
    const ws = words(40).split(' ');
    ws[9] += ',';
    ws[14] += ';';
    ws[19] += ',';
    const [first] = splitIntoSpeechChunks(ws.join(' '));
    expect(first.endsWith('w15;')).toBe(true);
  });

  it('takes the latest comma within reach when there is no stronger break', () => {
    const ws = words(40).split(' ');
    ws[9] += ',';
    ws[19] += ',';
    const [first] = splitIntoSpeechChunks(ws.join(' '));
    expect(first.endsWith('w20,')).toBe(true);
  });

  it('with no punctuation at all, cuts between two words', () => {
    const chunks = splitIntoSpeechChunks(words(40));
    expect(chunks.every(chunk => /^w\d+( w\d+)*$/.test(chunk))).toBe(true);
  });
});
