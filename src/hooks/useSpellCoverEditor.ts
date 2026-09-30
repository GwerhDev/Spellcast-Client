import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import type { JSONContent } from '../magictext';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getSpellById, updateSpellCoverFrame, updateSpellFull } from '../db';
import { getOriginalPdf } from '../db/originalPdfs';
import { coverFrameChanged, invalidateContent, invalidateSpellList } from '../store/spellReaderSlice';
import { applyCoverToPage1, blobToDataUrl, downscaleImageBlob, renderPageToCover } from '../utils/pdfUtils';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

// Changes a spell's cover and cover frame from outside the editor (the spell's detail),
// saving right away. A new cover also replaces the cover image on page 1, the same as the
// editor does, so the reader and the cards all show it; every list is refreshed after.
export const useSpellCoverEditor = (spellId: string | null) => {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(state => state.session.userData?.id);

  // Mirrors Spell.coverFrameId's three states: a frame id, null (explicitly none) or
  // undefined (back to following the caster's default). A small write of its own, and the
  // views showing this spell update it in place -- no list reads its spells again.
  const setFrame = async (coverFrameId: string | null | undefined) => {
    if (!spellId || !userId) return;
    await updateSpellCoverFrame(spellId, userId, coverFrameId);
    dispatch(coverFrameChanged({ spellId, coverFrameId }));
  };

  const applyCover = async (blob: Blob) => {
    if (!spellId || !userId) return;
    const spell = await getSpellById(spellId, userId);
    if (!spell) return;
    const pages = spell.pagesContent ? JSON.parse(spell.pagesContent) as JSONContent[] : [];
    const updatedPages = applyCoverToPage1(pages, await blobToDataUrl(blob));
    await updateSpellFull(spellId, userId, {
      title: spell.title,
      pagesContent: JSON.stringify(updatedPages),
      cover: blob,
      originalPagesContent: spell.originalPagesContent,
    });
    dispatch(invalidateContent());
    dispatch(invalidateSpellList());
  };

  // Downscaled first: an upload can be several MB, only ever shown at cover size.
  const setCoverFromImage = async (file: File) => applyCover(await downscaleImageBlob(file));

  // The original PDF's first page, when the spell kept its PDF.
  const setCoverFromPdf = async () => {
    if (!spellId) return;
    const pdfBlob = await getOriginalPdf(spellId);
    if (!pdfBlob) return;
    const pdf = await pdfjsLib.getDocument({ data: await pdfBlob.arrayBuffer() }).promise;
    const cover = await renderPageToCover(pdf);
    if (cover) await applyCover(cover);
  };

  return { setFrame, setCoverFromImage, setCoverFromPdf };
};
