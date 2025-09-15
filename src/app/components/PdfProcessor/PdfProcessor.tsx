import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as pdfjsLib from 'pdfjs-dist';
import { RootState } from '../../../store';
import { textToSpeechService } from '../../../services/tts';
import { setPlaylist, play } from '../../../store/audioPlayerSlice';
import { setPdfDocumentInfo, setCurrentPageText, goToNextPage } from '../../../store/pdfReaderSlice';

// Set workerSrc for pdfjsLib
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export const PdfProcessor = () => {
  const dispatch = useDispatch();
  const { fileContent, currentPage, totalPages } = useSelector((state: RootState) => state.pdfReader);
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const sourceType = useSelector((state: RootState) => state.audioPlayer.sourceType);
  const pdfPageNumber = useSelector((state: RootState) => state.audioPlayer.pdfPageNumber);
  const isPlaying = useSelector((state: RootState) => state.audioPlayer.isPlaying);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
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
          const page = await pdfDoc.getPage(currentPage);
          const content = await page.getTextContent();
          const text = content.items.map((item: any) => item.str).join(' ');
          
          dispatch(setCurrentPageText(text));

          if (text && text.trim() !== '') {
            // Only generate audio if it's not already for the current page
            if (sourceType !== 'pdfPage' || pdfPageNumber !== currentPage) {
              const audioUrl = await textToSpeechService({ text, voice: selectedVoice });
              dispatch(setPlaylist({ playlist: [audioUrl], startIndex: 0, sourceType: 'pdfPage', pdfPageNumber: currentPage }));
              dispatch(play());
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
  }, [pdfDoc, currentPage, dispatch, selectedVoice, sourceType, pdfPageNumber, isPlaying, isProcessing, totalPages]);

  return null; // Headless component
};