import { useState, useEffect, useRef } from 'react';
import { textToSpeechService } from 'services/tts';
import { useDispatch, useSelector } from 'react-redux';
import { setPlaylist, play, resetAudioPlayer } from '../../../../store/audioPlayerSlice';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import { setPdfDocumentInfo, goToNextPage, resetPdfState } from 'store/pdfReaderSlice';
import { RootState } from 'store';
import s from './PdfReader.module.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

interface PdfReaderProps {
  file: File;
  selectedVoice: string;
}

export const PdfReader = ({ file, selectedVoice }: PdfReaderProps) => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const dispatch = useDispatch();

  const pageProcessedRef = useRef(0);

  const { currentPage, totalPages, isLoaded } = useSelector((state: RootState) => state.pdfReader);

  const loadPage = async (pdf: any, pageNumber: number): Promise<string> => {
    setIsLoading(true);
    try {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const extractedText = content.items.map((item: any) => item.str).join(' ');
      setText(extractedText);
      return extractedText;
    } catch (error) {
      console.error('Error loading page:', error);
      return '';
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadPdfDocument = async () => {
      setIsLoading(true);
      const fileReader = new FileReader();
      fileReader.onload = async () => {
        try {
          const typedArray = new Uint8Array(fileReader.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          setPdfDoc(pdf);
          dispatch(setPdfDocumentInfo({ totalPages: pdf.numPages }));
        } catch (error) {
          console.error('Error reading PDF:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fileReader.readAsArrayBuffer(file);
    };

    loadPdfDocument();

    return () => {
      dispatch(resetPdfState());
    };
  }, [file, dispatch]);

  useEffect(() => {
    if (pdfDoc) {
      const fetchTextAndAudio = async () => {
        dispatch(resetAudioPlayer());
        try {
          const newText = await loadPage(pdfDoc, currentPage);

          if (!newText || newText.trim() === '') {
            // Only dispatch goToNextPage if it hasn't been dispatched for this page yet
            if (pageProcessedRef.current !== currentPage && currentPage < totalPages) {
              pageProcessedRef.current = currentPage; // Mark this page as processed
              dispatch(goToNextPage());
            }
            return; // Skip audio generation for empty page
          }

          const audioUrl = await textToSpeechService({ text: newText, voice: selectedVoice });
          dispatch(setPlaylist({ playlist: [audioUrl], startIndex: 0, sourceType: 'pdfPage' }));
          dispatch(play());
        } catch (error) {
          console.error('Failed to generate audio for page', error);
        }
      };
      fetchTextAndAudio();
    }
  }, [pdfDoc, currentPage, totalPages, dispatch, selectedVoice]);

  return (
    <div className={s.pdfReaderContainer}>
      {isLoaded && (
        <div className={s.pageInfoContainer}>
          <span style={{ margin: '0 1rem' }}>
            Page {currentPage} of {totalPages}
          </span>
        </div>
      )}
      <div className={s.textContainer}>
        {isLoading ? (
          <p>Loading page...</p>
        ) : (
          <div className={s.textContent}>
            {text || 'Extracted text will appear here...'}
          </div>
        )}
      </div>
    </div>
  )
}
