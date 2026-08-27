import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import { RootState } from '../../../store';
import {
  setUploadProcessing,
  setUploadProgress,
  setUploadCover,
  setUploadDone,
  setUploadError,
} from '../../../store/spellUploadSlice';
import { saveSpellToDB, updateSpellFull } from '../../../db';
import { setOriginalPdf } from '../../../db/originalPdfs';
import { renderPageToCover, extractPdfPages, injectCoverIntoPages, blobToDataUrl, extractPdfMetadata } from '../../../utils/pdfUtils';
import { invalidateContent, invalidateSpellList } from '../../../store/spellReaderSlice';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export const SpellUploadWorker: React.FC = () => {
  const dispatch = useDispatch();
  const queue = useSelector((state: RootState) => state.spellUpload.queue);
  const isProcessing = useRef(false);

  useEffect(() => {
    const next = queue.find(j => j.status === 'queued');
    if (!next || isProcessing.current) return;

    isProcessing.current = true;
    dispatch(setUploadProcessing(next.id));

    (async () => {
      try {
        const pdfData = atob(next.fileContent.substring(next.fileContent.indexOf(',') + 1));
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const meta = await extractPdfMetadata(pdf);

        const page1TextContent = await (await pdf.getPage(1)).getTextContent();
        const page1HasText = page1TextContent.items.some(
          (item) => (item as { str: string }).str.trim().length > 0
        );
        const coverBlob = page1HasText ? null : await renderPageToCover(pdf);

        if (coverBlob) {
          const coverUrl = await blobToDataUrl(coverBlob);
          dispatch(setUploadCover({ id: next.id, coverUrl }));
        }

        const rawPages = await extractPdfPages(pdf, (current, total) => {
          dispatch(setUploadProgress({ id: next.id, current, total }));
        });
        const pagesContent = await injectCoverIntoPages(rawPages, coverBlob);

        const byteString = atob(next.fileContent.split(',')[1]);
        const byteArray = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) byteArray[i] = byteString.charCodeAt(i);
        const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });

        if (next.targetDocId) {
          await updateSpellFull(next.targetDocId, next.userId, {
            title: next.title,
            pagesContent: JSON.stringify(pagesContent),
            cover: coverBlob ?? undefined,
            originalPagesContent: JSON.stringify(pagesContent),
          });
          // Replacing a spell's content always keeps the PDF it was replaced with as the
          // new "original" (matches the pre-TCORE-90 behavior for this path) -- stored in
          // its own store now, never on the spell record itself.
          await setOriginalPdf(next.targetDocId, pdfBlob);
          dispatch(invalidateContent());
          dispatch(setUploadDone({ id: next.id }));
        } else {
          const resultDocId = await saveSpellToDB({
            title: next.title,
            cover: coverBlob ?? undefined,
            userId: next.userId,
            pagesContent: JSON.stringify(pagesContent),
            originalPagesContent: next.saveOriginal ? JSON.stringify(pagesContent) : undefined,
            // TCORE-97 follow-up: same PDF-metadata prefill SpellCreateForm already does,
            // so spells created via this background path get it too. Never overrides
            // anything a user could edit here (there's no review step on this path), so
            // there's no clobber risk to guard against, unlike the form's title field.
            description: meta.description,
            author: meta.author,
            tags: meta.tags,
            language: meta.language,
          });
          if (next.saveOriginal) {
            await setOriginalPdf(resultDocId, pdfBlob);
          }
          dispatch(setUploadDone({ id: next.id, resultDocId }));
          dispatch(invalidateSpellList());
        }
      } catch (err) {
        console.error('SpellUploadWorker error:', err);
        dispatch(setUploadError({ id: next.id, message: String(err) }));
      } finally {
        isProcessing.current = false;
      }
    })();
  }, [queue, dispatch]);

  return null;
};
