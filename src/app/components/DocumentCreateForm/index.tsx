import s from './index.module.css';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store';
import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import { Spinner } from '../Spinner';
import { PageList } from './PageList';
import { EditPageModal } from '../Modals/EditPageModal';
import jsPDF from 'jspdf';
import { saveDocumentToDB } from '../../../db';
import { useNavigate } from 'react-router-dom';

// The workerSrc import is important for pdfjs-dist to work
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import { LabeledInput } from '../Inputs/LabeledInput';
import { faCloud, faSave } from '@fortawesome/free-solid-svg-icons';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { resetDocumentState } from 'store/documentSlice';
import { resetPdfState } from 'store/pdfReaderSlice';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export const DocumentCreateForm: React.FC = () => {
  const { fileContent, title } = useSelector((state: RootState) => state.document);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [documentTitle, setDocumentTitle] = useState(title || '');
  const [pagesText, setPagesText] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPageIndex, setEditingPageIndex] = useState<number | null>(null);

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

  const handlePageClick = (pageIndex: number) => {
    setEditingPageIndex(pageIndex);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPageIndex(null);
  };

  const handleSavePage = (pageIndex: number, newText: string) => {
    const updatedPagesText = [...pagesText];
    updatedPagesText[pageIndex] = newText;
    setPagesText(updatedPagesText);
  };

  const handleSaveLocal = async () => {
    if (!documentTitle || pagesText.length === 0) {
      alert('Please provide a title and have at least one page of content.');
      return;
    }

    setIsSaving(true);
    try {
      const pdf = new jsPDF();
      pdf.text(documentTitle, 10, 10);

      pagesText.forEach((pageText, index) => {
        if (index > 0) {
          pdf.addPage();
        }
        // Split text into lines that fit the page width.
        const lines = pdf.splitTextToSize(pageText, 180);
        pdf.text(lines, 10, 20);
      });

      const pdfBlob = pdf.output('blob');

      const newId = await saveDocumentToDB({
        title: documentTitle,
        pdf: pdfBlob,
      });

      dispatch(resetPdfState());
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
      <div className={s.titleGroup}>
        <h1 className={s.mainTitle}>Create Document</h1>
        <LabeledInput
          onChange={(e) => setDocumentTitle(e.target.value)}
          id="document-title"
          name="document-title"
          htmlFor="document-title"
          label="Document title" value={documentTitle}
        />
      </div>
      <h2 className={s.pagesTitle}>Pages ({pagesText.length})</h2>
      <div className={s.pagesContainer}>
        <PageList pages={pagesText} onPageClick={handlePageClick} />
      </div>
      <div className={s.actions}>
        <PrimaryButton type="button" icon={faSave} className={s.saveButtonCloud} onClick={handleSaveLocal} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Local'}
        </PrimaryButton>
        <PrimaryButton type="button" icon={faCloud} className={s.saveButtonCloud} disabled>
          Save Cloud
        </PrimaryButton>
      </div>

      {editingPageIndex !== null && (
        <EditPageModal
          show={isModalOpen}
          onClose={handleCloseModal}
          pageNumber={editingPageIndex + 1}
          pageText={pagesText[editingPageIndex]}
          onSave={handleSavePage}
        />
      )}
    </div>
  );
};
