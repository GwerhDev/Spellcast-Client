import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import s from './DocumentCreate.module.css';
import { Spinner } from '../components/Spinner';

// The workerSrc import is important for pdfjs-dist to work
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export const DocumentCreate: React.FC = () => {
  const { fileContent, title, totalPages } = useSelector((state: RootState) => state.document);
  const [documentTitle, setDocumentTitle] = useState(title || '');
  const [pagesText, setPagesText] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (title) {
      setDocumentTitle(title);
    }
  }, [title]);

  useEffect(() => {
    const extractTextFromPdf = async () => {
      if (!fileContent) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const pdfData = atob(fileContent.substring(fileContent.indexOf(',') + 1));
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const numPages = pdf.numPages;

        const allPagesText: string[] = [];
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const text = content.items.map((item: TextItem | TextMarkedContent) => ('str' in item ? item.str : '')).join(' ');
          allPagesText.push(text.replace(/\s+/g, ' ').trim());
        }
        setPagesText(allPagesText);
      } catch (error) {
        console.error('Failed to extract text from PDF:', error);
      } finally {
        setIsLoading(false);
      }
    };

    extractTextFromPdf();
  }, [fileContent]);

  const handlePageTextChange = (index: number, newText: string) => {
    const updatedPagesText = [...pagesText];
    updatedPagesText[index] = newText;
    setPagesText(updatedPagesText);
  };

  if (isLoading) {
    return <Spinner />;
  }

  if (!fileContent) {
    return (
      <div className={s.container}>
        <h2>No document loaded</h2>
        <p>Please go back and upload a PDF file to begin.</p>
      </div>
    );
  }

  return (
    <div className={s.container}>
      <h1 className={s.mainTitle}>Create Document</h1>
      <form className={s.form}>
        <div className={s.titleGroup}>
          <label htmlFor="document-title" className={s.titleLabel}>Title</label>
          <input
            id="document-title"
            type="text"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            className={s.titleInput}
          />
        </div>

        <div className={s.pagesContainer}>
          <h2 className={s.pagesTitle}>Pages ({totalPages})</h2>
          {pagesText.map((text, index) => (
            <div key={index} className={s.pageEditor}>
              <label htmlFor={`page-${index + 1}`} className={s.pageLabel}>Page {index + 1}</label>
              <textarea
                id={`page-${index + 1}`}
                value={text}
                onChange={(e) => handlePageTextChange(index, e.target.value)}
                className={s.pageTextarea}
              />
            </div>
          ))}
        </div>

        <div className={s.actions}>
          <button type="button" className={s.saveButton}>
            Guardar en local
          </button>
          <button type="button" className={s.saveButtonCloud} disabled>
            Guardar en la nube
          </button>
        </div>
      </form>
    </div>
  );
};