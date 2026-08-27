import { describe, it, expect, vi, beforeEach } from 'vitest';
import JSZip from 'jszip';
import {
  exportSpellToBlob,
  importSpellFromFile,
  downloadBlob,
  SpellImportError,
  SPELL_FORMAT_VERSION,
  type SpellManifest,
} from '../spellFormat';
import type { Spell } from '../../interfaces';
import type { CachedAudioEntry } from '../../db/audioCache';

const getSpellByIdMock = vi.fn();
const saveSpellToDBMock = vi.fn();
vi.mock('../../db', () => ({
  getSpellById: (...args: unknown[]) => getSpellByIdMock(...args),
  saveSpellToDB: (...args: unknown[]) => saveSpellToDBMock(...args),
}));

const getOriginalPdfMock = vi.fn();
const setOriginalPdfMock = vi.fn();
vi.mock('../../db/originalPdfs', () => ({
  getOriginalPdf: (...args: unknown[]) => getOriginalPdfMock(...args),
  setOriginalPdf: (...args: unknown[]) => setOriginalPdfMock(...args),
}));

const getCachedAudioEntriesForSpellMock = vi.fn();
const setCachedAudioMock = vi.fn();
vi.mock('../../db/audioCache', () => ({
  getCachedAudioEntriesForSpell: (...args: unknown[]) => getCachedAudioEntriesForSpellMock(...args),
  setCachedAudio: (...args: unknown[]) => setCachedAudioMock(...args),
}));

const baseSpell: Spell = {
  id: 'spell-1',
  title: 'My Spell',
  createdAt: new Date('2026-01-01'),
  userId: 'user-1',
  pagesContent: JSON.stringify([{ type: 'doc' }]),
  progress: { currentPage: 3, pagesProgress: [], lastReadSentenceIndex: 7 },
};

const readZipJson = async (blob: Blob, path: string) => {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const entry = zip.file(path);
  if (!entry) return null;
  return JSON.parse(await entry.async('string'));
};

beforeEach(() => {
  vi.clearAllMocks();
  getSpellByIdMock.mockResolvedValue(baseSpell);
  getOriginalPdfMock.mockResolvedValue(null);
  getCachedAudioEntriesForSpellMock.mockResolvedValue([]);
  saveSpellToDBMock.mockResolvedValue('new-spell-id');
  setCachedAudioMock.mockResolvedValue(undefined);
  setOriginalPdfMock.mockResolvedValue(undefined);
});

describe('exportSpellToBlob', () => {
  it('throws when the spell is not found', async () => {
    getSpellByIdMock.mockResolvedValue(undefined);
    await expect(exportSpellToBlob('missing', 'user-1')).rejects.toThrow('Spell not found.');
  });

  it('builds a minimal zip with spell.json and manifest.json when no options are passed', async () => {
    const { blob, filename } = await exportSpellToBlob('spell-1', 'user-1');
    expect(filename).toBe('My Spell.spell');

    const spellJson = await readZipJson(blob, 'spell.json');
    expect(spellJson).toEqual({ title: 'My Spell', pagesContent: baseSpell.pagesContent });

    const manifest = await readZipJson(blob, 'manifest.json') as SpellManifest;
    expect(manifest).toEqual({
      formatVersion: SPELL_FORMAT_VERSION,
      title: 'My Spell',
      exportedAt: manifest.exportedAt,
      hasOriginalPdf: false,
      voices: [],
    });
  });

  it('never includes the reader progress in spell.json, even though the record has one', async () => {
    const { blob } = await exportSpellToBlob('spell-1', 'user-1');
    const spellJson = await readZipJson(blob, 'spell.json') as Record<string, unknown>;
    expect(spellJson.progress).toBeUndefined();
    expect(Object.keys(spellJson)).toEqual(['title', 'pagesContent']);
  });

  it('bundles original/original.pdf (read from the dedicated PDF store, not the record) when includeSource is true and one exists', async () => {
    const pdfBytes = new TextEncoder().encode('%PDF-1.4 fake');
    getOriginalPdfMock.mockResolvedValue(new Blob([pdfBytes], { type: 'application/pdf' }));
    getSpellByIdMock.mockResolvedValue({
      ...baseSpell,
      originalPagesContent: JSON.stringify([{ type: 'doc', original: true }]),
    });

    const { blob } = await exportSpellToBlob('spell-1', 'user-1', { includeSource: true });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());

    expect(getOriginalPdfMock).toHaveBeenCalledWith('spell-1');
    expect(zip.file('original/original.pdf')).not.toBeNull();
    expect(zip.file('original/originalPagesContent.json')).not.toBeNull();
    const manifest = await readZipJson(blob, 'manifest.json') as SpellManifest;
    expect(manifest.hasOriginalPdf).toBe(true);
  });

  it('does not bundle original/original.pdf when includeSource is true but nothing is stored for this spell', async () => {
    getOriginalPdfMock.mockResolvedValue(null);
    const { blob } = await exportSpellToBlob('spell-1', 'user-1', { includeSource: true });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(zip.file('original/original.pdf')).toBeNull();
    const manifest = await readZipJson(blob, 'manifest.json') as SpellManifest;
    expect(manifest.hasOriginalPdf).toBe(false);
  });

  it('does not bundle original/original.pdf when includeSource is false, even if one is stored', async () => {
    getOriginalPdfMock.mockResolvedValue(new Blob(['fake'], { type: 'application/pdf' }));
    const { blob } = await exportSpellToBlob('spell-1', 'user-1', { includeSource: false });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(zip.file('original/original.pdf')).toBeNull();
    // includeSource only gates the (heavier) binary -- it must never even look it up.
    expect(getOriginalPdfMock).not.toHaveBeenCalled();
  });

  it('bundles original/originalPagesContent.json whenever the record has it, regardless of includeSource', async () => {
    getSpellByIdMock.mockResolvedValue({
      ...baseSpell,
      originalPagesContent: JSON.stringify([{ type: 'doc', original: true }]),
    });

    const { blob } = await exportSpellToBlob('spell-1', 'user-1', { includeSource: false });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());

    expect(zip.file('original/originalPagesContent.json')).not.toBeNull();
    expect(zip.file('original/original.pdf')).toBeNull();
  });

  it('bundles renders/<voice>/ for every cached audio+timeline pair when includeAudio is true', async () => {
    const entries: CachedAudioEntry[] = [
      { page: 1, voice: 'alice', blob: new Blob(['a1'], { type: 'audio/mpeg' }), timeline: [{ text: 'hi', start: 0, end: 1 }] },
      { page: 2, voice: 'alice', blob: new Blob(['a2'], { type: 'audio/mpeg' }), timeline: [{ text: 'bye', start: 0, end: 1 }] },
      { page: 1, voice: 'bob', blob: new Blob(['b1'], { type: 'audio/wav' }), timeline: [{ text: 'yo', start: 0, end: 1 }] },
    ];
    getCachedAudioEntriesForSpellMock.mockResolvedValue(entries);

    const { blob } = await exportSpellToBlob('spell-1', 'user-1', { includeAudio: true });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());

    expect(zip.file('renders/alice/page-1.mp3')).not.toBeNull();
    expect(zip.file('renders/alice/page-1.timeline.json')).not.toBeNull();
    expect(zip.file('renders/alice/page-2.mp3')).not.toBeNull();
    expect(zip.file('renders/bob/page-1.wav')).not.toBeNull();

    const timelineJson = await readZipJson(blob, 'renders/alice/page-1.timeline.json');
    expect(timelineJson).toEqual(entries[0].timeline);

    const manifest = await readZipJson(blob, 'manifest.json') as SpellManifest;
    expect(new Set(manifest.voices)).toEqual(new Set(['alice', 'bob']));
  });

  it('reports no voices when includeAudio is true but nothing is cached', async () => {
    const { blob } = await exportSpellToBlob('spell-1', 'user-1', { includeAudio: true });
    const manifest = await readZipJson(blob, 'manifest.json') as SpellManifest;
    expect(manifest.voices).toEqual([]);
  });

  it('sanitizes invalid filename characters out of the title', async () => {
    getSpellByIdMock.mockResolvedValue({ ...baseSpell, title: 'My/Spell:Test?<>|"*' });
    const { filename } = await exportSpellToBlob('spell-1', 'user-1');
    expect(filename).toBe('My Spell Test.spell');
  });

  it('falls back to "spell" when the title is empty after sanitizing', async () => {
    getSpellByIdMock.mockResolvedValue({ ...baseSpell, title: '   ///:::   ' });
    const { filename } = await exportSpellToBlob('spell-1', 'user-1');
    expect(filename).toBe('spell.spell');
  });
});

describe('downloadBlob', () => {
  it('creates a temporary anchor, clicks it, and cleans up the object URL', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-url');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    downloadBlob(new Blob(['x']), 'test.spell');

    expect(createUrlSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:fake-url');
    expect(document.querySelectorAll('a[download="test.spell"]').length).toBe(0);

    clickSpy.mockRestore();
    createUrlSpy.mockRestore();
    revokeUrlSpy.mockRestore();
  });
});

describe('importSpellFromFile', () => {
  const asFile = (blob: Blob, name = 'export.spell') => new File([blob], name);

  it('throws SpellImportError when manifest.json is missing', async () => {
    const zip = new JSZip();
    zip.file('spell.json', JSON.stringify({ title: 't', pagesContent: '[]' }));
    const blob = await zip.generateAsync({ type: 'blob' });

    await expect(importSpellFromFile(asFile(blob), 'user-1')).rejects.toThrow(SpellImportError);
    await expect(importSpellFromFile(asFile(blob), 'user-1')).rejects.toThrow(/missing manifest\.json/);
  });

  it('throws SpellImportError when the format version is unsupported', async () => {
    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify({ formatVersion: 999, title: 't', exportedAt: '', hasOriginalPdf: false, voices: [] }));
    zip.file('spell.json', JSON.stringify({ title: 't', pagesContent: '[]' }));
    const blob = await zip.generateAsync({ type: 'blob' });

    await expect(importSpellFromFile(asFile(blob), 'user-1')).rejects.toThrow(/Unsupported \.spell format version/);
  });

  it('throws SpellImportError when spell.json is missing', async () => {
    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify({ formatVersion: SPELL_FORMAT_VERSION, title: 't', exportedAt: '', hasOriginalPdf: false, voices: [] }));
    const blob = await zip.generateAsync({ type: 'blob' });

    await expect(importSpellFromFile(asFile(blob), 'user-1')).rejects.toThrow(/missing spell\.json/);
  });

  it('round-trips a plain spell (no source, no audio) through export then import, never sending a pdf/originalPdf field', async () => {
    const { blob } = await exportSpellToBlob('spell-1', 'user-1');
    const newId = await importSpellFromFile(asFile(blob), 'user-2');

    expect(newId).toBe('new-spell-id');
    expect(saveSpellToDBMock).toHaveBeenCalledWith({
      title: 'My Spell',
      userId: 'user-2',
      pagesContent: baseSpell.pagesContent,
      originalPagesContent: undefined,
    });
    expect(setOriginalPdfMock).not.toHaveBeenCalled();
    expect(setCachedAudioMock).not.toHaveBeenCalled();
  });

  it('round-trips a spell with a bundled original PDF into a new record using a fresh id, storing the PDF in the dedicated store (not the record)', async () => {
    const pdfBlob = new Blob([new TextEncoder().encode('%PDF-1.4 fake')], { type: 'application/pdf' });
    getOriginalPdfMock.mockResolvedValue(pdfBlob);
    getSpellByIdMock.mockResolvedValue({
      ...baseSpell,
      originalPagesContent: JSON.stringify([{ type: 'doc', original: true }]),
    });
    saveSpellToDBMock.mockResolvedValue('brand-new-id');

    const { blob } = await exportSpellToBlob('spell-1', 'user-1', { includeSource: true });
    const newId = await importSpellFromFile(asFile(blob), 'user-2');

    expect(newId).toBe('brand-new-id');
    expect(saveSpellToDBMock).toHaveBeenCalledTimes(1);
    const call = saveSpellToDBMock.mock.calls[0][0];
    expect(call.title).toBe('My Spell');
    expect(call.originalPagesContent).toBe(JSON.stringify([{ type: 'doc', original: true }]));
    expect(call).not.toHaveProperty('pdf');
    expect(call).not.toHaveProperty('originalPdf');

    expect(setOriginalPdfMock).toHaveBeenCalledTimes(1);
    const [storedId, storedBlob] = setOriginalPdfMock.mock.calls[0];
    expect(storedId).toBe('brand-new-id');
    expect(await (storedBlob as Blob).arrayBuffer()).toEqual(await pdfBlob.arrayBuffer());
  });

  it('round-trips bundled audio renders into setCachedAudio calls keyed on the NEW spell id', async () => {
    const entries: CachedAudioEntry[] = [
      { page: 1, voice: 'alice', blob: new Blob(['a1'], { type: 'audio/mpeg' }), timeline: [{ text: 'hi', start: 0, end: 1 }] },
      { page: 2, voice: 'alice', blob: new Blob(['a2'], { type: 'audio/mpeg' }), timeline: [{ text: 'bye', start: 1, end: 2 }] },
    ];
    getCachedAudioEntriesForSpellMock.mockResolvedValue(entries);
    saveSpellToDBMock.mockResolvedValue('brand-new-id');

    const { blob } = await exportSpellToBlob('spell-1', 'user-1', { includeAudio: true });
    const newId = await importSpellFromFile(asFile(blob), 'user-2');

    expect(newId).toBe('brand-new-id');
    expect(setCachedAudioMock).toHaveBeenCalledTimes(2);
    const [firstCallArgs] = setCachedAudioMock.mock.calls.filter(([id, page]) => id === 'brand-new-id' && page === 1);
    expect(firstCallArgs[2]).toBe('alice');
    expect(firstCallArgs[4]).toEqual(entries[0].timeline);
    expect(await (firstCallArgs[3] as Blob).arrayBuffer()).toEqual(await entries[0].blob.arrayBuffer());
  });

  describe('format v1 backward compatibility', () => {
    const buildV1Zip = async (opts: { withPdf?: boolean; withOriginalPages?: boolean } = {}) => {
      const zip = new JSZip();
      zip.file('spell.json', JSON.stringify({ title: 'Old Spell', pagesContent: '[]' }));
      const hasSource = !!(opts.withPdf || opts.withOriginalPages);
      if (opts.withPdf) zip.file('source/original.pdf', new TextEncoder().encode('%PDF-1.4 v1'));
      if (opts.withOriginalPages) zip.file('source/originalPagesContent.json', JSON.stringify([{ type: 'doc', v1: true }]));
      zip.file('manifest.json', JSON.stringify({ formatVersion: 1, title: 'Old Spell', exportedAt: '', hasSource, voices: [] }));
      return zip.generateAsync({ type: 'blob' });
    };

    it('imports a v1 .spell with a bundled PDF without breaking, ignoring the PDF entirely', async () => {
      const blob = await buildV1Zip({ withPdf: true });
      saveSpellToDBMock.mockResolvedValue('v1-new-id');

      const newId = await importSpellFromFile(asFile(blob), 'user-2');

      expect(newId).toBe('v1-new-id');
      expect(saveSpellToDBMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Old Spell' }));
      const call = saveSpellToDBMock.mock.calls[0][0];
      expect(call).not.toHaveProperty('pdf');
      expect(call).not.toHaveProperty('originalPdf');
      // The old PDF is not migrated into the new store either -- explicitly dropped.
      expect(setOriginalPdfMock).not.toHaveBeenCalled();
    });

    it('still hydrates originalPagesContent from a v1 source/ folder (for revert to keep working)', async () => {
      const blob = await buildV1Zip({ withOriginalPages: true });
      const newId = await importSpellFromFile(asFile(blob), 'user-2');
      expect(newId).toBeDefined();
      const call = saveSpellToDBMock.mock.calls[0][0];
      expect(call.originalPagesContent).toBe(JSON.stringify([{ type: 'doc', v1: true }]));
    });
  });
});
