import s from './index.module.css';
import { useState } from 'react';
import { TextOption } from './TextOption';
import { InputTypeSelector } from '../Selectors/InputTypeSelector';
import { ImportOption } from './ImportOption';
import { useDispatch } from 'react-redux';
import { resetDocumentState } from 'store/documentSlice';

export const Start = () => {
  const [inputType, setInputType] = useState('text');
  const dispatch = useDispatch();

  const handeInputTypeChange = (type: string) => {
    setInputType(type);
    dispatch((resetDocumentState()));
  };

  const getSubtitle = () => {
    switch (inputType) {
      case 'upload':
        return "Get started by importing a new Document";
      case 'text':
        return "Write some magic words";

      default: return;
    }
  };

  return (
    <div className={s.container}>
      <div className={s.createContainer}>
        <h1 className="featured">Cast a spell</h1>
        <p>{getSubtitle()}</p>

        <InputTypeSelector inputType={inputType} setInputType={handeInputTypeChange} />

        <div className={s.optionContainer}>
          {inputType === 'upload' && <ImportOption />}
          {inputType === 'text' && <TextOption />}
        </div>

      </div >
    </div >
  );
};