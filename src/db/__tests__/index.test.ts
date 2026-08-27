import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
// fake-indexeddb clones stored values with Node's structuredClone(), which only
// round-trips Node's OWN Blob class -- happy-dom's global `Blob` (the one `new
// Blob(...)` resolves to in this test environment) is a different class that
// structuredClone falls back to cloning as a plain object, silently losing its
// Blob-ness. Using node:buffer's Blob explicitly for anything that gets stored
// and read back here sidesteps that -- a test-environment quirk, not a real
// IndexedDB limitation (real browsers round-trip Blobs from either global fine).
import { Blob } from 'node:buffer';
import { DB_NAME, DB_VERSION, SPELLS_STORE_NAME } from '../../config/api';

// A fresh IDBFactory per test gives each one a genuinely empty, isolated
// IndexedDB -- no leftover databases/records from a previous test, and no need to
// track and delete specific database names by hand.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  vi.resetModules();
});

// db/index.ts keeps module-level state (the cached openDB() promise, and a
// "migration already attempted this session" flag) that must NOT leak between
// tests -- vi.resetModules() above discards the previous module instance, so
// each test imports a genuinely fresh one.
const importDb = () => import('../index');

const seedSpell = (overrides: Partial<{ title: string; userId: string; pagesContent: string }> = {}) => ({
  title: overrides.title ?? 'Test Spell',
  userId: overrides.userId ?? 'user-1',
  pagesContent: overrides.pagesContent ?? '[]',
});

describe('db/index.ts CRUD', () => {
  it('saveSpellToDB creates a record with a generated id, createdAt, and default progress', async () => {
    const { saveSpellToDB, getSpellById } = await importDb();
    const id = await saveSpellToDB(seedSpell());

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);

    const spell = await getSpellById(id, 'user-1');
    expect(spell).toMatchObject({ id, title: 'Test Spell', userId: 'user-1' });
    expect(spell?.createdAt).toBeInstanceOf(Date);
    expect(spell?.progress).toEqual({ currentPage: 0, pagesProgress: [], lastReadSentenceIndex: 0 });
  });

  it('saveSpellToDB persists social/feed metadata (description/author/tags/language) when provided, all optional (TCORE-97)', async () => {
    const { saveSpellToDB, getSpellById } = await importDb();
    const id = await saveSpellToDB({
      ...seedSpell(),
      description: 'A tale of dragons',
      author: 'Jane Doe',
      tags: ['fantasy', 'adventure'],
      language: 'en',
    });

    const spell = await getSpellById(id, 'user-1');
    expect(spell?.description).toBe('A tale of dragons');
    expect(spell?.author).toBe('Jane Doe');
    expect(spell?.tags).toEqual(['fantasy', 'adventure']);
    expect(spell?.language).toBe('en');
  });

  it('saveSpellToDB works with none of the new metadata fields set (all optional)', async () => {
    const { saveSpellToDB, getSpellById } = await importDb();
    const id = await saveSpellToDB(seedSpell());

    const spell = await getSpellById(id, 'user-1');
    expect(spell?.description).toBeUndefined();
    expect(spell?.author).toBeUndefined();
    expect(spell?.tags).toBeUndefined();
    expect(spell?.language).toBeUndefined();
  });

  it('getSpellsFromDB returns only the requesting user\'s spells via the userId index', async () => {
    const { saveSpellToDB, getSpellsFromDB } = await importDb();
    await saveSpellToDB(seedSpell({ title: 'Mine', userId: 'user-1' }));
    await saveSpellToDB(seedSpell({ title: 'Not mine', userId: 'user-2' }));

    const mine = await getSpellsFromDB('user-1');
    expect(mine).toHaveLength(1);
    expect(mine[0].title).toBe('Mine');
  });

  it('getSpellsFromDB returns an empty list for a user with no spells', async () => {
    const { getSpellsFromDB } = await importDb();
    expect(await getSpellsFromDB('nobody')).toEqual([]);
  });

  it('getSpellsFromDB falls back to a type-tolerant full scan when the index lookup misses', async () => {
    // Simulates historical data where userId was stored as a number but the
    // current session id is a string -- the userId INDEX lookup (exact match)
    // finds nothing, but the fallback scan's sameUser() string comparison does.
    const { saveSpellToDB, getSpellsFromDB } = await importDb();
    // @ts-expect-error -- deliberately mistyped userId to model legacy data
    await saveSpellToDB(seedSpell({ title: 'Legacy', userId: 42 }));

    const result = await getSpellsFromDB('42');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Legacy');
  });

  it('getSpellById returns undefined when the spell exists but belongs to a different user', async () => {
    const { saveSpellToDB, getSpellById } = await importDb();
    const id = await saveSpellToDB(seedSpell({ userId: 'user-1' }));
    expect(await getSpellById(id, 'user-2')).toBeUndefined();
  });

  it('getSpellById returns undefined for a non-existent id', async () => {
    const { getSpellById } = await importDb();
    expect(await getSpellById('does-not-exist', 'user-1')).toBeUndefined();
  });

  it('deleteSpellFromDB deletes only when the requesting user matches', async () => {
    const { saveSpellToDB, deleteSpellFromDB, getSpellById } = await importDb();
    const id = await saveSpellToDB(seedSpell({ userId: 'user-1' }));

    await deleteSpellFromDB(id, 'user-1');
    expect(await getSpellById(id, 'user-1')).toBeUndefined();
  });

  it('deleteSpellFromDB rejects and leaves the record intact for a mismatched user', async () => {
    const { saveSpellToDB, deleteSpellFromDB } = await importDb();
    const id = await saveSpellToDB(seedSpell({ userId: 'user-1' }));

    await expect(deleteSpellFromDB(id, 'user-2')).rejects.toBeTruthy();

    // Re-import is unnecessary (same module instance, same cached DB connection) --
    // read back through a fresh call to confirm the record really does survive.
    const { getSpellById } = await importDb();
    expect(await getSpellById(id, 'user-1')).toBeDefined();
  });

  it('deleteSpellFromDB rejects for a non-existent id', async () => {
    const { deleteSpellFromDB } = await importDb();
    await expect(deleteSpellFromDB('missing', 'user-1')).rejects.toBeTruthy();
  });

  it('updateSpellContent updates title/pagesContent only for the matching user', async () => {
    const { saveSpellToDB, updateSpellContent, getSpellById } = await importDb();
    const id = await saveSpellToDB(seedSpell({ userId: 'user-1', title: 'Old' }));

    await updateSpellContent(id, 'user-1', { title: 'New', pagesContent: '[1]' });

    const spell = await getSpellById(id, 'user-1');
    expect(spell?.title).toBe('New');
    expect(spell?.pagesContent).toBe('[1]');
  });

  it('updateSpellContent rejects for a mismatched user without changing the record', async () => {
    const { saveSpellToDB, updateSpellContent, getSpellById } = await importDb();
    const id = await saveSpellToDB(seedSpell({ userId: 'user-1', title: 'Old' }));

    await expect(updateSpellContent(id, 'user-2', { title: 'New', pagesContent: '[1]' })).rejects.toThrow();
    expect((await getSpellById(id, 'user-1'))?.title).toBe('Old');
  });

  it('updateSpellFull replaces content fields while preserving the rest of the record', async () => {
    const { saveSpellToDB, updateSpellFull, getSpellById } = await importDb();
    const id = await saveSpellToDB(seedSpell({ userId: 'user-1', title: 'Old' }));
    const coverBlob = new Blob(['cover-bytes'], { type: 'image/png' });

    await updateSpellFull(id, 'user-1', { title: 'New', pagesContent: '[2]', cover: coverBlob as unknown as globalThis.Blob });

    const spell = await getSpellById(id, 'user-1');
    expect(spell?.title).toBe('New');
    expect(spell?.pagesContent).toBe('[2]');
    expect(spell?.cover).toBeInstanceOf(Blob);
    // Fields not part of the update (e.g. progress from saveSpellToDB) survive the spread.
    expect(spell?.progress).toEqual({ currentPage: 0, pagesProgress: [], lastReadSentenceIndex: 0 });
  });

  it('getSpellOriginalPages returns the field only for the matching user', async () => {
    const { saveSpellToDB, updateSpellFull, getSpellOriginalPages } = await importDb();
    const id = await saveSpellToDB(seedSpell({ userId: 'user-1' }));
    await updateSpellFull(id, 'user-1', { title: 'T', pagesContent: '[]', originalPagesContent: 'ORIGINAL' });

    expect(await getSpellOriginalPages(id, 'user-1')).toBe('ORIGINAL');
    expect(await getSpellOriginalPages(id, 'user-2')).toBeUndefined();
  });

  it('updateSpellProgress updates progress only for the matching user', async () => {
    const { saveSpellToDB, updateSpellProgress, getSpellById } = await importDb();
    const id = await saveSpellToDB(seedSpell({ userId: 'user-1' }));
    const progress = { currentPage: 5, pagesProgress: [1, 2, 3], lastReadSentenceIndex: 12 };

    await updateSpellProgress(id, 'user-1', progress);

    expect((await getSpellById(id, 'user-1'))?.progress).toEqual(progress);
  });

  it('updateSpellProgress rejects for a mismatched user', async () => {
    const { saveSpellToDB, updateSpellProgress } = await importDb();
    const id = await saveSpellToDB(seedSpell({ userId: 'user-1' }));
    await expect(
      updateSpellProgress(id, 'user-2', { currentPage: 1, pagesProgress: [], lastReadSentenceIndex: 0 })
    ).rejects.toThrow();
  });

  it('clearAllData empties the spells store', async () => {
    const { saveSpellToDB, clearAllData, getSpellsFromDB } = await importDb();
    await saveSpellToDB(seedSpell({ userId: 'user-1' }));
    await saveSpellToDB(seedSpell({ userId: 'user-1' }));

    await clearAllData();

    expect(await getSpellsFromDB('user-1')).toEqual([]);
  });

  it('deleteSpellFromDB also deletes the spell\'s original PDF from the separate store (TCORE-90)', async () => {
    const { saveSpellToDB, deleteSpellFromDB } = await importDb();
    const { setOriginalPdf, getOriginalPdf } = await import('../originalPdfs');
    const id = await saveSpellToDB(seedSpell({ userId: 'user-1' }));
    await setOriginalPdf(id, new Blob(['%PDF-1.4']) as unknown as globalThis.Blob);

    await deleteSpellFromDB(id, 'user-1');

    expect(await getOriginalPdf(id)).toBeNull();
  });
});

describe('db/index.ts schema setup and legacy migration', () => {
  it('creates the spells store (with its indexes) on a brand-new database', async () => {
    const { saveSpellToDB, getSpellsFromDB } = await importDb();
    // No pre-existing database at all -- openDB() must run onupgradeneeded itself
    // and create a working, indexed `spells` store from scratch.
    const id = await saveSpellToDB(seedSpell({ userId: 'user-1' }));
    const spells = await getSpellsFromDB('user-1'); // exercises the userId index
    expect(spells.map((s) => s.id)).toContain(id);
  });

  it('migrates pre-existing legacy "documents" records into "spells" in the background', async () => {
    // Seed a pre-existing database at a version BEFORE `spells` ever existed, with
    // a legacy `documents` store already populated -- mirrors a real upgrading
    // user's browser (TCORE-78).
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        const store = db.createObjectStore('documents', { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
      };
      req.onsuccess = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        const tx = db.transaction('documents', 'readwrite');
        tx.objectStore('documents').add({ id: 'legacy-1', title: 'Legacy Doc', userId: 'user-1', createdAt: new Date() });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });

    const { getSpellsFromDB, onSpellsMigrated } = await importDb();
    const migratedPromise = new Promise<boolean>((resolve) => {
      onSpellsMigrated(() => resolve(true));
      setTimeout(() => resolve(false), 2000);
    });
    // Calling any CRUD function is what actually triggers openDB() -- and
    // therefore the background migration -- for the first time. The migration
    // itself is fire-and-forget from inside openDB(), so this first call can
    // resolve before the copy finishes; the REAL assertion below re-queries only
    // after migratedPromise confirms the copy actually completed.
    await getSpellsFromDB('user-1');
    const migrated = await migratedPromise;
    const spells = await getSpellsFromDB('user-1');
    expect(spells.some((s) => s.id === 'legacy-1' && s.title === 'Legacy Doc')).toBe(true);
    expect(migrated).toBe(true);
  });

  it('does not touch (or fail on) a database that never had a legacy "documents" store', async () => {
    const { getSpellsFromDB } = await importDb();
    await expect(getSpellsFromDB('user-1')).resolves.toEqual([]);
  });

  it('recovers a database that is missing the spells store despite already being at DB_VERSION', async () => {
    // Simulates the historical production bug this module documents fixing: a
    // database that reached DB_VERSION through some unrelated path, without ever
    // getting the `spells` store created (so onupgradeneeded never fires again for
    // this version). openDB() must add the store via a forced version bump --
    // never delete anything.
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => { /* deliberately create nothing */ };
      req.onsuccess = (e) => { (e.target as IDBOpenDBRequest).result.close(); resolve(); };
      req.onerror = () => reject(req.error);
    });

    const { saveSpellToDB, getSpellsFromDB } = await importDb();
    const id = await saveSpellToDB(seedSpell({ userId: 'user-1' }));
    expect((await getSpellsFromDB('user-1')).map((s) => s.id)).toContain(id);
  });

  it('migrates a legacy spell\'s embedded pdf/originalPdf blob into the separate original-pdf store, then strips those fields (TCORE-90)', async () => {
    // Seed a `spells` record the way it looked BEFORE this migration -- with the PDF
    // blobs embedded directly on the record, as any real pre-existing browser has today.
    // Written directly against the raw store (bypassing saveSpellToDB, which no longer
    // accepts pdf/originalPdf) to faithfully model what's already on disk for real users.
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        const store = db.createObjectStore(SPELLS_STORE_NAME, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
      };
      req.onsuccess = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        const tx = db.transaction(SPELLS_STORE_NAME, 'readwrite');
        tx.objectStore(SPELLS_STORE_NAME).add({
          id: 'legacy-pdf-1',
          title: 'Legacy Spell',
          userId: 'user-1',
          createdAt: new Date(),
          pdf: new Blob(['%PDF-1.4 working']),
          originalPdf: new Blob(['%PDF-1.4 original']),
        });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });

    const { getSpellById, onOriginalPdfsMigrated } = await importDb();
    const { getOriginalPdf } = await import('../originalPdfs');
    const migratedPromise = new Promise<boolean>((resolve) => {
      onOriginalPdfsMigrated(() => resolve(true));
      setTimeout(() => resolve(false), 2000);
    });

    // Triggers openDB(), which fires the migration in the background.
    await getSpellById('legacy-pdf-1', 'user-1');
    const migrated = await migratedPromise;
    expect(migrated).toBe(true);

    // The blob now lives in the dedicated store -- never lost.
    const movedBlob = await getOriginalPdf('legacy-pdf-1');
    expect(movedBlob).not.toBeNull();
    await expect(movedBlob!.text()).resolves.toBe('%PDF-1.4 original');

    // ...and the legacy fields are gone from the spell record itself, everything else intact.
    const spell = await getSpellById('legacy-pdf-1', 'user-1');
    expect(spell).not.toHaveProperty('pdf');
    expect(spell).not.toHaveProperty('originalPdf');
    expect(spell?.title).toBe('Legacy Spell');
  });

  it('does not lose a concurrent write that lands while the migration is still running (no lost-update, TCORE-90 review)', async () => {
    // Same legacy seed as above.
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        const store = db.createObjectStore(SPELLS_STORE_NAME, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
      };
      req.onsuccess = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        const tx = db.transaction(SPELLS_STORE_NAME, 'readwrite');
        tx.objectStore(SPELLS_STORE_NAME).add({
          id: 'legacy-pdf-2',
          title: 'Legacy Spell 2',
          userId: 'user-1',
          createdAt: new Date(),
          pdf: new Blob(['%PDF-1.4 working']),
          originalPdf: new Blob(['%PDF-1.4 original']),
        });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });

    const { getSpellById, updateSpellProgress, onOriginalPdfsMigrated } = await importDb();
    const originalPdfsModule = await import('../originalPdfs');

    // The migration awaits setOriginalPdf() (copying the blob out) BEFORE it strips the
    // fields from the spell record -- that gap is exactly when a real user action (reading
    // a page while the background migration is still running) can write to the SAME
    // record. Hooking the real setOriginalPdf to also perform that write reproduces the
    // race deterministically instead of depending on incidental timing.
    const realSetOriginalPdf = originalPdfsModule.setOriginalPdf;
    vi.spyOn(originalPdfsModule, 'setOriginalPdf').mockImplementation(async (spellId, blob) => {
      await realSetOriginalPdf(spellId, blob);
      if (spellId === 'legacy-pdf-2') {
        await updateSpellProgress('legacy-pdf-2', 'user-1', { currentPage: 9, pagesProgress: [1, 2, 3], lastReadSentenceIndex: 42 });
      }
    });

    const migratedPromise = new Promise<boolean>((resolve) => {
      onOriginalPdfsMigrated(() => resolve(true));
      setTimeout(() => resolve(false), 2000);
    });
    await getSpellById('legacy-pdf-2', 'user-1');
    expect(await migratedPromise).toBe(true);

    const spell = await getSpellById('legacy-pdf-2', 'user-1');
    // The migration's own write must never clobber the concurrent progress update with a
    // stale pre-migration snapshot.
    expect(spell?.progress).toEqual({ currentPage: 9, pagesProgress: [1, 2, 3], lastReadSentenceIndex: 42 });
    expect(spell).not.toHaveProperty('pdf');
    expect(spell).not.toHaveProperty('originalPdf');
  });
});

// Sanity check that this suite is actually exercising the real, configured store
// name rather than an assumption baked into the test file.
describe('config sanity', () => {
  it('SPELLS_STORE_NAME matches what the suite above assumes', () => {
    expect(SPELLS_STORE_NAME).toBe('spells');
  });
});
