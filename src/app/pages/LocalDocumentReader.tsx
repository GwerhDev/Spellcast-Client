import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { getDocumentById } from '../../db';
import { setPdfFile, setPdfDocumentInfo, setPageText } from '../../store/pdfReaderSlice';
import { Spinner } from '../components/Spinner';
import { DocumentReader } from '../components/DocumentReader';
import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';

// The workerSrc import is important for pdfjs-dist to work
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const LocalDocumentReader: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDocument = async () => {
      if (!id) {
        setError('No document ID provided.');
        setIsLoading(false);
        return;
      }

      try {
        const doc = await getDocumentById(id);
        if (!doc) {
          setError('Document not found.');
          setIsLoading(false);
          return;
        }

        const pdfAsBase64 = await blobToBase64(doc.pdf);
        dispatch(setPdfFile(pdfAsBase64));

        const pdfData = await doc.pdf.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        
        dispatch(setPdfDocumentInfo({ totalPages: pdf.numPages }));

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const text = content.items.map((item: TextItem | TextMarkedContent) => ('str' in item ? item.str : '')).join(' ');
          dispatch(setPageText({ pageNumber: i, text: text.replace(/\s+/g, ' ').trim() }));
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load local document:', err);
        setError('Failed to load document.');
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [id, dispatch]);

  if (isLoading) {
    return <Spinner isLoading message="Loading local document..." />;
  }

  if (error) {
    return (
      <div>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return <DocumentReader />;
};
