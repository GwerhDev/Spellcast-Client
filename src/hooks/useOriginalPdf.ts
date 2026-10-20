import { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { getOriginalPdf } from '../db/originalPdfs';

export type OriginalPdf =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; pdf: pdfjsLib.PDFDocumentProxy };

// The spell's original PDF, read once while it's wanted (`source` set) and let go after:
// the sheet below draws its pages from it, so flipping, zooming and turning pages don't
// read it again. `source`: a stored spell's id (its PDF kept apart), or the PDF itself (a
// spell being made, not stored yet).
export const useOriginalPdf = (source: string | Blob | null): OriginalPdf | null => {
  const [state, setState] = useState<OriginalPdf | null>(null);
  useEffect(() => {
    if (!source) { setState(null); return; }
    let cancelled = false;
    let pdf: pdfjsLib.PDFDocumentProxy | null = null;
    setState({ status: 'loading' });
    (typeof source === 'string' ? getOriginalPdf(source) : Promise.resolve(source))
      .then(async blob => {
        if (!blob) throw new Error('no original PDF');
        pdf = await pdfjsLib.getDocument({ data: await blob.arrayBuffer() }).promise;
        if (cancelled) { pdf.destroy(); return; }
        setState({ status: 'ready', pdf });
      })
      .catch(() => { if (!cancelled) setState({ status: 'error' }); });
    return () => { cancelled = true; pdf?.destroy(); };
  }, [source]);
  return state;
};
