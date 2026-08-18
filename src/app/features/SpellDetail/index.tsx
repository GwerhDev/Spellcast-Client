import s from '../../components/SpellDetail/index.module.css';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../../store/hooks';
import { getSpellById, deleteSpellFromDB } from '../../../db';
import { setAutoPlayOnLoad, resetBrowserPlayer } from '../../../store/browserPlayerSlice';
import { setAutoPlayOnLoad as setAudioAutoPlayOnLoad } from '../../../store/audioPlayerSlice';
import { invalidateSpellList, resetPdfReader } from '../../../store/pdfReaderSlice';
import { Spinner } from '../../components/Spinner';
import { PrimaryButton } from '../../components/Buttons/PrimaryButton';
import { SecondaryButton } from '../../components/Buttons/SecondaryButton';
import { IconButton } from '../../components/Buttons/IconButton';
import { DeleteConfirmModal } from '../../components/Modals/DeleteConfirmModal';
// import { SpellExportModal } from '../../components/Modals/SpellExportModal'; // .spell export: future
import { Tag } from '../../components/Tag/Tag';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faBookOpen, faPen, faArrowLeft, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../../i18n';
// import { useSpellExport } from '../../../hooks/useSpellExport'; // .spell export: future

export const SpellDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { userData, logged } = useAppSelector((state) => state.session);
  const { t } = useLanguage();
  const { spellId: currentPlayingId, currentPage: readerCurrentPage } = useAppSelector((state) => state.pdfReader);
  const [doc, setDoc] = useState<Awaited<ReturnType<typeof getSpellById>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  // .spell export UI is hidden for now (not ready to ship this phase) — kept wired but
  // commented out so it's a one-line re-enable later. See the export button below and
  // the SpellExportModal render near the end of this file.
  // const { exportTarget, openExportModal, closeExportModal, handleExport, isExporting } = useSpellExport();

  useEffect(() => {
    const load = async () => {
      if (!id || !logged) { setIsLoading(false); return; }
      try {
        const spellDoc = await getSpellById(id, userData.id);
        if (!spellDoc) { setError('Document not found.'); setIsLoading(false); return; }
        setDoc(spellDoc);
      } catch {
        setError('Failed to load document.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, logged, userData.id]);

  useEffect(() => {
    if (!doc?.cover) return;
    const url = URL.createObjectURL(doc.cover);
    setCoverUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [doc?.cover]);

  const handlePlay = () => {
    dispatch(setAutoPlayOnLoad(true));
    dispatch(setAudioAutoPlayOnLoad(true));
    navigate(`/spell/${id}/reader`);
  };

  const handleContinueReading = () => navigate(`/spell/${id}/reader`);
  const handleEdit = () => navigate(`/editor/${id}`, { state: { from: location.pathname } });

  const handleDeleteConfirm = async () => {
    if (!id || !userData?.id) return;
    try {
      await deleteSpellFromDB(id, userData.id);
      if (currentPlayingId === id) {
        dispatch(resetBrowserPlayer());
        dispatch(resetPdfReader());
      }
      dispatch(invalidateSpellList());
      navigate('/');
    } catch {
      setError('Failed to delete document.');
    } finally {
      setShowDeleteModal(false);
    }
  };

  if (isLoading) return (
    <div data-testid="spell-detail-loading" className={s.container}>
      <Spinner isLoading message={t.common.loading} />
    </div>
  );
  if (error || !doc) return (
    <div data-testid="spell-detail-error">{error || t.spell.notFound}</div>
  );

  const pagesCount = doc.pagesContent ? JSON.parse(doc.pagesContent).length : null;
  const currentPage = (currentPlayingId === id && readerCurrentPage > 0)
    ? readerCurrentPage
    : (doc.progress?.currentPage ?? 0);
  const progressPct = (pagesCount && currentPage > 0)
    ? Math.min(Math.round(currentPage / pagesCount * 100), 100)
    : null;

  return (
    <div data-testid="spell-detail" className={s.container}>
      <div className={s.pageInfoContainer}>
        <IconButton className={s.backButton} icon={faArrowLeft} variant="transparent" onClick={() => navigate("/")} />
      </div>
      <div className={s.detailsContainer}>
        <div className={s.header}>
          {coverUrl
            ? <img src={coverUrl} alt={doc.title} className={s.cover} />
            : <FontAwesomeIcon icon={faFilePdf} size="4x" className={s.icon} />
          }
          <div className={s.info}>
            <h1 data-testid="spell-detail-title" className={s.title}>{doc.title}</h1>
            <div className={s.tags}>
              {doc.pdf && <Tag tone="default" size="sm">PDF</Tag>}
              {currentPage > 0 && progressPct !== null && (
                <Tag tone={progressPct === 100 ? 'ok' : 'primary'} size="sm">{progressPct}%</Tag>
              )}
              {!doc.pagesContent && <Tag tone="warning" size="sm">Unprocessed</Tag>}
            </div>
            <p className={s.meta}>{t.spell.created} {new Date(doc.createdAt).toLocaleDateString()}</p>
            {pagesCount && <p className={s.meta}>{pagesCount} {pagesCount === 1 ? t.spell.pageSingular : t.spell.pagePlural}</p>}
            {progressPct !== null && (
              <div className={s.progressBarContainer}>
                <div className={s.progressBarFill} style={{ width: `${progressPct}%` }} />
              </div>
            )}
            {currentPage > 0 && pagesCount && (
              <p className={s.meta}>{t.spell.page} {currentPage} {t.spell.of} {pagesCount}</p>
            )}
          </div>
        </div>
        <div className={s.actions}>
          <PrimaryButton data-testid="spell-detail-continue-btn" icon={faBookOpen} onClick={currentPage > 0 ? handleContinueReading : handlePlay}>
            {currentPage > 0 ? t.spell.continueReading : t.spell.startReading}
          </PrimaryButton>
          <SecondaryButton data-testid="spell-detail-edit-btn" icon={faPen} onClick={handleEdit}>{t.spell.editSpell}</SecondaryButton>
          {/* .spell export: future
          <SecondaryButton data-testid="spell-detail-export-btn" icon={faFileExport} onClick={() => openExportModal({ id: doc.id, title: doc.title })}>{t.spell.exportSpell}</SecondaryButton>
          */}
          <PrimaryButton data-testid="spell-detail-delete-btn" variant="danger" icon={faTrash} onClick={() => setShowDeleteModal(true)}>{t.common.delete}</PrimaryButton>
        </div>
      </div>
      <DeleteConfirmModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title={t.spell.deleteTitle}
        message={t.spell.deleteConfirm.replace('{title}', doc.title)}
      />
      {/* .spell export: future — re-enable the useSpellExport() hook above and this block.
      {exportTarget && (
        <SpellExportModal
          show={!!exportTarget}
          title={exportTarget.title}
          isExporting={isExporting}
          onClose={closeExportModal}
          onExport={handleExport}
        />
      )} */}
    </div>
  );
};
