import React, { useState, useEffect } from 'react';
import s from './EditPageModal.module.css';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { CustomModal } from './CustomModal';
import { faSave } from '@fortawesome/free-solid-svg-icons';
import { SimpleEditor } from '../Tiptap/components/tiptap-templates/simple/simple-editor';
import { JSONContent } from '@tiptap/core';

const emptyContent: JSONContent = {
  type: 'doc',
  content: [{
    type: 'paragraph',
  }]
};

const safeParseJSON = (str: string): JSONContent => {
  if (!str) {
    return emptyContent;
  }
  try {
    const parsed = JSON.parse(str);
    return parsed;
  } catch {
    return {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'text',
          text: str,
        }]
      }]
    };
  }
};

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
  const [text, setText] = useState<JSONContent>(safeParseJSON(pageText));

  useEffect(() => {
    setText(safeParseJSON(pageText));
  }, [pageText, pageNumber]);

  const handleSave = () => {
    onSave(pageNumber - 1, JSON.stringify(text));
    onClose();
  };

  const handleContentChange = (newContent: JSONContent) => {
    setText(newContent);
  };

  return (
    <CustomModal show={show} onClose={onClose} title={`Editing Page ${pageNumber}`}>
      <SimpleEditor isEditable={true} content={text} onContentChange={handleContentChange} />
      <div className={s.actions}>
        <PrimaryButton icon={faSave} onClick={handleSave}>Save</PrimaryButton>
      </div>
    </CustomModal>
  );
};