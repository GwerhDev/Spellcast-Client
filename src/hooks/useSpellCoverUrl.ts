import { useLayoutEffect, useState } from 'react';
import { getCachedSpellCover, getSpellCover } from '../db';

// Object URL for a spell's cover image (null while loading, or when it has none), revoked
// when the spell changes or the component unmounts. A cover already in memory (the spell
// was listed this session) is applied before the first paint, with no read at all.
export const useSpellCoverUrl = (spellId: string | null | undefined, userId: string | undefined): string | null => {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  // Layout effect so a cover from memory shows on the first frame instead of one later.
  useLayoutEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    const show = (cover: Blob | null) => {
      url = cover ? URL.createObjectURL(cover) : null;
      setCoverUrl(url);
    };

    if (!spellId) {
      setCoverUrl(null);
    } else {
      const cached = getCachedSpellCover(spellId);
      if (cached !== undefined) {
        show(cached);
      } else {
        setCoverUrl(null);
        getSpellCover(spellId, userId)
          .then(cover => { if (!cancelled) show(cover); })
          .catch(() => {});
      }
    }
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [spellId, userId]);

  return coverUrl;
};
