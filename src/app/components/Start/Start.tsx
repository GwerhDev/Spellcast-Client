import s from './Start.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { textToSpeechService } from '../../../services/tts';
import { RootState } from '../../../store';
import { setPlaylist, play as playAiAudio } from '../../../store/audioPlayerSlice';
import { setText as setBrowserText, play as playBrowserAudio } from '../../../store/browserPlayerSlice';
import { setPdfFile, resetPdfState } from '../../../store/pdfReaderSlice';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { PdfInput } from './PdfInput/PdfInput';
import { TextInput } from './TextInput/TextInput';
import { InputTypeSelector } from '../Selectors/InputTypeSelector';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowAltCircleRight, faFileCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { LabeledInput } from '../Inputs/LabeledInput';

export const Start = () => {
  const [inputType, setInputType] = useState('upload');
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const fileContent = useSelector((state: RootState) => state.pdfReader.fileContent);

  const handleNavigate = () => {
    navigate("/document/create")
  };

  const generateAiAudio = useCallback(async (textToSpeak: string, voice: string) => {
    setIsLoading(true);
    try {
      const audioUrl = await textToSpeechService({ text: textToSpeak, voice });
      dispatch(setPlaylist({ playlist: [audioUrl], startIndex: 0 }));
      dispatch(playAiAudio());
    } catch (error) {
      console.error('Failed to generate audio', error);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    console.log(reader)
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      dispatch(setPdfFile(base64));
    };
    reader.readAsDataURL(file);
  }, [dispatch]);

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

    if (selectedVoice.type !== 'browser') {
      await generateAiAudio(text, selectedVoice.value);
    } else {
      dispatch(setBrowserText(text));
      dispatch(playBrowserAudio());
    }
  };

  return (
    <div className={s.container}>
      <div className={s.createContainer}>
        <h1>Cast a spell</h1>
        <p>Get started by creating a new Audio Book</p>

        <InputTypeSelector inputType={inputType} setInputType={setInputType} />

        <form onSubmit={handleSubmit} className={s.form}>
          {inputType === 'create' && (
            <div className={s.form}>
              <LabeledInput label="Document title" value={""} name="" />
              <PrimaryButton type="submit" onClick={handleNavigate}>
                Create new document
              </PrimaryButton>
            </div>
          )}
          {inputType === 'text' && (
            <>
              <TextInput text={text} setText={setText} isLoading={isLoading} />
              <PrimaryButton type="submit" disabled={isLoading || !text}>
                {isLoading ? 'Generating Audio...' : 'Generate Audio'}
              </PrimaryButton>
            </>
          )}
          {inputType === 'upload' && (
            fileContent ? (
              <div className={s.form}>
                <Link to="/document/create" className={s.pdfLink}>
                  <div className={s.pdfInput}>
                    <FontAwesomeIcon size="2x" icon={faFileCircleCheck} />
                    <span>
                      <p>A PDF is already loaded</p>
                      <small>Continue creating</small>
                      <p></p>
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