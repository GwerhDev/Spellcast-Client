import type { TimelineEntry } from '../services/tts';

const DB_NAME = 'spellcast-audio-cache';
// Bumped from 1 → 2: some browsers ended up with this DB already created at version 1 but
// missing the audio_pages object store — a bare `indexedDB.open(dbName)` call elsewhere in
// the app (the storage-usage counters in BrowserStorage.tsx/LibraryCharts, now fixed) could
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

export const getCachedAudio = async (
  spellId: string,
  page: number,
  voice: string,
): Promise<{ blob: Blob; timeline: TimelineEntry[]; cacheVersion?: number } | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(makeKey(spellId, page, voice));
    request.onsuccess = () => {
      const record = request.result as { id: string; blob: Blob; timeline?: TimelineEntry[]; cacheVersion?: number } | undefined;
      if (!record) { resolve(null); return; }
      resolve({ blob: record.blob, timeline: record.timeline ?? [], cacheVersion: record.cacheVersion });
    };
    request.onerror = (e) => reject((e.target as IDBRequest).error);
  });
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
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put({ id: makeKey(spellId, page, voice), blob, timeline, cacheVersion: AUDIO_CACHE_VERSION });
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject((e.target as IDBRequest).error);
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
