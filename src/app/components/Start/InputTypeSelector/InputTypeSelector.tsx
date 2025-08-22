import s from './InputTypeSelector.module.css';
import React from 'react';

interface InputTypeSelectorProps {
  inputType: string;
  setInputType: (type: string) => void;
}

export const InputTypeSelector: React.FC<InputTypeSelectorProps> = ({
  inputType,
  setInputType,
}) => {
  return (
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
  );
};
