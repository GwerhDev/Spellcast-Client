import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { JSONContent } from '../../../magictext';
import { RootState } from '../../../store';
import { setPageText, setSpellLoaded, setSentences } from '../../../store/spellReaderSlice';
import { getSpellById, updateSpellProgress } from '../../../db';
import { useAppSelector } from '../../../store/hooks';
import { SpellProgress } from '../../../interfaces/index';

const extractSentencesFromJSON = (text: string): string[] => {
  try {
    const json = JSON.parse(text) as JSONContent;
    const sentences: string[] = [];
    // Containers (a page's columns: see ColumnsExtension) are walked into, in order: the
    // same reading order the reader and the provider voices' parser walk the page in.
    const blocks: JSONContent[] = [];
    const flatten = (nodes: JSONContent[]) => {
      for (const node of nodes) {
        if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'image') blocks.push(node);
        else if (node.content) flatten(node.content);
      }
    };
    flatten(json.content || []);
    for (const node of blocks) {
      if (node.type === 'image') {
        const alt = (node.attrs as { alt?: string })?.alt;
        if (alt) sentences.push(...alt.split(/(?<=[.!?])(?!\s*\.)\s*/).filter(Boolean));
        continue;
      }
      const nodeText = (node.content || [])
        .map((c: JSONContent) => {
          if (c.type === 'text') return (c.text as string) || '';
          if (c.type === 'hardBreak') return ' ';
          return '';
        })
        .join('')
        .trim();
      if (!nodeText) continue;
      sentences.push(...nodeText.split(/(?<=[.!?])(?!\s*\.)\s*/).filter(Boolean));
    }
    return sentences;
  } catch {
    return text.split(/(?<=[.!?])(?!\s*\.)/).filter(Boolean);
  }
};

export const SpellProcessor = () => {
  const dispatch = useDispatch();
  const { userData } = useAppSelector((state) => state.session);
  const { currentPage, spellId, isLoaded, currentSentenceIndex, contentVersion } = useSelector((state: RootState) => state.spellReader);

  // The loaded pages, tagged with the spell they belong to. On a spell change (or unload)
  // this still holds the PREVIOUS spell's pages for the render where spellId has already
  // moved on -- clearing it is only a scheduled update -- so publishing checks the tag rather
  // than trusting that the state has caught up.
  const [loaded, setLoaded] = useState<{ spellId: string; pages: string[] } | null>(null);

  useEffect(() => {
    setLoaded(null);
    if (!spellId) return;
    // A spell unloaded or swapped while its read is still in flight must not land late.
    let cancelled = false;
    getSpellById(spellId, userData.id).then(async (doc) => {
      if (cancelled) return;
      if (doc?.pagesContent) {
        const parsed = JSON.parse(doc.pagesContent) as JSONContent[];
        setLoaded({ spellId, pages: parsed.map((p) => JSON.stringify(p)) });
      } else {
        setLoaded({ spellId, pages: [] });
      }
    });
    return () => { cancelled = true; };
  }, [spellId, userData.id, contentVersion]);

  useEffect(() => {
    // Only this spell's own pages: never the previous spell's, still in state for a render.
    if (!spellId || loaded?.spellId !== spellId) return;
    const text = loaded.pages[currentPage - 1] ?? '';
    dispatch(setPageText({ text }));
    dispatch(setSentences({ sentences: extractSentencesFromJSON(text) }));
    dispatch(setSpellLoaded(true));
  }, [currentPage, loaded, spellId, dispatch]);

  useEffect(() => {
    if (!isLoaded || currentSentenceIndex < 0 || !spellId) return;
    const progress: SpellProgress = {
      currentPage,
      pagesProgress: [],
      lastReadSentenceIndex: currentSentenceIndex < 0 ? 0 : currentSentenceIndex,
    };
    updateSpellProgress(spellId, userData.id || '', progress);
  }, [currentPage, spellId, isLoaded, currentSentenceIndex, userData.id]);

  return null;
};
