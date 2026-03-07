import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import { RootState } from '../../../store';
import { setPageText, setPdfLoaded, setSentences } from '../../../store/pdfReaderSlice';

// Set workerSrc for pdfjsLib
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import { getDocumentById, updateDocumentProgress } from '../../../db';
import { useAppSelector } from 'store/hooks';
import { DocumentProgress } from '../../../interfaces/index';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export const PdfProcessor = () => {
  const dispatch = useDispatch();
  const { userData } = useAppSelector((state) => state.session);
  const { currentPage, pages, documentId, currentPageText, isLoaded,currentSentenceIndex } = useSelector((state: RootState) => state.pdfReader);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Effect to create pdfDoc from fileContent
  useEffect(() => {
    const loadDocument = async () => {
      const fileContent = await getDocumentById(documentId || "", userData.id);

      if (fileContent) {
        const arrayBuffer = await fileContent.pdf.arrayBuffer();
        setPdfDoc(null);
        pdfjsLib.getDocument({ data: arrayBuffer }).promise.then(doc => {
          setPdfDoc(doc);
        });
      } else {
        setPdfDoc(null);
      }
    };

    loadDocument();
  }, [dispatch, documentId, userData.id]);

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
    //eslint-disable-next-line
  }, [pdfDoc, currentPage, dispatch]);

  useEffect(() => {
    if (isLoaded && currentSentenceIndex > -1) {
      const progress: DocumentProgress = {
        currentPage: currentPage,
        pagesProgress: [],
        lastReadSentenceIndex: currentSentenceIndex,
      };
      updateDocumentProgress(documentId || "", userData.id || "", progress);
    }

    if (isLoaded && currentSentenceIndex === -1) {
      const progress: DocumentProgress = {
        currentPage: currentPage,
        pagesProgress: [],
        lastReadSentenceIndex: 0,
      };
      updateDocumentProgress(documentId || "", userData.id || "", progress);
    }
  }, [currentPage, documentId, isLoaded, currentSentenceIndex, userData.id]);

  return null; // Headless component
};