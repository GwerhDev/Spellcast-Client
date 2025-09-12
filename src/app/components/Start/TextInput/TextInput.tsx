import React from 'react';

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
      placeholder="Enter text to convert to speech..."
      value={text}
      onChange={(e) => setText(e.target.value)}
      disabled={isLoading}
    />
  );
};
