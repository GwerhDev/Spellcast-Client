// A protected .spell: envelope encryption (see docs/spell-protection.md). Its content is
// encrypted once, with a random key (AES-256-GCM); that key is wrapped once for each way the
// file opens -- each wrapping a slot of the protection block, in the file's header. Any slot
// opens it. Everything is done here, on the device: a password, and the key derived from it,
// never leave it.

export const CONTENT_CIPHER = 'AES-256-GCM';
export const PASSWORD_KDF = 'PBKDF2-SHA256';
// OWASP's recommendation for PBKDF2-HMAC-SHA256.
export const PASSWORD_ITERATIONS = 600_000;

// A way to open the file: the content key, wrapped. Open-ended: a type this version doesn't
// know is left alone (another way to open it).
export type ProtectionSlot =
  // Wrapped with a key derived from a password.
  | { type: 'password'; kdf: string; iterations: number; salt: string; iv: string; wrappedKey: string }
  // Wrapped with one of the caster's access keys.
  | { type: 'key'; keyId: string; iv: string; wrappedKey: string };

export interface SpellProtection {
  cipher: string;
  // The content's IV.
  iv: string;
  slots: ProtectionSlot[];
}

// One of the caster's access keys: 32 random bytes, by its id.
export interface AccessKey {
  id: string;
  key: Uint8Array;
}

/** How to protect a file: a password, access keys, or both (at least one). */
export interface ProtectWith {
  password?: string;
  keys?: AccessKey[];
}

/** What to open a protected file with: a password, and the access keys at hand. */
export interface UnlockWith {
  password?: string;
  keys?: AccessKey[];
}

/**
 * A protected file not opened: nothing given opens it (`wrong`: a password was given, and
 * it's not this file's). Says how it can be opened: with a password, with an access key
 * (their ids).
 */
export class SpellLockedError extends Error {
  constructor(readonly wrong: boolean, readonly password: boolean, readonly keyIds: string[]) {
    super(wrong ? 'Wrong password for this .spell file.' : 'This .spell file is protected.');
  }
}

/** A protected file whose content, opened, is not what was sealed: it was altered. */
export class SpellTamperedError extends Error {}

const base64 = (bytes: Uint8Array) => btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
const unbase64 = (text: string) => Uint8Array.from(atob(text), c => c.charCodeAt(0));
const random = (length: number) => crypto.getRandomValues(new Uint8Array(length));

const aesKey = (raw: Uint8Array, usage: KeyUsage[]) =>
  crypto.subtle.importKey('raw', raw as BufferSource, { name: 'AES-GCM' }, false, usage);

// The password as UTF-8, normalized (NFC): the same password typed anywhere (an accent typed
// as one character or as two) is the same key.
const passwordKey = async (password: string, salt: Uint8Array, iterations: number) => {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
};

const encrypt = async (key: CryptoKey, iv: Uint8Array, data: Uint8Array, aad?: Uint8Array) =>
  new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource, ...(aad ? { additionalData: aad as BufferSource } : {}) }, key, data as BufferSource));
const decrypt = async (key: CryptoKey, iv: Uint8Array, data: Uint8Array, aad?: Uint8Array) =>
  new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource, ...(aad ? { additionalData: aad as BufferSource } : {}) }, key, data as BufferSource));

/**
 * The protection of a new file: a random content key wrapped in a slot for the password and
 * one for each access key, and `seal`, which encrypts the content with it. `aad`: the bytes
 * the content is bound to (the file's header, this protection in it), so altering them is
 * told apart too.
 */
export async function protect(
  { password, keys = [] }: ProtectWith,
): Promise<{ protection: SpellProtection; seal: (content: Uint8Array, aad: Uint8Array) => Promise<Uint8Array> }> {
  if (!password && !keys.length) throw new Error('A protected file needs a password or an access key.');
  const contentKey = random(32);
  const slots: ProtectionSlot[] = [];
  if (password) {
    const salt = random(16);
    const iv = random(12);
    const wrapped = await encrypt(await passwordKey(password, salt, PASSWORD_ITERATIONS), iv, contentKey);
    slots.push({ type: 'password', kdf: PASSWORD_KDF, iterations: PASSWORD_ITERATIONS, salt: base64(salt), iv: base64(iv), wrappedKey: base64(wrapped) });
  }
  for (const access of keys) {
    const iv = random(12);
    const wrapped = await encrypt(await aesKey(access.key, ['encrypt']), iv, contentKey);
    slots.push({ type: 'key', keyId: access.id, iv: base64(iv), wrappedKey: base64(wrapped) });
  }
  const iv = random(12);
  const key = await aesKey(contentKey, ['encrypt']);
  return {
    protection: { cipher: CONTENT_CIPHER, iv: base64(iv), slots },
    seal: (content, aad) => encrypt(key, iv, content, aad),
  };
}

// The content key, from the first slot what's given opens. A slot that doesn't open (another
// key, a wrong password) is passed over.
const contentKeyOf = async (protection: SpellProtection, { password, keys = [] }: UnlockWith): Promise<CryptoKey> => {
  const slots = Array.isArray(protection?.slots) ? protection.slots : [];
  const passwordSlots = slots.filter((slot): slot is Extract<ProtectionSlot, { type: 'password' }> => slot?.type === 'password');
  const keySlots = slots.filter((slot): slot is Extract<ProtectionSlot, { type: 'key' }> => slot?.type === 'key');
  const unwrap = async (wrappingKey: CryptoKey, slot: { iv: string; wrappedKey: string }) => {
    try {
      return await aesKey(await decrypt(wrappingKey, unbase64(slot.iv), unbase64(slot.wrappedKey)), ['decrypt']);
    } catch {
      return null;
    }
  };
  for (const slot of keySlots) {
    const access = keys.find(k => k.id === slot.keyId);
    const key = access && await unwrap(await aesKey(access.key, ['decrypt']), slot);
    if (key) return key;
  }
  if (password) {
    for (const slot of passwordSlots) {
      // Only the derivation this version knows, and never one so long it would hang.
      if (slot.kdf !== PASSWORD_KDF || !Number.isSafeInteger(slot.iterations) || slot.iterations < 1 || slot.iterations > 10 * PASSWORD_ITERATIONS) continue;
      const key = await unwrap(await passwordKey(password, unbase64(slot.salt), slot.iterations), slot);
      if (key) return key;
    }
  }
  throw new SpellLockedError(!!password, passwordSlots.length > 0, keySlots.map(slot => slot.keyId));
};

/** A protected file's content, opened with what's given. Throws SpellLockedError when none
 * of it opens the file, SpellTamperedError when what it opens was altered. */
export async function unseal(protection: SpellProtection, sealed: Uint8Array, aad: Uint8Array, unlock: UnlockWith): Promise<Uint8Array> {
  const key = await contentKeyOf(protection, unlock);
  try {
    return await decrypt(key, unbase64(protection.iv), sealed, aad);
  } catch {
    throw new SpellTamperedError('This .spell file was altered.');
  }
}
