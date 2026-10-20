// The .spell file's container: a binary of its own (not a ZIP), open to anyone who reads the
// format. Its entries (a page, an image, an audio...) each stand on their own, so an entry
// whose content doesn't change is byte for byte the same in every file it's in.
//
//   "SPELL"  version (1 byte)  flags (1 byte)
//   protection length (uint16, big-endian)  protection (JSON)
//   index length (uint32, big-endian)  index (deflate)
//   entries, one after the other
//
// A protected file (the PROTECTED flag) has, after its protection block, everything else --
// index length, index and entries -- encrypted as one, bound to the header before it (see
// spellProtection and docs/spell-protection.md).
//
// The index is JSON: the manifest and each entry's path, content hash (sha256), size, place,
// whether it's compressed and, for an image or an audio, its media type (kept as it was, so
// it comes back the same). Each entry is compressed (unless it's already compressed data, like
// an image) and checked against its hash when read, so a damaged file is told apart; it's
// never decompressed past its size, so a file that would inflate to more than it says (a
// "zip bomb") fails instead of filling the memory.
//
// A spell is free: nothing is encrypted unless the caster protects it, with a password, an
// access key, or both.

import { protect, unseal, type ProtectWith, type SpellProtection, type UnlockWith } from './spellProtection';

const MAGIC = new TextEncoder().encode('SPELL');
// "SPELL", the version and the flags.
const HEAD_LENGTH = MAGIC.length + 2;
export const PROTECTED_FLAG = 0x01;

export class SpellContainerError extends Error {}

export interface ContainerEntry {
  path: string;
  data: Uint8Array;
  // Already-compressed data (images, audio, PDFs) is stored as it is.
  compress: boolean;
  // Its media type, when it has one to keep (an image's, an audio's).
  type?: string;
}

interface IndexEntry {
  path: string;
  sha256: string;
  // Its content's size, uncompressed.
  size: number;
  offset: number;
  length: number;
  compressed: boolean;
  type?: string;
}

const isCount = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const isIndexEntry = (entry: unknown): entry is IndexEntry => {
  const e = entry as Partial<IndexEntry> | null;
  return !!e && typeof e.path === 'string' && typeof e.sha256 === 'string' && typeof e.compressed === 'boolean'
    && isCount(e.size) && isCount(e.offset) && isCount(e.length) && (e.type === undefined || typeof e.type === 'string');
};

// The index is at most this big, uncompressed.
const MAX_INDEX_SIZE = 64 * 1024 * 1024;

interface ContainerIndex<M> {
  manifest: M;
  entries: IndexEntry[];
}

const hex = (buffer: ArrayBuffer): string => Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('');
export const sha256Hex = async (data: Uint8Array): Promise<string> => hex(await crypto.subtle.digest('SHA-256', data as BufferSource));

const streamThrough = async (data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> =>
  new Uint8Array(await new Response(new Blob([data as BlobPart]).stream().pipeThrough(stream)).arrayBuffer());
const compress = (data: Uint8Array) => streamThrough(data, new CompressionStream('deflate-raw'));

// Decompressed, but never past `max` bytes: past it, it's not what it says it is.
const decompress = async (data: Uint8Array, max: number): Promise<Uint8Array> => {
  const reader = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) {
      await reader.cancel();
      throw new SpellContainerError('This .spell file inflates past its stated size.');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) { out.set(chunk, at); at += chunk.length; }
  return out;
};

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let at = 0;
  for (const part of parts) { out.set(part, at); at += part.length; }
  return out;
};

/** Writes the entries and the manifest into a .spell container -- protected with a password
 * and/or access keys, if `protectWith` is given. */
export async function writeContainer<M>(
  manifest: M,
  entries: ContainerEntry[],
  { version, protectWith }: { version: number; protectWith?: ProtectWith },
): Promise<Blob> {
  const protection = protectWith ? await protect(protectWith) : null;
  const protectionBytes = protection ? new TextEncoder().encode(JSON.stringify(protection.protection)) : new Uint8Array(0);
  if (protectionBytes.length > 0xffff) throw new SpellContainerError('Too many ways to open this .spell file.');
  const head = new Uint8Array(HEAD_LENGTH + 2 + protectionBytes.length);
  head.set(MAGIC, 0);
  head[MAGIC.length] = version;
  head[MAGIC.length + 1] = protection ? PROTECTED_FLAG : 0;
  new DataView(head.buffer).setUint16(HEAD_LENGTH, protectionBytes.length);
  head.set(protectionBytes, HEAD_LENGTH + 2);
  const parts: Uint8Array[] = [];
  const index: IndexEntry[] = [];
  let offset = 0;
  for (const entry of entries) {
    const stored = entry.compress ? await compress(entry.data) : entry.data;
    index.push({
      path: entry.path, sha256: await sha256Hex(entry.data), size: entry.data.length,
      offset, length: stored.length, compressed: entry.compress, ...(entry.type ? { type: entry.type } : {}),
    });
    parts.push(stored);
    offset += stored.length;
  }
  const indexBytes = await compress(new TextEncoder().encode(JSON.stringify({ manifest, entries: index } satisfies ContainerIndex<M>)));
  const length = new Uint8Array(4);
  new DataView(length.buffer).setUint32(0, indexBytes.length);
  const body = [length, indexBytes, ...parts];
  const stored = protection ? [await protection.seal(concat(body), head)] : body;
  return new Blob([head, ...stored] as BlobPart[], { type: 'application/octet-stream' });
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
  // An entry's media type, as it was written (undefined: none was kept).
  typeOf: (path: string) => string | undefined;
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
    if (typeof protection?.iv !== 'string' || !Array.isArray(protection.slots)) throw new SpellContainerError('This .spell file is damaged.');
  }
  return { version, protection, bodyStart: indexLengthAt };
};

/** Opens a .spell container; a protected one with what `unlock` gives (a password, access
 * keys). Throws SpellContainerError when it isn't one or is damaged, SpellLockedError when
 * it's protected and nothing given opens it, SpellTamperedError when it was altered. */
export async function openContainer<M>(file: Uint8Array, unlock: UnlockWith = {}): Promise<OpenedContainer<M>> {
  const { version, protection, bodyStart } = readHeader(file);
  // A protected one's body, opened: the rest is read as an unprotected one's.
  const bytes = protection ? await unseal(protection, file.subarray(bodyStart), file.subarray(0, bodyStart), unlock) : file.subarray(bodyStart);
  if (bytes.length < 4) throw new SpellContainerError('This .spell file is incomplete.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const indexLengthAt = 0;
  const indexStart = indexLengthAt + 4;
  const indexLength = view.getUint32(indexLengthAt);
  const dataStart = indexStart + indexLength;
  if (bytes.length < dataStart) throw new SpellContainerError('This .spell file is incomplete.');

  let index: ContainerIndex<M>;
  try {
    index = JSON.parse(new TextDecoder().decode(await decompress(bytes.slice(indexStart, dataStart), MAX_INDEX_SIZE))) as ContainerIndex<M>;
  } catch {
    throw new SpellContainerError('This .spell file is damaged.');
  }

  // Every entry says where it is, how big it is and what it should hash to: without its size
  // its decompression couldn't be capped.
  if (!Array.isArray(index?.entries) || !index.entries.every(isIndexEntry)) throw new SpellContainerError('This .spell file is damaged.');

  const byPath = new Map(index.entries.map(entry => [entry.path, entry]));
  const read = async (path: string): Promise<Uint8Array | null> => {
    const entry = byPath.get(path);
    if (!entry) return null;
    const start = dataStart + entry.offset;
    if (start + entry.length > bytes.length) throw new SpellContainerError(`This .spell file is incomplete (${path}).`);
    let data: Uint8Array;
    try {
      const stored = bytes.slice(start, start + entry.length);
      data = entry.compressed ? await decompress(stored, entry.size) : stored;
    } catch {
      throw new SpellContainerError(`This .spell file is damaged (${path}).`);
    }
    if (await sha256Hex(data) !== entry.sha256) throw new SpellContainerError(`This .spell file is damaged (${path}).`);
    return data;
  };

  return {
    version, protection, manifest: index.manifest, paths: index.entries.map(entry => entry.path), read,
    typeOf: (path) => byPath.get(path)?.type,
  };
}
