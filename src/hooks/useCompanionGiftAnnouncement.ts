import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { unlockAsset, setActiveCompanion } from 'store/userLibrarySlice';
import { companions } from '../config/assets/companions';

const GIFT_COMPANION_ID = 'cats';
const ACTIVATED_KEY = `companionGift:${GIFT_COMPANION_ID}:activated`;
// The announcement itself is only offered 2026-08-10 through 2026-08-30 (inclusive) —
// separate from companions.ts's CATS_RELEASE_DATE, which just gates when the companion
// becomes unlockable at all (and stays unlockable forever after via Havenstore). Past
// this window the gift modal stops appearing even for someone who never saw it.
const GIFT_WINDOW_END = new Date('2026-08-30T23:59:59');

// Module-level, NOT component state — survives client-side navigation between readers
// (the module stays loaded) and only resets on an actual browser reload (fresh module
// evaluation). Caps the dev-only bypass below to one appearance per page load, so
// opening a second/third document in the same session doesn't force it open again —
// only reloading the page does.
let devBypassShownThisPageLoad = false;

// `enabled` should reflect whether the caller is actually able to RENDER the modal
// right now (e.g. SpellReader's `isLoaded`) — not just whether the hook is mounted.
export function useCompanionGiftAnnouncement(enabled: boolean) {
  const dispatch = useAppDispatch();
  const unlockedIds = useAppSelector(s => s.userLibrary.unlockedIds);
  // Tracks a user-initiated close (Activate/Dismiss) for THIS mount.
  const [closedLocally, setClosedLocally] = useState(false);
  // Latches to true the first time `eligible` below is met, then STAYS true regardless
  // of later re-renders. While a spell finishes loading, SpellReader fires several
  // effects back-to-back and re-renders more than once in quick succession — deriving
  // "show" fresh every render straight off enabled/devBypass/realCondition is racy (it
  // can flip true→false before ever being painted, or even after, if `enabled` itself
  // flickers). Latching into state means once eligible, it stays open until the user
  // actually closes it, independent of how those inputs move afterward.
  const [hasAppeared, setHasAppeared] = useState(false);

  const companion = companions.find(c => c.id === GIFT_COMPANION_ID);
  const hasActivated = localStorage.getItem(ACTIVATED_KEY) === 'true';
  const isUnlocked = unlockedIds.includes(GIFT_COMPANION_ID);

  // TODO(paso 3): quitar este bypass antes de producción — fuerza el modal a aparecer
  // al abrir un reader durante desarrollo, sin importar fecha/unlock/activated, para
  // poder revisar el diseño antes de comprometerse a la condición real. Limitado a una
  // vez por carga de página (ver el flag de módulo arriba) — así navegar entre
  // documentos ya no lo vuelve a forzar, solo un reload real lo hace.
  const devBypass = import.meta.env.DEV && !devBypassShownThisPageLoad;

  const withinGiftWindow = new Date() <= GIFT_WINDOW_END;
  const realCondition = !!companion && !companion.comingSoon && !isUnlocked && !hasActivated && withinGiftWindow;
  const eligible = enabled && (devBypass || realCondition);

  useEffect(() => {
    if (eligible && !hasAppeared) {
      devBypassShownThisPageLoad = true;
      setHasAppeared(true);
    }
  }, [eligible, hasAppeared]);

  const showModal = hasAppeared && !closedLocally;

  const markActivated = () => localStorage.setItem(ACTIVATED_KEY, 'true');

  const handleActivate = () => {
    dispatch(unlockAsset(GIFT_COMPANION_ID));
    dispatch(setActiveCompanion(GIFT_COMPANION_ID));
    markActivated();
    setClosedLocally(true);
  };

  // Dismissing does NOT persist anything — it only closes the modal for this mount
  // (this reader session). Without ever clicking Activate, it reappears next time a
  // document reader is opened.
  const handleDismiss = () => {
    setClosedLocally(true);
  };

  return { showModal, handleActivate, handleDismiss };
}
