import s from './InputTypeSelector.module.css';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faUpload } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../../i18n';

interface InputTypeSelectorProps {
  inputType: string;
  setInputType: (type: string) => void;
}

export const InputTypeSelector: React.FC<InputTypeSelectorProps> = ({ inputType, setInputType, }) => {
  const { t } = useLanguage();
  return (
    <div className={s.container}>
      <span className={s.buttonsContainer}>
        <button
          className={`${s.tabButton} ${s.left} ${inputType === 'text' ? s.active : ''}`}
          onClick={() => setInputType('text')}
        >
          <FontAwesomeIcon icon={faPen} />
          <span className={s.title}>{t.start.textTab}</span>
        </button>
        <button
          className={`${s.tabButton} ${s.right} ${inputType === 'import' ? s.active : ''}`}
          onClick={() => setInputType('import')}
        >
          <FontAwesomeIcon icon={faUpload} />
          <span className={s.title}>{t.start.importTab}</span>
        </button>
      </span>
    </div>
  );
};
