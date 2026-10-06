import type { CSSProperties } from 'react';
import { pageBackgrounds } from '../config/assets';
import { useSpellCosmetic } from './useSpellCosmetic';

// A spell's page background (its own pick, or the caster's default; see useSpellCosmetic) as
// styles for its page's sheet: its background and the text, highlight and hover colors that
// go with it. The reader's alone (the editor keeps the theme's paper). Empty with none: the
// app's own paper.
export function usePageBackground(spellId: string | null): CSSProperties {
  const { resolvedId } = useSpellCosmetic('pageBackground', spellId);
  const bg = pageBackgrounds.find(b => b.id === resolvedId) ?? null;
  return {
    ...(bg?.cssValue ? { background: bg.cssValue } : {}),
    ...(bg?.textColor ? { '--page-text-color': bg.textColor } : {}),
    ...(bg?.highlightColor ? { '--page-highlight': bg.highlightColor } : {}),
    ...(bg?.sentenceHoverColor ? { '--page-sentence-hover': bg.sentenceHoverColor } : {}),
  } as CSSProperties;
}
