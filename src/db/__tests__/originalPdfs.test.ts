import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
// See index.test.ts for why: fake-indexeddb's structuredClone-based storage only
// round-trips Node's own Blob class, not happy-dom's global `Blob`.
import { Blob } from 'node:buffer';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  vi.resetModules();
});

const importOriginalPdfs = () => import('../originalPdfs');

describe('db/originalPdfs.ts', () => {
  it('returns null for a spell that never had an original PDF saved', async () => {
    const { getOriginalPdf } = await importOriginalPdfs();
    expect(await getOriginalPdf('spell-1')).toBeNull();
  });

  it('stores and retrieves the original PDF for a spell', async () => {
    const { setOriginalPdf, getOriginalPdf } = await importOriginalPdfs();
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });

    await setOriginalPdf('spell-1', blob as unknown as globalThis.Blob);
    const stored = await getOriginalPdf('spell-1');

    expect(stored).toBeInstanceOf(Blob);
  });

  it('keeps original PDFs isolated per spell', async () => {
    const { setOriginalPdf, getOriginalPdf } = await importOriginalPdfs();
    await setOriginalPdf('spell-1', new Blob(['a']) as unknown as globalThis.Blob);
    await setOriginalPdf('spell-2', new Blob(['b']) as unknown as globalThis.Blob);

    expect(await getOriginalPdf('spell-1')).not.toBeNull();
    expect(await getOriginalPdf('spell-2')).not.toBeNull();
    await expect((await getOriginalPdf('spell-1'))!.text()).resolves.toBe('a');
    await expect((await getOriginalPdf('spell-2'))!.text()).resolves.toBe('b');
  });

  it('overwrites a previously stored original PDF for the same spell (idempotent put)', async () => {
    const { setOriginalPdf, getOriginalPdf } = await importOriginalPdfs();
    await setOriginalPdf('spell-1', new Blob(['old']) as unknown as globalThis.Blob);
    await setOriginalPdf('spell-1', new Blob(['new']) as unknown as globalThis.Blob);

    await expect((await getOriginalPdf('spell-1'))!.text()).resolves.toBe('new');
  });

  it('deleteOriginalPdf removes only the given spell\'s entry', async () => {
    const { setOriginalPdf, getOriginalPdf, deleteOriginalPdf } = await importOriginalPdfs();
    await setOriginalPdf('spell-1', new Blob(['a']) as unknown as globalThis.Blob);
    await setOriginalPdf('spell-2', new Blob(['b']) as unknown as globalThis.Blob);

    await deleteOriginalPdf('spell-1');

    expect(await getOriginalPdf('spell-1')).toBeNull();
    expect(await getOriginalPdf('spell-2')).not.toBeNull();
  });

  it('deleteOriginalPdf does not throw for a spell with nothing stored', async () => {
    const { deleteOriginalPdf } = await importOriginalPdfs();
    await expect(deleteOriginalPdf('nothing-here')).resolves.toBeUndefined();
  });

  describe('hasOriginalPdf', () => {
    it('is false when nothing was ever stored for the spell', async () => {
      const { hasOriginalPdf } = await importOriginalPdfs();
      expect(await hasOriginalPdf('spell-1')).toBe(false);
    });

    it('is true once an original PDF has been stored', async () => {
      const { setOriginalPdf, hasOriginalPdf } = await importOriginalPdfs();
      await setOriginalPdf('spell-1', new Blob(['x']) as unknown as globalThis.Blob);
      expect(await hasOriginalPdf('spell-1')).toBe(true);
    });

    it('is false again after the entry is deleted', async () => {
      const { setOriginalPdf, deleteOriginalPdf, hasOriginalPdf } = await importOriginalPdfs();
      await setOriginalPdf('spell-1', new Blob(['x']) as unknown as globalThis.Blob);
      await deleteOriginalPdf('spell-1');
      expect(await hasOriginalPdf('spell-1')).toBe(false);
    });
  });

  describe('getAllOriginalPdfIds', () => {
    it('returns an empty set when nothing has been stored', async () => {
      const { getAllOriginalPdfIds } = await importOriginalPdfs();
      expect(await getAllOriginalPdfIds()).toEqual(new Set());
    });

    it('returns the spellIds of every stored original PDF, in one read', async () => {
      const { setOriginalPdf, getAllOriginalPdfIds } = await importOriginalPdfs();
      await setOriginalPdf('spell-1', new Blob(['a']) as unknown as globalThis.Blob);
      await setOriginalPdf('spell-2', new Blob(['b']) as unknown as globalThis.Blob);

      expect(await getAllOriginalPdfIds()).toEqual(new Set(['spell-1', 'spell-2']));
    });

    it('no longer includes a spellId after its entry is deleted', async () => {
      const { setOriginalPdf, deleteOriginalPdf, getAllOriginalPdfIds } = await importOriginalPdfs();
      await setOriginalPdf('spell-1', new Blob(['a']) as unknown as globalThis.Blob);
      await setOriginalPdf('spell-2', new Blob(['b']) as unknown as globalThis.Blob);
      await deleteOriginalPdf('spell-1');

      expect(await getAllOriginalPdfIds()).toEqual(new Set(['spell-2']));
    });
  });
});
