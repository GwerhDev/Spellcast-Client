import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'react-redux';
import { getSpellsFromDB } from '../db';
import { useAppSelector } from '../store/hooks';
import type { Spell } from '../interfaces';
import { applyQuickStart } from '../utils/quickStart';

// How many spells the quick start shows; past that, it points to the Grimoire.
export const QUICK_START_MAX = 10;

// The list as last read, kept past the quick start's own life: back on the altar with nothing
// changed since (the same caster, the same version of the list), it's shown at once, not read
// from the database again. Kept per store (the app has one; each test its own). `version` is
// the list's version it was read at -- patched in place since, it's still that version.
interface ReadList { userId: string; version: number; docs: Spell[] }
const lastRead = new WeakMap<object, ReadList>();

// The quick start's spells, for any way of showing them (the coverflow, or the home's 3D
// scene): the caster's spells, newest first, through the altar's filters (see
// applyQuickStart), kept up to date as they change -- read again when the list changes,
// and patched in place for a cover frame picked or a page turned in the one being read.
// The one on the altar isn't among them: it's back once it's dispelled.
export const useQuickStartSpells = () => {
  const userId = useAppSelector((state) => state.session.userData.id);
  const { spellId: activeDocId, currentPage: activeCurrentPage, listVersion, coverFrameChange } = useAppSelector((state) => state.spellReader);
  const quickStart = useAppSelector((state) => state.altar.quickStart);
  const store = useStore();
  const cached = lastRead.get(store);
  const fresh = !!userId && cached?.userId === userId && cached.version === listVersion ? cached : null;
  const [documents, setDocuments] = useState<Spell[]>(() => fresh?.docs ?? []);
  const [isLoading, setIsLoading] = useState(!fresh);
  // The list's version what's shown was read at (null: nothing read yet).
  const shownVersion = useRef<number | null>(fresh ? fresh.version : null);
  // The spell left out (the one on the altar). It follows the one loaded in a layout effect,
  // not in the same render: the commit a spell is conjured in still has its card, so the
  // view can see where it was (and fly it from there to the altar) before it's gone, with
  // nothing painted in between.
  const [onAltar, setOnAltar] = useState<string | null>(activeDocId);
  useLayoutEffect(() => { setOnAltar(activeDocId); }, [activeDocId]);
  // One dropped on the altar leaves the row as it's let go, before it has loaded: its card
  // (back from being dragged) would show for a moment otherwise. Back if it fails to load.
  const dropped = useAppSelector((state) => (state.altar.arrival?.via === 'drop' ? state.altar.arrival.spellId : null));

  useEffect(() => {
    // No going back to the loading state on a refetch (isLoading starts true, for the first
    // load only): what shows the loading state replaces everything, including an open detail
    // modal, which would close and reopen on every change saved from it. Without the session
    // read yet there's no caster to list for: still loading, not an empty list.
    if (!userId) return;
    // Shown already as it is now (kept from the last time): nothing to read.
    if (shownVersion.current === listVersion && lastRead.get(store)?.userId === userId) return;
    let cancelled = false;
    getSpellsFromDB(userId)
      .then(docs => {
        if (cancelled) return;
        shownVersion.current = listVersion;
        setDocuments(docs.sort((a: Spell, b: Spell) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      })
      .catch(error => console.error('Failed to fetch local spells:', error))
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
    //eslint-disable-next-line
  }, [userId, listVersion]);

  // What's shown, kept for next time: patched in place or read, at the version it was read at.
  useEffect(() => {
    if (!userId || shownVersion.current === null) return;
    lastRead.set(store, { userId, version: shownVersion.current, docs: documents });
  }, [store, userId, documents]);

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
  const listed = useMemo(
    () => applyQuickStart(documents.filter(doc => doc.id !== onAltar && doc.id !== dropped), quickStart),
    [documents, quickStart, onAltar, dropped],
  );
  const visible = useMemo(() => listed.slice(0, QUICK_START_MAX), [listed]);
  return {
    // Spells leaving the row for the altar: gone from it at once (their cover is on its way
    // there), not faded out where they were.
    vanishing: [onAltar, dropped, activeDocId].filter((id): id is string => !!id),
    isLoading,
    // None at all (not just none through the filters).
    empty: documents.length === 0,
    visible,
    hasMore: listed.length > QUICK_START_MAX,
  };
};
