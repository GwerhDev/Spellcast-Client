import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addApiResponse } from '../store/apiResponsesSlice';
import { enqueueUpload } from '../store/spellUploadSlice';
import { useLanguage } from '../i18n';
import { getOriginalPdf } from '../db/originalPdfs';
import { getSpellById } from '../db';
import { blobToDataUrl } from '../utils/pdfUtils';

// "Update from PDF" for several spells at once: each one with its original PDF stored is
// read again from it -- its pages and its details (description, author, tags, language,
// and the title if the PDF has one), keeping its cover -- by the background upload worker,
// which shows each one's progress on its card and in the upload panel. Spells without a
// stored PDF have nothing to be read again from and are skipped.
export function useUpdateSpellsFromPdf() {
  const dispatch = useAppDispatch();
  const { t } = useLanguage();
  const userId = useAppSelector((state) => state.session.userData?.id);

  // `report: false` for a caller that tells the outcome on its own (e.g. a single spell's page);
  // `pagesOnly` to read only the pages again, leaving the title and details as they are.
  return async (spellIds: string[], { report = true, pagesOnly = false } = {}): Promise<{ queued: number; skipped: number }> => {
    if (!userId) return { queued: 0, skipped: spellIds.length };
    let queued = 0;
    let skipped = 0;
    for (const spellId of spellIds) {
      const [pdf, spell] = await Promise.all([getOriginalPdf(spellId), getSpellById(spellId, userId)]);
      if (!pdf || !spell) { skipped++; continue; }
      dispatch(enqueueUpload({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: spell.title,
        fileContent: await blobToDataUrl(pdf),
        saveOriginal: true,
        userId,
        targetDocId: spellId,
        refreshFromPdf: true,
        ...(pagesOnly ? { pagesOnly: true } : {}),
      }));
      queued++;
    }
    if (report) dispatch(addApiResponse({
      message: t.grimoire.updateFromPdfResult.replace('{queued}', String(queued)).replace('{skipped}', String(skipped)),
      type: queued > 0 ? 'success' : 'error',
    }));
    return { queued, skipped };
  };
}
