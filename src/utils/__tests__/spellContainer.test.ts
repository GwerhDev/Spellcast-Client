import { describe, it, expect } from 'vitest';
import { openContainer, writeContainer, SpellContainerError, PROTECTED_FLAG } from '../spellContainer';

const enc = (text: string) => new TextEncoder().encode(text);
const bytesOf = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer());
const write = (entries: { path: string; text: string; compress?: boolean }[], manifest: unknown = { title: 't' }) =>
  writeContainer(manifest, entries.map(e => ({ path: e.path, data: enc(e.text), compress: e.compress ?? true })), { version: 1 });

// The same file, its header saying it's protected (as a protected one will).
const asProtected = (bytes: Uint8Array, protection: object): Uint8Array => {
  const block = enc(JSON.stringify(protection));
  const rest = bytes.slice(9); // after "SPELL", version, flags and the (empty) protection length
  const out = new Uint8Array(9 + block.length + rest.length);
  out.set(bytes.slice(0, 7), 0);
  out[6] = PROTECTED_FLAG;
  new DataView(out.buffer).setUint16(7, block.length);
  out.set(block, 9);
  out.set(rest, 9 + block.length);
  return out;
};

describe('spellContainer', () => {
  it('starts with "SPELL", the version, no flags and an empty protection block', async () => {
    const bytes = await bytesOf(await write([{ path: 'a', text: 'x' }]));
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('SPELL');
    expect(Array.from(bytes.slice(5, 9))).toEqual([1, 0, 0, 0]);
  });

  it('reads back each entry and the manifest, unprotected', async () => {
    const opened = await openContainer<{ title: string }>(await bytesOf(await write([
      { path: 'pages/0001.json', text: '{"type":"doc"}' },
      { path: 'assets/x.png', text: 'raw image bytes', compress: false },
    ], { title: 'My Spell' })));
    expect(opened.manifest.title).toBe('My Spell');
    expect(opened.protection).toBeNull();
    expect(opened.paths).toEqual(['pages/0001.json', 'assets/x.png']);
    expect(new TextDecoder().decode((await opened.read('pages/0001.json'))!)).toBe('{"type":"doc"}');
    expect(new TextDecoder().decode((await opened.read('assets/x.png'))!)).toBe('raw image bytes');
    expect(await opened.read('missing')).toBeNull();
  });

  it('stores an entry already compressed (an image) as it is', async () => {
    const bytes = await bytesOf(await write([{ path: 'assets/x.png', text: 'raw image bytes', compress: false }]));
    expect(new TextDecoder('latin1').decode(bytes)).toContain('raw image bytes');
  });

  // Kept for the protected files to come (a canonical with the backend's key, a caster's own
  // with their key): read, and turned down by this version rather than misread.
  it("a protected file's protection is read, and the file isn't opened yet", async () => {
    const bytes = asProtected(await bytesOf(await write([{ path: 'a', text: 'x' }])), { scheme: 'passphrase', kdf: 'PBKDF2-SHA256', iterations: 600000, salt: 'c2FsdA==' });
    await expect(openContainer(bytes)).rejects.toThrow(/protected/);
  });

  it('a damaged entry fails clearly, on its own', async () => {
    const bytes = await bytesOf(await write([{ path: 'a', text: 'first' }, { path: 'b', text: 'second entry', compress: false }]));
    bytes[bytes.length - 1] ^= 0xff;
    const opened = await openContainer(bytes);
    expect(new TextDecoder().decode((await opened.read('a'))!)).toBe('first');
    await expect(opened.read('b')).rejects.toThrow(SpellContainerError);
  });

  it('a damaged index or something that is not a .spell fails clearly', async () => {
    const bytes = await bytesOf(await write([{ path: 'a', text: 'x' }]));
    bytes[14] ^= 0xff;
    await expect(openContainer(bytes)).rejects.toThrow(SpellContainerError);
    await expect(openContainer(enc('PK\u0003\u0004 not a spell'))).rejects.toThrow('Not a .spell file.');
  });
});
