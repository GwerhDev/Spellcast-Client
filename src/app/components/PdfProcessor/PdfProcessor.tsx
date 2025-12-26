import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import { RootState } from '../../../store';
import { setPageText, setPdfLoaded } from '../../../store/pdfReaderSlice';

// Set workerSrc for pdfjsLib
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import { getDocumentById, saveDocumentProgress } from '../../../db';
import { setCurrentSentenceIndex, setSentences } from 'store/browserPlayerSlice';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export const PdfProcessor = () => {
  const dispatch = useDispatch();
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const { currentPage, totalPages, pages, documentId, currentPageText, isLoaded } = useSelector((state: RootState) => state.pdfReader);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Effect to create pdfDoc from fileContent
  useEffect(() => {
    const loadDocument = async () => {
      const fileContent = await getDocumentById(documentId || "");

      if (fileContent) {
        const pdfAsBase64 = await blobToBase64(fileContent.pdf);
        setPdfDoc(null);
        const pdfData = atob(pdfAsBase64.substring(pdfAsBase64.indexOf(',') + 1));
        pdfjsLib.getDocument({ data: pdfData }).promise.then(doc => {
          setPdfDoc(doc);
        });
      } else {
        setPdfDoc(null);
      }
    };

    loadDocument();
  }, [dispatch, documentId]);

  useEffect(() => {
    const sentences = currentPageText?.split(/(?<=[.!?])/) || [];
    dispatch(setSentences({ sentences: sentences }));
  }, [currentPageText, dispatch]);

  // Effect to process page when currentPage changes
  useEffect(() => {
    if (pdfDoc && !isProcessing) {
      const processPage = async () => {
        setIsProcessing(true);

        try {
          let text = pages[currentPage];
          if (!text) {
            const page = await pdfDoc.getPage(currentPage);
            const content = await page.getTextContent();
            text = content.items.map((item: TextItem | TextMarkedContent) => ('str' in item ? item.str : '')).join(' ');
            text = text.replace(/\s+/g, ' ').trim();
            dispatch(setPageText({ text }));
            dispatch(setCurrentSentenceIndex(0));
          }

          if (text && text.trim() !== '') {
            // Only generate audio if it's not already for the current page
            dispatch(setPageText({ text }));
          }
        } catch (error) {
          console.error(`Failed to process page ${currentPage}:`, error);
        } finally {
          setIsProcessing(false);
          dispatch(setPdfLoaded(true)); // Set isLoaded to true after all pages are processed
        }
      };
      processPage();
    }
  }, [pdfDoc, currentPage, dispatch, selectedVoice, isProcessing, totalPages, pages]);

  useEffect(() => {
    if (isLoaded && documentId && currentPage) {
      saveDocumentProgress({ documentId, currentPage });
    }
  }, [currentPage, documentId, isLoaded]);

  return null; // Headless component
};