import React from 'react';
import s from './TextInput.module.css';

interface TextInputProps {
  text: string;
  setText: (text: string) => void;
  isLoading: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({
  text,
  setText,
  isLoading,
}) => {
  return (
    <textarea
      className={s.textarea}
      placeholder="Enter text to convert to speech..."
      value={text}
      onChange={(e) => setText(e.target.value)}
      disabled={isLoading}
    />
  );
};
