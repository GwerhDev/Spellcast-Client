import s from './index.module.css';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAppSelector } from '../../../store/hooks';
import { RootState } from 'store';
import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import { Spinner } from '../Spinner';
import { PageList } from './PageList';
import { DocumentEditor } from '../Editors/DocumentEditor';
import jsPDF from 'jspdf';
import { saveDocumentToDB } from '../../../db';
import { useNavigate } from 'react-router-dom';
import { JSONContent } from '@tiptap/core';
// The workerSrc import is important for pdfjs-dist to work
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import { faCloud, faSave } from '@fortawesome/free-solid-svg-icons';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { resetDocumentState } from 'store/documentSlice';
import { resetPdfReader } from 'store/pdfReaderSlice';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const emptyContent: JSONContent = {
  type: 'doc',
  content: [{
    type: 'paragraph',
  }]
};

export const DocumentCreateForm: React.FC = () => {
  const { fileContent, title } = useSelector((state: RootState) => state.document);
  const { userData, logged } = useAppSelector((state: RootState) => state.session);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [documentTitle, setDocumentTitle] = useState(title || '');
  const [pagesContent, setPagesContent] = useState<JSONContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPageIndex, setEditingPageIndex] = useState<number>(0);

  useEffect(() => {
    if (title) {
      setDocumentTitle(title);
    }
  }, [title]);

  useEffect(() => {
    const extractTextFromPdf = async () => {
      if (!fileContent) {
        setPagesContent([emptyContent]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const pdfData = atob(fileContent.substring(fileContent.indexOf(',') + 1));
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const numPages = pdf.numPages;

        const allPagesContent: JSONContent[] = [];
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const text = content.items.map((item: TextItem | TextMarkedContent) => ('str' in item ? item.str : '')).join(' ').replace(/\s+/g, ' ').trim();

          if (text) {
            allPagesContent.push({
              type: 'doc',
              content: [{
                type: 'paragraph',
                content: [{
                  type: 'text',
                  text: text,
                }]
              }]
            });
          } else {
            allPagesContent.push(emptyContent);
          }
        }
        setPagesContent(allPagesContent);
      } catch (error) {
        console.error('Failed to extract text from PDF:', error);
      } finally {
        setIsLoading(false);
      }
    };

    extractTextFromPdf();
  }, [fileContent]);

  const handlePageClick = (pageIndex: number) => {
    setEditingPageIndex(pageIndex);
  };

  const handlePageDelete = (pageIndex: number) => {
    setPagesContent(pagesContent.filter((_, index) => index !== pageIndex));
  };

  const handleAddPage = () => {
    setPagesContent([...pagesContent, emptyContent]);
  };

  const handlePageContentChange = (newContent: JSONContent) => {
    const updatedPagesContent = [...pagesContent];
    updatedPagesContent[editingPageIndex] = newContent;
    setPagesContent(updatedPagesContent);
  };

  const handleSaveLocal = async () => {
    if (!documentTitle || pagesContent.length === 0) {
      alert('Please provide a title and have at least one page of content.');
      return;
    }

    if (!logged) {
      alert('You must be logged in to save a document.');
      return;
    }

    setIsSaving(true);
    try {
      const pdf = new jsPDF();
      const margin = 1;
      const startY = 1;
      const lineHeight = 1;

      pagesContent.forEach((pageContent, index) => {
        if (index > 0) {
          pdf.addPage();
        }
        
        const plainText = pageContent.content?.map(node => {
          if (node.type === 'paragraph' && node.content) {
            return node.content.map(item => 'text' in item ? item.text : '').join('');
          }
          return '';
        }).join('\n') || '';

        const lines = pdf.splitTextToSize(plainText, pdf.internal.pageSize.width - margin * 2);
        
        let y = startY;
        const pageHeight = pdf.internal.pageSize.height;

        for (const line of lines) {
          if (y + lineHeight > pageHeight - margin) {
            pdf.addPage();
            y = startY;
          }
          pdf.text(line, margin, y);
          y += lineHeight;
        }
      });

      const pdfBlob = pdf.output('blob');

      const newId = await saveDocumentToDB({
        title: documentTitle,
        pdf: pdfBlob,
        userId: userData.id,
      });

      dispatch(resetPdfReader());
      dispatch(resetDocumentState());
      navigate(`/document/local/${newId}`);

    } catch (error) {
      console.error('Failed to save document locally:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Spinner isLoading />;
  }

  return (
    <div className={s.container}>
      <div className={s.titleGroup}>
        <h1 className={s.mainTitle}>Create Document</h1>
      </div>

      <div className={s.editorContainer}>
        <DocumentEditor
          title={documentTitle}
          pageNumber={editingPageIndex + 1}
          pageContent={pagesContent[editingPageIndex]}
          onPageContentChange={handlePageContentChange}
        />

        <div className={s.pagesContainer}>
          <PageList
            pages={pagesContent.map(() => '')} // PageList still expects string[], so we map to empty strings
            currentPage={editingPageIndex}
            onPageClick={handlePageClick}
            onPageDelete={handlePageDelete}
            onAddPage={handleAddPage}
          />
        </div>
      </div>
      <div className={s.actions}>
        <PrimaryButton type="button" icon={faSave} className={s.saveButtonCloud} onClick={handleSaveLocal} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Local'}
        </PrimaryButton>
        <PrimaryButton type="button" icon={faCloud} className={s.saveButtonCloud} disabled>
          Save Cloud
        </PrimaryButton>
      </div>
    </div>
  );
};
