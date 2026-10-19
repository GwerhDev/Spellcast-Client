import type { TimelineEntry } from '../services/tts';
import { openContainer, sha256Hex, SpellContainerError, writeContainer, type ContainerEntry, type OpenedContainer } from './spellContainer';
import { getSpellById, saveSpellToDB } from '../db';
import { getOriginalPdf, setOriginalPdf } from '../db/originalPdfs';
import { getCachedAudioEntriesForSpell, setCachedAudio, type CachedAudioEntry } from '../db/audioCache';

// .spell is a container of the app's own (see spellContainer): a binary, not a ZIP, open to
// anyone who reads the format.
// Every part of the work is an entry of its own, so an entry that doesn't change between two
// exports is byte for byte the same (and content-addressed storage keeps it once). The
// manifest (SpellManifest) is in the container's index; the entries:
//
//   pages/0001.json ...              one page per entry, its images as references
//   original/pages/0001.json ...     the pages as first read (the "reset" source), if any
//   original/original.pdf            the PDF it was read from, only when asked for
//   assets/{sha256}.{ext}            each image once, as binary, named by its content
//   cover.{ext}                      the spell's cover, if it has one
//   renders/{voice}/{sha256}.{ext}   cached audio of a page, named by the content of the page
//   renders/{voice}/{sha256}.timeline.json   it reads (the page entry's sha256), with its timeline
//
// Only serialization: the local spell keeps its pagesContent as it is; exporting splits it
// into these files and importing puts the very same pagesContent back together.
export const SPELL_FORMAT_VERSION = 1;

export interface SpellManifest {
  formatVersion: number;
  title: string;
  exportedAt: string;
  pageCount: number;
  // null: the spell has no original pages.
  originalPageCount: number | null;
  // The cover's file in the ZIP, or null.
  cover: string | null;
  hasOriginalPdf: boolean;
  voices: string[];
  description?: string;
  author?: string;
  tags?: string[];
  language?: string;
}

export interface ExportSpellOptions {
  /**
   * Bundle original/original.pdf, when one is stored for this spell. Gates ONLY the PDF
   * binary (the heavy part) — the original pages (needed for revert) are bundled whenever
   * the record has them, independent of this flag.
   */
  includeSource?: boolean;
  /** Bundle renders/<voice>/ (cached audio + timelines), when any are cached for this spell. */
  includeAudio?: boolean;
}

export interface ExportSpellResult {
  blob: Blob;
  filename: string;
}

type JsonNode = { [key: string]: unknown };

const sanitizeFilename = (title: string): string => {
  const cleaned = title.trim().replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : 'spell';
};

const audioExtension = (blob: Blob): string => {
  const type = blob.type.toLowerCase();
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
  if (type.includes('wav')) return 'wav';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('webm')) return 'webm';
  return 'audio';
};

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
};
const IMAGE_TYPES: Record<string, string> = Object.fromEntries(Object.entries(IMAGE_EXTENSIONS).map(([type, ext]) => [ext, type]));

const imageExtension = (type: string): string => IMAGE_EXTENSIONS[type.toLowerCase()] ?? 'bin';
const imageType = (ext: string): string => IMAGE_TYPES[ext] ?? 'application/octet-stream';

const encode = (text: string) => new TextEncoder().encode(text);
const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

const base64ToBytes = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(binary);
};

// An image written into a page (a base64 data URL), and how a page refers to its entry
// instead: `spell-asset:{sha256}.{ext}`, the entry being assets/{sha256}.{ext}. An image whose
// type isn't the one its extension stands for (image/jpg, image/bmp...) says it too
// (`;type=image/jpg`): the same bytes can be there under different types, and each comes back
// as it was.
const DATA_URL = /^data:([^;,]+);base64,(.*)$/s;
const ASSET_REF = /^spell-asset:([0-9a-f]{64}\.[a-z0-9]+)(?:;type=([^;]+))?$/;
const assetPath = (name: string) => `assets/${name}`;

// Every attribute value of a node and its children, deep: images live in nodes' attrs (an
// image's src), at any depth (columns, boxes, tables).
const mapAttrs = async (node: unknown, map: (value: string) => Promise<string>): Promise<unknown> => {
  if (Array.isArray(node)) return Promise.all(node.map(child => mapAttrs(child, map)));
  if (!node || typeof node !== 'object') return node;
  const out: JsonNode = {};
  for (const [key, value] of Object.entries(node as JsonNode)) {
    if (key === 'attrs' && value && typeof value === 'object' && !Array.isArray(value)) {
      const attrs: JsonNode = {};
      for (const [name, attr] of Object.entries(value as JsonNode)) attrs[name] = typeof attr === 'string' ? await map(attr) : attr;
      out[key] = attrs;
    } else {
      out[key] = await mapAttrs(value, map);
    }
  }
  return out;
};

// The entries being written, each path once (an image shared by pages is one entry).
class Entries {
  readonly list: ContainerEntry[] = [];
  private readonly paths = new Set<string>();
  add(path: string, data: Uint8Array, compress: boolean, type?: string) {
    if (this.paths.has(path)) return;
    this.paths.add(path);
    this.list.push({ path, data, compress, type });
  }
}

// A page as its entry: each image taken out to assets/ (once per content), the page referring
// to it.
const pageToFile = async (page: unknown, entries: Entries): Promise<string> => {
  const withRefs = await mapAttrs(page, async (value) => {
    const match = DATA_URL.exec(value);
    if (!match) return value;
    const bytes = base64ToBytes(match[2]);
    const ext = imageExtension(match[1]);
    const name = `${await sha256Hex(bytes)}.${ext}`;
    entries.add(assetPath(name), bytes, false);
    return imageType(ext) === match[1] ? `spell-asset:${name}` : `spell-asset:${name};type=${match[1]}`;
  });
  return JSON.stringify(withRefs);
};

const pageFileName = (folder: string, index: number) => `${folder}/${String(index + 1).padStart(4, '0')}.json`;

// The pages of a pagesContent into folder/0001.json..., returning each page entry's bytes.
const writePages = async (pagesContent: string, folder: string, entries: Entries): Promise<Uint8Array[]> => {
  const pages = JSON.parse(pagesContent) as unknown[];
  const files: Uint8Array[] = [];
  for (let i = 0; i < pages.length; i++) {
    const file = encode(await pageToFile(pages[i], entries));
    entries.add(pageFileName(folder, i), file, true);
    files.push(file);
  }
  return files;
};

/**
 * Reads a Spell (and, optionally, its cached audio) from IndexedDB and assembles a
 * .spell in memory. Never includes `progress` — a reader's personal position is
 * not part of the work, and must never travel in a shared .spell.
 */
export async function exportSpellToBlob(
  spellId: string,
  userId: string,
  options: ExportSpellOptions = {},
): Promise<ExportSpellResult> {
  const spell = await getSpellById(spellId, userId);
  if (!spell) throw new Error('Spell not found.');

  const includeSource = options.includeSource ?? false;
  const includeAudio = options.includeAudio ?? false;

  // Images shared by pages (or by a page and its original) are written once.
  const entries = new Entries();

  const pageFiles = await writePages(spell.pagesContent ?? '[]', 'pages', entries);
  const originalPageFiles = spell.originalPagesContent
    ? await writePages(spell.originalPagesContent, 'original/pages', entries)
    : null;

  let cover: string | null = null;
  if (spell.cover) {
    cover = `cover.${imageExtension(spell.cover.type)}`;
    entries.add(cover, new Uint8Array(await spell.cover.arrayBuffer()), false, spell.cover.type || undefined);
  }

  // Only look up the PDF store at all when actually requested — it's the one genuinely
  // heavy, opt-in part of a .spell export.
  const originalPdf = includeSource ? await getOriginalPdf(spellId) : null;
  if (originalPdf) entries.add('original/original.pdf', new Uint8Array(await originalPdf.arrayBuffer()), false);

  // A page's audio is named by what it reads (its page entry's content), not by its number:
  // the same page renders the same, wherever it sits.
  const voices = new Set<string>();
  if (includeAudio) {
    const pageHashes = await Promise.all(pageFiles.map(file => sha256Hex(file)));
    const cached: CachedAudioEntry[] = await getCachedAudioEntriesForSpell(spellId);
    for (const render of cached) {
      const hash = pageHashes[render.page - 1];
      if (!hash) continue;
      voices.add(render.voice);
      entries.add(`renders/${render.voice}/${hash}.${audioExtension(render.blob)}`, new Uint8Array(await render.blob.arrayBuffer()), false);
      entries.add(`renders/${render.voice}/${hash}.timeline.json`, encode(JSON.stringify(render.timeline)), true);
    }
  }

  // The manifest is made last so it reflects what was actually written above, not what was
  // requested.
  const manifest: SpellManifest = {
    formatVersion: SPELL_FORMAT_VERSION,
    title: spell.title,
    exportedAt: new Date().toISOString(),
    pageCount: pageFiles.length,
    originalPageCount: originalPageFiles ? originalPageFiles.length : null,
    cover,
    hasOriginalPdf: !!originalPdf,
    voices: Array.from(voices),
    description: spell.description,
    author: spell.author,
    tags: spell.tags,
    language: spell.language,
  };
  const blob = await writeContainer(manifest, entries.list, { version: SPELL_FORMAT_VERSION });
  return { blob, filename: `${sanitizeFilename(spell.title)}.spell` };
}

/** Triggers a browser download of a Blob — no existing reusable helper for this in the app. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export class SpellImportError extends Error {}

type Container = OpenedContainer<SpellManifest>;

const readText = async (container: Container, path: string): Promise<string | null> => {
  const data = await container.read(path);
  return data ? decode(data) : null;
};

const readBlob = async (container: Container, path: string, mimeType?: string): Promise<Blob | null> => {
  const data = await container.read(path);
  return data ? new Blob([data as BlobPart], mimeType ? { type: mimeType } : undefined) : null;
};

// The pages of folder/0001.json... back into a pagesContent: each image reference back into
// the image itself (a data URL, as it was written in the page).
const readPages = async (container: Container, folder: string, count: number): Promise<{ pagesContent: string; files: Uint8Array[] }> => {
  const dataUrls = new Map<string, string>();
  const files: Uint8Array[] = [];
  const pages: string[] = [];
  for (let i = 0; i < count; i++) {
    const file = await container.read(pageFileName(folder, i));
    if (file == null) throw new SpellImportError(`Not a valid .spell file: missing ${pageFileName(folder, i)}.`);
    files.push(file);
    const page = await mapAttrs(JSON.parse(decode(file)), async (value) => {
      const match = ASSET_REF.exec(value);
      if (!match) return value;
      const name = match[1];
      let base64 = dataUrls.get(name);
      if (base64 === undefined) {
        const bytes = await container.read(assetPath(name));
        if (!bytes) throw new SpellImportError(`Not a valid .spell file: missing ${assetPath(name)}.`);
        base64 = bytesToBase64(bytes);
        dataUrls.set(name, base64);
      }
      const type = match[2] ?? imageType(name.slice(name.lastIndexOf('.') + 1));
      return `data:${type};base64,${base64}`;
    });
    pages.push(JSON.stringify(page));
  }
  return { pagesContent: `[${pages.join(',')}]`, files };
};

/**
 * Opens a .spell file and hydrates it into a brand-new Spell record (+ audio_pages
 * cache entries, if renders/ is present). Always creates a NEW id — ids are local to a
 * browser/user's database, not part of the file. Returns the new spell's id so the caller
 * can navigate to it / invalidate the list.
 */
export async function importSpellFromFile(file: File, userId: string): Promise<string> {
  let container: Container;
  try {
    container = await openContainer<SpellManifest>(new Uint8Array(await file.arrayBuffer()));
  } catch (error) {
    if (error instanceof SpellContainerError) throw new SpellImportError(error.message);
    throw error;
  }
  const { manifest } = container;
  if (container.version !== SPELL_FORMAT_VERSION || manifest.formatVersion !== SPELL_FORMAT_VERSION) {
    throw new SpellImportError(`Unsupported .spell format version: ${manifest.formatVersion ?? container.version}.`);
  }

  // A damaged entry surfaces as an import error too.
  const guarded = async <T,>(read: () => Promise<T>): Promise<T> => {
    try { return await read(); } catch (error) {
      if (error instanceof SpellContainerError) throw new SpellImportError(error.message);
      throw error;
    }
  };

  const { pagesContent, files: pageFiles } = await guarded(() => readPages(container, 'pages', manifest.pageCount));
  const original = manifest.originalPageCount != null
    ? await guarded(() => readPages(container, 'original/pages', manifest.originalPageCount!))
    : null;
  const cover = manifest.cover
    ? await guarded(() => readBlob(container, manifest.cover!, container.typeOf(manifest.cover!) ?? imageType(manifest.cover!.slice(manifest.cover!.lastIndexOf('.') + 1))))
    : null;
  const originalPdf = manifest.hasOriginalPdf ? await guarded(() => readBlob(container, 'original/original.pdf', 'application/pdf')) : null;

  const newSpellId = await saveSpellToDB({
    title: manifest.title,
    userId,
    pagesContent,
    originalPagesContent: original?.pagesContent,
    cover: cover ?? undefined,
    description: manifest.description,
    author: manifest.author,
    tags: manifest.tags,
    language: manifest.language,
  });

  if (originalPdf) await setOriginalPdf(newSpellId, originalPdf);

  // Each render goes to every page that reads that content (pages are 1-based for the cache).
  const pagesByHash = new Map<string, number[]>();
  for (let i = 0; i < pageFiles.length; i++) {
    const hash = await sha256Hex(pageFiles[i]);
    pagesByHash.set(hash, [...(pagesByHash.get(hash) ?? []), i + 1]);
  }
  for (const voice of manifest.voices) {
    const prefix = `renders/${voice}/`;
    const timelinePaths = container.paths.filter(path => path.startsWith(prefix) && path.endsWith('.timeline.json'));
    for (const timelinePath of timelinePaths) {
      const hash = timelinePath.slice(prefix.length, -'.timeline.json'.length);
      const pages = pagesByHash.get(hash);
      if (!pages) continue;
      const timelineJson = await guarded(() => readText(container, timelinePath));
      if (!timelineJson) continue;
      const timeline = JSON.parse(timelineJson) as TimelineEntry[];
      const audioPath = container.paths.find(path => path.startsWith(`${prefix}${hash}.`) && !path.endsWith('.timeline.json'));
      if (!audioPath) continue;
      const audioBlob = await guarded(() => readBlob(container, audioPath));
      if (!audioBlob) continue;
      for (const page of pages) await setCachedAudio(newSpellId, page, voice, audioBlob, timeline);
    }
  }

  return newSpellId;
}
