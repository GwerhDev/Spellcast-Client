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
import { saveSpellToDB, updateSpellFull, getSpellById, deleteSpellFromDB } from '../../../db';
import { setOriginalPdf } from '../../../db/originalPdfs';
import { renderPageToCover, extractPdfPages, injectCoverIntoPages, blobToDataUrl, extractPdfMetadata } from '../../../utils/pdfUtils';
import { invalidateContent, invalidateSpellList } from '../../../store/spellReaderSlice';
import { isQuotaExceededError } from '../../../utils/storageQuota';
import { useLanguage } from '../../../i18n';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export const SpellUploadWorker: React.FC = () => {
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const queue = useSelector((state: RootState) => state.spellUpload.queue);
  const isProcessing = useRef(false);

  useEffect(() => {
    const next = queue.find(j => j.status === 'queued');
    if (!next || isProcessing.current) return;

    isProcessing.current = true;
    dispatch(setUploadProcessing(next.id));

    (async () => {
      // TCORE-117: if a write after this point fails with QuotaExceededError, these let
      // the catch block undo whatever already-successful write preceded it, instead of
      // leaving a spell record half-updated (new content, no matching original PDF) or an
      // orphaned new spell (metadata with no original PDF ever meant to back it up).
      let previousSpell: Awaited<ReturnType<typeof getSpellById>> | null = null;
      let createdSpellId: string | null = null;

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
          previousSpell = await getSpellById(next.targetDocId, next.userId) ?? null;
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
          createdSpellId = await saveSpellToDB({
            // Same merge-if-empty prefill SpellCreateForm does: prefer the PDF's own
            // embedded title, but never clobber one the user already typed over the
            // filename-derived default in the review card (titleWasEdited).
            title: (!next.titleWasEdited && meta.title) ? meta.title : next.title,
            cover: coverBlob ?? undefined,
            userId: next.userId,
            pagesContent: JSON.stringify(pagesContent),
            originalPagesContent: next.saveOriginal ? JSON.stringify(pagesContent) : undefined,
            // TCORE-97 follow-up: same PDF-metadata prefill SpellCreateForm already does,
            // so spells created via this background path get it too. There's no review
            // step for these on this path, so there's no clobber risk to guard against.
            description: meta.description,
            author: meta.author,
            tags: meta.tags,
            language: meta.language,
          });
          if (next.saveOriginal) {
            await setOriginalPdf(createdSpellId, pdfBlob);
          }
          dispatch(setUploadDone({ id: next.id, resultDocId: createdSpellId }));
          dispatch(invalidateSpellList());
        }
      } catch (err) {
        console.error('SpellUploadWorker error:', err);

        if (isQuotaExceededError(err)) {
          if (next.targetDocId && previousSpell) {
            // Best-effort: restore the content this replace would have overwritten. Not
            // airtight (a device already this close to full could fail again writing back
            // a similarly-sized record), but leaves the spell matching its old, complete
            // state rather than new content with no original PDF behind it.
            await updateSpellFull(next.targetDocId, next.userId, {
              title: previousSpell.title,
              pagesContent: previousSpell.pagesContent ?? '',
              cover: previousSpell.cover,
              originalPagesContent: previousSpell.originalPagesContent,
            }).catch((restoreErr) => console.error('SpellUploadWorker: failed to restore previous content after quota error:', restoreErr));
          } else if (createdSpellId) {
            // The new spell's metadata was written but its original PDF wasn't -- drop it
            // entirely rather than leave an orphaned, incomplete spell in the list.
            await deleteSpellFromDB(createdSpellId, next.userId)
              .catch((deleteErr) => console.error('SpellUploadWorker: failed to roll back orphaned spell after quota error:', deleteErr));
          }
          dispatch(setUploadError({ id: next.id, message: t.spell.quotaExceededUpload }));
        } else {
          dispatch(setUploadError({ id: next.id, message: String(err) }));
        }
      } finally {
        isProcessing.current = false;
      }
    })();
    //eslint-disable-next-line
  }, [queue, dispatch]);

  return null;
};
