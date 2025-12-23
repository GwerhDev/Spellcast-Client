import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import { RootState } from '../../../store';
import { textToSpeechService } from '../../../services/tts';
import { setPlaylist, play as playAiAudio } from '../../../store/audioPlayerSlice';
import { setText as setBrowserText, play as playBrowserAudio } from '../../../store/browserPlayerSlice';
import { setPdfDocumentInfo, setPageText, goToNextPage } from '../../../store/pdfReaderSlice';

// Set workerSrc for pdfjsLib
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export const PdfProcessor = () => {
  const dispatch = useDispatch();
  const { fileContent, currentPage, totalPages, pages } = useSelector((state: RootState) => state.pdfReader);
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const sourceType = useSelector((state: RootState) => state.audioPlayer.sourceType);
  const pdfPageNumber = useSelector((state: RootState) => state.audioPlayer.pdfPageNumber);
  const isPlaying = useSelector((state: RootState) => state.audioPlayer.isPlaying);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Effect to create pdfDoc from fileContent
  useEffect(() => {
    if (fileContent) {
      const pdfData = atob(fileContent.substring(fileContent.indexOf(',') + 1));
      pdfjsLib.getDocument({ data: pdfData }).promise.then(doc => {
        setPdfDoc(doc);
        if (totalPages === 0) {
            dispatch(setPdfDocumentInfo({ totalPages: doc.numPages }));
        }
      });
    } else {
      setPdfDoc(null);
    }
  }, [fileContent, dispatch, totalPages]);

  // Effect to process page when currentPage changes
  useEffect(() => {
    if (pdfDoc && currentPage > 0 && !isProcessing) {
      // Avoid processing if audio for the current page is already playing or loaded
      if (isPlaying && sourceType === 'pdfPage' && pdfPageNumber === currentPage) {
        return;
      }

      const processPage = async () => {
        setIsProcessing(true);
        try {
            let text = pages[currentPage];

            if (!text) {
                const page = await pdfDoc.getPage(currentPage);
                const content = await page.getTextContent();
                text = content.items.map((item: TextItem | TextMarkedContent) => ('str' in item ? item.str : '')).join(' ');
                text = text.replace(/\s+/g, ' ').trim();
                dispatch(setPageText({ pageNumber: currentPage, text }));
            }

          if (text && text.trim() !== '') {
            // Only generate audio if it's not already for the current page
            if (sourceType !== 'pdfPage' || pdfPageNumber !== currentPage) {
              if (selectedVoice === 'browser') {
                dispatch(setBrowserText(text));
                dispatch(playBrowserAudio());
              } else {
                const audioUrl = await textToSpeechService({ text, voice: selectedVoice });
                dispatch(setPlaylist({ playlist: [audioUrl], startIndex: 0, sourceType: 'pdfPage', pdfPageNumber: currentPage }));
                dispatch(playAiAudio());
              }
            }
          } else {
            // If page is empty, go to next
            if (currentPage < totalPages) {
              dispatch(goToNextPage());
            }
          }
        } catch (error) {
          console.error(`Failed to process page ${currentPage}:`, error);
        } finally {
          setIsProcessing(false);
        }
      };
      processPage();
    }
  }, [pdfDoc, currentPage, dispatch, selectedVoice, sourceType, pdfPageNumber, isPlaying, isProcessing, totalPages, pages]);

  return null; // Headless component
};