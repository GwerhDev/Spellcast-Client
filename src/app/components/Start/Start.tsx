import s from './Start.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { textToSpeechService } from '../../../services/tts';
import { RootState } from '../../../store';
import { setPlaylist, play, resetAudioPlayer } from '../../../store/audioPlayerSlice';
import { setPdfFile, resetPdfState } from '../../../store/pdfReaderSlice';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { PdfInput } from './PdfInput/PdfInput';
import { TextInput } from './TextInput/TextInput';
import { InputTypeSelector } from './InputTypeSelector/InputTypeSelector';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowAltCircleRight, faFileCircleCheck } from '@fortawesome/free-solid-svg-icons';

export const Start = () => {
  const [inputType, setInputType] = useState('pdf'); // 'text' or 'pdf'
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const fileContent = useSelector((state: RootState) => state.pdfReader.fileContent);

  const generateAudio = useCallback(async (textToSpeak: string, voice: string) => {
    setIsLoading(true);
    try {
      const audioUrl = await textToSpeechService({ text: textToSpeak, voice });
      dispatch(setPlaylist({ playlist: [audioUrl], startIndex: 0 }));
      dispatch(play());
    } catch (error) {
      console.error('Failed to generate audio', error);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      dispatch(setPdfFile(base64));
      dispatch(resetAudioPlayer());
      navigate('/new');
    };
    reader.readAsDataURL(file);
  }, [dispatch, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFile(e.target.files[0]);
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
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (inputType === 'pdf' && fileContent) {
      // PDF handling is done by PdfReader component
    } else if (inputType === 'text') {
      await generateAudio(text, selectedVoice);
    }
  };

  useEffect(() => {
    // This useEffect is no longer responsible for triggering audio generation on text change.
    // Audio generation for text input is now solely triggered by the "Generate Audio" button click via handleSubmit.
  }, [selectedVoice, inputType, generateAudio]);

  return (
    <div className={s.container}>
      <div className={s.createContainer}>
        <h1>Cast a spell</h1>
        <p>Get started by creating a new Audio Book</p>

        <InputTypeSelector inputType={inputType} setInputType={setInputType} />

        <form onSubmit={handleSubmit} className={s.form}>
          {inputType === 'text' ? (
            <>
              <TextInput text={text} setText={setText} isLoading={isLoading} />
              <PrimaryButton type="submit" disabled={isLoading || !text}>
                {isLoading ? 'Generating Audio...' : 'Generate Audio'}
              </PrimaryButton>
            </>
          ) : (
            fileContent ? (
              <div className={s.form}>
                <Link to="/new" className={s.pdfLink}>
                  <div className={s.pdfInput}>
                    <FontAwesomeIcon size="2x" icon={faFileCircleCheck} />
                    <span>
                      <p>A PDF is already loaded</p>
                      <p>Continue reading</p>
                    </span>
                    <span>
                      <FontAwesomeIcon size="2x" icon={faArrowAltCircleRight} />
                    </span>
                  </div>
                </Link>
                <p onClick={() => dispatch(resetPdfState())} className={s.resetPdf}>
                  Or upload a new one
                </p>
              </div>
            ) : (
              <PdfInput
                isLoading={isLoading}
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                handleFileChange={handleFileChange}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
              />
            )
          )}

        </form>
      </div >
    </div >
  );
};