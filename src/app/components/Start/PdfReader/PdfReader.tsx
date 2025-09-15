import s from './PdfReader.module.css';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { textToSpeechService } from '../../../../services/tts';
import { setPlaylist, play, resetAudioPlayer } from '../../../../store/audioPlayerSlice';
import { setPdfDocumentInfo, goToNextPage, resetPdfState } from '../../../../store/pdfReaderSlice';
import { PageSelector } from './PageSelector/PageSelector';
import { IconButton } from '../../Buttons/IconButton';
import { faArrowLeft, faEdit, faSave, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export const PdfReader = () => {
  const [text, setText] = useState('');
  const [editedText, setEditedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const dispatch = useDispatch();
  const file = useSelector((state: RootState) => state.pdfReader.file);
  const selectedVoice = useSelector((state: RootState) => state.voice.selectedVoice);

  const pageProcessedRef = useRef(0);

  const { currentPage, totalPages, isLoaded } = useSelector((state: RootState) => state.pdfReader);

  const loadPage = async (pdf: any, pageNumber: number): Promise<string> => {
    setIsLoading(true);
    try {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const extractedText = content.items.map((item: any) => item.str).join(' ');
      setText(extractedText);
      setEditedText(extractedText);
      return extractedText;
    } catch (error) {
      console.error('Error loading page:', error);
      return '';
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAudio = async (textToGenerate: string) => {
    try {
      const audioUrl = await textToSpeechService({ text: textToGenerate, voice: selectedVoice });
      dispatch(setPlaylist({ playlist: [audioUrl], startIndex: 0, sourceType: 'pdfPage' }));
      dispatch(play());
    } catch (error) {
      console.error('Failed to generate audio for page', error);
    }
  };

  useEffect(() => {
    const loadPdfDocument = async () => {
      if (!file) return;
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
            if (pageProcessedRef.current !== currentPage && currentPage < totalPages) {
              pageProcessedRef.current = currentPage;
              dispatch(goToNextPage());
            }
            return;
          }
          handleGenerateAudio(newText);
        } catch (error) {
          console.error('Failed to generate audio for page', error);
        }
      };
      fetchTextAndAudio();
    }
    //eslint-disable-next-line
  }, [pdfDoc, currentPage, totalPages, dispatch, selectedVoice]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    setText(editedText);
    setIsEditing(false);
    handleGenerateAudio(editedText);
  };

  const handleCancel = () => {
    setEditedText(text);
    setIsEditing(false);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedText(e.target.value);
  };

  return (
    <div className={s.pdfReaderContainer}>
      <div className={s.pageInfoContainer}>
        <span className={s.headerControls}>
          <Link to={'/'}>
            <IconButton variant='transparent' icon={faArrowLeft} />
          </Link>
          {isLoaded && <PageSelector />}
        </span>
        <div className={s.controlsContainer}>
          {isLoaded && isEditing ? (
            <>
              <IconButton icon={faSave} variant='transparent' onClick={handleSave} />
              <IconButton icon={faXmark} variant='transparent' onClick={handleCancel} />
            </>
          ) : (
            <IconButton icon={faEdit} variant='transparent' onClick={handleEdit} />
          )}
        </div>
      </div>
      <div className={s.textContainer}>
        {isLoading ? (
          <p>Loading page...</p>
        ) : (
          <textarea
            value={isEditing ? editedText : text || 'Extracted text will appear here...'}
            onChange={handleTextChange}
            readOnly={!isEditing}
          />
        )}
      </div>
    </div>
  )
}
