import { describe, it, expect } from 'vitest';
import { openContainer, writeContainer, SpellContainerError, PROTECTED_FLAG } from '../spellContainer';
import { SpellLockedError, SpellTamperedError, type AccessKey, type ProtectWith } from '../spellProtection';

const enc = (text: string) => new TextEncoder().encode(text);
const bytesOf = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer());
const write = (entries: { path: string; text: string; compress?: boolean }[], manifest: unknown = { title: 't' }) =>
  writeContainer(manifest, entries.map(e => ({ path: e.path, data: enc(e.text), compress: e.compress ?? true })), { version: 1 });

// The same file with its index changed (as a hand-made or damaged file could have it).
type PlainIndex = { manifest: unknown; entries: Record<string, unknown>[] };
const rewriteIndex = async (bytes: Uint8Array, change: (index: PlainIndex) => void): Promise<Uint8Array> => {
  const indexLength = new DataView(bytes.buffer, bytes.byteOffset).getUint32(9);
  const indexBytes = bytes.slice(13, 13 + indexLength);
  const plain = JSON.parse(new TextDecoder().decode(await new Response(new Blob([indexBytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer())) as PlainIndex;
  change(plain);
  const newIndex = new Uint8Array(await new Response(new Blob([enc(JSON.stringify(plain))]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
  const out = new Uint8Array(13 + newIndex.length + (bytes.length - 13 - indexLength));
  out.set(bytes.slice(0, 9), 0);
  new DataView(out.buffer).setUint32(9, newIndex.length);
  out.set(newIndex, 13);
  out.set(bytes.slice(13 + indexLength), 13 + newIndex.length);
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

  it('keeps an entry\'s media type', async () => {
    const blob = await writeContainer({}, [{ path: 'assets/x.bmp', data: enc('b'), compress: false, type: 'image/bmp' }, { path: 'p', data: enc('t'), compress: true }], { version: 1 });
    const opened = await openContainer(await bytesOf(blob));
    expect(opened.typeOf('assets/x.bmp')).toBe('image/bmp');
    expect(opened.typeOf('p')).toBeUndefined();
  });

  // A tiny entry claiming a small size but inflating far past it (a "zip bomb") is turned down
  // before it fills the memory.
  it('never decompresses an entry past its stated size', async () => {
    const big = new Uint8Array(4 * 1024 * 1024); // compresses to a few KB
    const bytes = await bytesOf(await writeContainer({}, [{ path: 'bomb', data: big, compress: true }], { version: 1 }));
    // Rewrite the index to state a tiny size for it.
    const out = await rewriteIndex(bytes, index => { index.entries[0].size = 10; });
    const opened = await openContainer(out);
    await expect(opened.read('bomb')).rejects.toThrow(SpellContainerError);
  });

  // Without its size an entry's decompression couldn't be capped: such an index is damaged.
  it('turns down an index whose entry has no size, or a negative one', async () => {
    const bytes = await bytesOf(await write([{ path: 'a', text: 'x' }]));
    await expect(openContainer(await rewriteIndex(bytes, index => { delete index.entries[0].size; }))).rejects.toThrow(SpellContainerError);
    await expect(openContainer(await rewriteIndex(bytes, index => { index.entries[0].size = -1; }))).rejects.toThrow(SpellContainerError);
    await expect(openContainer(await rewriteIndex(bytes, index => { index.entries[0].offset = 'x'; }))).rejects.toThrow(SpellContainerError);
  });

  describe('protected', () => {
    const SECRET = 'a secret page, never readable without the password';
    const key = (id: string): AccessKey => ({ id, key: crypto.getRandomValues(new Uint8Array(32)) });
    const KEY = key('key-1');
    const protectedFile = async (protectWith: ProtectWith) => bytesOf(await writeContainer(
      { title: 'Hidden title' }, [{ path: 'pages/0001.json', data: enc(SECRET), compress: false }], { version: 1, protectWith },
    ));
    const secretOf = async (bytes: Uint8Array, unlock: Parameters<typeof openContainer>[1]) => {
      const opened = await openContainer<{ title: string }>(bytes, unlock);
      return { title: opened.manifest.title, page: new TextDecoder().decode((await opened.read('pages/0001.json'))!) };
    };
    const lockedBy = async (bytes: Uint8Array, unlock: Parameters<typeof openContainer>[1]) => {
      try { await openContainer(bytes, unlock); } catch (error) { return error; }
      throw new Error('it opened');
    };

    it('with a password: flagged, nothing of it readable, opened only with that password', async () => {
      const bytes = await protectedFile({ password: 'correct horse' });
      expect(bytes[6]).toBe(PROTECTED_FLAG);
      const text = new TextDecoder('latin1').decode(bytes);
      expect(text).not.toContain('secret page');
      expect(text).not.toContain('Hidden title');
      expect(text).not.toContain('correct horse');
      expect(await secretOf(bytes, { password: 'correct horse' })).toEqual({ title: 'Hidden title', page: SECRET });

      const none = await lockedBy(bytes, {});
      expect(none).toBeInstanceOf(SpellLockedError);
      expect(none).toMatchObject({ wrong: false, password: true, keyIds: [] });
      expect(await lockedBy(bytes, { password: 'wrong horse' })).toMatchObject({ wrong: true });
    });

    it('a password typed in another normalization (an accent as two characters) is the same', async () => {
      const bytes = await protectedFile({ password: 'contrase\u00f1a' });
      expect((await secretOf(bytes, { password: 'contrasen\u0303a' })).page).toBe(SECRET);
    });

    it('with an access key: opened with that key only', async () => {
      const bytes = await protectedFile({ keys: [KEY] });
      expect(await secretOf(bytes, { keys: [key('other'), KEY] })).toEqual({ title: 'Hidden title', page: SECRET });
      const locked = await lockedBy(bytes, { keys: [key('other')], password: 'anything' });
      expect(locked).toMatchObject({ password: false, keyIds: ['key-1'] });
      // The same id, another key.
      expect(await lockedBy(bytes, { keys: [key('key-1')] })).toBeInstanceOf(SpellLockedError);
    });

    it('with both, opened with either', async () => {
      const bytes = await protectedFile({ password: 'correct horse', keys: [KEY] });
      expect((await secretOf(bytes, { password: 'correct horse' })).page).toBe(SECRET);
      expect((await secretOf(bytes, { keys: [KEY] })).page).toBe(SECRET);
      expect((await secretOf(bytes, { password: 'wrong horse', keys: [KEY] })).page).toBe(SECRET);
      expect(await lockedBy(bytes, {})).toMatchObject({ password: true, keyIds: ['key-1'] });
    });

    it('altered, in its content or its header, is told apart', async () => {
      const bytes = await protectedFile({ keys: [KEY] });
      const body = bytes.slice(); body[body.length - 1] ^= 0x01;
      expect(await lockedBy(body, { keys: [KEY] })).toBeInstanceOf(SpellTamperedError);
      const header = bytes.slice(); header[5] = 2; // the version, bound to the content
      expect(await lockedBy(header, { keys: [KEY] })).toBeInstanceOf(SpellTamperedError);
    });

    it('needs a password or an access key', async () => {
      await expect(protectedFile({})).rejects.toThrow();
      await expect(protectedFile({ password: '' })).rejects.toThrow();
    });
  });
});
