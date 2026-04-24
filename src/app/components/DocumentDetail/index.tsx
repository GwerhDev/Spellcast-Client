import s from './index.module.css';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../../store/hooks';
import { getDocumentById, deleteDocumentFromDB } from '../../../db';
import { setAutoPlayOnLoad, resetBrowserPlayer } from '../../../store/browserPlayerSlice';
import { setAutoPlayOnLoad as setAudioAutoPlayOnLoad } from '../../../store/audioPlayerSlice';
import { resetPdfReader } from '../../../store/pdfReaderSlice';
import { Spinner } from '../Spinner';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { SecondaryButton } from '../Buttons/SecondaryButton';
import { IconButton } from '../Buttons/IconButton';
import { DeleteConfirmModal } from '../Modals/DeleteConfirmModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faPlay, faBookOpen, faPen, faArrowLeft, faTrash } from '@fortawesome/free-solid-svg-icons';

export const DocumentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData, logged } = useAppSelector((state) => state.session);
  const currentPlayingId = useAppSelector((state) => state.pdfReader.documentId);
  const [doc, setDoc] = useState<Awaited<ReturnType<typeof getDocumentById>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
    dispatch(setAudioAutoPlayOnLoad(true));
    navigate(`/document/${id}/reader`);
  };

  const handleContinueReading = () => navigate(`/document/${id}/reader`);
  const handleEdit = () => navigate(`/document/${id}/edit`);

  const handleDeleteConfirm = async () => {
    if (!id || !userData?.id) return;
    try {
      await deleteDocumentFromDB(id, userData.id);
      if (currentPlayingId === id) {
        dispatch(resetBrowserPlayer());
        dispatch(resetPdfReader());
      }
      navigate('/');
    } catch {
      setError('Failed to delete document.');
    } finally {
      setShowDeleteModal(false);
    }
  };

  if (isLoading) return <div className={s.container}><Spinner isLoading message="Loading..." /></div>;
  if (error || !doc) return <div>{error || 'Document not found.'}</div>;

  const pagesCount = doc.pagesContent ? JSON.parse(doc.pagesContent).length : null;
  const currentPage = doc.progress?.currentPage ?? 0;
  const progressPct = (pagesCount && currentPage > 0)
    ? Math.min(Math.round(currentPage / pagesCount * 100), 100)
    : null;

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
            {progressPct !== null && (
              <div className={s.progressBarContainer}>
                <div className={s.progressBarFill} style={{ width: `${progressPct}%` }} />
              </div>
            )}
            {currentPage > 0 && (
              <p className={s.meta}>
                Page {currentPage}{pagesCount ? ` of ${pagesCount}` : ''} — {progressPct}% complete
              </p>
            )}
          </div>
        </div>
        <div className={s.actions}>
          <PrimaryButton icon={faPlay} onClick={handlePlay}>Play</PrimaryButton>
          <SecondaryButton className={s.solid} icon={faBookOpen} onClick={handleContinueReading}>Continue Reading</SecondaryButton>
          <SecondaryButton className={s.solid} icon={faPen} onClick={handleEdit}>Edit Document</SecondaryButton>
          <PrimaryButton variant="danger" icon={faTrash} onClick={() => setShowDeleteModal(true)}>Delete</PrimaryButton>
        </div>
      </div>
      <DeleteConfirmModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Document"
        message={`Are you sure you want to delete "${doc.title}"? This action cannot be undone.`}
      />
    </div>
  );
};
