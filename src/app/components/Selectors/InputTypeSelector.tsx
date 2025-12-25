import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import s from './InputTypeSelector.module.css';
import React from 'react';
import { faFileCirclePlus, faUpload } from '@fortawesome/free-solid-svg-icons';

interface InputTypeSelectorProps {
  inputType: string;
  setInputType: (type: string) => void;
}

export const InputTypeSelector: React.FC<InputTypeSelectorProps> = ({ inputType, setInputType, }) => {
  return (
    <div className={s.container}>
      <span className={s.buttonsContainer}>
        <button
          className={`${s.tabButton} ${s.left} ${inputType === 'upload' ? s.active : ''}`}
          onClick={() => setInputType('upload')}
        >
          <FontAwesomeIcon icon={faUpload} />
          <span className={s.title}>Upload</span>
        </button>
        <button
          className={`${s.tabButton} ${s.middle} ${inputType === 'create' ? s.active : ''}`}
          onClick={() => setInputType('create')}
        >
          <FontAwesomeIcon icon={faFileCirclePlus} />
          <span className={s.title}>Create</span>
        </button>
        <button
          className={`${s.tabButton} ${s.right} ${inputType === 'text' ? s.active : ''}`}
          onClick={() => setInputType('text')}
        >
          <FontAwesomeIcon icon={faUpload} />
          <span className={s.title}>Text</span>
        </button>
      </span>
    </div>
  );
};
