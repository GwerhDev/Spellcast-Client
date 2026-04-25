import s from './index.module.css';
import React, { useEffect, useState } from 'react';
import { getDocumentsFromDB, deleteDocumentFromDB } from '../../../db';
import { useNavigate } from 'react-router-dom';
import { DeleteConfirmModal } from '../Modals/DeleteConfirmModal';
import { useAppSelector } from 'store/hooks';
import { Document } from 'src/interfaces';
import { DocumentCard } from '../Cards/DocumentCard';
import { useDispatch } from 'react-redux';
import { setAutoPlayOnLoad } from '../../../store/browserPlayerSlice';
import { setAutoPlayOnLoad as setAudioAutoPlayOnLoad } from '../../../store/audioPlayerSlice';

export const LastDocuments: React.FC = () => {
  const { userData } = useAppSelector((state) => state.session);
  const { documentId: activeDocId, currentPage: activeCurrentPage } = useAppSelector((state) => state.pdfReader);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ id: string, title: string } | null>(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handlePlay = (id: string) => {
    dispatch(setAutoPlayOnLoad(true));
    dispatch(setAudioAutoPlayOnLoad(true));
    navigate(`/document/${id}/reader`);
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
        <h2 className={s.title}>Last Documents</h2>
        <div className={s.slider}>
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onClick={() => navigate(`/document/${doc.id}`)}
              onEdit={(e) => { e.stopPropagation(); navigate(`/document/${doc.id}/edit`); }}
              onDelete={(e) => openDeleteModal(doc.id, doc.title, e)}
              onPlay={() => handlePlay(doc.id)}
            />
          ))}
        </div>
      </div>
      {selectedDoc && (
        <DeleteConfirmModal
          show={showDeleteModal}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteConfirm}
          title="Delete Document"
          message={`Are you sure you want to delete "${selectedDoc.title}"? This action cannot be undone.`}
        />
      )}
    </>
  );
};
