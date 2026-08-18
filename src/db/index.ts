import { DB_NAME, DB_VERSION, SPELLS_STORE_NAME } from "../config/api";
import { Spell, SpellProgress } from "../interfaces";

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

const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      if (oldVersion > 0) {
        const storeNames = Array.from(db.objectStoreNames);
        storeNames.forEach(name => {
          db.deleteObjectStore(name);
        });
      }

      const store = db.createObjectStore(SPELLS_STORE_NAME, { keyPath: 'id' });
      store.createIndex('title', 'title', { unique: false });
      store.createIndex('createdAt', 'createdAt', { unique: false });
      store.createIndex('userId', 'userId', { unique: false });
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
