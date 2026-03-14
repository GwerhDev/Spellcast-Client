import s from './index.module.css';
import { useState } from 'react';
import { TextOption } from './TextOption';
import { InputTypeSelector } from '../Selectors/InputTypeSelector';
import { CreateOption } from './CreateOption';
import { UploadOption } from './UploadOption';
import { useDispatch } from 'react-redux';
import { resetDocumentState } from 'store/documentSlice';

export const Start = () => {
  const [inputType, setInputType] = useState('upload');
  const dispatch = useDispatch();

  const handeInputTypeChange = (type: string) => {
    setInputType(type);
    dispatch((resetDocumentState()));
  };

  const getSubtitle = () => {
    switch (inputType) {
      case 'create':
        return "Get started by creating a new Document";
      case 'upload':
        return "Get started by uploading a new Document";
      case 'text':
        return "Write some magic words";

      default: return;
    }
  };

  return (
    <div className={s.container}>
      <div className={s.createContainer}>
        <h1>Cast a spell</h1>
        <p>{getSubtitle()}</p>

        <InputTypeSelector inputType={inputType} setInputType={handeInputTypeChange} />

        {inputType === 'upload' && <UploadOption />}
        {inputType === 'create' && <CreateOption />}
        {inputType === 'text' && <TextOption />}

      </div >
    </div >
  );
};