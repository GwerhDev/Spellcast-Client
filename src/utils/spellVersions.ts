import type { Spell } from '../interfaces';
import { sha256Hex } from './spellContainer';
import { pageFileName, readWork, writeWork, type SpellFileSource, type SpellWork, type SpellWorkLayout } from './spellFormat';
import { diffSpells, type SpellDiff, type SpellSnapshot } from './spellDiff';
import { alignByContent } from './sequenceAlign';
import type { JSONContent } from '@tiptap/core';
import { recordImages as recordImagesOf, imagesOf, type SpellImage } from './spellImages';
import { getSpellById } from '../db';
import {
  getBlob, getRepo, getSeal, getVersion, getVersions, putBlobs, putSealAndHead, putVersionAsCurrent, setCurrentVersion,
  withSpellLock, type SealRecord, type VersionRecord,
} from '../db/spellRepository';

// A spell's versions, kept locally as a repository (see db/spellRepository): sealing (the Save
// button) snapshots the spell's work as files stored by content; a version is a line of work
// pointing at its latest seal; the chronicle is a version's seals, newest first. The spell's
// own record keeps the working state (what the editor autosaves), as before.
//
// A seal's files are the same as a .spell's entries (see spellFormat's writeWork) -- pages,
// original pages, images, cover -- plus spell.json with the work's details. Audio isn't sealed.
// Its images are stored only while the spell's record doesn't hold them (see
// db/spellRepository): a seal's image is read from the repository, or else from the record.
//
// Everything here runs holding the spell's lock (withSpellLock), one at a time with the
// writes of its record.

// Every spell's first version, where the others come from.
export const SOURCE_VERSION = 'source';
const META_PATH = 'spell.json';

type WorkMeta = SpellWorkLayout & Omit<SpellWork, 'pagesContent' | 'originalPagesContent' | 'cover'>;

export const workOf = (spell: Spell): SpellWork => ({
  title: spell.title,
  pagesContent: spell.pagesContent ?? '[]',
  originalPagesContent: spell.originalPagesContent,
  cover: spell.cover,
  description: spell.description,
  author: spell.author,
  tags: spell.tags,
  language: spell.language,
});

const encode = (text: string) => new TextEncoder().encode(text);

// The work as files: path -> sha256, and the files themselves.
const filesOf = async (work: SpellWork) => {
  const { entries, layout } = await writeWork(work);
  const meta: WorkMeta = {
    ...layout,
    title: work.title, description: work.description, author: work.author, tags: work.tags, language: work.language,
  };
  const all = [...entries.list, { path: META_PATH, data: encode(JSON.stringify(meta)), type: undefined }];
  const files: Record<string, string> = {};
  const blobs: SealFile[] = [];
  for (const entry of all) {
    const sha256 = await sha256Hex(entry.data);
    files[entry.path] = sha256;
    blobs.push({ sha256, data: entry.data, type: entry.type, path: entry.path });
  }
  return { files, blobs };
};

type SealFile = SpellImage & { path: string };
const isPageImage = (path: string) => path.startsWith('assets/');
const isImagePath = (path: string) => isPageImage(path) || path.startsWith('cover.');

// The spell's record as stored now (not as the caller last read it).
const storedRecord = async (spell: Spell) => (await getSpellById(spell.id, spell.userId)) ?? null;

// The images the spell's record holds now, by sha256. The same pages as the work being sealed
// (the usual case) are already hashed: only the cover is read again.
const recordImageShas = async (spell: Spell, blobs: SealFile[]): Promise<Set<string>> => {
  const stored = await storedRecord(spell);
  if (!stored) return new Set();
  const samePages = (stored.pagesContent ?? '[]') === (spell.pagesContent ?? '[]') && stored.originalPagesContent === spell.originalPagesContent;
  const images = samePages
    ? [...blobs.filter(blob => isPageImage(blob.path)), ...await imagesOf([], [stored.cover])]
    : await recordImagesOf(stored);
  return new Set(images.map(image => image.sha256));
};

// A seal's files into the repository: all but the images the record holds (stored once, there).
const storeSealFiles = async (spell: Spell, blobs: SealFile[]) => {
  const inRecord = await recordImageShas(spell, blobs);
  await putBlobs(spell.id, blobs
    .filter(blob => !isImagePath(blob.path) || !inRecord.has(blob.sha256))
    .map(({ sha256, data, type }) => ({ sha256, data, type })));
};

const sameFiles = (a: Record<string, string>, b: Record<string, string>) => {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => a[key] === b[key]);
};

// A seal's id: the sha256 of what it is (its files sorted by path, so the same content gives
// the same id wherever it's made). Not the spell's id: that one is local to this device.
const sealIdOf = async ({ parentIds, files, message, createdAt }: Omit<SealRecord, 'id'>) => {
  const sorted = Object.keys(files).sort().map(path => [path, files[path]]);
  return sha256Hex(encode(JSON.stringify({ parentIds, files: sorted, message, createdAt })));
};

const makeSeal = async (spellId: string, parentIds: string[], files: Record<string, string>, message: string): Promise<SealRecord> => {
  const base = { spellId, parentIds, files, message, createdAt: new Date().toISOString() };
  return { id: await sealIdOf(base), ...base };
};

export interface RepositoryState {
  currentVersion: string;
  head: SealRecord;
}

const currentState = async (spellId: string): Promise<RepositoryState | null> => {
  const repo = await getRepo(spellId);
  if (!repo) return null;
  const version = await getVersion(spellId, repo.currentVersion);
  const head = version ? await getSeal(spellId, version.headSealId) : undefined;
  return head ? { currentVersion: repo.currentVersion, head } : null;
};

/**
 * The spell's repository, made the first time it's needed: a spell from before versions (every
 * existing one) gets the source version, with a first seal of its work as it is.
 */
export const spellRepository = (spell: Spell): Promise<RepositoryState> => withSpellLock(spell.id, () => ensureRepository(spell));

const ensureRepository = async (spell: Spell): Promise<RepositoryState> => {
  const state = await currentState(spell.id);
  if (state) return state;
  const { files, blobs } = await filesOf(workOf(spell));
  await storeSealFiles(spell, blobs);
  const head = await makeSeal(spell.id, [], files, '');
  await putSealAndHead(head, { spellId: spell.id, name: SOURCE_VERSION, headSealId: head.id, createdAt: head.createdAt });
  return { currentVersion: SOURCE_VERSION, head };
};

/** Whether the spell's work is what its current version's latest seal holds. */
export const spellIsSealed = (spell: Spell): Promise<boolean> => withSpellLock(spell.id, async () => {
  const { head } = await ensureRepository(spell);
  const { files } = await filesOf(workOf(spell));
  return sameFiles(files, head.files);
});

/**
 * Seals the spell's work on its current version (the Save button). Nothing changed since the
 * latest seal: no new seal (`created` false).
 */
export const spellSeal = (spell: Spell, message = ''): Promise<{ seal: SealRecord; created: boolean }> => withSpellLock(spell.id, async () => {
  const { currentVersion, head } = await ensureRepository(spell);
  const { files, blobs } = await filesOf(workOf(spell));
  if (sameFiles(files, head.files)) return { seal: head, created: false };
  // What the latest seal already holds is kept already (in the repository or in the record).
  const held = new Set(Object.values(head.files));
  await storeSealFiles(spell, blobs.filter(blob => !held.has(blob.sha256)));
  const seal = await makeSeal(spell.id, [head.id], files, message);
  const version = await getVersion(spell.id, currentVersion);
  await putSealAndHead(seal, { spellId: spell.id, name: currentVersion, headSealId: seal.id, createdAt: version?.createdAt ?? seal.createdAt });
  return { seal, created: true };
});

export interface ChronicleEntry {
  seal: SealRecord;
  // What changed from the seal before it (none for the first).
  first: boolean;
  // Pages added, removed, changed and moved, told apart by content (see spellDiff): a page
  // inserted at the start doesn't count the ones after it as changed.
  pagesAdded: number;
  pagesRemoved: number;
  pagesChanged: number;
  pagesMoved: number;
  detailsChanged: boolean;
  coverChanged: boolean;
}

const pageFiles = (files: Record<string, string>) => Object.keys(files).filter(path => path.startsWith('pages/')).sort();
// The pages a seal added, removed, changed and moved from the one before it, by their files'
// hashes alone (none read): identical pages are anchors, as in spellDiff.
const pageCounts = (before: string[] | null, after: string[]) => {
  const counts = { pagesAdded: 0, pagesRemoved: 0, pagesChanged: 0, pagesMoved: 0 };
  if (!before) return counts;
  const { pairs, byFrom, byTo } = alignByContent(before, after);
  counts.pagesAdded = byTo.filter(pair => !pair).length;
  counts.pagesRemoved = byFrom.filter(pair => !pair).length;
  counts.pagesChanged = pairs.filter(pair => pair.kind === 'changed').length;
  counts.pagesMoved = pairs.filter(pair => pair.kind === 'moved').length;
  return counts;
};

// The cover's file and content, as one value to compare.
const coverOf = (files: Record<string, string>) => Object.entries(files).filter(([path]) => path.startsWith('cover.')).map(e => e.join('=')).join();

// A seal's details (title, description, author, tags, language) as one value to compare: its
// spell.json also says where its pages and cover are, which changes with them.
const detailsOf = async (spellId: string, seal: SealRecord): Promise<string> => {
  const blob = seal.files[META_PATH] ? await getBlob(spellId, seal.files[META_PATH]) : undefined;
  if (!blob) return '';
  const { title, description, author, tags, language } = JSON.parse(new TextDecoder().decode(blob.data)) as WorkMeta;
  return JSON.stringify([title, description, author, tags, language]);
};

/** The chronicle of a version (the current one if none given): its seals, newest first. */
export const spellChronicle = (spell: Spell, versionName?: string): Promise<ChronicleEntry[]> => withSpellLock(spell.id, async () => {
  const { currentVersion } = await ensureRepository(spell);
  const version = await getVersion(spell.id, versionName ?? currentVersion);
  const entries: ChronicleEntry[] = [];
  let seal = version ? await getSeal(spell.id, version.headSealId) : undefined;
  while (seal) {
    const parent = seal.parentIds[0] ? await getSeal(spell.id, seal.parentIds[0]) : undefined;
    const pages = pageFiles(seal.files);
    entries.push({
      seal,
      first: !parent,
      ...pageCounts(parent ? pageFiles(parent.files).map(path => parent.files[path]) : null, pages.map(path => seal!.files[path])),
      detailsChanged: !!parent && seal.files[META_PATH] !== parent.files[META_PATH]
        && await detailsOf(spell.id, seal) !== await detailsOf(spell.id, parent),
      coverChanged: !!parent && coverOf(seal.files) !== coverOf(parent.files),
    });
    seal = parent;
  }
  return entries;
});

/** The spell's versions, and which one it's on. */
export const spellVersions = (spell: Spell): Promise<{ current: string; versions: VersionRecord[] }> => withSpellLock(spell.id, async () => {
  const { currentVersion } = await ensureRepository(spell);
  const versions = await getVersions(spell.id);
  versions.sort((a, b) => (a.name === SOURCE_VERSION ? -1 : b.name === SOURCE_VERSION ? 1 : a.createdAt.localeCompare(b.createdAt)));
  return { current: currentVersion, versions };
});

export class SpellVersionError extends Error {}

/**
 * A new version from where the current one is (its latest seal), made the current one. Unsealed
 * work stays as it is, now on the new version.
 */
export const spellVersion = (spell: Spell, name: string): Promise<VersionRecord> => withSpellLock(spell.id, async () => {
  const trimmed = name.trim();
  if (!trimmed) throw new SpellVersionError('A version needs a name.');
  const { head } = await ensureRepository(spell);
  if (await getVersion(spell.id, trimmed)) throw new SpellVersionError(`There's already a version named "${trimmed}".`);
  const version: VersionRecord = { spellId: spell.id, name: trimmed, headSealId: head.id, createdAt: new Date().toISOString() };
  await putVersionAsCurrent(version);
  return version;
});

// A seal's files, as a .spell's are read: from the repository, or (an image the record still
// holds) from the spell's record as stored now.
const sealSource = (spell: Spell, seal: SealRecord): SpellFileSource => {
  const types = new Map<string, string | undefined>();
  let recordImages: Promise<Map<string, SpellImage>> | null = null;
  const fromRecord = async (sha256: string) => {
    recordImages ??= storedRecord(spell).then(async stored => new Map(
      (stored ? await recordImagesOf(stored) : []).map(image => [image.sha256, image]),
    ));
    return (await recordImages).get(sha256);
  };
  return {
    read: async (path) => {
      const sha256 = seal.files[path];
      if (!sha256) return null;
      const blob = (await getBlob(spell.id, sha256)) ?? (isImagePath(path) ? await fromRecord(sha256) : undefined);
      if (!blob) throw new SpellVersionError(`A sealed file is missing (${path}).`);
      types.set(path, blob.type);
      return blob.data;
    },
    typeOf: (path) => types.get(path),
  };
};

/**
 * Switches the spell to another version: that version's latest seal, as work handed to `write`
 * to put in the spell's record. The spell is on that version only once it's written: a write
 * that fails leaves it on the one it was, with its work as it was. Whatever wasn't sealed on
 * the version it leaves is not kept: seal it first if it's wanted.
 */
export async function spellSwitchVersion(spell: Spell, name: string, write: (work: SpellWork) => Promise<void>): Promise<SpellWork> {
  // Read holding the lock; written after, through the record's own writes (which take it).
  const work = await withSpellLock(spell.id, async () => {
    await ensureRepository(spell);
    const version = await getVersion(spell.id, name);
    const seal = version ? await getSeal(spell.id, version.headSealId) : undefined;
    if (!version || !seal) throw new SpellVersionError(`There's no version named "${name}".`);
    const source = sealSource(spell, seal);
    const metaBytes = await source.read(META_PATH);
    if (!metaBytes) throw new SpellVersionError('A sealed file is missing (spell.json).');
    const meta = JSON.parse(new TextDecoder().decode(metaBytes)) as WorkMeta;
    if (meta.cover) await source.read(meta.cover); // its type known before the cover is read back
    return (await readWork(source, meta)).work;
  });
  await write(work);
  await setCurrentVersion(spell.id, name);
  return work;
}

// ── Changes (see spellDiff) ──

export type ChangesSide = 'from' | 'to';

export interface SpellChanges {
  diff: SpellDiff;
  from: SpellSnapshot;
  to: SpellSnapshot;
  // Each side's cover file (to show it), if it has one.
  cover: Record<ChangesSide, string | null>;
  // An image of one side (an asset a page refers to, or the cover), read when it's shown.
  readImage: (side: ChangesSide, path: string) => Promise<Blob | null>;
}

const EMPTY: SpellSnapshot = { title: '', cover: null, originalPages: null, pages: [] };

// A seal's (or the work's) files as a snapshot to compare: its pages as the files write them
// (images as references, never the images), its cover and original pages known by content.
const snapshotOf = async (files: Record<string, string>, read: (path: string) => Promise<Uint8Array | null>) => {
  const metaBytes = await read(META_PATH);
  if (!metaBytes) throw new SpellVersionError('A sealed file is missing (spell.json).');
  const meta = JSON.parse(new TextDecoder().decode(metaBytes)) as WorkMeta;
  const pages: JSONContent[] = [];
  for (let i = 0; i < meta.pageCount; i++) {
    const bytes = await read(pageFileName('pages', i));
    if (!bytes) throw new SpellVersionError(`A sealed file is missing (${pageFileName('pages', i)}).`);
    pages.push(JSON.parse(new TextDecoder().decode(bytes)) as JSONContent);
  }
  const originals = meta.originalPageCount == null ? null
    : Array.from({ length: meta.originalPageCount }, (_, i) => files[pageFileName('original/pages', i)] ?? '').join();
  const snapshot: SpellSnapshot = {
    title: meta.title, description: meta.description, author: meta.author, tags: meta.tags, language: meta.language,
    cover: meta.cover ? files[meta.cover] ?? null : null,
    originalPages: originals,
    pages,
  };
  return { snapshot, coverPath: meta.cover };
};

const sealSide = async (spell: Spell, seal: SealRecord) => {
  const source = sealSource(spell, seal);
  const { snapshot, coverPath } = await snapshotOf(seal.files, source.read);
  const readImage = async (path: string) => {
    const data = await source.read(path);
    return data ? new Blob([data as BlobPart], { type: source.typeOf(path) ?? '' }) : null;
  };
  return { snapshot, coverPath, readImage };
};

const workSide = async (spell: Spell) => {
  const { files, blobs } = await filesOf(workOf(spell));
  const byPath = new Map(blobs.map(blob => [blob.path, blob]));
  const read = async (path: string) => byPath.get(path)?.data ?? null;
  const { snapshot, coverPath } = await snapshotOf(files, read);
  const readImage = async (path: string) => {
    const blob = byPath.get(path);
    return blob ? new Blob([blob.data as BlobPart], { type: blob.type ?? '' }) : null;
  };
  return { snapshot, coverPath, readImage };
};

type Side = Awaited<ReturnType<typeof sealSide>>;
const changesOf = (from: Side | null, to: Side): SpellChanges => ({
  diff: diffSpells(from?.snapshot ?? EMPTY, to.snapshot),
  from: from?.snapshot ?? EMPTY,
  to: to.snapshot,
  cover: { from: from?.coverPath ?? null, to: to.coverPath ?? null },
  readImage: (side, path) => (side === 'from' ? from?.readImage(path) ?? Promise.resolve(null) : to.readImage(path)),
});

/** What a seal changed from the seal before it (from nothing, for the first). */
export const spellSealChanges = (spell: Spell, sealId: string): Promise<SpellChanges> => withSpellLock(spell.id, async () => {
  await ensureRepository(spell);
  const seal = await getSeal(spell.id, sealId);
  if (!seal) throw new SpellVersionError('That seal is not in this spell.');
  const parent = seal.parentIds[0] ? await getSeal(spell.id, seal.parentIds[0]) : undefined;
  return changesOf(parent ? await sealSide(spell, parent) : null, await sealSide(spell, seal));
});

/** What the work has that its current version's latest seal doesn't (the changes not sealed). */
export const spellUnsealedChanges = (spell: Spell): Promise<SpellChanges> => withSpellLock(spell.id, async () => {
  const { head } = await ensureRepository(spell);
  return changesOf(await sealSide(spell, head), await workSide(spell));
});
