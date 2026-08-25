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
  getCachedAudioEntriesForSpellMock.mockResolvedValue([]);
  saveSpellToDBMock.mockResolvedValue('new-spell-id');
  setCachedAudioMock.mockResolvedValue(undefined);
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
      hasSource: false,
      voices: [],
    });
  });

  it('never includes the reader progress in spell.json, even though the record has one', async () => {
    const { blob } = await exportSpellToBlob('spell-1', 'user-1');
    const spellJson = await readZipJson(blob, 'spell.json') as Record<string, unknown>;
    expect(spellJson.progress).toBeUndefined();
    expect(Object.keys(spellJson)).toEqual(['title', 'pagesContent']);
  });

  it('bundles source/ when includeSource is true and the record has an original PDF', async () => {
    const pdfBytes = new TextEncoder().encode('%PDF-1.4 fake');
    getSpellByIdMock.mockResolvedValue({
      ...baseSpell,
      originalPdf: new Blob([pdfBytes], { type: 'application/pdf' }),
      originalPagesContent: JSON.stringify([{ type: 'doc', original: true }]),
    });

    const { blob } = await exportSpellToBlob('spell-1', 'user-1', { includeSource: true });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());

    expect(zip.file('source/original.pdf')).not.toBeNull();
    expect(zip.file('source/originalPagesContent.json')).not.toBeNull();
    const manifest = await readZipJson(blob, 'manifest.json') as SpellManifest;
    expect(manifest.hasSource).toBe(true);
  });

  it('does not bundle source/ when includeSource is true but the record has no original PDF/pages', async () => {
    const { blob } = await exportSpellToBlob('spell-1', 'user-1', { includeSource: true });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(zip.file('source/original.pdf')).toBeNull();
    const manifest = await readZipJson(blob, 'manifest.json') as SpellManifest;
    expect(manifest.hasSource).toBe(false);
  });

  it('does not bundle source/ when includeSource is false, even if the record has an original PDF', async () => {
    getSpellByIdMock.mockResolvedValue({
      ...baseSpell,
      originalPdf: new Blob(['fake'], { type: 'application/pdf' }),
    });
    const { blob } = await exportSpellToBlob('spell-1', 'user-1', { includeSource: false });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(zip.file('source/original.pdf')).toBeNull();
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
    zip.file('manifest.json', JSON.stringify({ formatVersion: 999, title: 't', exportedAt: '', hasSource: false, voices: [] }));
    zip.file('spell.json', JSON.stringify({ title: 't', pagesContent: '[]' }));
    const blob = await zip.generateAsync({ type: 'blob' });

    await expect(importSpellFromFile(asFile(blob), 'user-1')).rejects.toThrow(/Unsupported \.spell format version/);
  });

  it('throws SpellImportError when spell.json is missing', async () => {
    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify({ formatVersion: SPELL_FORMAT_VERSION, title: 't', exportedAt: '', hasSource: false, voices: [] }));
    const blob = await zip.generateAsync({ type: 'blob' });

    await expect(importSpellFromFile(asFile(blob), 'user-1')).rejects.toThrow(/missing spell\.json/);
  });

  it('round-trips a plain spell (no source, no audio) through export then import', async () => {
    const { blob } = await exportSpellToBlob('spell-1', 'user-1');
    const newId = await importSpellFromFile(asFile(blob), 'user-2');

    expect(newId).toBe('new-spell-id');
    expect(saveSpellToDBMock).toHaveBeenCalledWith({
      title: 'My Spell',
      userId: 'user-2',
      pagesContent: baseSpell.pagesContent,
      pdf: undefined,
      originalPdf: undefined,
      originalPagesContent: undefined,
    });
    expect(setCachedAudioMock).not.toHaveBeenCalled();
  });

  it('round-trips a spell with bundled source into a new record using a fresh id', async () => {
    const pdfBlob = new Blob([new TextEncoder().encode('%PDF-1.4 fake')], { type: 'application/pdf' });
    getSpellByIdMock.mockResolvedValue({
      ...baseSpell,
      originalPdf: pdfBlob,
      originalPagesContent: JSON.stringify([{ type: 'doc', original: true }]),
    });

    const { blob } = await exportSpellToBlob('spell-1', 'user-1', { includeSource: true });
    await importSpellFromFile(asFile(blob), 'user-2');

    expect(saveSpellToDBMock).toHaveBeenCalledTimes(1);
    const call = saveSpellToDBMock.mock.calls[0][0];
    expect(call.title).toBe('My Spell');
    expect(call.originalPagesContent).toBe(JSON.stringify([{ type: 'doc', original: true }]));
    // The bundled PDF doubles as both `pdf` and `originalPdf`, mirroring a fresh upload.
    expect(call.pdf).toBeInstanceOf(Blob);
    expect(call.originalPdf).toBeInstanceOf(Blob);
    expect(await call.pdf.arrayBuffer()).toEqual(await call.originalPdf.arrayBuffer());
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
});
