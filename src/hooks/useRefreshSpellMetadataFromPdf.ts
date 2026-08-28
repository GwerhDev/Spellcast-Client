import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addApiResponse } from '../store/apiResponsesSlice';
import { invalidateSpellList } from '../store/spellReaderSlice';
import { useLanguage } from '../i18n';
import { getOriginalPdf } from '../db/originalPdfs';
import { updateSpellMetadata } from '../db';
import { extractPdfMetadata, type PdfMetadata } from '../utils/pdfUtils';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface RefreshOneResult {
  status: 'updated' | 'skipped';
  metadata?: PdfMetadata;
}

/**
 * Shared "re-extract metadata from the stored original PDF" flow (TCORE-103), for a spell
 * that has one saved (TCORE-90's src/db/originalPdfs.ts) -- individually or in bulk from
 * GrimoireLanding's existing selection framework. Lives in src/hooks/ for the same
 * layering reason as useSpellImport/useSpellExport (needs redux + IndexedDB access).
 */
export function useRefreshSpellMetadataFromPdf() {
  const dispatch = useAppDispatch();
  const { t } = useLanguage();
  const { userData } = useAppSelector((state) => state.session);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshOne = async (spellId: string): Promise<RefreshOneResult> => {
    const blob = await getOriginalPdf(spellId);
    if (!blob) return { status: 'skipped' };

    let metadata: PdfMetadata;
    try {
      const pdf = await pdfjsLib.getDocument({ data: await blob.arrayBuffer() }).promise;
      metadata = await extractPdfMetadata(pdf);
    } catch (err) {
      // A stored blob that pdf.js itself can't open (corrupt/not actually a PDF) has
      // nothing to re-extract from -- practically the same outcome as no PDF at all,
      // so it's folded into 'skipped' rather than a third reporting bucket.
      console.error(`[useRefreshSpellMetadataFromPdf] Could not open stored PDF for spell "${spellId}":`, err);
      return { status: 'skipped' };
    }

    await updateSpellMetadata(spellId, userData.id!, metadata);
    return { status: 'updated', metadata };
  };

  const refreshMany = async (spellIds: string[]): Promise<{ updated: number; skipped: number }> => {
    setIsRefreshing(true);
    try {
      let updated = 0;
      let skipped = 0;
      for (const id of spellIds) {
        const result = await refreshOne(id);
        if (result.status === 'updated') updated++; else skipped++;
      }
      dispatch(invalidateSpellList());
      dispatch(addApiResponse({
        message: t.grimoire.bulkRefreshMetadataResult.replace('{updated}', String(updated)).replace('{skipped}', String(skipped)),
        type: 'success',
      }));
      return { updated, skipped };
    } finally {
      setIsRefreshing(false);
    }
  };

  return { refreshOne, refreshMany, isRefreshing };
}
