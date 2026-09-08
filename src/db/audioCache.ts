import type { TimelineEntry } from '../services/tts';

// TCORE-118: persisted the same way as the app's other flat, non-domain settings
// (reader:fitToWidth, editor:autoSave, ...) -- read directly wherever it's needed
// (AudioCacheManager's toggle, and useStorageQuotaWarning's auto-eviction check) rather
// than through a Redux slice. Lives here, not in the UI layer, so a hook that only needs
// this one string doesn't have to import the whole AudioCacheManager component tree.
export const AUDIO_CACHE_AUTO_CLEANUP_KEY = 'storage:audioCacheAutoCleanup';

const DB_NAME = 'spellcast-audio-cache';
// Bumped from 1 → 2: some browsers ended up with this DB already created at version 1 but
// missing the audio_pages object store — a bare `indexedDB.open(dbName)` call elsewhere in
// the app (the storage-usage counters in BrowserStorage.tsx/GrimoireCharts, now fixed) could
// create this database with no store before this module ever opened it itself, and once a
// database exists at a given version, onupgradeneeded never fires again for that same
// version — so the store was permanently missing for anyone who hit that race. Bumping the
// version forces onupgradeneeded to run again for every existing browser, creating the
// store if it's missing (the existence check inside is already idempotent).
const DB_VERSION = 2;
const STORE_NAME = 'audio_pages';

// Bumped 2 → 3: the backend TTS request contract changed (client now sends the raw Tiptap
// Node tree instead of a flattened segment list — see TCORE-77), which can shift how the
// backend parses text into timeline entries. Invalidates all previously cached audio+timeline
// pairs on rollout rather than risking a stale timeline that no longer lines up with the doc.
//
// Bumped 3 → 4: the backend's sentence splitting itself changed after the above shipped (per-
// text-node → per-paragraph-merged, fixing sentences fragmenting at inline marks/line breaks
// — Spellcast-API commit 0acfb87). Any audio cached under version 3 was already synthesized
// with the old, broken segmentation and would otherwise keep being served as "valid".
export const AUDIO_CACHE_VERSION = 4;

let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
  });
  return dbPromise;
};

const makeKey = (spellId: string, page: number, voice: string) =>
  `${spellId}_${page}_${voice}`;

// Shared by every function below that needs to recover {spellId, page, voice} from a raw
// key -- splitting on the first two `_` is safe because spellId is a UUID (hyphens, no
// underscores) and page is numeric, so whatever remains is the voice id verbatim even if a
// future voice id itself contained an underscore.
const parseKey = (key: string): { spellId: string; page: number; voice: string } | null => {
  const firstSep = key.indexOf('_');
  if (firstSep === -1) return null;
  const spellId = key.slice(0, firstSep);
  const rest = key.slice(firstSep + 1);
  const secondSep = rest.indexOf('_');
  if (secondSep === -1) return null;
  const page = Number(rest.slice(0, secondSep));
  const voice = rest.slice(secondSep + 1);
  if (Number.isNaN(page)) return null;
  return { spellId, page, voice };
};

export const getCachedAudio = async (
  spellId: string,
  page: number,
  voice: string,
): Promise<{ blob: Blob; timeline: TimelineEntry[]; cacheVersion?: number } | null> => {
  const db = await openDB();
  const key = makeKey(spellId, page, voice);
  const record = await new Promise<{ id: string; blob: Blob; timeline?: TimelineEntry[]; cacheVersion?: number } | undefined>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject((e.target as IDBRequest).error);
  });
  if (!record) return null;

  // TCORE-118: "touch" the record on every real cache hit so lastAccessed reflects actual
  // usage, not just when it was synthesized -- evictLeastRecentlyUsedAudio relies on this
  // to skip audio someone is still actively reading past whatever was cached longest ago.
  // Best-effort/fire-and-forget: a failed touch would only make this one entry look
  // slightly older than it is to the LRU sweep, never lose or corrupt anything.
  const touchRequest = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME)
    .put({ ...record, lastAccessed: Date.now() });
  touchRequest.onerror = () => console.error('[audioCache] Failed to touch lastAccessed for', key);

  return { blob: record.blob, timeline: record.timeline ?? [], cacheVersion: record.cacheVersion };
};

export const setCachedAudio = async (
  spellId: string,
  page: number,
  voice: string,
  blob: Blob,
  timeline: TimelineEntry[] = [],
): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put({
      id: makeKey(spellId, page, voice), blob, timeline, cacheVersion: AUDIO_CACHE_VERSION, lastAccessed: Date.now(),
    });
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject((e.target as IDBRequest).error);
  });
};

export interface CachedAudioEntry {
  page: number;
  voice: string;
  blob: Blob;
  timeline: TimelineEntry[];
}

// Enumerates every cached audio+timeline pair for a spell, grouped by voice — used by the
// .spell export flow (TCORE-78) to bundle renders/<voice>/ without needing to know in
// advance which voices/pages happen to be cached. Keys are `${spellId}_${page}_${voice}`;
// splitting on the first two `_` is safe because spellId is a UUID (hyphens, no
// underscores) and page is numeric, so whatever remains is the voice id verbatim even if a
// future voice id itself contained an underscore.
export const getCachedAudioEntriesForSpell = async (spellId: string): Promise<CachedAudioEntry[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const entries: CachedAudioEntry[] = [];
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).openCursor();
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (!cursor) { resolve(entries); return; }
      const key = cursor.key as string;
      const prefix = `${spellId}_`;
      if (key.startsWith(prefix)) {
        const rest = key.slice(prefix.length);
        const sep = rest.indexOf('_');
        if (sep !== -1) {
          const page = Number(rest.slice(0, sep));
          const voice = rest.slice(sep + 1);
          const record = cursor.value as { blob: Blob; timeline?: TimelineEntry[] };
          if (!Number.isNaN(page) && record.timeline && record.timeline.length > 0) {
            // Only export pairs that actually have a timeline — audio without its timeline
            // (or vice versa) is never packaged, per the .spell renders/ co-location rule.
            entries.push({ page, voice, blob: record.blob, timeline: record.timeline });
          }
        }
      }
      cursor.continue();
    };
    req.onerror = (e) => reject((e.target as IDBRequest).error);
  });
};

export const clearSpellAudioCache = async (spellId: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.openCursor();
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        if ((cursor.key as string).startsWith(`${spellId}_`)) cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// TCORE-118: only this spell+voice combination -- the finer-grained sibling of
// clearSpellAudioCache (which drops every voice for a spell at once).
export const clearAudioCacheForVoice = async (spellId: string, voice: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.openCursor();
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        const parsed = parseKey(cursor.key as string);
        if (parsed && parsed.spellId === spellId && parsed.voice === voice) cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const clearAllAudioCache = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).clear();
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject((e.target as IDBRequest).error);
  });
};

export interface AudioCacheSpellSummary {
  totalBytes: number;
  byVoice: Record<string, number>;
  lastAccessed: number;
}

export interface AudioCacheSummary {
  totalBytes: number;
  bySpell: Record<string, AudioCacheSpellSummary>;
}

// TCORE-118: one full pass to size the cache for the storage-management UI -- per spell,
// per voice within each spell, and a spell-level lastAccessed (the most recent of its own
// entries) so the UI can show which spells' audio hasn't been touched in a while. Reads
// blob.size (metadata Blob already carries, not its bytes) so this never has to load actual
// audio data into memory just to report on it.
export const getAudioCacheSummary = async (): Promise<AudioCacheSummary> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const summary: AudioCacheSummary = { totalBytes: 0, bySpell: {} };
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).openCursor();
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (!cursor) { resolve(summary); return; }
      const parsed = parseKey(cursor.key as string);
      const record = cursor.value as { blob: Blob; lastAccessed?: number };
      if (parsed) {
        const size = record.blob?.size ?? 0;
        const lastAccessed = record.lastAccessed ?? 0;
        const spell = summary.bySpell[parsed.spellId] ??= { totalBytes: 0, byVoice: {}, lastAccessed: 0 };
        spell.totalBytes += size;
        spell.byVoice[parsed.voice] = (spell.byVoice[parsed.voice] ?? 0) + size;
        spell.lastAccessed = Math.max(spell.lastAccessed, lastAccessed);
        summary.totalBytes += size;
      }
      cursor.continue();
    };
    req.onerror = (e) => reject((e.target as IDBRequest).error);
  });
};

// TCORE-118 "LRU" auto-cleanup: deletes whole entries (not partial blobs) oldest-lastAccessed
// first until targetBytes has been freed or the cache is empty, whichever comes first.
// Returns the bytes actually freed, which can be less than targetBytes if the cache alone
// can't cover it. A record missing lastAccessed (shouldn't happen post-TCORE-118, but covers
// anything synthesized before this field existed) sorts as if never accessed -- oldest
// possible -- so it's evicted before anything with a real timestamp.
export const evictLeastRecentlyUsedAudio = async (targetBytes: number): Promise<number> => {
  if (targetBytes <= 0) return 0;
  const db = await openDB();
  const candidates = await new Promise<{ key: string; size: number; lastAccessed: number }[]>((resolve, reject) => {
    const found: { key: string; size: number; lastAccessed: number }[] = [];
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).openCursor();
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (!cursor) { resolve(found); return; }
      const record = cursor.value as { blob: Blob; lastAccessed?: number };
      found.push({ key: cursor.key as string, size: record.blob?.size ?? 0, lastAccessed: record.lastAccessed ?? 0 });
      cursor.continue();
    };
    req.onerror = (e) => reject((e.target as IDBRequest).error);
  });
  candidates.sort((a, b) => a.lastAccessed - b.lastAccessed);

  let freed = 0;
  const keysToDelete: string[] = [];
  for (const candidate of candidates) {
    if (freed >= targetBytes) break;
    keysToDelete.push(candidate.key);
    freed += candidate.size;
  }
  if (keysToDelete.length === 0) return 0;

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    keysToDelete.forEach((key) => store.delete(key));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return freed;
};
