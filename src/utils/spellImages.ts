import { sha256Hex } from './spellContainer';

// The images a spell's record holds -- written into its pages as base64 data URLs, and its
// cover -- by content (sha256), the same way a .spell's entries and a seal's files name them.
// The record keeps its images inline; its seals keep only the ones it no longer has (see
// db/spellRepository's keepSealedImages), so an image is stored once wherever it's used.

// A data URL as a page holds it: its media type and its bytes, base64.
const DATA_URL = /^data:([^;,]+);base64,(.*)$/s;

export const base64ToBytes = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/** A data URL's media type and bytes; null for anything else. */
export const parseDataUrl = (value: string): { type: string; bytes: Uint8Array } | null => {
  const match = DATA_URL.exec(value);
  return match ? { type: match[1], bytes: base64ToBytes(match[2]) } : null;
};

// Every JSON string in a pages text that is a data URL, as it reads once parsed. Found in the
// text itself, without parsing all the pages (they can be hundreds of MB).
const DATA_URL_STRING = /"data:[^"\\]*(?:\\.[^"\\]*)*"/g;

/** The data URLs written in pages texts (a pagesContent, an originalPagesContent), each once. */
export const dataUrlsIn = (...texts: (string | undefined)[]): Set<string> => {
  const found = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    for (const literal of text.match(DATA_URL_STRING) ?? []) {
      try {
        const value = JSON.parse(literal) as string;
        if (DATA_URL.test(value)) found.add(value);
      } catch { /* not a whole string: not an image */ }
    }
  }
  return found;
};

export interface SpellImage {
  sha256: string;
  data: Uint8Array;
  type?: string;
}

/** Images by content: data URLs (as dataUrlsIn finds them) and covers. */
export const imagesOf = async (dataUrls: Iterable<string>, covers: (Blob | undefined)[] = []): Promise<SpellImage[]> => {
  const images: SpellImage[] = [];
  for (const url of dataUrls) {
    const parsed = parseDataUrl(url);
    if (parsed) images.push({ sha256: await sha256Hex(parsed.bytes), data: parsed.bytes });
  }
  for (const cover of covers) {
    if (!cover) continue;
    const data = new Uint8Array(await cover.arrayBuffer());
    images.push({ sha256: await sha256Hex(data), data, ...(cover.type ? { type: cover.type } : {}) });
  }
  return images;
};

// What a spell's record holds of its work: its pages texts and its cover.
export interface SpellImageSource {
  pagesContent?: string;
  originalPagesContent?: string;
  cover?: Blob;
}

/** All the images a spell's record holds. */
export const recordImages = (record: SpellImageSource): Promise<SpellImage[]> =>
  imagesOf(dataUrlsIn(record.pagesContent, record.originalPagesContent), [record.cover]);
