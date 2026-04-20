const DB_NAME = 'spellcast-audio-cache';
const DB_VERSION = 1;
const STORE_NAME = 'audio_pages';

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

const makeKey = (documentId: string, page: number, voice: string) =>
  `${documentId}_${page}_${voice}`;

export const getCachedAudio = async (
  documentId: string,
  page: number,
  voice: string,
): Promise<Blob | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(makeKey(documentId, page, voice));
    request.onsuccess = () => resolve((request.result as { id: string; blob: Blob } | undefined)?.blob ?? null);
    request.onerror = (e) => reject((e.target as IDBRequest).error);
  });
};

export const setCachedAudio = async (
  documentId: string,
  page: number,
  voice: string,
  blob: Blob,
): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put({ id: makeKey(documentId, page, voice), blob });
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject((e.target as IDBRequest).error);
  });
};

export const clearDocumentAudioCache = async (documentId: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.openCursor();
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        if ((cursor.key as string).startsWith(`${documentId}_`)) cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
