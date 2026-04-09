import s from './index.module.css';
import React, { useState, useEffect } from 'react';
import { SimpleEditor } from '../../Tiptap/components/tiptap-templates/simple/simple-editor';
import { JSONContent } from '@tiptap/core';

interface EditPageModalProps {
  pageNumber: number;
  pageContent: JSONContent;
  onPageContentChange: (newContent: JSONContent) => void;
}

export const DocumentEditor: React.FC<EditPageModalProps> = ({
  pageNumber,
  pageContent,
  onPageContentChange,
}) => {
  const [text, setText] = useState<JSONContent>(pageContent);

  useEffect(() => {
    setText(pageContent);
  }, [pageContent, pageNumber]);

  const handleContentChange = (newContent: JSONContent) => {
    setText(newContent);
    onPageContentChange(newContent);
  };

  return (
    <SimpleEditor
      isEditable
      content={text}
      onContentChange={handleContentChange}
      wrapContent={(content) => (
        <div className={s.paperBackground}>
          <div className={s.paperSheet}>
            {content}
          </div>
        </div>
      )}
    />
  );
};
