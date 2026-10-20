import { dataUrlsIn, imagesOf, type SpellImageSource } from '../utils/spellImages';

// A spell's local repository: its seals (snapshots of its files), its versions (lines of work,
// each pointing at its latest seal) and which version it's on. Its files are stored by content
// (sha256), once per spell however many seals hold them. The logic lives in
// utils/spellVersions; this is only where it's kept.
//
// A seal's images are stored here only while the spell's record doesn't hold them: the record
// keeps its images inline (as it always has), so an image the work still uses is never stored
// twice. An image leaving the record that a seal holds is kept here first (keepSealedImages),
// and one coming back to it is dropped from here.
//
// A database of its own (like the audio cache), so the spells' database never needs a version
// bump for it.

const DB_NAME = 'spellcast-repository';
// 2: seals keyed per spell. Version 1 only ever existed in builds that were never released:
// it's started over, its repositories made again the next time a spell is opened in the
// editor.
const DB_VERSION = 2;
const BLOBS = 'blobs';
const SEALS = 'seals';
const VERSIONS = 'versions';
const REPOS = 'repos';

export interface BlobRecord {
  // `${spellId}:${sha256}`
  key: string;
  data: Uint8Array;
  // An image's or a cover's media type, kept as it was.
  type?: string;
}

// A seal: the files a version had (path -> sha256), its parent seal(s) and when it was made.
// Its id is the sha256 of the rest but the spell (whose id is local to this device). No
// author: a seal never says who made it. Kept per spell: two spells can hold the same seal.
export interface SealRecord {
  id: string;
  spellId: string;
  parentIds: string[];
  files: Record<string, string>;
  message: string;
  createdAt: string;
}

export interface VersionRecord {
  spellId: string;
  name: string;
  headSealId: string;
  createdAt: string;
}

export interface RepoRecord {
  spellId: string;
  currentVersion: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (event.oldVersion === 1) {
        for (const name of [BLOBS, SEALS, VERSIONS, REPOS]) {
          if (db.objectStoreNames.contains(name)) db.deleteObjectStore(name);
        }
      }
      if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(SEALS)) db.createObjectStore(SEALS, { keyPath: ['spellId', 'id'] }).createIndex('spellId', 'spellId');
      if (!db.objectStoreNames.contains(VERSIONS)) db.createObjectStore(VERSIONS, { keyPath: ['spellId', 'name'] }).createIndex('spellId', 'spellId');
      if (!db.objectStoreNames.contains(REPOS)) db.createObjectStore(REPOS, { keyPath: 'spellId' });
    };
    request.onsuccess = () => {
      const db = request.result;
      // A connection the browser closes (or another tab upgrades) is opened again next time.
      const forget = () => { dbPromise = null; };
      db.onclose = forget;
      db.onversionchange = () => { db.close(); forget(); };
      resolve(db);
    };
    request.onerror = () => { dbPromise = null; reject(request.error); };
  });
  return dbPromise;
};

const done = (tx: IDBTransaction) => new Promise<void>((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error);
  tx.onabort = () => reject(tx.error);
});

const result = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

export const blobKey = (spellId: string, sha256: string) => `${spellId}:${sha256}`;

// One at a time per spell, across tabs: writing its record's images and sealing it each read
// what the other one writes (which images the record holds, which ones its seals do).
const localLocks = new Map<string, Promise<unknown>>();
export const withSpellLock = <T,>(spellId: string, task: () => Promise<T>): Promise<T> => {
  const name = `spellcast-spell:${spellId}`;
  if (typeof navigator !== 'undefined' && navigator.locks?.request) return navigator.locks.request(name, task) as Promise<T>;
  // No Web Locks (an older browser, tests): one at a time in this tab.
  const previous = localLocks.get(name) ?? Promise.resolve();
  const next = previous.then(task, task);
  const settled = next.catch(() => undefined);
  localLocks.set(name, settled);
  void settled.then(() => { if (localLocks.get(name) === settled) localLocks.delete(name); });
  return next;
};

export const getRepo = async (spellId: string): Promise<RepoRecord | undefined> =>
  result((await openDB()).transaction(REPOS).objectStore(REPOS).get(spellId));

export const getSeal = async (spellId: string, id: string): Promise<SealRecord | undefined> =>
  result((await openDB()).transaction(SEALS).objectStore(SEALS).get([spellId, id]));

// Every seal of a spell (its history, to find where two versions meet).
export const getSeals = async (spellId: string): Promise<SealRecord[]> =>
  result((await openDB()).transaction(SEALS).objectStore(SEALS).index('spellId').getAll(spellId));

export const getVersion = async (spellId: string, name: string): Promise<VersionRecord | undefined> =>
  result((await openDB()).transaction(VERSIONS).objectStore(VERSIONS).get([spellId, name]));

export const getVersions = async (spellId: string): Promise<VersionRecord[]> =>
  result((await openDB()).transaction(VERSIONS).objectStore(VERSIONS).index('spellId').getAll(spellId));

export const getBlob = async (spellId: string, sha256: string): Promise<BlobRecord | undefined> =>
  result((await openDB()).transaction(BLOBS).objectStore(BLOBS).get(blobKey(spellId, sha256)));

/** Stores the files not stored yet for this spell (one at a time: a spell's images can be big). */
export const putBlobs = async (spellId: string, blobs: { sha256: string; data: Uint8Array; type?: string }[]): Promise<void> => {
  const db = await openDB();
  for (const blob of blobs) {
    const key = blobKey(spellId, blob.sha256);
    const tx = db.transaction(BLOBS, 'readwrite');
    const store = tx.objectStore(BLOBS);
    const exists = await result(store.getKey(key));
    if (exists === undefined) store.put({ key, data: blob.data, ...(blob.type ? { type: blob.type } : {}) } satisfies BlobRecord);
    await done(tx);
  }
};

// The images the spell's seals hold, by sha256.
const sealedImages = async (spellId: string): Promise<Set<string>> => {
  const seals = await result((await openDB()).transaction(SEALS).objectStore(SEALS).index('spellId').getAll(spellId)) as SealRecord[];
  const found = new Set<string>();
  for (const seal of seals) {
    for (const [path, sha256] of Object.entries(seal.files)) {
      if (path.startsWith('assets/') || path.startsWith('cover.')) found.add(sha256);
    }
  }
  return found;
};

const deleteBlobs = async (spellId: string, sha256s: string[]): Promise<void> => {
  if (sha256s.length === 0) return;
  const tx = (await openDB()).transaction(BLOBS, 'readwrite');
  for (const sha256 of sha256s) tx.objectStore(BLOBS).delete(blobKey(spellId, sha256));
  await done(tx);
};

/**
 * Writes a spell's record (`write`) keeping its seals whole: an image the record stops holding
 * that a seal holds is stored here first, and one the record holds again is dropped from here
 * once it's written. `before` is the record as stored, `after` what's written. Call it holding
 * the spell's lock (withSpellLock). A spell without versions is just written.
 */
export const keepSealedImages = async <T,>(
  spellId: string, before: SpellImageSource | undefined, after: SpellImageSource, write: () => Promise<T>,
): Promise<T> => {
  if (!before || !(await getRepo(spellId))) return write();
  const was = dataUrlsIn(before.pagesContent, before.originalPagesContent);
  const is = dataUrlsIn(after.pagesContent, after.originalPagesContent);
  const coverChanged = before.cover !== after.cover;
  const gone = await imagesOf([...was].filter(url => !is.has(url)), coverChanged ? [before.cover] : []);
  const back = await imagesOf([...is].filter(url => !was.has(url)), coverChanged ? [after.cover] : []);
  const sealed = await sealedImages(spellId);
  // Leaving the record and back in it at once (the cover becoming a page's image): not gone.
  const backShas = new Set(back.map(image => image.sha256));
  await putBlobs(spellId, gone.filter(image => sealed.has(image.sha256) && !backShas.has(image.sha256)));
  const written = await write();
  await deleteBlobs(spellId, [...backShas].filter(sha256 => sealed.has(sha256)));
  return written;
};

/** Writes a seal and moves a version to it (creating the version if it's new), and makes that
 * version the spell's current one -- all at once. */
export const putSealAndHead = async (seal: SealRecord, version: VersionRecord): Promise<void> => {
  const tx = (await openDB()).transaction([SEALS, VERSIONS, REPOS], 'readwrite');
  tx.objectStore(SEALS).put(seal);
  tx.objectStore(VERSIONS).put(version);
  tx.objectStore(REPOS).put({ spellId: version.spellId, currentVersion: version.name } satisfies RepoRecord);
  await done(tx);
};

/** Adds a version (at an existing seal) and makes it the current one. */
export const putVersionAsCurrent = async (version: VersionRecord): Promise<void> => {
  const tx = (await openDB()).transaction([VERSIONS, REPOS], 'readwrite');
  tx.objectStore(VERSIONS).put(version);
  tx.objectStore(REPOS).put({ spellId: version.spellId, currentVersion: version.name } satisfies RepoRecord);
  await done(tx);
};

export const setCurrentVersion = async (spellId: string, name: string): Promise<void> => {
  const tx = (await openDB()).transaction(REPOS, 'readwrite');
  tx.objectStore(REPOS).put({ spellId, currentVersion: name } satisfies RepoRecord);
  await done(tx);
};

/** Removes everything of a spell's repository (the spell itself was deleted). */
export const deleteSpellRepository = async (spellId: string): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction([BLOBS, SEALS, VERSIONS, REPOS], 'readwrite');
  tx.objectStore(BLOBS).delete(IDBKeyRange.bound(`${spellId}:`, `${spellId}:￿`));
  const deleteByIndex = (storeName: string) => {
    const request = tx.objectStore(storeName).index('spellId').openCursor(spellId);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      cursor.delete();
      cursor.continue();
    };
  };
  deleteByIndex(SEALS);
  deleteByIndex(VERSIONS);
  tx.objectStore(REPOS).delete(spellId);
  await done(tx);
};

/** Removes every spell's repository (all local data cleared). */
export const clearSpellRepositories = async (): Promise<void> => {
  const tx = (await openDB()).transaction([BLOBS, SEALS, VERSIONS, REPOS], 'readwrite');
  for (const name of [BLOBS, SEALS, VERSIONS, REPOS]) tx.objectStore(name).clear();
  await done(tx);
};
