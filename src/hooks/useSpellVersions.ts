import { useCallback, useRef, useState } from 'react';
import { useAppDispatch } from '../store/hooks';
import { getSpellById, updateSpellFull } from '../db';
import { invalidateContent, invalidateSpellList } from '../store/spellReaderSlice';
import {
  spellChronicle, spellIsSealed, spellSeal, spellSwitchVersion, spellVersion, spellVersions, type ChronicleEntry,
} from '../utils/spellVersions';

/**
 * A spell's versions in the editor (see utils/spellVersions): whether its work has changes not
 * sealed yet, its versions and the current one, and sealing, making a version, switching to
 * one and reading the chronicle. Everything that reads or writes the repository runs one after
 * the other (a single queue), so the last one to run always reads what's really stored: two of
 * them can never race to say whether the work is sealed.
 */
export function useSpellVersions(spellId: string | undefined, userId: string | undefined) {
  const dispatch = useAppDispatch();
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [unsealed, setUnsealed] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [names, setNames] = useState<string[]>([]);

  const run = useCallback(<T,>(op: () => Promise<T>): Promise<T> => {
    const next = queue.current.then(op);
    queue.current = next.catch(() => undefined);
    return next;
  }, []);

  const readSpell = useCallback(async () => {
    const spell = spellId ? await getSpellById(spellId, userId) : undefined;
    if (!spell) throw new Error('Spell not found.');
    return spell;
  }, [spellId, userId]);

  const readVersions = useCallback(async (spell: Awaited<ReturnType<typeof readSpell>>) => {
    const list = await spellVersions(spell);
    setCurrent(list.current);
    setNames(list.versions.map(version => version.name));
  }, []);

  /** Reads again whether the stored work is sealed, and the versions. */
  const refresh = useCallback(() => run(async () => {
    const spell = await readSpell();
    setUnsealed(!(await spellIsSealed(spell)));
    await readVersions(spell);
  }), [run, readSpell, readVersions]);

  /** Seals the stored work on the current version (save it first). */
  const seal = useCallback(() => run(async () => {
    await spellSeal(await readSpell());
    setUnsealed(false);
  }), [run, readSpell]);

  /** A new version from where the current one is, made the current one. */
  const createVersion = useCallback((name: string) => run(async () => {
    const spell = await readSpell();
    await spellVersion(spell, name);
    await readVersions(spell);
  }), [run, readSpell, readVersions]);

  /** Switches to a version: its latest seal becomes the spell's work, and the editor reloads it. */
  const switchTo = useCallback((name: string) => run(async () => {
    const spell = await readSpell();
    await spellSwitchVersion(spell, name, work => updateSpellFull(spell.id, userId!, work));
    setUnsealed(false);
    await readVersions(spell);
    dispatch(invalidateContent());
    dispatch(invalidateSpellList());
  }), [run, readSpell, readVersions, userId, dispatch]);

  const chronicle = useCallback((): Promise<ChronicleEntry[]> => run(async () => spellChronicle(await readSpell())), [run, readSpell]);

  // An edit (saved or not) is work not sealed yet.
  const markUnsealed = useCallback(() => setUnsealed(true), []);

  return { unsealed, current, names, refresh, seal, createVersion, switchTo, chronicle, markUnsealed };
}
