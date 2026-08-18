import { DB_NAME, DB_VERSION, SPELLS_STORE_NAME } from "../config/api";
import { Spell, SpellProgress } from "../interfaces";

// The pre-rename (TCORE-78) store name, frozen on purpose: it names whatever a
// browser already has on disk from before this migration shipped, so it must never
// change even though SPELLS_STORE_NAME's env-configurable default did.
const LEGACY_DOCUMENTS_STORE_NAME = 'documents';
const MIGRATION_COMPLETE_KEY = 'spellcast:migration:documentsToSpells:complete';

// Loose user match: a spell's userId and the session id come from the same
// source, but historical records may store it in a different type (e.g. number
// vs string after a backend change). Compare as strings so old spells still
// resolve, without ever matching a genuinely different user.
const sameUser = (a: string | undefined, b: string | undefined): boolean =>
  a != null && b != null && String(a) === String(b);

let dbPromise: Promise<IDBDatabase> | null = null;

export const clearAllData = async (): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(SPELLS_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SPELLS_STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
};

// Silent, resumable background migration of pre-existing `documents` records into
// `spells` (TCORE-78). Runs fire-and-forget after openDB() resolves — never blocks
// the app's first read/write, which already target `spells` exclusively from the
// moment this store exists (see onupgradeneeded below). `put` is idempotent on `id`,
// so re-running this after an interrupted previous attempt (tab closed mid-copy) is
// safe: it just re-copies, no duplicates, no partial state. Only sets the completion
// flag once source/destination counts verifiably match. Deleting the legacy store is
// intentionally NOT done here or in this ticket — that's a later, separate version
// bump (see db/index.ts's onupgradeneeded comment) once this rollout has had time to
// reach the active user base, gated on a defensive re-check at that time rather than
// blindly trusting this flag (a cleared localStorage without a cleared IndexedDB, or
// a synced-but-inconsistent browser profile, could otherwise cause data loss).
let migrationAttempted = false;

// Lets an app-level component (mounted once, e.g. DefaultLayout) refetch the spell
// list after a background migration actually copies something — without this, a
// component that already called getSpellsFromDB() in the same tick as openDB()
// resolving (i.e. before the copy below lands) would keep showing an empty/stale
// list until something else happens to trigger a refetch, which would look
// indistinguishable from data loss even though nothing was lost. This module
// intentionally has no Redux/store import (db/ stays a leaf per the app's layering
// rules) — callers decide what "refetch" means.
type MigrationListener = () => void;
const migrationListeners: MigrationListener[] = [];
export const onSpellsMigrated = (listener: MigrationListener): void => {
  migrationListeners.push(listener);
};

const migrateLegacyDocumentsStore = async (db: IDBDatabase): Promise<void> => {
  if (migrationAttempted) return;
  migrationAttempted = true;

  if (!db.objectStoreNames.contains(LEGACY_DOCUMENTS_STORE_NAME)) return;
  if (localStorage.getItem(MIGRATION_COMPLETE_KEY) === '1') return;

  try {
    const legacyRecords = await new Promise<Spell[]>((resolve, reject) => {
      const tx = db.transaction(LEGACY_DOCUMENTS_STORE_NAME, 'readonly');
      const req = tx.objectStore(LEGACY_DOCUMENTS_STORE_NAME).getAll();
      req.onsuccess = () => resolve((req.result as Spell[]) ?? []);
      req.onerror = () => reject(req.error);
    });

    if (legacyRecords.length > 0) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(SPELLS_STORE_NAME, 'readwrite');
        const store = tx.objectStore(SPELLS_STORE_NAME);
        legacyRecords.forEach((record) => store.put(record));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    const [legacyCount, spellsCount] = await Promise.all([
      new Promise<number>((resolve, reject) => {
        const req = db.transaction(LEGACY_DOCUMENTS_STORE_NAME, 'readonly').objectStore(LEGACY_DOCUMENTS_STORE_NAME).count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
      new Promise<number>((resolve, reject) => {
        const req = db.transaction(SPELLS_STORE_NAME, 'readonly').objectStore(SPELLS_STORE_NAME).count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
    ]);

    if (legacyCount === spellsCount) {
      localStorage.setItem(MIGRATION_COMPLETE_KEY, '1');
      if (legacyRecords.length > 0) {
        migrationListeners.forEach((listener) => listener());
      }
    } else {
      // Leave the flag unset — the next app open re-attempts (migrationAttempted is
      // per-session, not persisted), and `put` being idempotent makes that safe.
      console.warn(`[IndexedDB] documents->spells migration count mismatch (legacy=${legacyCount}, spells=${spellsCount}); will retry on next open.`);
    }
  } catch (err) {
    console.error('[IndexedDB] documents->spells background migration failed, will retry on next open:', err);
  }
};

const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Purely additive (TCORE-78): never delete an existing store here, regardless
      // of oldVersion. The legacy `documents` store (if present) is left fully intact
      // and queryable — migrateLegacyDocumentsStore() backfills it into `spells` in
      // the background after open, and only a LATER version bump (not part of this
      // rollout) drops `documents`, defensively re-verifying record counts itself
      // rather than trusting any flag set here.
      if (!db.objectStoreNames.contains(SPELLS_STORE_NAME)) {
        const store = db.createObjectStore(SPELLS_STORE_NAME, { keyPath: 'id' });
        store.createIndex('title', 'title', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(SPELLS_STORE_NAME)) {
        db.close();
        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
        deleteRequest.onsuccess = () => {
          console.warn("Broken database detected and deleted. Reloading the page to fix the issue.");
          window.location.reload();
        };
        deleteRequest.onerror = () => {
          reject(new Error("Failed to delete corrupt database."));
        };
      } else {
        resolve(db);
        void migrateLegacyDocumentsStore(db);
      }
    };

    request.onblocked = () => {
      // Fires when another open tab still holds an older DB version; without
      // handling it the open() request hangs indefinitely. Common in Edge with
      // multiple tabs / restored sessions.
      console.error('[IndexedDB] open blocked: another tab holds an older version of', DB_NAME);
      reject(new Error(`IndexedDB open blocked for "${DB_NAME}" (close other tabs of the app).`));
    };

    request.onerror = (event) => {
      const err = (event.target as IDBOpenDBRequest).error;
      console.error(`[IndexedDB] open("${DB_NAME}", ${DB_VERSION}) failed:`, err?.name, err?.message);
      reject(err);
    };
  });

  return dbPromise;
};

export const saveSpellToDB = async (spell: Omit<Spell, 'id' | 'createdAt' | 'progress'>): Promise<string> => {
  const db = await openDB();
  const transaction = db.transaction(SPELLS_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SPELLS_STORE_NAME);

  const newSpell: Spell = {
    ...spell,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    progress: {
      currentPage: 0,
      pagesProgress: [],
      lastReadSentenceIndex: 0,
    }
  };

  return new Promise((resolve, reject) => {
    const request = store.add(newSpell);
    request.onsuccess = () => resolve(newSpell.id);
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
};

export const getSpellsFromDB = async (userId: string | undefined): Promise<Spell[]> => {
  const db = await openDB();
  const transaction = db.transaction(SPELLS_STORE_NAME, 'readonly');
  const spellStore = transaction.objectStore(SPELLS_STORE_NAME);
  const spellIndex = spellStore.index('userId');

  return new Promise((resolve, reject) => {
    const getAllRequest = spellIndex.getAll(userId);

    getAllRequest.onerror = () => {
      const err = getAllRequest.error;
      console.error('[IndexedDB] getSpellsFromDB getAll(userId) failed:', err?.name, err?.message);
      reject(err);
    };

    getAllRequest.onsuccess = () => {
      // WebKit/Safari can return null entries from IDBIndex.getAll() for records
      // deleted concurrently between its key snapshot and value fetch (e.g. a
      // delete + refetch racing across the components that share this store).
      // Drop those before anything downstream (e.g. sort by createdAt) touches them.
      const exact = (getAllRequest.result as (Spell | null)[]).filter((s): s is Spell => s != null);
      // Fast path: the userId index matched (types agree), or there's no user to
      // filter by. Otherwise fall back to a full scan with a type-tolerant match
      // so spells saved under a differently-typed id (historical data) still
      // list instead of silently disappearing. Only runs when the index is empty.
      if (exact.length > 0 || userId == null) {
        resolve(exact);
        return;
      }
      const scanRequest = spellStore.getAll();
      scanRequest.onerror = () => {
        const err = scanRequest.error;
        console.error('[IndexedDB] getSpellsFromDB fallback scan failed:', err?.name, err?.message);
        reject(err);
      };
      scanRequest.onsuccess = () => {
        const matched = (scanRequest.result as (Spell | null)[])
          .filter((s): s is Spell => s != null)
          .filter((s) => sameUser(s.userId, userId));
        if (matched.length > 0) {
          console.warn(`[IndexedDB] Listed ${matched.length} spell(s) via type-tolerant userId fallback (stored id type differs from session id).`);
        }
        resolve(matched);
      };
    };
  });
};

export const getSpellById = async (id: string, userId: string | undefined): Promise<Spell | undefined> => {
  const db = await openDB();
  const transaction = db.transaction(SPELLS_STORE_NAME, 'readonly');
  const spellStore = transaction.objectStore(SPELLS_STORE_NAME);

  return new Promise((resolve, reject) => {
    const spellRequest = spellStore.get(id);

    spellRequest.onerror = () => {
      reject(spellRequest.error);
    };

    spellRequest.onsuccess = () => {
      const spell = spellRequest.result as Spell | undefined;
      if (!spell || !sameUser(spell.userId, userId)) {
        return resolve(undefined);
      }
      resolve(spell);
    };
  });
};

export const deleteSpellFromDB = async (id: string, userId: string | undefined): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(SPELLS_STORE_NAME, 'readwrite');
  const spellStore = transaction.objectStore(SPELLS_STORE_NAME);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    const getRequest = spellStore.get(id);
    getRequest.onsuccess = () => {
      const spell = getRequest.result as Spell | undefined;
      if (spell && sameUser(spell.userId, userId)) {
        spellStore.delete(id);
      } else {
        transaction.abort();
        reject('Spell not found or you do not have permission to delete it.');
      }
    };
  });
};

export const updateSpellContent = async (id: string, userId: string, updates: { title: string; pagesContent: string }): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(SPELLS_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SPELLS_STORE_NAME);

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const spell = getRequest.result as Spell | undefined;
      if (spell && sameUser(spell.userId, userId)) {
        const putRequest = store.put({ ...spell, title: updates.title, pagesContent: updates.pagesContent });
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = (e) => reject((e.target as IDBRequest).error);
      } else {
        reject(new Error('Spell not found or user mismatch.'));
      }
    };
    getRequest.onerror = (e) => reject((e.target as IDBRequest).error);
  });
};

export const updateSpellFull = async (
  id: string,
  userId: string,
  updates: { title: string; pagesContent: string; pdf: Blob; cover?: Blob; originalPdf?: Blob; originalPagesContent?: string }
): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(SPELLS_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SPELLS_STORE_NAME);

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const spell = getRequest.result as Spell | undefined;
      if (spell && sameUser(spell.userId, userId)) {
        const putRequest = store.put({ ...spell, ...updates });
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = (e) => reject((e.target as IDBRequest).error);
      } else {
        reject(new Error('Spell not found or user mismatch.'));
      }
    };
    getRequest.onerror = (e) => reject((e.target as IDBRequest).error);
  });
};

export const getSpellOriginalPages = async (id: string, userId: string | undefined): Promise<string | undefined> => {
  const db = await openDB();
  const transaction = db.transaction(SPELLS_STORE_NAME, 'readonly');
  const store = transaction.objectStore(SPELLS_STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const spell = request.result as Spell | undefined;
      if (!spell || !sameUser(spell.userId, userId)) return resolve(undefined);
      resolve(spell.originalPagesContent);
    };
    request.onerror = (e) => reject((e.target as IDBRequest).error);
  });
};

export const updateSpellProgress = async (spellId: string, userId: string, progress: SpellProgress): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(SPELLS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(SPELLS_STORE_NAME);

    return new Promise((resolve, reject) => {
        const getRequest = store.get(spellId);

        getRequest.onsuccess = () => {
            const spell = getRequest.result as Spell | undefined;
            if (spell && sameUser(spell.userId, userId)) {
                const updatedSpell = { ...spell, progress };
                const putRequest = store.put(updatedSpell);

                putRequest.onsuccess = () => resolve();
                putRequest.onerror = (event) => reject((event.target as IDBRequest).error);
            } else {
                reject(new Error('Spell not found or user mismatch.'));
            }
        };

        getRequest.onerror = (event) => reject((event.target as IDBRequest).error);
    });
};
