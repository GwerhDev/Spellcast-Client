import s from './index.module.css';
import React, { useEffect, useState } from 'react';
import { getDocumentsFromDB, deleteDocumentFromDB } from '../../../db';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faTrash } from '@fortawesome/free-solid-svg-icons';
import { DeleteConfirmModal } from '../Modals/DeleteConfirmModal';

interface LocalDocument {
  id: string;
  title: string;
  createdAt: Date;
}

export const RecentLocalDocument: React.FC = () => {
  const [documents, setDocuments] = useState<LocalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{id: string, title: string} | null>(null);
  const navigate = useNavigate();

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const docs = await getDocumentsFromDB();
      const sortedDocs = docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setDocuments(sortedDocs.slice(0, 3));
    } catch (error) {
      console.error('Failed to fetch local documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

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
        await deleteDocumentFromDB(selectedDoc.id);
        fetchDocuments();
      } catch (error) {
        console.error('Failed to delete document:', error);
      } finally {
        closeDeleteModal();
      }
    }
  };

  const handleDocClick = (docId: string) => {
    navigate(`/document/local/${docId}`);
  };

  if (isLoading) {
    return <p>Loading recent documents...</p>;
  }

  if (documents.length === 0) {
    return null;
  }

  return (
    <>
      <div className={s.container}>
        <h2 className={s.title}>Recent Local Documents</h2>
        <div className={s.listContainer}>
          {documents.map((doc) => (
            <div key={doc.id} className={s.docLink} onClick={() => handleDocClick(doc.id)}>
              <div className={s.docInfo}>
                <FontAwesomeIcon icon={faFilePdf} size="2x" />
                <div>
                  <span className={s.docTitle}>{doc.title}</span>
                  <small className={s.docDate}>{new Date(doc.createdAt).toLocaleString()}</small>
                </div>
              </div>
              <button className={s.deleteButton} onClick={(e) => openDeleteModal(doc.id, doc.title, e)}>
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
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
