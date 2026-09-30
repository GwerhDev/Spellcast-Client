// Each spell's cover frame pick, in its own small database -- same approach as
// spellProgress.ts. Kept on the Spell record, a frame change had to read and rewrite the
// whole record (all its pages, embedded images included: tens of MB for an illustrated
// book) just to change one field, which made picking a frame slow on big spells.
//
// Additive and backward compatible: nothing is moved or deleted. Spells picked before this
// existed keep their embedded `coverFrameId`, and it's still what's read until their first
// change lands here (see withStoredCoverFrame in db/index.ts).
const DB_NAME = 'spellcast-cover-frames';
const DB_VERSION = 1;
const STORE_NAME = 'coverFrames';

export interface CoverFrameRecord {
  spellId: string;
  userId: string | undefined;
  // Spell.coverFrameId's three states: a frame id, null (explicitly no frame), or
  // undefined (follows the caster's default). IndexedDB keeps an explicit undefined.
  coverFrameId: string | null | undefined;
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

export const getStoredCoverFrame = async (spellId: string): Promise<CoverFrameRecord | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(spellId);
    request.onsuccess = () => resolve(request.result as CoverFrameRecord | undefined);
    request.onerror = () => reject(request.error);
  });
};

export const getAllStoredCoverFrames = async (): Promise<Map<string, CoverFrameRecord>> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      const records = (request.result as (CoverFrameRecord | null)[]).filter((r): r is CoverFrameRecord => r != null);
      resolve(new Map(records.map(r => [r.spellId, r])));
    };
    request.onerror = () => reject(request.error);
  });
};

export const setStoredCoverFrame = async (spellId: string, userId: string | undefined, coverFrameId: string | null | undefined): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const record: CoverFrameRecord = { spellId, userId, coverFrameId, updatedAt: Date.now() };
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteStoredCoverFrame = async (spellId: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(spellId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const clearStoredCoverFrames = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
