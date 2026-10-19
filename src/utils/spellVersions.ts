import type { Spell } from '../interfaces';
import { sha256Hex } from './spellContainer';
import { readWork, writeWork, type SpellFileSource, type SpellWork, type SpellWorkLayout } from './spellFormat';
import {
  getBlob, getRepo, getSeal, getVersion, getVersions, putBlobs, putSealAndHead, putVersionAsCurrent, setCurrentVersion,
  type SealRecord, type VersionRecord,
} from '../db/spellRepository';

// A spell's versions, kept locally as a repository (see db/spellRepository): sealing (the Save
// button) snapshots the spell's work as files stored by content; a version is a line of work
// pointing at its latest seal; the chronicle is a version's seals, newest first. The spell's
// own record keeps the working state (what the editor autosaves), as before.
//
// A seal's files are the same as a .spell's entries (see spellFormat's writeWork) -- pages,
// original pages, images, cover -- plus spell.json with the work's details. Audio isn't sealed.

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
  const blobs: { sha256: string; data: Uint8Array; type?: string }[] = [];
  for (const entry of all) {
    const sha256 = await sha256Hex(entry.data);
    files[entry.path] = sha256;
    blobs.push({ sha256, data: entry.data, type: entry.type });
  }
  return { files, blobs };
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
export async function spellRepository(spell: Spell): Promise<RepositoryState> {
  const state = await currentState(spell.id);
  if (state) return state;
  const { files, blobs } = await filesOf(workOf(spell));
  await putBlobs(spell.id, blobs);
  const head = await makeSeal(spell.id, [], files, '');
  await putSealAndHead(head, { spellId: spell.id, name: SOURCE_VERSION, headSealId: head.id, createdAt: head.createdAt });
  return { currentVersion: SOURCE_VERSION, head };
}

/** Whether the spell's work is what its current version's latest seal holds. */
export async function spellIsSealed(spell: Spell): Promise<boolean> {
  const { head } = await spellRepository(spell);
  const { files } = await filesOf(workOf(spell));
  return sameFiles(files, head.files);
}

/**
 * Seals the spell's work on its current version (the Save button). Nothing changed since the
 * latest seal: no new seal (`created` false).
 */
export async function spellSeal(spell: Spell, message = ''): Promise<{ seal: SealRecord; created: boolean }> {
  const { currentVersion, head } = await spellRepository(spell);
  const { files, blobs } = await filesOf(workOf(spell));
  if (sameFiles(files, head.files)) return { seal: head, created: false };
  await putBlobs(spell.id, blobs.filter(blob => !Object.values(head.files).includes(blob.sha256)));
  const seal = await makeSeal(spell.id, [head.id], files, message);
  const version = await getVersion(spell.id, currentVersion);
  await putSealAndHead(seal, { spellId: spell.id, name: currentVersion, headSealId: seal.id, createdAt: version?.createdAt ?? seal.createdAt });
  return { seal, created: true };
}

export interface ChronicleEntry {
  seal: SealRecord;
  // What changed from the seal before it (none for the first).
  first: boolean;
  pagesChanged: number;
  pageCountChanged: boolean;
  detailsChanged: boolean;
  coverChanged: boolean;
}

const pageFiles = (files: Record<string, string>) => Object.keys(files).filter(path => path.startsWith('pages/'));
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
export async function spellChronicle(spell: Spell, versionName?: string): Promise<ChronicleEntry[]> {
  const { currentVersion } = await spellRepository(spell);
  const version = await getVersion(spell.id, versionName ?? currentVersion);
  const entries: ChronicleEntry[] = [];
  let seal = version ? await getSeal(spell.id, version.headSealId) : undefined;
  while (seal) {
    const parent = seal.parentIds[0] ? await getSeal(spell.id, seal.parentIds[0]) : undefined;
    const pages = pageFiles(seal.files);
    entries.push({
      seal,
      first: !parent,
      pagesChanged: parent ? pages.filter(path => seal!.files[path] !== parent.files[path]).length : 0,
      pageCountChanged: !!parent && pages.length !== pageFiles(parent.files).length,
      detailsChanged: !!parent && seal.files[META_PATH] !== parent.files[META_PATH]
        && await detailsOf(spell.id, seal) !== await detailsOf(spell.id, parent),
      coverChanged: !!parent && coverOf(seal.files) !== coverOf(parent.files),
    });
    seal = parent;
  }
  return entries;
}

/** The spell's versions, and which one it's on. */
export async function spellVersions(spell: Spell): Promise<{ current: string; versions: VersionRecord[] }> {
  const { currentVersion } = await spellRepository(spell);
  const versions = await getVersions(spell.id);
  versions.sort((a, b) => (a.name === SOURCE_VERSION ? -1 : b.name === SOURCE_VERSION ? 1 : a.createdAt.localeCompare(b.createdAt)));
  return { current: currentVersion, versions };
}

export class SpellVersionError extends Error {}

/**
 * A new version from where the current one is (its latest seal), made the current one. Unsealed
 * work stays as it is, now on the new version.
 */
export async function spellVersion(spell: Spell, name: string): Promise<VersionRecord> {
  const trimmed = name.trim();
  if (!trimmed) throw new SpellVersionError('A version needs a name.');
  const { head } = await spellRepository(spell);
  if (await getVersion(spell.id, trimmed)) throw new SpellVersionError(`There's already a version named "${trimmed}".`);
  const version: VersionRecord = { spellId: spell.id, name: trimmed, headSealId: head.id, createdAt: new Date().toISOString() };
  await putVersionAsCurrent(version);
  return version;
}

// A seal's files, as a .spell's are read.
const sealSource = (spellId: string, seal: SealRecord): SpellFileSource => {
  const types = new Map<string, string | undefined>();
  return {
    read: async (path) => {
      const sha256 = seal.files[path];
      if (!sha256) return null;
      const blob = await getBlob(spellId, sha256);
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
  await spellRepository(spell);
  const version = await getVersion(spell.id, name);
  const seal = version ? await getSeal(spell.id, version.headSealId) : undefined;
  if (!version || !seal) throw new SpellVersionError(`There's no version named "${name}".`);
  const source = sealSource(spell.id, seal);
  const metaBytes = await source.read(META_PATH);
  if (!metaBytes) throw new SpellVersionError('A sealed file is missing (spell.json).');
  const meta = JSON.parse(new TextDecoder().decode(metaBytes)) as WorkMeta;
  if (meta.cover) await source.read(meta.cover); // its type known before the cover is read back
  const { work } = await readWork(source, meta);
  await write(work);
  await setCurrentVersion(spell.id, name);
  return work;
}
