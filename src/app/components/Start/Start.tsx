import s from './Start.module.css';
import { useState } from 'react';
import { TextOption } from './TextOption';
import { InputTypeSelector } from '../Selectors/InputTypeSelector';
import { CreateOption } from './CreateOption';
import { UploadOption } from './UploadOption';

export const Start = () => {
  const [inputType, setInputType] = useState('upload');

  return (
    <div className={s.container}>
      <div className={s.createContainer}>
        <h1>Cast a spell</h1>
        <p>Get started by creating a new Audio Book</p>

        <InputTypeSelector inputType={inputType} setInputType={setInputType} />

          {inputType === 'create' && <CreateOption />}

          {inputType === 'text' && <TextOption />}

          {inputType === 'upload' && <UploadOption />}

      </div >
    </div >
  );
};