import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { JSONContent } from '@tiptap/core';
import { RootState } from '../../../store';
import { setPageText, setPdfLoaded, setSentences } from '../../../store/pdfReaderSlice';
import { getDocumentById, updateDocumentProgress } from '../../../db';
import { useAppSelector } from 'store/hooks';
import { DocumentProgress } from '../../../interfaces/index';

const extractSentencesFromJSON = (text: string): string[] => {
  try {
    const json = JSON.parse(text) as JSONContent;
    const sentences: string[] = [];
    for (const node of (json.content || [])) {
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
      sentences.push(...nodeText.split(/(?<=[.!?])\s*/).filter(Boolean));
    }
    return sentences;
  } catch {
    return text.split(/(?<=[.!?])/).filter(Boolean);
  }
};

export const PdfProcessor = () => {
  const dispatch = useDispatch();
  const { userData } = useAppSelector((state) => state.session);
  const { currentPage, documentId, isLoaded, currentSentenceIndex, contentVersion } = useSelector((state: RootState) => state.pdfReader);

  const [pages, setPages] = useState<string[]>([]);
  const [docLoaded, setDocLoaded] = useState(false);

  useEffect(() => {
    if (!documentId) return;
    setDocLoaded(false);
    setPages([]);
    getDocumentById(documentId, userData.id).then((doc) => {
      if (doc?.pagesContent) {
        const parsed = JSON.parse(doc.pagesContent) as unknown[];
        setPages(parsed.map((p) => JSON.stringify(p)));
      } else {
        setPages([]);
      }
      setDocLoaded(true);
    });
  }, [documentId, userData.id, contentVersion]);

  useEffect(() => {
    if (!docLoaded) return;
    const text = pages[currentPage - 1] ?? '';
    dispatch(setPageText({ text }));
    dispatch(setSentences({ sentences: extractSentencesFromJSON(text) }));
    dispatch(setPdfLoaded(true));
  }, [currentPage, docLoaded, pages, dispatch]);

  useEffect(() => {
    if (!isLoaded || currentSentenceIndex < 0) return;
    const progress: DocumentProgress = {
      currentPage,
      pagesProgress: [],
      lastReadSentenceIndex: currentSentenceIndex < 0 ? 0 : currentSentenceIndex,
    };
    updateDocumentProgress(documentId || '', userData.id || '', progress);
  }, [currentPage, documentId, isLoaded, currentSentenceIndex, userData.id]);

  return null;
};
