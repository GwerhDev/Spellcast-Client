import * as pdfjsLib from 'pdfjs-dist';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { getDocumentById, getDocumentProgress } from '../../db';
import { useAppSelector } from '../../store/hooks';
import { resetAudioPlayer } from '../../store/audioPlayerSlice';
import { resetBrowserPlayer, stop } from '../../store/browserPlayerSlice';
import { setPdfFile, setPdfDocumentInfo, resetPdfReader, goToPage, setPdfLoaded, setHasInitialPageSet } from '../../store/pdfReaderSlice';
import { Spinner } from '../components/Spinner';
import { DocumentReader } from '../components/DocumentReader';

// The workerSrc import is important for pdfjs-dist to work
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export const LocalDocumentReader: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { documentId } = useAppSelector((state) => state.pdfReader);

  useEffect(() => {
    const loadDocument = async () => {
      if (!id) {
        setError('No document ID provided.');
        setIsLoading(false);
        return;
      }

      if (id === documentId) {
        setIsLoading(false);
        return;
      }

      try {
        dispatch(stop()); // Stop browser TTS playback
        dispatch(resetPdfReader());
        dispatch(resetAudioPlayer()); // Stop audio playback
        dispatch(resetBrowserPlayer());
        dispatch(setPdfLoaded(false)); // Set isLoaded to false at the start of loading
        const doc = await getDocumentById(id);
        if (!doc) {
          setError('Document not found.');
          setIsLoading(false);
          return;
        }

        const progress = await getDocumentProgress(id);

        dispatch(setPdfFile({ id, title: doc.title }));

        const pdfData = await doc.pdf.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

        dispatch(setPdfDocumentInfo({ totalPages: pdf.numPages }));

        if (progress) {
          dispatch(goToPage(progress.currentPage));
        }
        dispatch(setHasInitialPageSet(true)); // Set flag after initial page is determined
        dispatch(setPdfLoaded(true)); // Set isLoaded to true after all pages are processed
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load local document:', err);
        setError('Failed to load document.');
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [id, dispatch, documentId]);

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
