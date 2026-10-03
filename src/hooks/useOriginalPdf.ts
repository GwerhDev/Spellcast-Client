import { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { getOriginalPdf } from '../db/originalPdfs';

export type OriginalPdf =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; pdf: pdfjsLib.PDFDocumentProxy };

// The spell's original PDF, read once while it's wanted (spellId set) and let go after:
// the sheet below draws its pages from it, so flipping, zooming and turning pages don't
// read it again.
export const useOriginalPdf = (spellId: string | null): OriginalPdf | null => {
  const [state, setState] = useState<OriginalPdf | null>(null);
  useEffect(() => {
    if (!spellId) { setState(null); return; }
    let cancelled = false;
    let pdf: pdfjsLib.PDFDocumentProxy | null = null;
    setState({ status: 'loading' });
    getOriginalPdf(spellId)
      .then(async blob => {
        if (!blob) throw new Error('no original PDF');
        pdf = await pdfjsLib.getDocument({ data: await blob.arrayBuffer() }).promise;
        if (cancelled) { pdf.destroy(); return; }
        setState({ status: 'ready', pdf });
      })
      .catch(() => { if (!cancelled) setState({ status: 'error' }); });
    return () => { cancelled = true; pdf?.destroy(); };
  }, [spellId]);
  return state;
};
