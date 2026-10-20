import { describe, it, expect } from 'vitest';
import { generatePassword } from '../passwordGenerator';

describe('generatePassword', () => {
  it('is as long as asked, never with characters easily mistaken', () => {
    const password = generatePassword();
    expect(password).toHaveLength(20);
    expect(generatePassword(32)).toHaveLength(32);
    expect(password).not.toMatch(/[0O1lI]/);
  });

  it('is a different one each time', () => {
    const made = new Set(Array.from({ length: 50 }, () => generatePassword()));
    expect(made.size).toBe(50);
  });
});
