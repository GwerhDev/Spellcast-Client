import s from './InputTypeSelector.module.css';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faPaperclip } from '@fortawesome/free-solid-svg-icons';

interface InputTypeSelectorProps {
  inputType: string;
  setInputType: (type: string) => void;
}

export const InputTypeSelector: React.FC<InputTypeSelectorProps> = ({ inputType, setInputType, }) => {
  return (
    <div className={s.container}>
      <span className={s.buttonsContainer}>
        <button
          className={`${s.tabButton} ${s.left} ${inputType === 'text' ? s.active : ''}`}
          onClick={() => setInputType('text')}
        >
          <FontAwesomeIcon icon={faPen} />
          <span className={s.title}>Text</span>
        </button>
        <button
          className={`${s.tabButton} ${s.right} ${inputType === 'upload' ? s.active : ''}`}
          onClick={() => setInputType('upload')}
        >
          <FontAwesomeIcon icon={faPaperclip} />
          <span className={s.title}>Import</span>
        </button>
      </span>
    </div>
  );
};
