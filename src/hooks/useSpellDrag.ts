import { useEffect, useState } from 'react';
import { SPELL_DRAG_TYPE } from '../config/consts';

// How close to the bottom of the window (px) a dragged spell counts as "near the bottom".
export const NEAR_BOTTOM_PX = 160;

export interface SpellDragState {
  // A spell (from a SpellCard) is being dragged anywhere over the page.
  active: boolean;
  // ...and the pointer is within NEAR_BOTTOM_PX of the window's bottom edge.
  nearBottom: boolean;
}

const isSpellDrag = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes(SPELL_DRAG_TYPE);

// Whether a spell is being dragged over the page, and whether it's near the bottom, from
// dragover on the document (the only event carrying the pointer during a native drag).
// Only updates when either flag actually changes, so it's cheap to use from the layout.
export const useSpellDrag = (): SpellDragState => {
  const [state, setState] = useState<SpellDragState>({ active: false, nearBottom: false });

  useEffect(() => {
    const update = (next: SpellDragState) =>
      setState(prev => (prev.active === next.active && prev.nearBottom === next.nearBottom ? prev : next));

    const handleOver = (e: DragEvent) => {
      if (!isSpellDrag(e)) return;
      // Some browsers report (0, 0) on the last dragover of a drag; that's not a position.
      if (e.clientX === 0 && e.clientY === 0) return;
      update({ active: true, nearBottom: window.innerHeight - e.clientY <= NEAR_BOTTOM_PX });
    };
    // Dropped (anywhere) or cancelled. A drag that leaves the window ends it too: its
    // dragleave has no element to go to and a pointer outside the window (relatedTarget
    // alone isn't reliable -- some browsers leave it null between elements too).
    const handleEnd = () => update({ active: false, nearBottom: false });
    const handleLeave = (e: DragEvent) => {
      if (e.relatedTarget) return;
      const outside = e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight;
      if (outside) handleEnd();
    };

    document.addEventListener('dragover', handleOver);
    document.addEventListener('dragend', handleEnd);
    document.addEventListener('drop', handleEnd);
    document.addEventListener('dragleave', handleLeave);
    return () => {
      document.removeEventListener('dragover', handleOver);
      document.removeEventListener('dragend', handleEnd);
      document.removeEventListener('drop', handleEnd);
      document.removeEventListener('dragleave', handleLeave);
    };
  }, []);

  return state;
};
