import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { JSONContent } from '../../../magictext';
import { RootState } from '../../../store';
import { setPageText, setPdfLoaded, setSentences } from '../../../store/pdfReaderSlice';
import { getSpellById, updateSpellProgress } from '../../../db';
import { useAppSelector } from '../../../store/hooks';
import { SpellProgress } from '../../../interfaces/index';
import { injectCoverIntoPages } from '../../../utils/pdfUtils';

const extractSentencesFromJSON = (text: string): string[] => {
  try {
    const json = JSON.parse(text) as JSONContent;
    const sentences: string[] = [];
    for (const node of (json.content || [])) {
      if (node.type === 'image') {
        const alt = (node.attrs as { alt?: string })?.alt;
        if (alt) sentences.push(...alt.split(/(?<=[.!?])(?!\s*\.)\s*/).filter(Boolean));
        continue;
      }
      if (node.type !== 'paragraph' && node.type !== 'heading') continue;
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

export const PdfProcessor = () => {
  const dispatch = useDispatch();
  const { userData } = useAppSelector((state) => state.session);
  const { currentPage, spellId, isLoaded, currentSentenceIndex, contentVersion } = useSelector((state: RootState) => state.pdfReader);

  const [pages, setPages] = useState<string[]>([]);
  const [docLoaded, setDocLoaded] = useState(false);

  useEffect(() => {
    if (!spellId) return;
    setDocLoaded(false);
    setPages([]);
    getSpellById(spellId, userData.id).then(async (doc) => {
      if (doc?.pagesContent) {
        const parsed = JSON.parse(doc.pagesContent) as JSONContent[];
        const withCover = await injectCoverIntoPages(parsed, doc.cover ?? null);
        setPages(withCover.map((p) => JSON.stringify(p)));
      } else {
        setPages([]);
      }
      setDocLoaded(true);
    });
  }, [spellId, userData.id, contentVersion]);

  useEffect(() => {
    if (!docLoaded) return;
    const text = pages[currentPage - 1] ?? '';
    dispatch(setPageText({ text }));
    dispatch(setSentences({ sentences: extractSentencesFromJSON(text) }));
    dispatch(setPdfLoaded(true));
  }, [currentPage, docLoaded, pages, dispatch]);

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
