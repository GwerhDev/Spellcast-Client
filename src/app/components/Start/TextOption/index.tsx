import React, { useCallback, useState } from 'react';
import { PrimaryButton } from '../../Buttons/PrimaryButton';
import { RootState } from 'store/index';
import { useDispatch, useSelector } from 'react-redux';
import { textToSpeechService } from '../../../../services/tts';
import { setPlaylist, play as playAiAudio } from '../../../../store/audioPlayerSlice';
import { play as playBrowserAudio } from '../../../../store/browserPlayerSlice';
import { setPageText } from 'store/pdfReaderSlice';

interface TextOptionProps {
  isLoading?: boolean;
}

export const TextOption: React.FC<TextOptionProps> = () => {
  const [text, setText] = useState<string>('');
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedVoice.type !== 'browser') {
      await generateAiAudio(text, selectedVoice.value);
    } else {
      dispatch(setPageText({ text }))
      dispatch(playBrowserAudio());
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        placeholder="Enter text to convert to speech..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isLoading}
      />
      <PrimaryButton type="submit" disabled={isLoading || !text}>
        {isLoading ? 'Generating Audio...' : 'Generate Audio'}
      </PrimaryButton>
    </form>
  );
};
