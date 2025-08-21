import { useState, useCallback, useEffect } from 'react';
import { textToSpeechService } from '../../../services/tts';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import s from './Start.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { setPlaylist, play } from '../../../store/audioPlayerSlice';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import { setPdfDocumentInfo, goToNextPage, goToPreviousPage, resetPdfState } from '../../../store/pdfReaderSlice';
import { RootState } from '../../../store';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const PdfReader = ({ file }: { file: File }) => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const dispatch = useDispatch();

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
        setIsLoadingAudio(true);
        try {
          const newText = await loadPage(pdfDoc, currentPage);
          if (newText) {
            const audioUrl = await textToSpeechService({ text: newText });
            dispatch(setPlaylist({ playlist: [audioUrl], startIndex: 0, sourceType: 'pdfPage' }));
            dispatch(play());
          }
        } catch (error) {
          console.error('Failed to generate audio for page', error);
        } finally {
          setIsLoadingAudio(false);
        }
      };
      fetchTextAndAudio();
    }
  }, [pdfDoc, currentPage]);

  return (
    <div className={s.pdfReaderContainer}>
        <div className={s.textContainer}>
          {isLoading ? (
            <p>Loading page...</p>
          ) : (
            <div className={s.textContent}>
              {text || 'Extracted text will appear here...'}
            </div>
          )}
        </div>

        {isLoaded && (
          <div className={s.pageInfoContainer}>
            <span style={{ margin: '0 1rem' }}>
              Page {currentPage} of {totalPages}
            </span>
            {isLoadingAudio && <span style={{ marginLeft: '1rem' }}>Generating audio...</span>}
          </div>
        )}
    </div>
  )
}

export const Start = () => {
  const [inputType, setInputType] = useState('pdf'); // 'text' or 'pdf'
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dispatch = useDispatch();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    let data = {};
    if (inputType === 'pdf' && file) {
      data = { file: file.name };
    } else {
      data = { text };
    }

    try {
      const audioUrl = await textToSpeechService(data);
      dispatch(setPlaylist({ playlist: [audioUrl], startIndex: 0 }));
      dispatch(play());
    } catch (error) {
      console.error('Failed to generate audio', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={s.container}>
      <div className={s.createContainer}>
        <h1>Cast a spell</h1>
        <p>Get started by creating a new Audio Book</p>

        <div className={s.tabs}>
          <button
            className={`${s.tab} ${s.left} ${inputType === 'pdf' ? s.active : ''}`}
            onClick={() => setInputType('pdf')}
          >
            PDF
          </button>
          <button
            className={`${s.tab} ${s.right} ${inputType === 'text' ? s.active : ''}`}
            onClick={() => setInputType('text')}
          >
            Text
          </button>
        </div>

        <form onSubmit={handleSubmit} className={s.form}>
          {inputType === 'text' ? (
            <textarea
              className={s.textarea}
              placeholder="Enter text to convert to speech..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isLoading}
            />
          ) : (
            <div
              className={`${s.dropzone} ${isDragging ? s.dragging : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={isLoading}
                className={s.fileInput}
                id="file-input"
              />
              <label htmlFor='file-input' className={s.fileInputLabel}>
                {file ? file.name : 'Drag and drop a PDF file here, or click to select a file'}
              </label>
            </div>
          )}
          {file && inputType === 'pdf' && <PdfReader file={file} />}
          {inputType === 'text' &&
            <PrimaryButton type="submit" disabled={isLoading || (inputType === 'text' ? !text : !file)}>
              {isLoading ? 'Generating Audio...' : 'Generate Audio'}
            </PrimaryButton>
          }
        </form>
      </div>
    </div>
  );
};


