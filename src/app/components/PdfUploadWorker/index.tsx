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
} from '../../../store/pdfUploadSlice';
import { saveDocumentToDB, updateDocumentFull } from '../../../db';
import { renderPageToCover, extractPdfPages, injectCoverIntoPages, blobToDataUrl } from '../../../utils/pdfUtils';
import { invalidateContent, invalidateDocumentList } from '../../../store/pdfReaderSlice';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export const PdfUploadWorker: React.FC = () => {
  const dispatch = useDispatch();
  const queue = useSelector((state: RootState) => state.pdfUpload.queue);
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
          // Editor replace flow
          await updateDocumentFull(next.targetDocId, next.userId, {
            title: next.title,
            pagesContent: JSON.stringify(pagesContent),
            pdf: pdfBlob,
            cover: coverBlob ?? undefined,
            originalPdf: pdfBlob,
            originalPagesContent: JSON.stringify(pagesContent),
          });
          dispatch(invalidateContent());
          dispatch(setUploadDone({ id: next.id }));
        } else {
          // Create new document flow
          const resultDocId = await saveDocumentToDB({
            title: next.title,
            pdf: pdfBlob,
            originalPdf: next.saveOriginal ? pdfBlob : undefined,
            cover: coverBlob ?? undefined,
            userId: next.userId,
            pagesContent: JSON.stringify(pagesContent),
            originalPagesContent: next.saveOriginal ? JSON.stringify(pagesContent) : undefined,
          });
          dispatch(setUploadDone({ id: next.id, resultDocId }));
          dispatch(invalidateDocumentList());
        }
      } catch (err) {
        console.error('PdfUploadWorker error:', err);
        dispatch(setUploadError({ id: next.id, message: String(err) }));
      } finally {
        isProcessing.current = false;
      }
    })();
  }, [queue, dispatch]);

  return null;
};
