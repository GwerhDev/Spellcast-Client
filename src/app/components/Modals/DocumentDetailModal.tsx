import s from './DocumentDetailModal.module.css';
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../../store/hooks';
import { getDocumentById, deleteDocumentFromDB } from '../../../db';
import { setAutoPlayOnLoad, resetBrowserPlayer } from '../../../store/browserPlayerSlice';
import { setAutoPlayOnLoad as setAudioAutoPlayOnLoad } from '../../../store/audioPlayerSlice';
import { invalidateDocumentList, resetPdfReader } from '../../../store/pdfReaderSlice';
import { CustomModal } from './CustomModal';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { SecondaryButton } from '../Buttons/SecondaryButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faBookOpen, faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Tag } from '../Tag/Tag';
import { useLanguage } from '../../../i18n';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface DocumentDetailModalProps {
  documentId: string | null;
  show: boolean;
  onClose: () => void;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({ documentId, show, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const { userData } = useAppSelector(state => state.session);
  const { documentId: currentPlayingId, currentPage: readerCurrentPage } = useAppSelector(state => state.pdfReader);

  const [doc, setDoc] = useState<Awaited<ReturnType<typeof getDocumentById>> | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!documentId || !userData?.id || !show) return;
    getDocumentById(documentId, userData.id).then(setDoc);
  }, [documentId, userData?.id, show]);

  useEffect(() => {
    if (!doc?.cover) { setCoverUrl(null); return; }
    const url = URL.createObjectURL(doc.cover);
    setCoverUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [doc?.cover]);

  if (!show || !documentId) return null;

  const pagesCount = doc?.pagesContent ? (() => { try { return JSON.parse(doc.pagesContent!).length; } catch { return null; } })() : null;
  const currentPage = (currentPlayingId === documentId && readerCurrentPage > 0)
    ? readerCurrentPage
    : (doc?.progress?.currentPage ?? 0);
  const progressPct = (pagesCount && currentPage > 0)
    ? Math.min(Math.round(currentPage / pagesCount * 100), 100)
    : null;

  const handleRead = () => {
    dispatch(setAutoPlayOnLoad(true));
    dispatch(setAudioAutoPlayOnLoad(true));
    onClose();
    navigate(`/document/${documentId}/reader`);
  };

  const handleEdit = () => {
    onClose();
    navigate(`/editor/${documentId}`, { state: { from: location.pathname } });
  };

  const handleDeleteConfirm = async () => {
    if (!documentId || !userData?.id) return;
    await deleteDocumentFromDB(documentId, userData.id);
    if (currentPlayingId === documentId) {
      dispatch(resetBrowserPlayer());
      dispatch(resetPdfReader());
    }
    dispatch(invalidateDocumentList());
    setShowDeleteModal(false);
    onClose();
  };

  return (
    <>
      <CustomModal show={show} onClose={onClose} title="" compact>
        {!doc ? (
          <div className={s.loading}>{t.common.loading}</div>
        ) : (
          <div className={s.content}>
            <div className={s.header}>
              <div className={s.coverWrap}>
                {coverUrl
                  ? <img src={coverUrl} alt={doc.title} className={s.cover} />
                  : <div className={s.coverPlaceholder}><FontAwesomeIcon icon={faFilePdf} /></div>
                }
              </div>
              <div className={s.info}>
                <h2 className={s.title}>{doc.title}</h2>
                <div className={s.tags}>
                  {doc.pdf && <Tag tone="default" size="sm">PDF</Tag>}
                  {currentPage > 0 && progressPct !== null && (
                    <Tag tone={progressPct === 100 ? 'ok' : 'primary'} size="sm">
                      {progressPct}%
                    </Tag>
                  )}
                  {!doc.pagesContent && <Tag tone="warning" size="sm">Unprocessed</Tag>}
                </div>
                <p className={s.meta}>{new Date(doc.createdAt).toLocaleDateString()}</p>
                {pagesCount && <p className={s.meta}>{pagesCount} {pagesCount === 1 ? t.document.pageSingular : t.document.pagePlural}</p>}
                {progressPct !== null && (
                  <div className={s.progressBar}>
                    <div className={s.progressFill} style={{ width: `${progressPct}%` }} />
                  </div>
                )}
                {currentPage > 0 && pagesCount && (
                  <p className={s.progressText}>{t.document.page} {currentPage} {t.document.of} {pagesCount}</p>
                )}
              </div>
            </div>
            <div className={s.actions}>
              <PrimaryButton icon={faBookOpen} onClick={handleRead}>
                {currentPage > 0 ? t.document.continueReading : t.document.startReading}
              </PrimaryButton>
              <SecondaryButton icon={faPen} onClick={handleEdit}>{t.document.editDocument}</SecondaryButton>
              <PrimaryButton variant="danger" icon={faTrash} onClick={() => setShowDeleteModal(true)}>
                {t.common.delete}
              </PrimaryButton>
            </div>
          </div>
        )}
      </CustomModal>
      <DeleteConfirmModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title={t.document.deleteTitle}
        message={t.document.deleteConfirm.replace('{title}', doc?.title ?? '')}
      />
    </>
  );
};
