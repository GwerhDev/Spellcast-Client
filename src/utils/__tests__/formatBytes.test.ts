import { describe, it, expect } from 'vitest';
import { formatBytes } from '../formatBytes';

describe('formatBytes', () => {
  it('formats 0 bytes as "0 B" instead of NaN/Infinity (log(0) is -Infinity)', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes, kilobytes, megabytes, and gigabytes with one decimal place', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
    expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
  });
});
