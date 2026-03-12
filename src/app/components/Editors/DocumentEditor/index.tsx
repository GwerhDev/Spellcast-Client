import s from './index.module.css';
import React, { useState, useEffect } from 'react';
import { SimpleEditor } from '../../Tiptap/components/tiptap-templates/simple/simple-editor';
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
  pageNumber: number;
  pageText: string;
  title: string;
}

export const DocumentEditor: React.FC<EditPageModalProps> = ({
  pageNumber,
  pageText,
  title,
}) => {
  const [text, setText] = useState<JSONContent>(safeParseJSON(pageText));

  useEffect(() => {
    setText(safeParseJSON(pageText));
  }, [pageText, pageNumber]);

  const handleContentChange = (newContent: JSONContent) => {
    setText(newContent);
  };

  return (
    <div className={s.container}>
      <h2 className={s.title}>{title}</h2>
      <SimpleEditor isEditable content={text} onContentChange={handleContentChange} />
    </div>
  );
};