// Each spell's own pick of the caster's cosmetics -- its page background, sound background
// and companion -- in its own small database, as its cover frame is (see spellCoverFrames):
// a pick changes without reading or rewriting the spell's whole record.
//
// Each pick has the cover frame's three states (see resolveAssetChoice): an asset id, null
// (explicitly none), or absent (the spell follows the caster's default, set from the
// inventory). Absent is stored as the field not being there at all.
const DB_NAME = 'spellcast-spell-cosmetics';
const DB_VERSION = 1;
const STORE_NAME = 'cosmetics';

export type SpellCosmeticKind = 'pageBackground' | 'soundBackground' | 'companion';
export type SpellCosmetics = Partial<Record<SpellCosmeticKind, string | null>>;

interface SpellCosmeticsRecord extends SpellCosmetics {
  spellId: string;
  userId: string | undefined;
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

const KINDS: SpellCosmeticKind[] = ['pageBackground', 'soundBackground', 'companion'];

const picksOf = (record: SpellCosmeticsRecord | undefined): SpellCosmetics => {
  const picks: SpellCosmetics = {};
  if (!record) return picks;
  for (const kind of KINDS) if (kind in record && record[kind] !== undefined) picks[kind] = record[kind];
  return picks;
};

const getRecord = async (spellId: string): Promise<SpellCosmeticsRecord | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(spellId);
    request.onsuccess = () => resolve(request.result as SpellCosmeticsRecord | undefined);
    request.onerror = () => reject(request.error);
  });
};

// A spell's picks, those its user made (another user's record on this device is none of
// theirs).
export const getSpellCosmetics = async (spellId: string, userId: string | undefined): Promise<SpellCosmetics> => {
  const record = await getRecord(spellId);
  return record && record.userId === userId ? picksOf(record) : {};
};

// Sets one pick: an asset id, null (none), or undefined (back to following the default).
export const setSpellCosmetic = async (spellId: string, userId: string | undefined, kind: SpellCosmeticKind, assetId: string | null | undefined): Promise<SpellCosmetics> => {
  const current = await getRecord(spellId);
  const record: SpellCosmeticsRecord = { ...(current && current.userId === userId ? current : {}), spellId, userId, updatedAt: Date.now() };
  if (assetId === undefined) delete record[kind];
  else record[kind] = assetId;
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  return picksOf(record);
};

export const deleteSpellCosmetics = async (spellId: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(spellId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const clearSpellCosmetics = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
