import type { CSSProperties } from 'react';
import { useAppSelector } from '../store/hooks';
import { pageBackgrounds } from '../config/assets';

// The caster's chosen page background (an inventory item) as styles for a page's sheet: its
// background and the text, highlight and hover colors that go with it. The reader's alone
// (the editor keeps the theme's paper). Empty when no background is chosen.
export function usePageBackground(): CSSProperties {
  const activePageBgId = useAppSelector((state) => state.casterInventory.activePageBgId);
  const bg = pageBackgrounds.find(b => b.id === activePageBgId) ?? null;
  return {
    ...(bg?.cssValue ? { background: bg.cssValue } : {}),
    ...(bg?.textColor ? { '--page-text-color': bg.textColor } : {}),
    ...(bg?.highlightColor ? { '--page-highlight': bg.highlightColor } : {}),
    ...(bg?.sentenceHoverColor ? { '--page-sentence-hover': bg.sentenceHoverColor } : {}),
  } as CSSProperties;
}
