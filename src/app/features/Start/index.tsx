import s from '../../components/Start/index.module.css';
import { useState } from 'react';
import { TextOption } from './TextOption';
import { InputTypeSelector } from '../../components/Selectors/InputTypeSelector';
import { ImportOption } from './ImportOption';
import { useDispatch } from 'react-redux';
import { resetDocumentState } from '../../../store/documentSlice';
import { useLanguage } from '../../../i18n';

export const Start = () => {
  const [inputType, setInputType] = useState('text');
  const dispatch = useDispatch();
  const { t } = useLanguage();

  const handleInputTypeChange = (type: string) => {
    setInputType(type);
    dispatch(resetDocumentState());
  };

  const getSubtitle = () => {
    switch (inputType) {
      case 'import': return t.start.importSubtitle;
      case 'text':   return t.start.textSubtitle;
      default:       return;
    }
  };

  return (
    <div data-testid="start" className={s.container}>
      <div className={s.createContainer}>
        <h1 className="featured-glow">{t.start.castSpell}</h1>
        <p>{getSubtitle()}</p>

        <InputTypeSelector inputType={inputType} setInputType={handleInputTypeChange} />

        <div className={s.optionContainer}>
          {inputType === 'import' && <ImportOption />}
          {inputType === 'text' && <TextOption />}
        </div>
      </div>
    </div>
  );
};
