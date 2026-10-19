import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import type { Spell } from '../../interfaces';

// A fresh, empty IndexedDB and fresh modules (the repository keeps its connection) per test.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  globalThis.IDBKeyRange = IDBKeyRange;
  vi.resetModules();
});
const load = async () => ({
  versions: await import('../spellVersions'),
  repo: await import('../../db/spellRepository'),
});

const IMG = 'data:image/png;base64,' + btoa('image-bytes');
const page = (text: string, src?: string) => ({
  type: 'doc',
  content: [
    ...(src ? [{ type: 'image', attrs: { src, alt: null, title: null, width: 300 } }] : []),
    { type: 'paragraph', content: [{ type: 'text', text }] },
  ],
});
const spellWith = (pages: object[], over: Partial<Spell> = {}): Spell => ({
  id: 'spell-1', title: 'A Spell', createdAt: new Date('2026-01-01'), userId: 'user-1',
  pagesContent: JSON.stringify(pages), ...over,
});

describe('spellVersions', () => {
  it('a spell from before versions gets source, with a first seal of its work as it is', async () => {
    const { versions } = await load();
    const spell = spellWith([page('one', IMG)]);
    const state = await versions.spellRepository(spell);
    expect(state.currentVersion).toBe('source');
    expect(state.head.parentIds).toEqual([]);
    expect(Object.keys(state.head.files).sort()).toEqual(expect.arrayContaining(['pages/0001.json', 'spell.json']));
    expect(await versions.spellIsSealed(spell)).toBe(true);
    // Asked again, it's the same repository.
    expect((await versions.spellRepository(spell)).head.id).toBe(state.head.id);
  });

  it('sealing twice without changes makes no new seal', async () => {
    const { versions } = await load();
    const spell = spellWith([page('one')]);
    const first = await versions.spellSeal(spell);
    const again = await versions.spellSeal(spell);
    expect(again.created).toBe(false);
    expect(again.seal.id).toBe(first.seal.id);
    expect(await versions.spellChronicle(spell)).toHaveLength(1);
  });

  it('sealing a change makes a seal after the latest, and the chronicle lists them newest first', async () => {
    const { versions } = await load();
    const before = spellWith([page('one', IMG), page('two')]);
    await versions.spellRepository(before);
    const edited = spellWith([page('one', IMG), page('two, edited')]);
    expect(await versions.spellIsSealed(edited)).toBe(false);
    const { seal, created } = await versions.spellSeal(edited);
    expect(created).toBe(true);
    const renamed = { ...edited, title: 'Renamed' };
    await versions.spellSeal(renamed);

    const chronicle = await versions.spellChronicle(renamed);
    expect(chronicle).toHaveLength(3);
    expect(chronicle[1].seal.id).toBe(seal.id);
    expect(chronicle[0]).toMatchObject({ first: false, pagesChanged: 0, detailsChanged: true });
    expect(chronicle[1]).toMatchObject({ first: false, pagesChanged: 1, detailsChanged: false });
    expect(chronicle[2].first).toBe(true);
    expect(chronicle[1].seal.parentIds).toEqual([chronicle[2].seal.id]);
  });

  it('an image kept across seals is stored once', async () => {
    const { versions, repo } = await load();
    const spell = spellWith([page('one', IMG)]);
    await versions.spellRepository(spell);
    const putBlobs = vi.spyOn(repo, 'putBlobs');
    await versions.spellSeal(spellWith([page('one, edited', IMG)]));
    const written = putBlobs.mock.calls.flatMap(([, blobs]) => blobs.map(blob => new TextDecoder().decode(blob.data)));
    expect(written).not.toContain('image-bytes');
  });

  it('a new version starts where the current one is and becomes the current one', async () => {
    const { versions } = await load();
    const spell = spellWith([page('one')]);
    const { head } = await versions.spellRepository(spell);
    await versions.spellVersion(spell, 'draft');
    const { current, versions: list } = await versions.spellVersions(spell);
    expect(current).toBe('draft');
    expect(list.map(v => v.name)).toEqual(['source', 'draft']);
    expect(list.find(v => v.name === 'draft')!.headSealId).toBe(head.id);
    await expect(versions.spellVersion(spell, 'draft')).rejects.toThrow(versions.SpellVersionError);
    await expect(versions.spellVersion(spell, '  ')).rejects.toThrow(versions.SpellVersionError);
  });

  it('switching versions gives back that version\'s work, exactly as sealed', async () => {
    const { versions } = await load();
    const sourcePages = [page('source text', IMG)];
    const source = spellWith(sourcePages, { cover: new Blob(['cover'], { type: 'image/webp' }), author: 'Jane' });
    await versions.spellRepository(source);
    await versions.spellVersion(source, 'draft');
    const draft = spellWith([page('draft text')], { title: 'Draft title' });
    await versions.spellSeal(draft);

    const write = vi.fn(async () => {});
    const back = await versions.spellSwitchVersion(draft, 'source', write);
    expect(write).toHaveBeenCalledWith(back);
    expect(back.pagesContent).toBe(JSON.stringify(sourcePages));
    expect(back.title).toBe('A Spell');
    expect(back.author).toBe('Jane');
    expect(back.cover?.type).toBe('image/webp');
    expect(await back.cover?.text()).toBe('cover');
    expect((await versions.spellVersions(source)).current).toBe('source');

    const forth = await versions.spellSwitchVersion(source, 'draft', write);
    expect(forth.title).toBe('Draft title');
    expect(forth.pagesContent).toBe(JSON.stringify([page('draft text')]));
  });

  // The work written to the spell's record failing (no room left, say): still on the version it
  // was, so its next seal doesn't go on the other one.
  it('a switch whose work could not be written stays on the version it was', async () => {
    const { versions } = await load();
    const spell = spellWith([page('one')]);
    await versions.spellRepository(spell);
    await versions.spellVersion(spell, 'draft');
    const failing = vi.fn(async () => { throw new Error('QuotaExceededError'); });
    await expect(versions.spellSwitchVersion(spell, 'source', failing)).rejects.toThrow('QuotaExceededError');
    expect((await versions.spellVersions(spell)).current).toBe('draft');
  });

  // A spell's id is local to this device: the same content sealed in another spell (the same
  // .spell imported twice, or on another device) is the same seal, kept for each.
  it('a seal\'s id is the same for the same content in another spell, and each spell keeps its own', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-19T12:00:00Z'));
    try {
      const { versions, repo } = await load();
      const one = spellWith([page('same')]);
      const other = spellWith([page('same')], { id: 'spell-2' });
      const a = await versions.spellRepository(one);
      const b = await versions.spellRepository(other);
      expect(b.head.id).toBe(a.head.id);
      await repo.deleteSpellRepository(other.id);
      expect(await repo.getSeal(one.id, a.head.id)).toMatchObject({ spellId: one.id });
    } finally {
      vi.useRealTimers();
    }
  });

  it('the chronicle tells the details changed even when pages changed too', async () => {
    const { versions } = await load();
    await versions.spellRepository(spellWith([page('one')]));
    const both = spellWith([page('one, edited')], { title: 'Renamed' });
    await versions.spellSeal(both);
    const [latest] = await versions.spellChronicle(both);
    expect(latest).toMatchObject({ pagesChanged: 1, detailsChanged: true });
  });

  it('deleting a spell\'s repository removes it all', async () => {
    const { versions, repo } = await load();
    const spell = spellWith([page('one', IMG)]);
    const { head } = await versions.spellRepository(spell);
    await repo.deleteSpellRepository(spell.id);
    expect(await repo.getRepo(spell.id)).toBeUndefined();
    expect(await repo.getSeal(spell.id, head.id)).toBeUndefined();
    expect(await repo.getVersions(spell.id)).toEqual([]);
    expect(await repo.getBlob(spell.id, head.files['pages/0001.json'])).toBeUndefined();
  });
});
