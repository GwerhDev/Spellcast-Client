import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  MAX_PASSWORD_ITERATIONS, MAX_PASSWORD_SLOTS, PASSWORD_ITERATIONS,
  SpellLockedError, protect, unseal, type ProtectionSlot,
} from '../spellProtection';

const CONTENT = new TextEncoder().encode('the content');
const AAD = new TextEncoder().encode('the header');
// Few iterations: the derivations are real, only shorter.
const FAST = 1000;

// A file's protection with a password, its content sealed with it.
const sealedWith = async (password: string) => {
  const { protection, seal } = await protect({ password, iterations: FAST });
  return { protection, sealed: await seal(CONTENT, AAD) };
};
const passwordSlot = (protection: { slots: ProtectionSlot[] }) =>
  protection.slots.find((slot): slot is Extract<ProtectionSlot, { type: 'password' }> => slot.type === 'password')!;

afterEach(() => vi.restoreAllMocks());

describe('spellProtection', () => {
  it('writes the password with PASSWORD_ITERATIONS unless asked for fewer', async () => {
    const { protection } = await protect({ password: 'pw' });
    expect(passwordSlot(protection).iterations).toBe(PASSWORD_ITERATIONS);
  });

  it('opens with the password, whatever its iterations were', async () => {
    const { protection, sealed } = await sealedWith('pw');
    expect(new TextDecoder().decode(await unseal(protection, sealed, AAD, { password: 'pw' }))).toBe('the content');
  });

  // A file made to hang the page: a slot asking for more iterations than a reader derives.
  it('never derives a slot past MAX_PASSWORD_ITERATIONS', async () => {
    const { protection, sealed } = await sealedWith('pw');
    const slot = passwordSlot(protection);
    const derive = vi.spyOn(crypto.subtle, 'deriveKey');
    const tooLong = { ...protection, slots: [{ ...slot, iterations: MAX_PASSWORD_ITERATIONS + 1 }] };
    await expect(unseal(tooLong, sealed, AAD, { password: 'pw' })).rejects.toBeInstanceOf(SpellLockedError);
    expect(derive).not.toHaveBeenCalled();
  });

  // Hundreds of password slots: only the first few are tried, whatever password is typed.
  it('tries at most MAX_PASSWORD_SLOTS password slots', async () => {
    const { protection, sealed } = await sealedWith('pw');
    const right = passwordSlot(protection);
    const { protection: other } = await sealedWith('another');
    const wrong = passwordSlot(other);
    const derive = vi.spyOn(crypto.subtle, 'deriveKey');

    const many = { ...protection, slots: [...Array(400).fill(wrong), right] };
    await expect(unseal(many, sealed, AAD, { password: 'pw' })).rejects.toBeInstanceOf(SpellLockedError);
    expect(derive).toHaveBeenCalledTimes(MAX_PASSWORD_SLOTS);

    // Within the first ones, it's found.
    const few = { ...protection, slots: [...Array(MAX_PASSWORD_SLOTS - 1).fill(wrong), right] };
    expect(new TextDecoder().decode(await unseal(few, sealed, AAD, { password: 'pw' }))).toBe('the content');
  });
});
