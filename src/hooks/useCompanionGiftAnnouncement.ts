import { useState } from 'react';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { unlockAsset, setActiveCompanion } from 'store/userLibrarySlice';
import { companions } from '../config/assets/companions';

const GIFT_COMPANION_ID = 'cats';
const SEEN_KEY = `companionGift:${GIFT_COMPANION_ID}:seen`;

export function useCompanionGiftAnnouncement() {
  const dispatch = useAppDispatch();
  const unlockedIds = useAppSelector(s => s.userLibrary.unlockedIds);
  // Tracks a user-initiated close (Activate/Dismiss) for THIS mount — without it, the
  // dev bypass below would force showModal back to true on every render, even right
  // after a click, so the modal could never actually close during testing.
  const [closedLocally, setClosedLocally] = useState(false);

  const companion = companions.find(c => c.id === GIFT_COMPANION_ID);
  const hasSeen = localStorage.getItem(SEEN_KEY) === 'true';
  const isUnlocked = unlockedIds.includes(GIFT_COMPANION_ID);

  // TODO(paso 3): quitar este bypass antes de producción — fuerza el modal a
  // aparecer al montar la app durante desarrollo, sin importar fecha/unlock/seen,
  // para poder revisar el diseño antes de comprometerse a la condición real. Solo
  // gobierna la apertura inicial: closedLocally sigue permitiendo cerrarlo al clickear.
  const devBypass = import.meta.env.DEV;

  const realCondition = !!companion && !companion.comingSoon && !isUnlocked && !hasSeen;
  const showModal = !closedLocally && (devBypass || realCondition);

  const markSeen = () => localStorage.setItem(SEEN_KEY, 'true');

  const handleActivate = () => {
    dispatch(unlockAsset(GIFT_COMPANION_ID));
    dispatch(setActiveCompanion(GIFT_COMPANION_ID));
    markSeen();
    setClosedLocally(true);
  };

  const handleDismiss = () => {
    markSeen();
    setClosedLocally(true);
  };

  return { showModal, handleActivate, handleDismiss };
}
