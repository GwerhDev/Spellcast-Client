import s from './index.module.css';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../../store/hooks';
import { getDocumentById } from '../../../db';
import { setAutoPlayOnLoad } from '../../../store/browserPlayerSlice';
import { Spinner } from '../Spinner';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { IconButton } from '../Buttons/IconButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faPlay, faBookOpen, faPen, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

export const DocumentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData, logged } = useAppSelector((state) => state.session);
  const [doc, setDoc] = useState<Awaited<ReturnType<typeof getDocumentById>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id || !logged) { setIsLoading(false); return; }
      try {
        const document = await getDocumentById(id, userData.id);
        if (!document) { setError('Document not found.'); setIsLoading(false); return; }
        setDoc(document);
      } catch {
        setError('Failed to load document.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, logged, userData.id]);

  const handlePlay = () => {
    dispatch(setAutoPlayOnLoad(true));
    navigate(`/document/${id}/reader`);
  };

  const handleContinueReading = () => navigate(`/document/${id}/reader`);
  const handleEdit = () => navigate(`/document/${id}/edit`);

  if (isLoading) return <Spinner isLoading />;
  if (error || !doc) return <div>{error || 'Document not found.'}</div>;

  const pagesCount = doc.pagesContent ? JSON.parse(doc.pagesContent).length : null;
  const currentPage = doc.progress?.currentPage;

  return (
    <div className={s.container}>
      <div className={s.pageInfoContainer}>
        <IconButton className={s.backButton} icon={faArrowLeft} variant="transparent" onClick={() => navigate("/")} />
      </div>
      <div className={s.detailsContainer}>
        <div className={s.header}>
          <FontAwesomeIcon icon={faFilePdf} size="4x" className={s.icon} />
          <div className={s.info}>
            <h1 className={s.title}>{doc.title}</h1>
            <p className={s.meta}>Created {new Date(doc.createdAt).toLocaleDateString()}</p>
            {pagesCount && <p className={s.meta}>{pagesCount} {pagesCount === 1 ? 'page' : 'pages'}</p>}
            {currentPage != null && currentPage > 0 && <p className={s.meta}>Last read: page {currentPage}</p>}
          </div>
        </div>
        <div className={s.actions}>
          <PrimaryButton icon={faPlay} onClick={handlePlay}>Play</PrimaryButton>
          <PrimaryButton icon={faBookOpen} onClick={handleContinueReading}>Continue Reading</PrimaryButton>
          <PrimaryButton icon={faPen} onClick={handleEdit}>Edit Document</PrimaryButton>
        </div>
      </div>
    </div>
  );
};
