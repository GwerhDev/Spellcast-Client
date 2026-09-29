import { useEffect, useState } from 'react';
import { getSpellById } from '../db';

// Object URL for a spell's cover image (null while loading, or when it has none), revoked
// when the spell changes or the component unmounts.
export const useSpellCoverUrl = (spellId: string | null | undefined, userId: string | undefined): string | null => {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    setCoverUrl(null);
    if (!spellId) return;
    getSpellById(spellId, userId)
      .then(spell => {
        if (cancelled || !spell?.cover) return;
        url = URL.createObjectURL(spell.cover);
        setCoverUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [spellId, userId]);

  return coverUrl;
};
