import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { setActiveCoverFrame } from 'store/casterInventorySlice';
import { coverFrames } from '../config/assets/coverFrames';

const GIFT_FRAME_ID = 'grimoire';
const ACTIVATED_KEY = `coverFrameGift:${GIFT_FRAME_ID}:activated`;
// TCORE-123: mirrors useCompanionGiftAnnouncement's own window (see that hook for the
// full reasoning) -- separate from the frame's own unlock gating (it's free/always
// unlocked, see FREE_IDS in casterInventorySlice.ts), this just bounds how long the
// "hey, this is new" nudge is worth showing at all.
const GIFT_WINDOW_START = new Date('2026-09-12T00:00:00');
const GIFT_WINDOW_END = new Date('2026-09-26T23:59:59');

// Module-level, NOT component state -- see useCompanionGiftAnnouncement's own comment for
// why (survives client-side navigation between readers, only resets on an actual reload).
let devBypassShownThisPageLoad = false;

// `enabled` should reflect whether the caller is actually able to RENDER the modal right
// now (e.g. SpellReader's `isLoaded`) -- not just whether the hook is mounted.
export function useCoverFrameGiftAnnouncement(enabled: boolean) {
  const dispatch = useAppDispatch();
  const activeCoverFrameId = useAppSelector(s => s.casterInventory.activeCoverFrameId);
  // Tracks a user-initiated close (Set as default/Dismiss) for THIS mount.
  const [closedLocally, setClosedLocally] = useState(false);
  // Latches to true the first time `eligible` below is met, then STAYS true regardless of
  // later re-renders -- see useCompanionGiftAnnouncement's own comment for why this can't
  // just be derived fresh every render.
  const [hasAppeared, setHasAppeared] = useState(false);

  const frame = coverFrames.find(f => f.id === GIFT_FRAME_ID);
  const hasActivated = localStorage.getItem(ACTIVATED_KEY) === 'true';
  const isAlreadyDefault = activeCoverFrameId === GIFT_FRAME_ID;

  // TODO(paso 3): quitar este bypass antes de producción -- fuerza el modal a aparecer al
  // abrir un reader durante desarrollo, sin importar fecha/activated, para poder revisar
  // el diseño antes de comprometerse a la condición real. Limitado a una vez por carga de
  // página (ver el flag de módulo arriba).
  const devBypass = import.meta.env.DEV && !devBypassShownThisPageLoad;

  const now = new Date();
  const withinGiftWindow = now >= GIFT_WINDOW_START && now <= GIFT_WINDOW_END;
  const realCondition = !!frame && !hasActivated && !isAlreadyDefault && withinGiftWindow;
  const eligible = enabled && (devBypass || realCondition);

  useEffect(() => {
    if (eligible && !hasAppeared) {
      devBypassShownThisPageLoad = true;
      setHasAppeared(true);
    }
  }, [eligible, hasAppeared]);

  const showModal = hasAppeared && !closedLocally;

  const markActivated = () => localStorage.setItem(ACTIVATED_KEY, 'true');

  // Unlike the companion gift, there's nothing to unlock (the frame is free/always
  // unlocked already) -- this just sets it as everyone's global default, exactly what
  // CasterInventoryLanding's own "Set default" button on this same card does.
  const handleSetDefault = () => {
    dispatch(setActiveCoverFrame(GIFT_FRAME_ID));
    markActivated();
    setClosedLocally(true);
  };

  // Dismissing does NOT persist anything -- it only closes the modal for this mount (this
  // reader session). Without ever clicking "Set as default", it reappears next time a
  // document reader is opened (until the gift window ends).
  const handleDismiss = () => {
    setClosedLocally(true);
  };

  return { showModal, handleSetDefault, handleDismiss };
}
