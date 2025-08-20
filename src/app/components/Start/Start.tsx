import { useState } from 'react';
import { textToSpeechService } from '../../../services/tts';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import s from './Start.module.css';

export const Start = () => {
  const [inputType, setInputType] = useState('text'); // 'text' or 'pdf'
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAudioSrc(null);

    let data = {};
    if (inputType === 'pdf' && file) {
      data = { file: file.name };
    } else {
      data = { text };
    }

    try {
      const audioUrl = await textToSpeechService(data);
      setAudioSrc(audioUrl);
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
            className={`${s.tab} ${s.left} ${inputType === 'text' ? s.active : ''}`}
            onClick={() => setInputType('text')}
          >
            Text
          </button>
          <button
            className={`${s.tab} ${s.right} ${inputType === 'pdf' ? s.active : ''}`}
            onClick={() => setInputType('pdf')}
          >
            PDF
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
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              disabled={isLoading}
              className={s.fileInput}
            />
          )}
          <PrimaryButton type="submit" disabled={isLoading || (inputType === 'text' ? !text : !file)}>
            {isLoading ? 'Generating Audio...' : 'Generate Audio'}
          </PrimaryButton>
        </form>

        {audioSrc && (
          <div className={s.audioPlayer}>
            <audio controls src={audioSrc} />
          </div>
        )}
      </div>
    </div>
  );
};
