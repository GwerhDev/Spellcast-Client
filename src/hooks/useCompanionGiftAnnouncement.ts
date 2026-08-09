import { useState } from 'react';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { unlockAsset, setActiveCompanion } from 'store/userLibrarySlice';
import { companions } from '../config/assets/companions';

const GIFT_COMPANION_ID = 'cats';
const ACTIVATED_KEY = `companionGift:${GIFT_COMPANION_ID}:activated`;

export function useCompanionGiftAnnouncement() {
  const dispatch = useAppDispatch();
  const unlockedIds = useAppSelector(s => s.userLibrary.unlockedIds);
  // Tracks a user-initiated close (Activate/Dismiss) for THIS mount — without it, the
  // dev bypass below would force showModal back to true on every render, even right
  // after a click, so the modal could never actually close during testing.
  const [closedLocally, setClosedLocally] = useState(false);

  const companion = companions.find(c => c.id === GIFT_COMPANION_ID);
  const hasActivated = localStorage.getItem(ACTIVATED_KEY) === 'true';
  const isUnlocked = unlockedIds.includes(GIFT_COMPANION_ID);

  // TODO(paso 3): quitar este bypass antes de producción — fuerza el modal a
  // aparecer al montar la app durante desarrollo, sin importar fecha/unlock/activated,
  // para poder revisar el diseño antes de comprometerse a la condición real. Solo
  // gobierna la apertura inicial: closedLocally sigue permitiendo cerrarlo al clickear.
  const devBypass = import.meta.env.DEV;

  const realCondition = !!companion && !companion.comingSoon && !isUnlocked && !hasActivated;
  const showModal = !closedLocally && (devBypass || realCondition);

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
