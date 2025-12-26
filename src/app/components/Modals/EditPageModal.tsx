import React, { useState, useEffect } from 'react';
import s from './EditPageModal.module.css';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { CustomModal } from './CustomModal';
import { faSave } from '@fortawesome/free-solid-svg-icons';

interface EditPageModalProps {
  show: boolean;
  onClose: () => void;
  pageNumber: number;
  pageText: string;
  onSave: (pageNumber: number, newText: string) => void;
}

export const EditPageModal: React.FC<EditPageModalProps> = ({
  show,
  onClose,
  pageNumber,
  pageText,
  onSave,
}) => {
  const [text, setText] = useState(pageText);

  useEffect(() => {
    setText(pageText);
  }, [pageText, pageNumber]);

  const handleSave = () => {
    onSave(pageNumber - 1, text);
    onClose();
  };

  return (
    <CustomModal show={show} onClose={onClose} title={`Editing Page ${pageNumber}`}>
      <div className={s.content}>
        <textarea
          className={s.textArea}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className={s.actions}>
          <PrimaryButton icon={faSave} onClick={handleSave}>Save</PrimaryButton>
        </div>
      </div>
    </CustomModal>
  );
};
