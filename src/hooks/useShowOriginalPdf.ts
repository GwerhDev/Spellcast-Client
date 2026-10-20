import { useEffect, useState } from 'react';

const SHOW_ORIGINAL_KEY = 'spellcast.editor.showOriginalPdf';

/**
 * Whether the page is compared with the original PDF's (beside it, or on its back; see
 * SpellEditor), in the editor and while making a spell alike. Remembered for the next spell
 * (this browser's own preference).
 */
export function useShowOriginalPdf(): [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
  const [showOriginal, setShowOriginal] = useState(() => {
    try { return localStorage.getItem(SHOW_ORIGINAL_KEY) === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(SHOW_ORIGINAL_KEY, showOriginal ? '1' : '0'); } catch { /* storage unavailable */ }
  }, [showOriginal]);
  return [showOriginal, setShowOriginal];
}
