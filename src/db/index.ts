import { DB_NAME, DB_VERSION, SPELLS_STORE_NAME } from "../config/api";
import { Spell, SpellProgress } from "../interfaces";
import { setOriginalPdf, deleteOriginalPdf } from "./originalPdfs";
import { clearSpellAudioCache } from "./audioCache";
import { sameUser } from "../utils/grimoire";
import { getStoredProgress, getAllStoredProgress, setStoredProgress, setStoredProgressMany, deleteStoredProgress, clearStoredProgress } from "./spellProgress";

// The pre-rename (TCORE-78) store name, frozen on purpose: it names whatever a
// browser already has on disk from before this migration shipped, so it must never
// change even though SPELLS_STORE_NAME's env-configurable default did.
const LEGACY_DOCUMENTS_STORE_NAME = 'documents';
const MIGRATION_COMPLETE_KEY = 'spellcast:migration:documentsToSpells:complete';


// Reading progress lives in its own database (see db/spellProgress.ts). A stored record,
// when there is one for the same user, wins over the progress embedded on the spell --
// which is still what every spell saved before that database existed uses until its first
// update. A failed progress read never fails the spell read: the embedded value stands.
const withStoredProgress = <T extends Spell>(spell: T, record: { userId: string | undefined; progress: SpellProgress } | undefined): T =>
  record && sameUser(record.userId, spell.userId) ? { ...spell, progress: record.progress } : spell;

// Where a spell starts: what a new spell is saved with, and what a reset writes back.
export const initialSpellProgress = (): SpellProgress => ({
  currentPage: 0,
  pagesProgress: [],
  lastReadSentenceIndex: 0,
});

let dbPromise: Promise<IDBDatabase> | null = null;

// Once a connection closes for ANY reason -- another tab (or a future openDB() call
// here) bumping the schema version, or the browser force-closing it unexpectedly
// (storage pressure, a crash) -- every future transaction on it throws
// "InvalidStateError: The database connection is closing" forever, because dbPromise
// stays cached and keeps resolving to that same dead connection. Every read across the
// app starts failing at once, which from the UI looks exactly like every spell just
// vanished, even though nothing was ever deleted. Attaching these listeners to every
// connection this module hands out means the next openDB() call after either event
// transparently reopens a fresh connection instead of the app being permanently broken
// until a manual reload.
const registerConnectionLifecycle = (db: IDBDatabase): IDBDatabase => {
  db.onversionchange = () => {
    db.close();
    dbPromise = null;
  };
  db.onclose = () => {
    dbPromise = null;
  };
  return db;
};

export const clearAllData = async (): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(SPELLS_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SPELLS_STORE_NAME);

  await new Promise<void>((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
  coverCache.clear();
  knownOwnership.clear();
  announceCoverChange(null);
  // Best-effort: with the spells gone, leftover progress records are unreachable anyway.
  await clearStoredProgress().catch((err) => {
    console.error('[IndexedDB] Failed to clear reading progress:', err);
  });
};

// Silent, resumable background migration of pre-existing `documents` records into
// `spells` (TCORE-78). Runs fire-and-forget after openDB() resolves — never blocks
// the app's first read/write, which already target `spells` exclusively from the
// moment this store exists (see onupgradeneeded below). `put` is idempotent on `id`,
// so re-running this after an interrupted previous attempt (tab closed mid-copy) is
// safe: it just re-copies, no duplicates, no partial state. Only sets the completion
// flag once source/destination counts verifiably match. This flag is NOT what gates
// deleting the legacy store, though — see onupgradeneeded's version-3 step below, which
// re-verifies counts itself inside the versionchange transaction rather than trusting
// this flag (a cleared localStorage without a cleared IndexedDB, or a synced-but-
// inconsistent browser profile, could otherwise turn a stale flag into data loss). This
// background copy stays useful even after that cleanup ships: it's what keeps `spells`
// caught up in the (self-correcting) case where the version-3 step found a count
// mismatch and skipped the delete.
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

// TCORE-90: pre-existing spell records still carry their `pdf`/`originalPdf` Blob embedded
// (that's how every record was written before this migration shipped). Same fire-and-forget,
// never-blocking shape as migrateLegacyDocumentsStore below, but crossing INTO a different
// physical database (src/db/originalPdfs.ts) rather than a different store of this same one --
// so it can't run inside `spells`'s onupgradeneeded versionchange transaction (transactions
// don't span databases). Only ever ADDS to the new store and STRIPS the two fields from the
// old record after that add is confirmed -- it never deletes a spell record, and a record
// whose copy fails is simply left untouched to retry on the next openDB() call.
const originalPdfMigrationListeners: MigrationListener[] = [];
export const onOriginalPdfsMigrated = (listener: MigrationListener): void => {
  originalPdfMigrationListeners.push(listener);
};

let pdfMigrationAttempted = false;

const migrateEmbeddedPdfsToOwnStore = async (db: IDBDatabase): Promise<void> => {
  if (pdfMigrationAttempted) return;
  pdfMigrationAttempted = true;

  try {
    const allSpells = await new Promise<(Spell & { pdf?: Blob; originalPdf?: Blob })[]>((resolve, reject) => {
      const req = db.transaction(SPELLS_STORE_NAME, 'readonly').objectStore(SPELLS_STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });

    const legacyRecords = allSpells.filter((s) => s.pdf || s.originalPdf);
    if (legacyRecords.length === 0) return;

    let migratedCount = 0;
    for (const record of legacyRecords) {
      try {
        // The PDF actually worth keeping is `originalPdf` -- the file the user chose to
        // retain. `pdf` was always either the same bytes or fully derivable from it and
        // never had its own reader, so it's simply dropped rather than copied too.
        if (record.originalPdf) {
          await setOriginalPdf(record.id, record.originalPdf);
        }
        // Re-read the CURRENT record inside this readwrite transaction rather than
        // writing back the `getAll()` snapshot from above -- that snapshot can be stale
        // by the time we get here (this loop iteration already awaited a separate
        // transaction to copy the blob out), and a real user action (e.g. reading a page)
        // can have written newer progress/content to this exact record in that window.
        // get+put inside the SAME transaction only ever removes the two legacy fields
        // from whatever is actually there right now, never reverting anything else.
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(SPELLS_STORE_NAME, 'readwrite');
          const store = tx.objectStore(SPELLS_STORE_NAME);
          const getReq = store.get(record.id);
          getReq.onsuccess = () => {
            const current = getReq.result as (Spell & { pdf?: Blob; originalPdf?: Blob }) | undefined;
            if (!current) { resolve(); return; } // deleted in the meantime -- nothing to do
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { pdf: _pdf, originalPdf: _originalPdf, ...rest } = current;
            const putReq = store.put(rest);
            putReq.onsuccess = () => resolve();
            putReq.onerror = () => reject(putReq.error);
          };
          getReq.onerror = () => reject(getReq.error);
        });
        migratedCount++;
      } catch (err) {
        // Leave this one record untouched (still carrying the embedded blob) -- next
        // openDB() call will find it again via the same `pdf || originalPdf` filter above.
        console.error(`[IndexedDB] Failed to migrate embedded PDF for spell "${record.id}", will retry on next open:`, err);
      }
    }

    if (migratedCount > 0) {
      originalPdfMigrationListeners.forEach((listener) => listener());
    }
  } catch (err) {
    console.error('[IndexedDB] Embedded-PDF migration scan failed, will retry on next open:', err);
  }
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

// Additive: create `spells` if missing, never delete anything. Shared by the normal
// onupgradeneeded path and by the recovery path below, so both go through the exact
// same non-destructive logic.
const ensureSpellsStore = (db: IDBDatabase): void => {
  if (!db.objectStoreNames.contains(SPELLS_STORE_NAME)) {
    const store = db.createObjectStore(SPELLS_STORE_NAME, { keyPath: 'id' });
    store.createIndex('title', 'title', { unique: false });
    store.createIndex('createdAt', 'createdAt', { unique: false });
    store.createIndex('userId', 'userId', { unique: false });
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

      ensureSpellsStore(db);

      // Cleanup step (TCORE-78, version 3): drop the legacy `documents` store, but only
      // after re-verifying record counts match INSIDE this same versionchange
      // transaction — never trust the localStorage completion flag alone here, since a
      // cleared localStorage without a cleared IndexedDB (or an inconsistent synced
      // browser profile) could otherwise turn this into data loss. If counts don't
      // match, skip the delete this time; migrateLegacyDocumentsStore() keeps `spells`
      // caught up in the background regardless, so a future version bump (or a retry of
      // this same check, if this version number is ever revisited) can clean up then.
      // Gated on newVersion >= 3 so this never runs (and never logs a spurious mismatch)
      // during an earlier transition, e.g. a fresh 1->2 upgrade where `spells` was just
      // created moments ago in the branch above and legitimately has 0 records so far.
      if ((event.newVersion ?? 0) >= 3 && db.objectStoreNames.contains(LEGACY_DOCUMENTS_STORE_NAME) && db.objectStoreNames.contains(SPELLS_STORE_NAME)) {
        const tx = (event.target as IDBOpenDBRequest).transaction;
        if (tx) {
          const legacyCountReq = tx.objectStore(LEGACY_DOCUMENTS_STORE_NAME).count();
          legacyCountReq.onsuccess = () => {
            const legacyCount = legacyCountReq.result;
            const spellsCountReq = tx.objectStore(SPELLS_STORE_NAME).count();
            spellsCountReq.onsuccess = () => {
              if (legacyCount === spellsCountReq.result) {
                db.deleteObjectStore(LEGACY_DOCUMENTS_STORE_NAME);
              } else {
                console.warn(`[IndexedDB] Skipped dropping legacy 'documents' store: count mismatch (legacy=${legacyCount}, spells=${spellsCountReq.result}).`);
              }
            };
          };
        }
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(SPELLS_STORE_NAME)) {
        // `spells` is missing even though the open succeeded without an upgrade — this
        // means the database on this browser is ALREADY at a version >= DB_VERSION
        // (e.g. a much older schema, from before `spells` existed, that had already
        // been bumped past this version number for unrelated reasons in the past).
        // Because the requested version wasn't higher than what's on disk,
        // onupgradeneeded above never got a chance to run.
        //
        // This used to delete the entire database here ("broken database detected and
        // deleted") and reload — which is exactly what destroyed real user data in
        // production: a pre-existing database's records aren't corruption just because
        // it predates `spells`, and deleting it is irreversible. NEVER do that. Instead,
        // force a real upgrade by reopening with a version guaranteed to be higher than
        // whatever is already on disk, so onupgradeneeded gets a chance to add `spells`
        // (and only ever add — nothing here ever deletes a store with data in it).
        const currentVersion = db.version;
        db.close();
        const bumpRequest = indexedDB.open(DB_NAME, currentVersion + 1);
        bumpRequest.onupgradeneeded = (bumpEvent) => {
          ensureSpellsStore((bumpEvent.target as IDBOpenDBRequest).result);
        };
        bumpRequest.onsuccess = (bumpEvent) => {
          const bumpedDb = registerConnectionLifecycle((bumpEvent.target as IDBOpenDBRequest).result);
          resolve(bumpedDb);
          void migrateLegacyDocumentsStore(bumpedDb);
          void migrateEmbeddedPdfsToOwnStore(bumpedDb);
        };
        bumpRequest.onerror = (bumpEvent) => {
          reject((bumpEvent.target as IDBOpenDBRequest).error ?? new Error('Failed to add the spells store to an existing database.'));
        };
      } else {
        resolve(registerConnectionLifecycle(db));
        void migrateLegacyDocumentsStore(db);
        void migrateEmbeddedPdfsToOwnStore(db);
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
    progress: initialSpellProgress(),
  };

  return new Promise((resolve, reject) => {
    const request = store.add(newSpell);
    request.onsuccess = () => resolve(newSpell.id);
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
};

const readSpellsFromStore = async (userId: string | undefined): Promise<Spell[]> => {
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

export const getSpellsFromDB = async (userId: string | undefined): Promise<Spell[]> => {
  const [spells, stored] = await Promise.all([
    readSpellsFromStore(userId),
    getAllStoredProgress().catch(() => new Map()),
  ]);
  spells.forEach(rememberCover);
  return spells.map(spell => withStoredProgress(spell, stored.get(spell.id)));
};

// Covers kept in memory as spells are read (the Last Spells / Grimoire listing reads them
// all), so the players and the Read tab can show a spell's cover without reading its whole
// record again just for it. `null` = known to have no cover; missing = not read yet.
const coverCache = new Map<string, Blob | null>();
const rememberCover = (spell: Spell) => { coverCache.set(spell.id, spell.cover ?? null); };

// Other tabs keep their own copy of that memory: when a cover changes (or a spell is
// deleted) here, they drop theirs and read it again next time, instead of showing the old
// one until reloaded. A message only ever makes a tab forget, never trusts a payload.
// `null` = forget every cover (all data cleared).
const coverChannel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('spellcast-covers') : null;
// Node's BroadcastChannel (tests) would otherwise keep the process alive; browsers have no unref.
(coverChannel as unknown as { unref?: () => void } | null)?.unref?.();
if (coverChannel) {
  coverChannel.onmessage = (event: MessageEvent<{ id: string | null }>) => {
    const id = event.data?.id;
    if (id == null) coverCache.clear();
    else coverCache.delete(id);
  };
}
const announceCoverChange = (id: string | null) => {
  try { coverChannel?.postMessage({ id }); } catch { /* best-effort */ }
};

// The cover already in memory, if this spell has been read this session (sync, so a view
// can show it on its first render); undefined when unknown.
export const getCachedSpellCover = (id: string): Blob | null | undefined => coverCache.get(id);

// A spell's cover: from memory when known, otherwise from one read of the spell.
export const getSpellCover = async (id: string, userId: string | undefined): Promise<Blob | null> => {
  const cached = coverCache.get(id);
  if (cached !== undefined) return cached;
  const spell = await getSpellById(id, userId);
  return spell?.cover ?? null;
};

// Concurrent reads of the same spell share one IndexedDB read: starting a spell asks for
// it from several places at once (the page processor, the player, the Read tab), and each
// read deserializes the whole record. Only while a read is in flight -- nothing is cached
// after it settles -- and every caller gets its own shallow copy.
const inFlightSpellReads = new Map<string, Promise<Spell | undefined>>();

export const getSpellById = (id: string, userId: string | undefined): Promise<Spell | undefined> => {
  const key = `${id}|${userId ?? ''}`;
  let read = inFlightSpellReads.get(key);
  if (!read) {
    read = Promise.all([
      readSpellFromStore(id, userId),
      getStoredProgress(id).catch(() => undefined),
    ]).then(([spell, stored]) => {
      if (!spell) return undefined;
      rememberCover(spell);
      return withStoredProgress(spell, stored);
    });
    inFlightSpellReads.set(key, read);
    const forget = () => { if (inFlightSpellReads.get(key) === read) inFlightSpellReads.delete(key); };
    read.then(forget, forget);
  }
  return read.then(spell => (spell ? { ...spell } : undefined));
};

const readSpellFromStore = async (id: string, userId: string | undefined): Promise<Spell | undefined> => {
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

  await new Promise<void>((resolve, reject) => {
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

  // Best-effort (TCORE-90): the spell itself is already gone, so a failure here would
  // leave an orphaned PDF in the other store, not lose anything -- never let it fail the
  // delete the user actually asked for.
  await deleteOriginalPdf(id).catch((err) => {
    console.error(`[IndexedDB] Failed to delete original PDF for removed spell "${id}":`, err);
  });

  // TCORE-118: same reasoning -- without this, every deleted spell left its cached audio
  // behind forever with nothing in the app able to reach or reclaim it (audioCache is keyed
  // by spellId, not looked up from the spells store), quietly wasting the "biggest consumer
  // of local space" this whole epic is about freeing up.
  await clearSpellAudioCache(id).catch((err) => {
    console.error(`[IndexedDB] Failed to clear audio cache for removed spell "${id}":`, err);
  });

  coverCache.delete(id);
  announceCoverChange(id);
  // A progress write still in flight for this spell (e.g. the player saving its position
  // as it's deleted) must not pass the ownership check from memory and leave a record behind.
  [...knownOwnership].forEach(key => { if (key.startsWith(`${id}|`)) knownOwnership.delete(key); });

  // Same reasoning: a deleted spell's reading position is unreachable, just leftover data.
  await deleteStoredProgress(id).catch((err) => {
    console.error(`[IndexedDB] Failed to delete reading progress for removed spell "${id}":`, err);
  });
};

export const updateSpellContent = async (
  id: string,
  userId: string,
  updates: { title: string; pagesContent: string; description?: string; author?: string; tags?: string[]; language?: string }
): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(SPELLS_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SPELLS_STORE_NAME);

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const spell = getRequest.result as Spell | undefined;
      if (spell && sameUser(spell.userId, userId)) {
        const putRequest = store.put({
          ...spell,
          title: updates.title,
          pagesContent: updates.pagesContent,
          description: updates.description,
          author: updates.author,
          tags: updates.tags,
          language: updates.language,
        });
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
  updates: { title: string; pagesContent: string; cover?: Blob; originalPagesContent?: string }
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
        putRequest.onsuccess = () => {
          if ('cover' in updates) {
            coverCache.set(id, updates.cover ?? null);
            announceCoverChange(id);
          }
          resolve();
        };
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

// Writes only to the progress database (db/spellProgress.ts), never the spell record: a
// progress update no longer reads and rewrites the whole spell (its pages and images) on
// every sentence, nor locks the spells store while doing it. The embedded progress is left
// untouched, as the fallback for anything still reading an older copy of the record.
export const updateSpellProgress = async (spellId: string, userId: string, progress: SpellProgress): Promise<void> => {
  if (!(await spellBelongsToUser(spellId, userId))) throw new Error('Spell not found or user mismatch.');
  await setStoredProgress(spellId, userId, progress);
};

// Ownership check for progress writes without deserializing the spell: the userId index
// yields just that user's spell ids. Legacy spells stored under a differently-typed userId
// (see getSpellsFromDB's fallback) miss the index, so those fall back to one full read.
// Remembered per session, so the check costs nothing after a spell's first progress write.
const knownOwnership = new Set<string>();

const spellBelongsToUser = async (spellId: string, userId: string): Promise<boolean> => {
  const key = `${spellId}|${userId}`;
  if (knownOwnership.has(key)) return true;
  const db = await openDB();
  const store = db.transaction(SPELLS_STORE_NAME, 'readonly').objectStore(SPELLS_STORE_NAME);
  const ownedIds = await new Promise<IDBValidKey[]>((resolve, reject) => {
    const request = store.index('userId').getAllKeys(userId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  let owns = ownedIds.includes(spellId);
  if (!owns) owns = !!(await readSpellFromStore(spellId, userId));
  if (owns) knownOwnership.add(key);
  return owns;
};

// Back to the start, as if never read. Writes the initial progress rather than deleting
// the stored record: a spell saved before the progress database existed would otherwise
// fall back to the position embedded on its record, undoing the reset.
export const resetSpellProgress = async (spellId: string, userId: string): Promise<void> => {
  await updateSpellProgress(spellId, userId, initialSpellProgress());
};

// Every spell of the user back to the start, in one write. Ids come from the userId index;
// legacy spells stored under a differently-typed userId miss it, so when it has none the
// same type-tolerant listing as getSpellsFromDB is used. Resolves to how many were reset.
export const resetAllSpellProgress = async (userId: string): Promise<number> => {
  const db = await openDB();
  const store = db.transaction(SPELLS_STORE_NAME, 'readonly').objectStore(SPELLS_STORE_NAME);
  let ids = await new Promise<string[]>((resolve, reject) => {
    const request = store.index('userId').getAllKeys(userId);
    request.onsuccess = () => resolve(request.result.map(String));
    request.onerror = () => reject(request.error);
  });
  if (ids.length === 0) ids = (await readSpellsFromStore(userId)).map(spell => spell.id);
  await setStoredProgressMany(ids.map(spellId => ({ spellId, userId, progress: initialSpellProgress() })));
  return ids.length;
};

// TCORE-103: updates description/author/tags/language, never pagesContent -- used by the
// "re-extract metadata from the stored original PDF" flow (individual and bulk). Unlike
// updateSpellContent's full-save semantics, this always overwrites those four fields with
// whatever is passed (including `undefined`, clearing a field the PDF no longer has) --
// re-extracting is a sync with the source, not a merge-if-empty prefill. `title` is the
// one exception: a spell must always have one, so it's only overwritten when the PDF
// actually has a title -- an absent title here means "leave it alone", not "clear it".
export const updateSpellMetadata = async (
  id: string,
  userId: string,
  metadata: { title?: string; description?: string; author?: string; tags?: string[]; language?: string }
): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(SPELLS_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SPELLS_STORE_NAME);

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const spell = getRequest.result as Spell | undefined;
      if (spell && sameUser(spell.userId, userId)) {
        const putRequest = store.put({
          ...spell,
          title: metadata.title || spell.title,
          description: metadata.description,
          author: metadata.author,
          tags: metadata.tags,
          language: metadata.language,
        });
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = (e) => reject((e.target as IDBRequest).error);
      } else {
        reject(new Error('Spell not found or user mismatch.'));
      }
    };
    getRequest.onerror = (e) => reject((e.target as IDBRequest).error);
  });
};

// TCORE-123: dedicated, single-field update -- same shape as updateSpellProgress, kept
// separate from updateSpellContent/updateSpellFull's full-record writes so picking a cover
// frame (from the spell's detail) can never race the autosave timer into clobbering
// an in-flight title/pagesContent edit. Accepts all three of Spell.coverFrameId's states: a
// frame id (this spell's own explicit pick), null (explicitly "no frame", overriding the
// global default), or undefined (clears any override, going back to following the global
// default) -- IndexedDB preserves an explicit `undefined` property value via structured
// clone (unlike JSON.stringify, which would drop it), so this reads back exactly as "never
// chosen" would.
export const updateSpellCoverFrame = async (
  id: string,
  userId: string,
  coverFrameId: string | null | undefined
): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(SPELLS_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SPELLS_STORE_NAME);

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const spell = getRequest.result as Spell | undefined;
      if (spell && sameUser(spell.userId, userId)) {
        const putRequest = store.put({ ...spell, coverFrameId });
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = (e) => reject((e.target as IDBRequest).error);
      } else {
        reject(new Error('Spell not found or user mismatch.'));
      }
    };
    getRequest.onerror = (e) => reject((e.target as IDBRequest).error);
  });
};
