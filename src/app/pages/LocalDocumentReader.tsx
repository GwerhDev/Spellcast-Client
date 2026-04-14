import * as pdfjsLib from 'pdfjs-dist';
import React, { useEffect, useState } from 'react';
import { JSONContent } from '@tiptap/core';
import { useParams, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { getDocumentById } from '../../db';
import { useAppSelector } from '../../store/hooks';
import { resetAudioPlayer } from '../../store/audioPlayerSlice';
import { resetBrowserPlayer, stop, setAutoPlayOnLoad } from '../../store/browserPlayerSlice';
import { setPdfFile, setPdfDocumentInfo, resetPdfReader, setPdfLoaded, setHasInitialPageSet, setPagesCache } from '../../store/pdfReaderSlice';
import { Spinner } from '../components/Spinner';
import { DocumentReader } from '../components/DocumentReader';

// The workerSrc import is important for pdfjs-dist to work
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;



export const LocalDocumentReader: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { userData, logged } = useAppSelector((state) => state.session);
  const { documentId } = useAppSelector((state) => state.pdfReader);

  useEffect(() => {
    const loadDocument = async () => {
      if (!id) {
        setError('No document ID provided.');
        setIsLoading(false);
        return;
      }

      if (!logged) {
        setError('You must be logged in to view this document.');
        setIsLoading(false);
        return;
      }

      if (id === documentId) {
        setIsLoading(false);
        if (location.state?.autoPlay) dispatch(setAutoPlayOnLoad(true));
        return;
      }

      try {
        dispatch(stop()); // Stop browser TTS playback
        dispatch(resetPdfReader());
        dispatch(resetAudioPlayer()); // Stop audio playback
        dispatch(resetBrowserPlayer());
        if (location.state?.autoPlay) dispatch(setAutoPlayOnLoad(true));
        dispatch(setPdfLoaded(false)); // Set isLoaded to false at the start of loading
        const doc = await getDocumentById(id, userData.id);
        if (!doc) {
          setError('Document not found.');
          setIsLoading(false);
          return;
        }
        
        dispatch(setPdfFile({ id, title: doc.title, progress: doc.progress }));

        if (doc.pagesContent) {
          try {
            const pages: JSONContent[] = JSON.parse(doc.pagesContent);
            const pagesCache: { [pageNumber: number]: string } = {};
            pages.forEach((page, index) => {
              pagesCache[index + 1] = JSON.stringify(page);
            });
            dispatch(setPagesCache(pagesCache));
          } catch {
            // ignore parse errors, PdfProcessor will extract from PDF
          }
        }

        const pdfData = await doc.pdf.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

        dispatch(setPdfDocumentInfo({ totalPages: pdf.numPages }));

        dispatch(setHasInitialPageSet(true)); // Set flag after initial page is determined
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load local document:', err);
        setError('Failed to load document.');
        setIsLoading(false);
      }
    };

    loadDocument();
    //eslint-disable-next-line
  }, [id, dispatch, documentId, logged, userData.id]);

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
