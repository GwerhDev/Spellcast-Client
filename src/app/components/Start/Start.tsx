import s from './Start.module.css';
import { useState } from 'react';
import { TextOption } from './TextOption';
import { InputTypeSelector } from '../Selectors/InputTypeSelector';
import { CreateOption } from './CreateOption';
import { UploadOption } from './UploadOption';

export const Start = () => {
  const [inputType, setInputType] = useState('upload');

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

        <InputTypeSelector inputType={inputType} setInputType={setInputType} />

        {inputType === 'create' && <CreateOption />}

        {inputType === 'text' && <TextOption />}

        {inputType === 'upload' && <UploadOption />}

      </div >
    </div >
  );
};