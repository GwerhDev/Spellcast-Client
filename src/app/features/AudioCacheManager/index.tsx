import { useCallback, useEffect, useState } from 'react';
import s from './index.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeadphones, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../../i18n';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { addApiResponse } from '../../../store/apiResponsesSlice';
import { getSpellsFromDB } from '../../../db';
import {
  getAudioCacheSummary, clearAllAudioCache, clearSpellAudioCache, clearAudioCacheForVoice,
  AUDIO_CACHE_AUTO_CLEANUP_KEY, type AudioCacheSummary,
} from '../../../db/audioCache';
import { formatBytes } from '../../../utils/formatBytes';
import { PrimaryButton } from '../../components/Buttons/PrimaryButton';
import { SecondaryButton } from '../../components/Buttons/SecondaryButton';
import { DeleteConfirmModal } from '../../components/Modals/DeleteConfirmModal';
import { ToggleRow } from '../../components/Inputs/ToggleRow';
import { EmptyState } from '../../components/EmptyState';
import { Spinner } from '../../components/Spinner';

interface SpellRow {
  id: string;
  title: string;
  totalBytes: number;
  byVoice: Record<string, number>;
  lastAccessed: number;
}

// TCORE-118: this needs direct IndexedDB access (audioCache.ts + the spells store, to
// resolve titles), so it's a Layer 3 feature per CLAUDE.md, not a Layer 4 component.
export const AudioCacheManager = () => {
  const { t } = useLanguage();
  const dispatch = useAppDispatch();
  const { userData } = useAppSelector((state) => state.session);

  const [summary, setSummary] = useState<AudioCacheSummary | null>(null);
  const [titlesById, setTitlesById] = useState<Record<string, string>>({});
  const [autoCleanup, setAutoCleanup] = useState(() => localStorage.getItem(AUDIO_CACHE_AUTO_CLEANUP_KEY) === 'true');
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; title: string } | 'all' | null>(null);

  const reload = useCallback(async () => {
    const [nextSummary, spells] = await Promise.all([
      getAudioCacheSummary(),
      getSpellsFromDB(userData.id),
    ]);
    setSummary(nextSummary);
    setTitlesById(Object.fromEntries(spells.map((spell) => [spell.id, spell.title])));
  }, [userData.id]);

  useEffect(() => { reload(); }, [reload]);

  const handleToggleAutoCleanup = (value: boolean) => {
    setAutoCleanup(value);
    localStorage.setItem(AUDIO_CACHE_AUTO_CLEANUP_KEY, String(value));
  };

  const handleClearAll = async () => {
    await clearAllAudioCache();
    setConfirmTarget(null);
    dispatch(addApiResponse({ message: t.storage.audioCacheClearedToast, type: 'success' }));
    await reload();
  };

  const handleClearSpell = async (id: string, title: string) => {
    await clearSpellAudioCache(id);
    setConfirmTarget(null);
    dispatch(addApiResponse({ message: t.storage.audioCacheSpellClearedToast.replace('{title}', title), type: 'success' }));
    await reload();
  };

  const handleClearVoice = async (id: string, voice: string) => {
    await clearAudioCacheForVoice(id, voice);
    await reload();
  };

  if (!summary) return <Spinner isLoading message={t.storage.calculating} />;

  const rows: SpellRow[] = Object.entries(summary.bySpell)
    .map(([id, entry]) => ({
      id,
      title: titlesById[id] ?? t.spell.untitled,
      totalBytes: entry.totalBytes,
      byVoice: entry.byVoice,
      lastAccessed: entry.lastAccessed,
    }))
    .sort((a, b) => b.totalBytes - a.totalBytes);

  return (
    <div className={s.container} data-testid="audio-cache-manager">
      <div className={s.header}>
        <div className={s.headerText}>
          <span className={s.headerIcon}><FontAwesomeIcon icon={faHeadphones} /></span>
          <div>
            <span className={s.totalValue} data-testid="audio-cache-total">{formatBytes(summary.totalBytes)}</span>
            <p className={s.subtitle}>{t.storage.audioCacheSubtitle}</p>
          </div>
        </div>
        <div className={s.headerActions}>
          <SecondaryButton
            data-testid="audio-cache-clear-all-btn"
            icon={faTrash}
            text={t.storage.audioCacheClearAll}
            onClick={() => setConfirmTarget('all')}
            disabled={summary.totalBytes === 0}
          />
        </div>
      </div>

      <ToggleRow
        label={t.storage.audioCacheAutoCleanup}
        description={t.storage.audioCacheAutoCleanupDesc}
        value={autoCleanup}
        onChange={handleToggleAutoCleanup}
      />

      {rows.length === 0 ? (
        <EmptyState icon={faHeadphones} message={t.storage.audioCacheEmpty} testId="audio-cache-empty" />
      ) : (
        <ul className={s.list}>
          {rows.map((row) => (
            <li key={row.id} className={s.spellRow} data-testid={`audio-cache-spell-${row.id}`}>
              <div className={s.spellHeader}>
                <div className={s.spellInfo}>
                  <span className={s.spellTitle}>{row.title}</span>
                  <span className={s.spellMeta}>
                    {formatBytes(row.totalBytes)}
                    {row.lastAccessed > 0 && ` · ${t.storage.audioCacheLastUsed.replace('{date}', new Date(row.lastAccessed).toLocaleDateString())}`}
                  </span>
                </div>
                <div className={s.spellActions}>
                  <PrimaryButton
                    data-testid={`audio-cache-clear-spell-${row.id}-btn`}
                    variant="danger"
                    icon={faTrash}
                    text={t.storage.audioCacheClearSpell}
                    onClick={() => setConfirmTarget({ id: row.id, title: row.title })}
                  />
                </div>
              </div>
              <ul className={s.voiceList}>
                {Object.entries(row.byVoice).map(([voice, bytes]) => (
                  <li key={voice} className={s.voiceRow} data-testid={`audio-cache-voice-${row.id}-${voice}`}>
                    <span className={s.voiceLabel}>{voice}</span>
                    <span className={s.voiceBytes}>{formatBytes(bytes)}</span>
                    <button
                      className={s.voiceClearBtn}
                      data-testid={`audio-cache-clear-voice-${row.id}-${voice}-btn`}
                      onClick={() => handleClearVoice(row.id, voice)}
                      title={t.storage.audioCacheClearSpell}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <DeleteConfirmModal
        show={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (confirmTarget === 'all') handleClearAll();
          else if (confirmTarget) handleClearSpell(confirmTarget.id, confirmTarget.title);
        }}
        title={confirmTarget === 'all'
          ? t.storage.audioCacheClearAllConfirmTitle
          : t.storage.audioCacheClearSpellConfirmTitle.replace('{title}', confirmTarget?.title ?? '')}
        message={confirmTarget === 'all' ? t.storage.audioCacheClearAllConfirmDesc : t.storage.audioCacheClearSpellConfirmDesc}
      />
    </div>
  );
};
