// A spell's local repository: its seals (snapshots of its files), its versions (lines of work,
// each pointing at its latest seal) and which version it's on. Its files are stored by content
// (sha256), once per spell however many seals hold them. The logic lives in
// utils/spellVersions; this is only where it's kept.
//
// A database of its own (like the audio cache), so the spells' database never needs a version
// bump for it.

const DB_NAME = 'spellcast-repository';
const DB_VERSION = 1;
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
// Its id is the sha256 of the rest. No author: a seal never says who made it.
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
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(SEALS)) db.createObjectStore(SEALS, { keyPath: 'id' }).createIndex('spellId', 'spellId');
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

export const getRepo = async (spellId: string): Promise<RepoRecord | undefined> =>
  result((await openDB()).transaction(REPOS).objectStore(REPOS).get(spellId));

export const getSeal = async (id: string): Promise<SealRecord | undefined> =>
  result((await openDB()).transaction(SEALS).objectStore(SEALS).get(id));

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
