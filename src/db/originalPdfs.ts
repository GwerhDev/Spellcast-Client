// The original PDF a spell was ingested from (TCORE-90) — kept ONLY if the user opted to
// (the "saveOriginal" flag on upload), and only ever useful for re-extracting with a better
// parser later or handing the file back to the user. It is never rendered anywhere: the
// reader/editor work exclusively from `pagesContent`/`originalPagesContent` (JSON). It used
// to live embedded as a Blob on the `Spell` record itself, which bloated every list/export
// with a binary nobody read. Split into its own DB, own store, keyed by spellId — same shape
// as `src/db/audioCache.ts` for the same reason (a spell's own record stays small and fast
// to list/export regardless of whether/how many big binaries exist for it elsewhere).
const DB_NAME = 'spellcast-original-pdfs';
const DB_VERSION = 1;
const STORE_NAME = 'original_pdfs';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'spellId' });
      }
    };
    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
  });
  return dbPromise;
};

export const getOriginalPdf = async (spellId: string): Promise<Blob | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(spellId);
    request.onsuccess = () => {
      const record = request.result as { spellId: string; blob: Blob } | undefined;
      resolve(record ? record.blob : null);
    };
    request.onerror = (e) => reject((e.target as IDBRequest).error);
  });
};

export const setOriginalPdf = async (spellId: string, blob: Blob): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put({ spellId, blob });
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject((e.target as IDBRequest).error);
  });
};

export const deleteOriginalPdf = async (spellId: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(spellId);
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject((e.target as IDBRequest).error);
  });
};

export const hasOriginalPdf = async (spellId: string): Promise<boolean> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    // count() on a get-by-key range is cheap and avoids pulling the Blob into memory
    // just to check existence.
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).count(spellId);
    request.onsuccess = () => resolve(request.result > 0);
    request.onerror = (e) => reject((e.target as IDBRequest).error);
  });
};

// One read for every spellId that has an original PDF stored -- used by SpellList's "pdf"
// filter so it doesn't have to do one IndexedDB read per row.
export const getAllOriginalPdfIds = async (): Promise<Set<string>> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAllKeys();
    request.onsuccess = () => resolve(new Set(request.result as string[]));
    request.onerror = (e) => reject((e.target as IDBRequest).error);
  });
};
