import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import s from './index.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBoxOpen, faTrash, faArrowUpRightFromSquare, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../../i18n';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { addApiResponse } from '../../../store/apiResponsesSlice';
import { getSpellsFromDB, resetSpellProgress, resetAllSpellProgress } from '../../../db';
import { invalidateSpellList } from '../../../store/spellReaderSlice';
import { usePlaySpell } from '../../../hooks/usePlaySpell';
import { deleteOriginalPdf, getAllOriginalPdfSizes } from '../../../db/originalPdfs';
import { getAudioCacheSummary, clearSpellAudioCache } from '../../../db/audioCache';
import { formatBytes } from '../../../utils/formatBytes';
import { PrimaryButton } from '../../components/Buttons/PrimaryButton';
import { DeleteConfirmModal } from '../../components/Modals/DeleteConfirmModal';
import { EmptyState } from '../../components/EmptyState';
import { Spinner } from '../../components/Spinner';

interface SpellRow {
  id: string;
  title: string;
  contentBytes: number;
  pdfBytes: number;
  audioBytes: number;
  totalBytes: number;
  // Page the reader is on (1-based); 0 when never started.
  currentPage: number;
}

type ConfirmTarget =
  | { id: string; title: string; kind: 'pdf' | 'audio' | 'progress' }
  | { kind: 'all-progress' }
  | null;

// TCORE-119: needs direct IndexedDB access across three separate stores (spells,
// originalPdfs, audioCache), so it's a Layer 3 feature per CLAUDE.md, not a Layer 4
// component -- same reasoning as AudioCacheManager (TCORE-118), whose "clear audio" action
// and copy this deliberately reuses rather than duplicating a parallel flow.
export const SpellStorageManager = () => {
  const { t } = useLanguage();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { userData } = useAppSelector((state) => state.session);
  const loadedSpellId = useAppSelector((state) => state.spellReader.spellId);
  const { unloadSpell } = usePlaySpell();

  const [rows, setRows] = useState<SpellRow[] | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);

  const reload = useCallback(async () => {
    const [spells, pdfSizes, audioSummary] = await Promise.all([
      getSpellsFromDB(userData.id),
      getAllOriginalPdfSizes(),
      getAudioCacheSummary(),
    ]);

    const nextRows: SpellRow[] = spells.map((spell) => {
      // Everything actually stored on the spell's own record -- its pages, the pristine
      // original pages backup (the "reset to original" source), both measured as the list
      // reads it (see getSpellsFromDB) -- and its cover image.
      const contentBytes = (spell.listedPages?.bytes ?? 0) + (spell.cover?.size ?? 0);
      const pdfBytes = pdfSizes[spell.id] ?? 0;
      const audioBytes = audioSummary.bySpell[spell.id]?.totalBytes ?? 0;
      return {
        id: spell.id, title: spell.title, contentBytes, pdfBytes, audioBytes,
        totalBytes: contentBytes + pdfBytes + audioBytes,
        currentPage: spell.progress?.currentPage ?? 0,
      };
    });
    nextRows.sort((a, b) => b.totalBytes - a.totalBytes);
    setRows(nextRows);
  }, [userData.id]);

  useEffect(() => { reload(); }, [reload]);

  const handleDropPdf = async (id: string, title: string) => {
    await deleteOriginalPdf(id);
    setConfirmTarget(null);
    dispatch(addApiResponse({ message: t.storage.spellStoragePdfDroppedToast.replace('{title}', title), type: 'success' }));
    await reload();
  };

  const handleClearAudio = async (id: string, title: string) => {
    await clearSpellAudioCache(id);
    setConfirmTarget(null);
    dispatch(addApiResponse({ message: t.storage.audioCacheSpellClearedToast.replace('{title}', title), type: 'success' }));
    await reload();
  };

  // A spell reset while it's loaded would keep playing from where it was and save that
  // position right back, so it's taken out of the player first.
  const afterProgressReset = async (resetIds: string[] | 'all') => {
    if (loadedSpellId && (resetIds === 'all' || resetIds.includes(loadedSpellId))) unloadSpell();
    setConfirmTarget(null);
    dispatch(invalidateSpellList());
    await reload();
  };

  const handleResetProgress = async (id: string, title: string) => {
    if (!userData.id) return;
    await resetSpellProgress(id, userData.id);
    dispatch(addApiResponse({ message: t.storage.spellStorageProgressResetToast.replace('{title}', title), type: 'success' }));
    await afterProgressReset([id]);
  };

  const handleResetAllProgress = async () => {
    if (!userData.id) return;
    await resetAllSpellProgress(userData.id);
    dispatch(addApiResponse({ message: t.storage.spellStorageProgressResetAllToast, type: 'success' }));
    await afterProgressReset('all');
  };

  if (!rows) return <Spinner isLoading message={t.storage.calculating} />;

  const anyStarted = rows.some(row => row.currentPage > 0);

  const confirmTitle = (target: ConfirmTarget): string => {
    if (!target) return '';
    if (target.kind === 'all-progress') return t.storage.spellStorageResetAllProgressConfirmTitle;
    if (target.kind === 'progress') return t.storage.spellStorageResetProgressConfirmTitle.replace('{title}', target.title);
    if (target.kind === 'pdf') return t.storage.spellStorageDropPdfConfirmTitle.replace('{title}', target.title);
    return t.storage.audioCacheClearSpellConfirmTitle.replace('{title}', target.title);
  };

  const confirmMessage = (target: ConfirmTarget): string => {
    if (!target) return '';
    if (target.kind === 'all-progress') return t.storage.spellStorageResetAllProgressConfirmDesc;
    if (target.kind === 'progress') return t.storage.spellStorageResetProgressConfirmDesc;
    if (target.kind === 'pdf') return t.storage.spellStorageDropPdfConfirmDesc;
    return t.storage.audioCacheClearSpellConfirmDesc;
  };

  return (
    <div className={s.container} data-testid="spell-storage-manager">
      <div className={s.header}>
        <div className={s.headerText}>
          <span className={s.headerIcon}><FontAwesomeIcon icon={faBoxOpen} /></span>
          <p className={s.subtitle}>{t.storage.spellStorageSubtitle}</p>
        </div>
        <div className={s.headerActions}>
          {anyStarted && (
            <PrimaryButton
              data-testid="spell-storage-reset-all-progress-btn"
              variant="danger"
              icon={faRotateLeft}
              text={t.storage.spellStorageResetAllProgress}
              onClick={() => setConfirmTarget({ kind: 'all-progress' })}
            />
          )}
          <button
            className={s.audioLink}
            data-testid="spell-storage-manage-audio-link"
            onClick={() => navigate('/caster/settings/storage/local/audio-cache')}
          >
            {t.storage.spellStorageManageAudioLink}
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} className={s.audioLinkIcon} />
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={faBoxOpen} message={t.storage.spellStorageEmpty} testId="spell-storage-empty" />
      ) : (
        <ul className={s.list}>
          {rows.map((row) => (
            <li key={row.id} className={s.spellRow} data-testid={`spell-storage-row-${row.id}`}>
              <div className={s.spellInfo}>
                <span className={s.spellTitle}>{row.title}</span>
                <span className={s.spellTotal}>{formatBytes(row.totalBytes)}</span>
              </div>

              <ul className={s.breakdown}>
                <li className={s.breakdownRow}>
                  <div className={s.breakdownInfo}>
                    <span className={s.breakdownLabel}>{t.storage.spellStorageContent}</span>
                    <span className={s.breakdownBytes}>{formatBytes(row.contentBytes)}</span>
                  </div>
                </li>
                <li className={s.breakdownRow}>
                  <div className={s.breakdownInfo}>
                    <span className={s.breakdownLabel}>{t.storage.spellStoragePdf}</span>
                    <span className={s.breakdownBytes}>{formatBytes(row.pdfBytes)}</span>
                  </div>
                  {row.pdfBytes > 0 && (
                    <div className={s.breakdownActions}>
                      <PrimaryButton
                        data-testid={`spell-storage-drop-pdf-${row.id}-btn`}
                        variant="danger"
                        icon={faTrash}
                        text={t.storage.spellStorageDropPdf}
                        onClick={() => setConfirmTarget({ id: row.id, title: row.title, kind: 'pdf' })}
                      />
                    </div>
                  )}
                </li>
                <li className={s.breakdownRow}>
                  <div className={s.breakdownInfo}>
                    <span className={s.breakdownLabel}>{t.storage.spellStorageProgress}</span>
                    <span className={s.breakdownBytes} data-testid={`spell-storage-progress-${row.id}`}>
                      {row.currentPage > 0
                        ? t.storage.spellStorageProgressPage.replace('{page}', String(row.currentPage))
                        : t.storage.spellStorageProgressNone}
                    </span>
                  </div>
                  {row.currentPage > 0 && (
                    <div className={s.breakdownActions}>
                      <PrimaryButton
                        data-testid={`spell-storage-reset-progress-${row.id}-btn`}
                        variant="danger"
                        icon={faRotateLeft}
                        text={t.storage.spellStorageResetProgress}
                        onClick={() => setConfirmTarget({ id: row.id, title: row.title, kind: 'progress' })}
                      />
                    </div>
                  )}
                </li>
                <li className={s.breakdownRow}>
                  <div className={s.breakdownInfo}>
                    <span className={s.breakdownLabel}>{t.storage.spellStorageAudio}</span>
                    <span className={s.breakdownBytes}>{formatBytes(row.audioBytes)}</span>
                  </div>
                  {row.audioBytes > 0 && (
                    <div className={s.breakdownActions}>
                      <PrimaryButton
                        data-testid={`spell-storage-clear-audio-${row.id}-btn`}
                        variant="danger"
                        icon={faTrash}
                        text={t.storage.audioCacheClearSpell}
                        onClick={() => setConfirmTarget({ id: row.id, title: row.title, kind: 'audio' })}
                      />
                    </div>
                  )}
                </li>
              </ul>
            </li>
          ))}
        </ul>
      )}

      <DeleteConfirmModal
        show={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (!confirmTarget) return;
          if (confirmTarget.kind === 'all-progress') handleResetAllProgress();
          else if (confirmTarget.kind === 'progress') handleResetProgress(confirmTarget.id, confirmTarget.title);
          else if (confirmTarget.kind === 'pdf') handleDropPdf(confirmTarget.id, confirmTarget.title);
          else handleClearAudio(confirmTarget.id, confirmTarget.title);
        }}
        title={confirmTitle(confirmTarget)}
        message={confirmMessage(confirmTarget)}
        confirmText={confirmTarget?.kind === 'progress' || confirmTarget?.kind === 'all-progress' ? t.storage.spellStorageResetConfirm : undefined}
      />
    </div>
  );
};
