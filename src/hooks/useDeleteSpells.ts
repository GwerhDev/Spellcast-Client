import { useAppDispatch, useAppSelector } from '../store/hooks';
import { deleteSpellFromDB } from '../db';
import { invalidateSpellList } from '../store/spellReaderSlice';
import { usePlaySpell } from './usePlaySpell';

// Deletes spells from the caster's grimoire, the one way every view does it: a spell that
// was loaded in the player is unloaded with it (so nothing keeps playing, or showing, a
// spell that no longer exists), and every list of spells is refreshed. Rejects if any of
// them failed to delete, after handling the ones that did.
export const useDeleteSpells = () => {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(state => state.session.userData?.id);
  const loadedSpellId = useAppSelector(state => state.spellReader.spellId);
  const { unloadSpell } = usePlaySpell();

  return async (ids: string[]): Promise<void> => {
    const results = await Promise.allSettled(ids.map(id => deleteSpellFromDB(id, userId)));
    const deleted = ids.filter((_, i) => results[i].status === 'fulfilled');
    if (loadedSpellId && deleted.includes(loadedSpellId)) unloadSpell();
    if (deleted.length > 0) dispatch(invalidateSpellList());
    const failure = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failure) throw failure.reason;
  };
};
