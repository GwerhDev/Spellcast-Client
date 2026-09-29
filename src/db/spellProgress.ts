import type { SpellProgress } from '../interfaces';

// A reader's position in each spell, in its own small database -- same approach as
// originalPdfs.ts and audioCache.ts. Progress changes on every sentence; kept embedded on
// the Spell record, each update had to read and rewrite the whole record (all its pages,
// including embedded images: tens of MB for an illustrated book), and that write locked
// the spells store for every other read meanwhile.
//
// Additive and backward compatible: nothing is moved or deleted. Spells saved before this
// existed keep their embedded `progress`, and it's still what's read until their first
// update lands here (see withStoredProgress in db/index.ts).
const DB_NAME = 'spellcast-progress';
const DB_VERSION = 1;
const STORE_NAME = 'progress';

interface ProgressRecord {
  spellId: string;
  userId: string | undefined;
  progress: SpellProgress;
  updatedAt: number;
}

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
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      // Another tab upgrading or deleting this database closes our connection; forget it
      // so the next call opens a fresh one instead of reusing a dead handle.
      db.onversionchange = () => { db.close(); dbPromise = null; };
      db.onclose = () => { dbPromise = null; };
      resolve(db);
    };
    request.onerror = (event) => {
      dbPromise = null;
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
  return dbPromise;
};

export const getStoredProgress = async (spellId: string): Promise<ProgressRecord | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(spellId);
    request.onsuccess = () => resolve(request.result as ProgressRecord | undefined);
    request.onerror = () => reject(request.error);
  });
};

export const getAllStoredProgress = async (): Promise<Map<string, ProgressRecord>> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      const records = (request.result as (ProgressRecord | null)[]).filter((r): r is ProgressRecord => r != null);
      resolve(new Map(records.map(r => [r.spellId, r])));
    };
    request.onerror = () => reject(request.error);
  });
};

export const setStoredProgress = async (spellId: string, userId: string | undefined, progress: SpellProgress): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const record: ProgressRecord = { spellId, userId, progress, updatedAt: Date.now() };
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Writes several records in one transaction (e.g. resetting every spell's progress at once).
export const setStoredProgressMany = async (entries: { spellId: string; userId: string | undefined; progress: SpellProgress }[]): Promise<void> => {
  if (entries.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const updatedAt = Date.now();
    entries.forEach(({ spellId, userId, progress }) => {
      const record: ProgressRecord = { spellId, userId, progress, updatedAt };
      store.put(record);
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
};

export const deleteStoredProgress = async (spellId: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(spellId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const clearStoredProgress = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
