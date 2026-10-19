// The .spell file's container: a binary of its own (not a ZIP), open to anyone who reads the
// format. Its entries (a page, an image, an audio...) each stand on their own, so an entry
// whose content doesn't change is byte for byte the same in every file it's in.
//
//   "SPELL"  version (1 byte)  flags (1 byte)
//   protection length (uint16, big-endian)  protection (JSON)
//   index length (uint32, big-endian)  index (deflate)
//   entries, one after the other
//
// The index is JSON: the manifest and each entry's path, content hash (sha256), place and
// whether it's compressed. Each entry is compressed (unless it's already compressed data, like
// an image) and checked against its hash when read, so a damaged file is told apart.
//
// A spell is free: nothing is encrypted. The PROTECTED flag and the protection block are kept
// for a protected file (a public canonical with the backend's key, or a caster's own with their
// key): what it takes to open it -- a key id, or a salt and derivation parameters -- without
// the format changing. This version writes none, and doesn't open a protected one yet.

const MAGIC = new TextEncoder().encode('SPELL');
// "SPELL", the version and the flags.
const HEAD_LENGTH = MAGIC.length + 2;
export const PROTECTED_FLAG = 0x01;

// What a protected file takes to open: a key id (a key held elsewhere), or a salt and
// derivation parameters (a key from a passphrase). Open-ended: its scheme says which.
export type SpellProtection =
  | { scheme: 'key'; keyId: string }
  | { scheme: 'passphrase'; kdf: string; iterations: number; salt: string }
  | { scheme: string; [field: string]: unknown };

export class SpellContainerError extends Error {}

export interface ContainerEntry {
  path: string;
  data: Uint8Array;
  // Already-compressed data (images, audio, PDFs) is stored as it is.
  compress: boolean;
}

interface IndexEntry {
  path: string;
  sha256: string;
  offset: number;
  length: number;
  compressed: boolean;
}

interface ContainerIndex<M> {
  manifest: M;
  entries: IndexEntry[];
}

const hex = (buffer: ArrayBuffer): string => Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('');
export const sha256Hex = async (data: Uint8Array): Promise<string> => hex(await crypto.subtle.digest('SHA-256', data as BufferSource));

const streamThrough = async (data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> =>
  new Uint8Array(await new Response(new Blob([data as BlobPart]).stream().pipeThrough(stream)).arrayBuffer());
const compress = (data: Uint8Array) => streamThrough(data, new CompressionStream('deflate-raw'));
const decompress = (data: Uint8Array) => streamThrough(data, new DecompressionStream('deflate-raw'));

/** Writes the entries and the manifest into a .spell container (an unprotected one). */
export async function writeContainer<M>(manifest: M, entries: ContainerEntry[], { version }: { version: number }): Promise<Blob> {
  const head = new Uint8Array(HEAD_LENGTH + 2);
  head.set(MAGIC, 0);
  head[MAGIC.length] = version;
  head[MAGIC.length + 1] = 0; // flags: not protected
  // An empty protection block (its length, 0, is the last two bytes).
  const parts: Uint8Array[] = [];
  const index: IndexEntry[] = [];
  let offset = 0;
  for (const entry of entries) {
    const stored = entry.compress ? await compress(entry.data) : entry.data;
    index.push({ path: entry.path, sha256: await sha256Hex(entry.data), offset, length: stored.length, compressed: entry.compress });
    parts.push(stored);
    offset += stored.length;
  }
  const indexBytes = await compress(new TextEncoder().encode(JSON.stringify({ manifest, entries: index } satisfies ContainerIndex<M>)));
  const length = new Uint8Array(4);
  new DataView(length.buffer).setUint32(0, indexBytes.length);
  return new Blob([head, length, indexBytes, ...parts] as BlobPart[], { type: 'application/octet-stream' });
}

export interface OpenedContainer<M> {
  version: number;
  // How it's protected, when it is.
  protection: SpellProtection | null;
  manifest: M;
  paths: string[];
  // An entry's content (decompressed and checked against its hash), or null if the container
  // has no such entry.
  read: (path: string) => Promise<Uint8Array | null>;
}

/** Reads a .spell container's header: its version and, if it's protected, how. Throws
 * SpellContainerError when it isn't a .spell. */
const readHeader = (bytes: Uint8Array) => {
  const isSpell = bytes.length >= HEAD_LENGTH + 2 && MAGIC.every((b, i) => bytes[i] === b);
  if (!isSpell) throw new SpellContainerError('Not a .spell file.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = bytes[MAGIC.length];
  const flags = bytes[MAGIC.length + 1];
  const protectionLength = view.getUint16(HEAD_LENGTH);
  const protectionStart = HEAD_LENGTH + 2;
  const indexLengthAt = protectionStart + protectionLength;
  if (bytes.length < indexLengthAt + 4) throw new SpellContainerError('This .spell file is incomplete.');
  let protection: SpellProtection | null = null;
  if (flags & PROTECTED_FLAG) {
    try {
      protection = JSON.parse(new TextDecoder().decode(bytes.subarray(protectionStart, indexLengthAt))) as SpellProtection;
    } catch {
      throw new SpellContainerError('This .spell file is damaged.');
    }
  }
  return { version, protection, indexLengthAt, view };
};

/** Opens a .spell container. Throws SpellContainerError when it isn't one, is damaged, or is
 * protected (not opened yet by this version). */
export async function openContainer<M>(bytes: Uint8Array): Promise<OpenedContainer<M>> {
  const { version, protection, indexLengthAt, view } = readHeader(bytes);
  if (protection) throw new SpellContainerError('This .spell file is protected, and this version of Spellcast can\'t open it yet.');
  const indexStart = indexLengthAt + 4;
  const indexLength = view.getUint32(indexLengthAt);
  const dataStart = indexStart + indexLength;
  if (bytes.length < dataStart) throw new SpellContainerError('This .spell file is incomplete.');

  let index: ContainerIndex<M>;
  try {
    index = JSON.parse(new TextDecoder().decode(await decompress(bytes.slice(indexStart, dataStart)))) as ContainerIndex<M>;
  } catch {
    throw new SpellContainerError('This .spell file is damaged.');
  }

  const byPath = new Map(index.entries.map(entry => [entry.path, entry]));
  const read = async (path: string): Promise<Uint8Array | null> => {
    const entry = byPath.get(path);
    if (!entry) return null;
    const start = dataStart + entry.offset;
    if (start + entry.length > bytes.length) throw new SpellContainerError(`This .spell file is incomplete (${path}).`);
    let data: Uint8Array;
    try {
      const stored = bytes.slice(start, start + entry.length);
      data = entry.compressed ? await decompress(stored) : stored;
    } catch {
      throw new SpellContainerError(`This .spell file is damaged (${path}).`);
    }
    if (await sha256Hex(data) !== entry.sha256) throw new SpellContainerError(`This .spell file is damaged (${path}).`);
    return data;
  };

  return { version, protection, manifest: index.manifest, paths: index.entries.map(entry => entry.path), read };
}
