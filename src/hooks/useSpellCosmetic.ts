import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadSpellCosmetics, pickSpellCosmetic } from '../store/spellCosmeticsSlice';
import { resolveAssetChoice } from '../utils/assetChoice';
import type { SpellCosmeticKind } from '../db/spellCosmetics';

// The caster's default for each cosmetic, set from the inventory.
const DEFAULT_OF = {
  pageBackground: 'activePageBgId',
  soundBackground: 'activeSoundBgId',
  companion: 'activeCompanionId',
} as const;

// A spell's cosmetic of one kind, as its cover frame is: the spell's own pick (an asset id,
// null for none, undefined to follow the default), the caster's default, what that resolves
// to, and a way to pick for the spell. With no spell, it's just the default.
export const useSpellCosmetic = (kind: SpellCosmeticKind, spellId: string | null) => {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(state => state.session.userData?.id);
  const defaultId = useAppSelector(state => state.casterInventory[DEFAULT_OF[kind]]);
  const picks = useAppSelector(state => (spellId ? state.spellCosmetics.bySpell[spellId] : undefined));
  const loaded = picks !== undefined;

  // Read once the caster is known: a spell's picks are its user's, so read before the session
  // is in, they'd come back as none -- and stay so.
  useEffect(() => {
    if (spellId && userId && !loaded) void dispatch(loadSpellCosmetics({ spellId, userId }));
  }, [dispatch, spellId, userId, loaded]);

  const choice = picks?.[kind];
  return {
    // Undefined while the spell's picks are still being read, or never picked.
    choice,
    defaultId,
    resolvedId: spellId ? resolveAssetChoice(choice, defaultId) : defaultId,
    pick: (assetId: string | null | undefined) => {
      if (spellId) void dispatch(pickSpellCosmetic({ spellId, userId, kind, assetId }));
    },
  };
};
