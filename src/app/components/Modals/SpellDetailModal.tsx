import s from './SpellDetailModal.module.css';
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../../store/hooks';
import { getSpellById, deleteSpellFromDB } from '../../../db';
import { hasOriginalPdf } from '../../../db/originalPdfs';
import { setAutoPlayOnLoad, resetBrowserPlayer } from '../../../store/browserPlayerSlice';
import { setAutoPlayOnLoad as setAudioAutoPlayOnLoad } from '../../../store/audioPlayerSlice';
import { invalidateSpellList, resetSpellReader } from '../../../store/spellReaderSlice';
import { CustomModal } from './CustomModal';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { SecondaryButton } from '../Buttons/SecondaryButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faScroll, faWandMagicSparkles, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Tag } from '../Tag/Tag';
import { useLanguage } from '../../../i18n';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface SpellDetailModalProps {
  spellId: string | null;
  show: boolean;
  onClose: () => void;
}

export const SpellDetailModal: React.FC<SpellDetailModalProps> = ({ spellId, show, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const { userData } = useAppSelector(state => state.session);
  const { spellId: currentPlayingId, currentPage: readerCurrentPage } = useAppSelector(state => state.spellReader);

  const [doc, setDoc] = useState<Awaited<ReturnType<typeof getSpellById>> | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  // TCORE-90: the original PDF no longer lives on the Spell record -- its existence is
  // looked up in the dedicated store instead of reading a `pdf` field.
  const [hasPdf, setHasPdf] = useState(false);

  useEffect(() => {
    if (!spellId || !userData?.id || !show) return;
    getSpellById(spellId, userData.id).then(setDoc);
  }, [spellId, userData?.id, show]);

  useEffect(() => {
    if (!doc?.cover) { setCoverUrl(null); return; }
    const url = URL.createObjectURL(doc.cover);
    setCoverUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [doc?.cover]);

  useEffect(() => {
    if (!doc?.id) { setHasPdf(false); return; }
    hasOriginalPdf(doc.id).then(setHasPdf);
  }, [doc?.id]);

  if (!show || !spellId) return null;

  const pagesCount = doc?.pagesContent ? (() => { try { return JSON.parse(doc.pagesContent!).length; } catch { return null; } })() : null;
  const currentPage = (currentPlayingId === spellId && readerCurrentPage > 0)
    ? readerCurrentPage
    : (doc?.progress?.currentPage ?? 0);
  const progressPct = (pagesCount && currentPage > 0)
    ? Math.min(Math.round(currentPage / pagesCount * 100), 100)
    : null;

  const handleRead = () => {
    dispatch(setAutoPlayOnLoad(true));
    dispatch(setAudioAutoPlayOnLoad(true));
    onClose();
    navigate(`/spell/${spellId}/reader`);
  };

  const handleEdit = () => {
    onClose();
    navigate(`/editor/${spellId}`, { state: { from: location.pathname } });
  };

  const handleDeleteConfirm = async () => {
    if (!spellId || !userData?.id) return;
    await deleteSpellFromDB(spellId, userData.id);
    if (currentPlayingId === spellId) {
      dispatch(resetBrowserPlayer());
      dispatch(resetSpellReader());
    }
    dispatch(invalidateSpellList());
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
                  : <div className={s.coverPlaceholder}><FontAwesomeIcon icon={faScroll} /></div>
                }
              </div>
              <div className={s.info}>
                <h2 className={s.title}>{doc.title}</h2>
                {doc.author && <p data-testid="spell-detail-modal-author" className={s.author}>{doc.author}</p>}
                <div className={s.tags}>
                  {hasPdf && <span data-testid="spell-detail-modal-pdf-tag"><Tag tone="default" size="sm">PDF</Tag></span>}
                  {currentPage > 0 && progressPct !== null && (
                    <Tag tone={progressPct === 100 ? 'ok' : 'primary'} size="sm">
                      {progressPct}%
                    </Tag>
                  )}
                  {!doc.pagesContent && <Tag tone="warning" size="sm">Unprocessed</Tag>}
                </div>
                <p className={s.meta}>{new Date(doc.createdAt).toLocaleDateString()}</p>
                {pagesCount && <p className={s.meta}>{pagesCount} {pagesCount === 1 ? t.spell.pageSingular : t.spell.pagePlural}</p>}
                {progressPct !== null && (
                  <div className={s.progressBar}>
                    <div className={s.progressFill} style={{ width: `${progressPct}%` }} />
                  </div>
                )}
                {currentPage > 0 && pagesCount && (
                  <p className={s.progressText}>{t.spell.page} {currentPage} {t.spell.of} {pagesCount}</p>
                )}
                {(doc.description || doc.language || doc.tags?.length) ? (
                  <div className={s.metadata} data-testid="spell-detail-modal-metadata">
                    {doc.description && (
                      <p className={s.metadataDescription} data-testid="spell-detail-modal-description">{doc.description}</p>
                    )}
                    {doc.language && (
                      <div className={s.metadataRow}>
                        <span data-testid="spell-detail-modal-language">
                          <strong>{t.spell.languageLabel}:</strong> {doc.language}
                        </span>
                      </div>
                    )}
                    {!!doc.tags?.length && (
                      <div className={s.metadataTags} data-testid="spell-detail-modal-tags">
                        {doc.tags.map((tag) => <Tag key={tag} tone="default" size="sm">{tag}</Tag>)}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
            <div className={s.actions}>
              <PrimaryButton data-testid="spell-detail-modal-continue-btn" icon={faScroll} onClick={handleRead}>
                {currentPage > 0 ? t.spell.continueReading : t.spell.startReading}
              </PrimaryButton>
              <SecondaryButton data-testid="spell-detail-modal-edit-btn" icon={faWandMagicSparkles} onClick={handleEdit}>{t.spell.editSpell}</SecondaryButton>
              <PrimaryButton data-testid="spell-detail-modal-delete-btn" variant="danger" icon={faTrash} onClick={() => setShowDeleteModal(true)}>
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
        title={t.spell.deleteTitle}
        message={t.spell.deleteConfirm.replace('{title}', doc?.title ?? '')}
      />
    </>
  );
};
