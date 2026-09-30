import { describe, it, expect } from 'vitest';
import { activeSentenceIndex } from '../activeSentence';

const timeline = [
  { text: 'One.', start: 0, end: 1000 },
  { text: 'Two.', start: 1000, end: 2500 },
];

describe('activeSentenceIndex', () => {
  it('is the tracked index for the browser voice', () => {
    expect(activeSentenceIndex('browser', 3, timeline, 1.2)).toBe(3);
  });

  it("is the timeline entry a provider voice's audio time falls in", () => {
    expect(activeSentenceIndex('ai', 0, timeline, 0.5)).toBe(0);
    expect(activeSentenceIndex('ai', 0, timeline, 1.2)).toBe(1);
    expect(activeSentenceIndex('ai', 0, timeline, 9)).toBe(1);
  });

  it('falls back to the tracked index when the provider voice has no timeline yet', () => {
    expect(activeSentenceIndex('ai', 2, [], 1)).toBe(2);
  });
});
