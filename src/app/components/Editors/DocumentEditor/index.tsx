import s from './index.module.css';
import React, { useState, useEffect } from 'react';
import { SimpleEditor } from '../../Tiptap/components/tiptap-templates/simple/simple-editor';
import { JSONContent } from '@tiptap/core';
import { useDispatch } from 'react-redux';
import { setDocumentTitle } from 'store/documentSlice';
import { DocumentState } from 'src/interfaces';

interface EditPageModalProps {
  pageNumber: number;
  pageContent: JSONContent;
  document: DocumentState;
  onPageContentChange: (newContent: JSONContent) => void;
}

export const DocumentEditor: React.FC<EditPageModalProps> = ({
  pageNumber,
  pageContent,
  document,
  onPageContentChange,
}) => {
  const [text, setText] = useState<JSONContent>(pageContent);
  const [editTitle, setEditTitle] = useState<boolean>(false);
  const dispatch = useDispatch();

  useEffect(() => {
    setText(pageContent);
  }, [pageContent, pageNumber]);

  const handleContentChange = (newContent: JSONContent) => {
    setText(newContent);
    onPageContentChange(newContent);
  };

  return (
    <div className={s.container}>
      <input placeholder={"Please, provide a Title for your Document"} readOnly={document.title.length > 0 && !editTitle} className={s.title} onClick={() => setEditTitle(true)} value={document.title} onChange={(e) => dispatch(setDocumentTitle(e.target.value))} type="text" />
      <SimpleEditor isEditable content={text} onContentChange={handleContentChange} />
    </div>
  );
};