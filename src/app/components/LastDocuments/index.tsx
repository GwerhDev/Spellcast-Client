import s from './index.module.css';
import React, { useEffect, useState } from 'react';
import { getDocumentsFromDB, deleteDocumentFromDB } from '../../../db';
import { useNavigate, useLocation } from 'react-router-dom';
import { DeleteConfirmModal } from '../Modals/DeleteConfirmModal';
import { useAppSelector } from 'store/hooks';
import { Document } from 'src/interfaces';
import { DocumentCard } from '../Cards/DocumentCard';
import { useDispatch } from 'react-redux';
import { setAutoPlayOnLoad, resetBrowserPlayer, requestTogglePlay } from '../../../store/browserPlayerSlice';
import { setAutoPlayOnLoad as setAudioAutoPlayOnLoad, resetAudioPlayer } from '../../../store/audioPlayerSlice';
import { setPdfFile, setPdfDocumentInfo, resetPdfReader } from '../../../store/pdfReaderSlice';
import { useLanguage } from '../../../i18n';

export const LastDocuments: React.FC = () => {
  const { userData } = useAppSelector((state) => state.session);
  const { documentId: activeDocId, currentPage: activeCurrentPage, isLoaded: readerLoaded } = useAppSelector((state) => state.pdfReader);
  const audioPlaying = useAppSelector((state) => state.audioPlayer.isPlaying);
  const browserPlaying = useAppSelector((state) => state.browserPlayer.isPlaying);
  const { t } = useLanguage();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ id: string, title: string } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const handlePlay = (doc: Document) => {
    if (activeDocId === doc.id && readerLoaded) {
      dispatch(requestTogglePlay());
      return;
    }
    const totalPages = doc.pagesContent ? (() => { try { return JSON.parse(doc.pagesContent!).length; } catch { return 1; } })() : 1;
    dispatch(resetPdfReader());
    dispatch(resetBrowserPlayer());
    dispatch(resetAudioPlayer());
    dispatch(setAutoPlayOnLoad(true));
    dispatch(setAudioAutoPlayOnLoad(true));
    dispatch(setPdfFile({ id: doc.id, title: doc.title, progress: doc.progress }));
    dispatch(setPdfDocumentInfo({ totalPages }));
  };

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const docs = await getDocumentsFromDB(userData.id);
      setDocuments(docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('Failed to fetch local documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    //eslint-disable-next-line
  }, [userData.id]);

  useEffect(() => {
    if (!activeDocId || !activeCurrentPage) return;
    setDocuments(prev => prev.map(doc =>
      doc.id === activeDocId
        ? { ...doc, progress: { currentPage: activeCurrentPage, pagesProgress: doc.progress?.pagesProgress ?? [], lastReadSentenceIndex: doc.progress?.lastReadSentenceIndex ?? 0 } }
        : doc
    ));
  }, [activeCurrentPage, activeDocId]);

  const openDeleteModal = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDoc({ id, title });
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setSelectedDoc(null);
    setShowDeleteModal(false);
  };

  const handleDeleteConfirm = async () => {
    if (selectedDoc) {
      try {
        await deleteDocumentFromDB(selectedDoc.id, userData.id);
        fetchDocuments();
      } catch (error) {
        console.error('Failed to delete document:', error);
      } finally {
        closeDeleteModal();
      }
    }
  };

  if (isLoading) {
    return (
      <div className={s.container}>
      </div>
    );
  }

  if (documents.length === 0) {
    return null;
  }

  return (
    <>
      <div className={s.container}>
        <h2 className={s.title}>{t.nav.lastDocuments}</h2>
        <div className={s.slider}>
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              isActive={activeDocId === doc.id && (readerLoaded || audioPlaying || browserPlaying)}
              isPlaying={activeDocId === doc.id && (audioPlaying || browserPlaying)}
              onClick={() => navigate(`/document/${doc.id}`)}
              onEdit={(e) => { e.stopPropagation(); navigate(`/editor/${doc.id}`, { state: { from: location.pathname } }); }}
              onDelete={(e) => openDeleteModal(doc.id, doc.title, e)}
              onPlay={() => handlePlay(doc)}
            />
          ))}
        </div>
      </div>
      {selectedDoc && (
        <DeleteConfirmModal
          show={showDeleteModal}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteConfirm}
          title={t.document.deleteTitle}
          message={t.document.deleteConfirm.replace('{title}', selectedDoc.title)}
        />
      )}
    </>
  );
};
