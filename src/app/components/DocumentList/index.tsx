import s from './index.module.css';
import React, { useEffect, useState } from 'react';
import { getDocumentsFromDB, deleteDocumentFromDB } from '../../../db';
import { useNavigate } from 'react-router-dom';
import { DeleteConfirmModal } from '../Modals/DeleteConfirmModal';
import { useAppSelector } from '../../../store/hooks';
import { Document } from 'src/interfaces';
import { Spinner } from '../Spinner';
import { DocumentCard } from '../Cards/DocumentCard';

export const DocumentList: React.FC = () => {
  const navigate = useNavigate();
  const { userData, logged } = useAppSelector(state => state.session);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ id: string, title: string } | null>(null);

  const fetchDocuments = async () => {
    if (!logged) { setIsLoading(false); return; }
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
    if (selectedDoc && userData?.id) {
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

  if (isLoading) return <Spinner isLoading />;
  if (documents.length === 0) return <p>No documents found.</p>;

  return (
    <>
      <div className={s.container}>
        <h2 className={s.title}>All Documents</h2>
        <div className={s.slider}>
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onClick={() => navigate(`/document/local/${doc.id}`)}
              onEdit={(e) => { e.stopPropagation(); navigate(`/document/local/${doc.id}/edit`); }}
              onDelete={(e) => openDeleteModal(doc.id, doc.title, e)}
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
