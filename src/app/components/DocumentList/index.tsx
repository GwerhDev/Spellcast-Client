import s from './index.module.css';
import React, { useEffect, useState } from 'react';
import { getDocumentsFromDB, deleteDocumentFromDB } from '../../../db';
import { useNavigate, useLocation } from 'react-router-dom';
import { DeleteConfirmModal } from '../Modals/DeleteConfirmModal';
import { useAppSelector } from '../../../store/hooks';
import { Document } from 'src/interfaces';
import { Spinner } from '../Spinner';
import { DocumentCard } from '../Cards/DocumentCard';
import { useDispatch } from 'react-redux';
import { setAutoPlayOnLoad, resetBrowserPlayer, requestTogglePlay } from '../../../store/browserPlayerSlice';
import { setAutoPlayOnLoad as setAudioAutoPlayOnLoad, resetAudioPlayer } from '../../../store/audioPlayerSlice';
import { setPdfFile, setPdfDocumentInfo, resetPdfReader } from '../../../store/pdfReaderSlice';
import { useLanguage } from '../../../i18n';

export type LibraryFilter = 'all' | 'local' | 'cloud';

interface DocumentListProps {
  query?: string;
  filter?: LibraryFilter;
}

export const DocumentList: React.FC<DocumentListProps> = ({ query = '', filter = 'local' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const { userData, logged } = useAppSelector(state => state.session);
  const { documentId: activeDocId, isLoaded: readerLoaded } = useAppSelector(state => state.pdfReader);
  const audioPlaying = useAppSelector(state => state.audioPlayer.isPlaying);
  const browserPlaying = useAppSelector(state => state.browserPlayer.isPlaying);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ id: string, title: string } | null>(null);

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

  const fetchLocal = async () => {
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
    // 'all' and 'local' both read from IndexedDB for now.
    // When cloud is wired up: 'cloud' → API fetch, 'all' → merge both sources.
    if (filter !== 'cloud') fetchLocal();
    //eslint-disable-next-line
  }, [userData.id, filter]);

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
        fetchLocal();
      } catch (error) {
        console.error('Failed to delete document:', error);
      } finally {
        closeDeleteModal();
      }
    }
  };

  const q = query.trim().toLowerCase();
  const visible = q
    ? documents.filter(d => d.title.toLowerCase().includes(q))
    : documents;

  if (isLoading) return <Spinner isLoading />;
  if (documents.length === 0) return <p className={s.empty}>{t.document.noLocalDocuments}</p>;
  if (visible.length === 0) return <p className={s.empty}>{t.document.noDocuments}</p>;

  return (
    <>
      <div className={s.container}>
        <div className={s.slider}>
          {visible.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onClick={() => navigate(`/document/${doc.id}`)}
              onEdit={(e) => { e.stopPropagation(); navigate(`/editor/${doc.id}`, { state: { from: location.pathname } }); }}
              onDelete={(e) => openDeleteModal(doc.id, doc.title, e)}
              isActive={activeDocId === doc.id && (readerLoaded || audioPlaying || browserPlaying)}
              isPlaying={activeDocId === doc.id && (audioPlaying || browserPlaying)}
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
