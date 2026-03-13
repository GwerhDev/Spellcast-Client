import s from './index.module.css';
import React, { useState, useEffect } from 'react';
import { SimpleEditor } from '../../Tiptap/components/tiptap-templates/simple/simple-editor';
import { JSONContent } from '@tiptap/core';

interface EditPageModalProps {
  pageNumber: number;
  pageContent: JSONContent;
  title: string;
  onPageContentChange: (newContent: JSONContent) => void;
}

export const DocumentEditor: React.FC<EditPageModalProps> = ({
  pageNumber,
  pageContent,
  title,
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
    <div className={s.container}>
      <h2 className={s.title}>{title}</h2>
      <SimpleEditor isEditable content={text} onContentChange={handleContentChange} />
    </div>
  );
};