import { useEffect, useMemo, useState } from 'react';
import { getSpellsFromDB } from '../db';
import { useAppSelector } from '../store/hooks';
import type { Spell } from '../interfaces';
import { applyQuickStart } from '../utils/quickStart';

// How many spells the quick start shows; past that, it points to the Grimoire.
export const QUICK_START_MAX = 10;

// The quick start's spells, for any way of showing them (the coverflow, or the home's 3D
// scene): the caster's spells, newest first, through the altar's filters (see
// applyQuickStart), kept up to date as they change -- read again when the list changes,
// and patched in place for a cover frame picked or a page turned in the one being read.
export const useQuickStartSpells = () => {
  const userId = useAppSelector((state) => state.session.userData.id);
  const { spellId: activeDocId, currentPage: activeCurrentPage, listVersion, coverFrameChange } = useAppSelector((state) => state.spellReader);
  const quickStart = useAppSelector((state) => state.altar.quickStart);
  const [documents, setDocuments] = useState<Spell[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // No going back to the loading state on a refetch (isLoading starts true, for the first
    // load only): what shows the loading state replaces everything, including an open detail
    // modal, which would close and reopen on every change saved from it.
    getSpellsFromDB(userId)
      .then(docs => setDocuments(docs.sort((a: Spell, b: Spell) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())))
      .catch(error => console.error('Failed to fetch local spells:', error))
      .finally(() => setIsLoading(false));
  }, [userId, listVersion]);

  // A cover frame picked from the detail: applied to that spell in place, no refetch.
  useEffect(() => {
    if (!coverFrameChange) return;
    const { spellId: changedId, coverFrameId } = coverFrameChange;
    setDocuments(prev => prev.map(doc => (doc.id === changedId ? { ...doc, coverFrameId } : doc)));
  }, [coverFrameChange]);

  useEffect(() => {
    if (!activeDocId || !activeCurrentPage) return;
    setDocuments(prev => prev.map(doc =>
      doc.id === activeDocId
        ? { ...doc, progress: { currentPage: activeCurrentPage, pagesProgress: doc.progress?.pagesProgress ?? [], lastReadSentenceIndex: doc.progress?.lastReadSentenceIndex ?? 0 } }
        : doc
    ));
  }, [activeCurrentPage, activeDocId]);

  // The same list until the spells or the filters change, for what's built from it.
  const listed = useMemo(() => applyQuickStart(documents, quickStart), [documents, quickStart]);
  const visible = useMemo(() => listed.slice(0, QUICK_START_MAX), [listed]);
  return {
    isLoading,
    // None at all (not just none through the filters).
    empty: documents.length === 0,
    visible,
    hasMore: listed.length > QUICK_START_MAX,
  };
};
