import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { getDocumentById } from '../../db';
import { useAppSelector } from '../../store/hooks';
import { resetAudioPlayer, setAutoPlayOnLoad as setAudioAutoPlayOnLoad } from '../../store/audioPlayerSlice';
import { resetBrowserPlayer, stop, setAutoPlayOnLoad } from '../../store/browserPlayerSlice';
import { setPdfFile, setPdfDocumentInfo, resetPdfReader, setPdfLoaded, setHasInitialPageSet } from '../../store/pdfReaderSlice';
import { Spinner } from '../components/Spinner';
import { DocumentReader } from '../components/DocumentReader';

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
      if (!id) { setError('No document ID provided.'); setIsLoading(false); return; }
      if (!logged) { setError('You must be logged in to view this document.'); setIsLoading(false); return; }

      if (id === documentId) {
        setIsLoading(false);
        if (location.state?.autoPlay) {
          dispatch(setAutoPlayOnLoad(true));
          dispatch(setAudioAutoPlayOnLoad(true));
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        dispatch(stop());
        dispatch(resetPdfReader());
        dispatch(resetAudioPlayer());
        dispatch(resetBrowserPlayer());
        if (location.state?.autoPlay) {
          dispatch(setAutoPlayOnLoad(true));
          dispatch(setAudioAutoPlayOnLoad(true));
        }
        dispatch(setPdfLoaded(false));

        const doc = await getDocumentById(id, userData.id);
        if (!doc) { setError('Document not found.'); setIsLoading(false); return; }

        const totalPages = doc.pagesContent
          ? (JSON.parse(doc.pagesContent) as unknown[]).length
          : 1;

        dispatch(setPdfFile({ id, title: doc.title, progress: doc.progress }));
        dispatch(setPdfDocumentInfo({ totalPages }));
        dispatch(setHasInitialPageSet(true));
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

  if (isLoading) return <Spinner isLoading message="Loading local document..." />;
  if (error) return <div><h2>Error</h2><p>{error}</p></div>;

  return <DocumentReader />;
};
