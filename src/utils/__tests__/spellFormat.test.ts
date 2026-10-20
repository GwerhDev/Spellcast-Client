import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openContainer, writeContainer } from '../spellContainer';
import {
  exportSpellToBlob,
  importSpellFromFile,
  downloadBlob,
  SpellImportError,
  SPELL_FORMAT_VERSION,
  type SpellManifest,
  type ExportSpellOptions,
} from '../spellFormat';
import { SpellLockedError } from '../spellProtection';
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

// A .spell opened as the app opens it, to look inside.
type Opened = Awaited<ReturnType<typeof openContainer<SpellManifest>>>;
const open = async (blob: Blob): Promise<Opened> => openContainer<SpellManifest>(new Uint8Array(await blob.arrayBuffer()));
const filesUnder = (opened: Opened, prefix: string) => opened.paths.filter(p => p.startsWith(prefix)).sort();
const manifestOf = async (blob: Blob) => (await open(blob)).manifest;
const text = async (opened: Opened, path: string) => { const data = await opened.read(path); return data ? new TextDecoder().decode(data) : null; };

beforeEach(() => {
  vi.clearAllMocks();
  getSpellByIdMock.mockResolvedValue(baseSpell);
  getOriginalPdfMock.mockResolvedValue(null);
  getCachedAudioEntriesForSpellMock.mockResolvedValue([]);
  saveSpellToDBMock.mockResolvedValue('new-spell-id');
  setCachedAudioMock.mockResolvedValue(undefined);
  setOriginalPdfMock.mockResolvedValue(undefined);
});

// A small PNG-ish payload as a page carries it: a base64 data URL in an image's src.
const IMG_A = 'data:image/png;base64,' + btoa('image-a-bytes');
const IMG_B = 'data:image/jpeg;base64,' + btoa('image-b-bytes');
const imagePage = (src: string, text = 'Hi') => ({
  type: 'doc',
  attrs: { displayWidth: 794, marginTop: 0 },
  content: [
    { type: 'image', attrs: { src, alt: null, title: null, width: 794 } },
    { type: 'paragraph', content: [{ type: 'text', text }] },
  ],
});
const asFile = (blob: Blob, name = 'export.spell') => new File([blob], name);
const exported = async (options = {}) => (await exportSpellToBlob('spell-1', 'user-1', options)).blob;
const sha = async (bytes: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource)), b => b.toString(16).padStart(2, '0')).join('');

describe('SPELL_FORMAT_VERSION', () => {
  it('is 1', () => {
    expect(SPELL_FORMAT_VERSION).toBe(1);
  });
});

describe('exportSpellToBlob', () => {
  it('throws when the spell is not found', async () => {
    getSpellByIdMock.mockResolvedValue(undefined);
    await expect(exportSpellToBlob('missing', 'user-1')).rejects.toThrow('Spell not found.');
  });

  it("is a binary of the app's own, not a ZIP", async () => {
    getSpellByIdMock.mockResolvedValue({ ...baseSpell, pagesContent: JSON.stringify([imagePage(IMG_A, 'some words')]) });
    const bytes = new Uint8Array(await (await exported()).arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('SPELL');
    expect(bytes[5]).toBe(SPELL_FORMAT_VERSION);
    // A ZIP starts with "PK\x03\x04".
    expect(Array.from(bytes.slice(0, 4))).not.toEqual([0x50, 0x4b, 0x03, 0x04]);
  });

  it('writes one entry per page and the manifest, never the reader progress', async () => {
    getSpellByIdMock.mockResolvedValue({ ...baseSpell, pagesContent: JSON.stringify([{ type: 'doc' }, { type: 'doc', content: [] }]) });
    const opened = await open(await exported());

    expect(filesUnder(opened, 'pages/')).toEqual(['pages/0001.json', 'pages/0002.json']);
    expect(opened.manifest).toMatchObject({
      formatVersion: 1, title: 'My Spell', pageCount: 2, originalPageCount: null, cover: null, hasOriginalPdf: false, voices: [],
    });
    const everything = await Promise.all(opened.paths.map(path => text(opened, path)));
    expect([JSON.stringify(opened.manifest), ...everything].join('\n')).not.toContain('lastReadSentenceIndex');
  });

  it('takes images out of the pages into assets/, once per content, the pages referring to them', async () => {
    getSpellByIdMock.mockResolvedValue({
      ...baseSpell,
      pagesContent: JSON.stringify([imagePage(IMG_A), imagePage(IMG_B), imagePage(IMG_A, 'same image again')]),
    });
    const opened = await open(await exported());

    const assets = filesUnder(opened, 'assets/');
    expect(assets).toHaveLength(2);
    expect(assets.some(a => /^assets\/[0-9a-f]{64}\.png$/.test(a))).toBe(true);
    expect(assets.some(a => /^assets\/[0-9a-f]{64}\.jpg$/.test(a))).toBe(true);
    const png = assets.find(a => a.endsWith('.png'))!;
    expect(await text(opened, png)).toBe('image-a-bytes');

    const page1 = await text(opened, 'pages/0001.json');
    expect(page1).not.toContain('base64');
    expect(page1).toContain(`spell-asset:${png.slice('assets/'.length)}`);
  });

  // Content-addressed storage keeps an unchanged entry once: it has to be the very same bytes.
  it('editing one page changes only that entry; the rest, images included, stay byte for byte the same', async () => {
    const pages = [imagePage(IMG_A, 'one'), imagePage(IMG_B, 'two')];
    getSpellByIdMock.mockResolvedValue({ ...baseSpell, pagesContent: JSON.stringify(pages) });
    const before = new Uint8Array(await (await exported()).arrayBuffer());
    getSpellByIdMock.mockResolvedValue({ ...baseSpell, pagesContent: JSON.stringify([pages[0], imagePage(IMG_B, 'two, edited')]) });
    const after = new Uint8Array(await (await exported()).arrayBuffer());

    const [b, a] = [await open(new Blob([before])), await open(new Blob([after]))];
    expect(await text(a, 'pages/0001.json')).toBe(await text(b, 'pages/0001.json'));
    expect(await text(a, 'pages/0002.json')).not.toBe(await text(b, 'pages/0002.json'));
    expect(filesUnder(a, 'assets/')).toEqual(filesUnder(b, 'assets/'));
    // What didn't change is stored as the very same bytes in both files.
    const raw = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes);
    for (const asset of filesUnder(b, 'assets/')) {
      const data = new TextDecoder('latin1').decode((await b.read(asset))!);
      expect(raw(before)).toContain(data);
      expect(raw(after)).toContain(data);
    }
  });

  it('writes the original pages the same way, whenever the record has them, regardless of includeSource', async () => {
    getSpellByIdMock.mockResolvedValue({ ...baseSpell, pagesContent: JSON.stringify([imagePage(IMG_A)]), originalPagesContent: JSON.stringify([imagePage(IMG_A), imagePage(IMG_B)]) });
    const opened = await open(await exported());
    expect(filesUnder(opened, 'original/pages/')).toEqual(['original/pages/0001.json', 'original/pages/0002.json']);
    // The image the page and its original share is one entry.
    expect(filesUnder(opened, 'assets/')).toHaveLength(2);
    expect(opened.manifest.originalPageCount).toBe(2);
  });

  it('bundles the cover', async () => {
    getSpellByIdMock.mockResolvedValue({ ...baseSpell, cover: new Blob(['cover-bytes'], { type: 'image/jpeg' }) });
    const opened = await open(await exported());
    expect(opened.manifest.cover).toBe('cover.jpg');
    expect(await text(opened, 'cover.jpg')).toBe('cover-bytes');
  });

  it('bundles original/original.pdf only when includeSource is true and one is stored', async () => {
    getOriginalPdfMock.mockResolvedValue(new Blob(['%PDF-fake'], { type: 'application/pdf' }));
    const without = await open(await exported());
    expect(without.paths).not.toContain('original/original.pdf');
    expect(getOriginalPdfMock).not.toHaveBeenCalled();

    const withPdf = await open(await exported({ includeSource: true }));
    expect(await text(withPdf, 'original/original.pdf')).toBe('%PDF-fake');
    expect(withPdf.manifest.hasOriginalPdf).toBe(true);

    getOriginalPdfMock.mockResolvedValue(null);
    expect((await manifestOf(await exported({ includeSource: true }))).hasOriginalPdf).toBe(false);
  });

  it('names each render by the content of the page it reads, not by its number', async () => {
    getSpellByIdMock.mockResolvedValue({ ...baseSpell, pagesContent: JSON.stringify([imagePage(IMG_A, 'one'), imagePage(IMG_B, 'two')]) });
    const entries: CachedAudioEntry[] = [
      { page: 1, voice: 'nova', blob: new Blob(['a1'], { type: 'audio/mpeg' }), timeline: [{ start: 0, end: 1 }] as never },
      { page: 2, voice: 'nova', blob: new Blob(['a2'], { type: 'audio/mpeg' }), timeline: [] },
    ];
    getCachedAudioEntriesForSpellMock.mockResolvedValue(entries);
    const opened = await open(await exported({ includeAudio: true }));

    const hash = await sha((await opened.read('pages/0001.json'))!);
    expect(await text(opened, `renders/nova/${hash}.mp3`)).toBe('a1');
    expect(JSON.parse((await text(opened, `renders/nova/${hash}.timeline.json`))!)).toEqual([{ start: 0, end: 1 }]);
    expect(filesUnder(opened, 'renders/nova/')).toHaveLength(4);
    expect(filesUnder(opened, 'renders/').some(p => /page-\d/.test(p))).toBe(false);
    expect(opened.manifest.voices).toEqual(['nova']);
  });

  it('reports no voices when includeAudio is true but nothing is cached', async () => {
    expect((await manifestOf(await exported({ includeAudio: true }))).voices).toEqual([]);
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

  it('includes description/author/tags/language in the manifest when the record has them', async () => {
    getSpellByIdMock.mockResolvedValue({ ...baseSpell, description: 'A tale of dragons', author: 'Jane Doe', tags: ['fantasy'], language: 'en' });
    expect(await manifestOf(await exported())).toMatchObject({ description: 'A tale of dragons', author: 'Jane Doe', tags: ['fantasy'], language: 'en' });
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
  const manifest = (over: Partial<SpellManifest> = {}): SpellManifest => ({
    formatVersion: 1, title: 't', exportedAt: '', pageCount: 1, originalPageCount: null, cover: null, hasOriginalPdf: false, voices: [], ...over,
  });
  const containerWith = async (m: SpellManifest, files: Record<string, string>, { version = 1 } = {}) =>
    asFile(await writeContainer(m, Object.entries(files).map(([path, content]) => ({ path, data: new TextEncoder().encode(content), compress: true })), { version }));

  it('rejects anything that is not a .spell, a ZIP included', async () => {
    // The start of a ZIP (a local file header), as an old .spell had.
    const zipStart = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00, ...new TextEncoder().encode('manifest.json')]);
    await expect(importSpellFromFile(asFile(new Blob([zipStart])), 'user-1')).rejects.toThrow(SpellImportError);
    await expect(importSpellFromFile(asFile(new Blob(['hello'])), 'user-1')).rejects.toThrow('Not a .spell file.');
  });

  it('rejects a file that was changed', async () => {
    getSpellByIdMock.mockResolvedValue({ ...baseSpell, pagesContent: JSON.stringify([imagePage(IMG_A)]) });
    const bytes = new Uint8Array(await (await exported()).arrayBuffer());
    for (const at of [20, bytes.length - 5]) {
      const changed = bytes.slice();
      changed[at] ^= 0xff;
      await expect(importSpellFromFile(asFile(new Blob([changed])), 'user-1')).rejects.toThrow(SpellImportError);
    }
    expect(saveSpellToDBMock).not.toHaveBeenCalled();
  });

  it('accepts only format version 1', async () => {
    for (const formatVersion of [2, 3]) {
      const file = await containerWith(manifest({ formatVersion }), { 'pages/0001.json': '{"type":"doc"}' }, { version: formatVersion });
      await expect(importSpellFromFile(file, 'user-1')).rejects.toThrow(`Unsupported .spell format version: ${formatVersion}.`);
    }
  });

  it('throws SpellImportError when a page entry is missing', async () => {
    const file = await containerWith(manifest({ pageCount: 2 }), { 'pages/0001.json': '{"type":"doc"}' });
    await expect(importSpellFromFile(file, 'user-1')).rejects.toThrow('missing pages/0002.json');
  });

  it('throws SpellImportError when an image a page refers to is missing', async () => {
    const ref = `spell-asset:${'a'.repeat(64)}.png`;
    const file = await containerWith(manifest(), { 'pages/0001.json': JSON.stringify(imagePage(ref)) });
    await expect(importSpellFromFile(file, 'user-1')).rejects.toBeInstanceOf(SpellImportError);
  });

  it('round-trips pages, images, original pages, cover and metadata into a new spell, the very same pagesContent', async () => {
    const pagesContent = JSON.stringify([imagePage(IMG_A), imagePage(IMG_B, 'two'), { type: 'doc', content: [] }]);
    const originalPagesContent = JSON.stringify([imagePage(IMG_A, 'as first read')]);
    getSpellByIdMock.mockResolvedValue({
      ...baseSpell, pagesContent, originalPagesContent,
      cover: new Blob(['cover-bytes'], { type: 'image/png' }),
      description: 'A tale', author: 'Jane', tags: ['x'], language: 'es',
    });

    const id = await importSpellFromFile(asFile(await exported()), 'user-2');
    expect(id).toBe('new-spell-id');
    const saved = saveSpellToDBMock.mock.calls[0][0];
    expect(saved.pagesContent).toBe(pagesContent);
    expect(saved.originalPagesContent).toBe(originalPagesContent);
    expect(saved).toMatchObject({ title: 'My Spell', userId: 'user-2', description: 'A tale', author: 'Jane', tags: ['x'], language: 'es' });
    expect(saved.cover.type).toBe('image/png');
    expect(await saved.cover.text()).toBe('cover-bytes');
    expect(saved).not.toHaveProperty('progress');
    expect(setOriginalPdfMock).not.toHaveBeenCalled();
  });

  // An image type outside the usual ones still comes back as it was.
  it('round-trips an image of an unusual type exactly', async () => {
    // The same bytes under two types, too: each comes back with its own.
    const pagesContent = JSON.stringify([
      imagePage('data:image/jpg;base64,' + btoa('jpg-bytes')), imagePage('data:image/bmp;base64,' + btoa('bmp-bytes')),
      imagePage('data:image/x-unusual;base64,' + btoa('jpg-bytes')),
    ]);
    getSpellByIdMock.mockResolvedValue({ ...baseSpell, pagesContent, cover: new Blob(['c'], { type: 'image/x-icon' }) });
    await importSpellFromFile(asFile(await exported()), 'user-1');
    const saved = saveSpellToDBMock.mock.calls[0][0];
    expect(saved.pagesContent).toBe(pagesContent);
    expect(saved.cover.type).toBe('image/x-icon');
  });

  it('round-trips a bundled original PDF into the dedicated store', async () => {
    getOriginalPdfMock.mockResolvedValue(new Blob(['%PDF-fake'], { type: 'application/pdf' }));
    await importSpellFromFile(asFile(await exported({ includeSource: true })), 'user-1');
    expect(setOriginalPdfMock).toHaveBeenCalledWith('new-spell-id', expect.any(Blob));
    expect(saveSpellToDBMock.mock.calls[0][0]).not.toHaveProperty('originalPdf');
  });

  it('puts each render back on every page that reads that content, under the new spell id', async () => {
    getSpellByIdMock.mockResolvedValue({ ...baseSpell, pagesContent: JSON.stringify([imagePage(IMG_A, 'one'), imagePage(IMG_B, 'two'), imagePage(IMG_A, 'one')]) });
    getCachedAudioEntriesForSpellMock.mockResolvedValue([
      { page: 1, voice: 'nova', blob: new Blob(['a1'], { type: 'audio/mpeg' }), timeline: [] },
      { page: 2, voice: 'nova', blob: new Blob(['a2'], { type: 'audio/mpeg' }), timeline: [{ start: 0 }] },
    ]);
    await importSpellFromFile(asFile(await exported({ includeAudio: true })), 'user-1');

    const calls = setCachedAudioMock.mock.calls.map(([spellId, page, voice]) => `${spellId}:${page}:${voice}`).sort();
    // Page 3 reads what page 1 reads: it gets that render too.
    expect(calls).toEqual(['new-spell-id:1:nova', 'new-spell-id:2:nova', 'new-spell-id:3:nova']);
    const page2 = setCachedAudioMock.mock.calls.find(([, page]) => page === 2)!;
    expect(page2[4]).toEqual([{ start: 0 }]);
  });
});

describe('a protected .spell', () => {
  const KEY = { id: 'key-1', key: crypto.getRandomValues(new Uint8Array(32)) };
  const lockedFile = async (protectWith: ExportSpellOptions['protectWith']) => {
    getSpellByIdMock.mockResolvedValue({ ...baseSpell, pagesContent: JSON.stringify([imagePage(IMG_A, 'A hidden page')]) });
    // Few iterations: the derivations are real, only shorter.
    return asFile(await exported({ protectWith: protectWith && { iterations: 1000, ...protectWith } }));
  };

  it('imports with its password, exactly as it was', async () => {
    const file = await lockedFile({ password: 'correct horse' });
    expect(new TextDecoder('latin1').decode(new Uint8Array(await file.arrayBuffer()))).not.toContain('My Spell');
    await expect(importSpellFromFile(file, 'user-1')).rejects.toBeInstanceOf(SpellLockedError);
    await expect(importSpellFromFile(file, 'user-1', { password: 'wrong' })).rejects.toMatchObject({ wrong: true });
    expect(saveSpellToDBMock).not.toHaveBeenCalled();
    await importSpellFromFile(file, 'user-1', { password: 'correct horse' });
    expect(saveSpellToDBMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'My Spell', pagesContent: JSON.stringify([imagePage(IMG_A, 'A hidden page')]) }));
  });

  it('with a password and a key, imports with either', async () => {
    const file = await lockedFile({ password: 'correct horse', keys: [KEY] });
    await importSpellFromFile(file, 'user-1', { keys: [KEY] });
    await importSpellFromFile(file, 'user-1', { password: 'correct horse' });
    expect(saveSpellToDBMock).toHaveBeenCalledTimes(2);
  });

  it('altered, is told apart as an import error', async () => {
    const bytes = new Uint8Array(await (await lockedFile({ keys: [KEY] })).arrayBuffer());
    bytes[bytes.length - 3] ^= 0x01;
    await expect(importSpellFromFile(asFile(new Blob([bytes])), 'user-1', { keys: [KEY] })).rejects.toThrow(SpellImportError);
    expect(saveSpellToDBMock).not.toHaveBeenCalled();
  });
});

