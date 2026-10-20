import s from '../../components/Inputs/SpellCreateInput.module.css';
import { useEffect, useRef, useState } from 'react';
import { faUpload, faFileCircleCheck, faFilePdf, faFileWord, faTrash, faHourglassHalf, faScroll, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { SpellState } from '../../../interfaces';
import { useAppSelector } from '../../../store/hooks';
import { enqueueUpload } from '../../../store/spellUploadSlice';
import { useLanguage } from '../../../i18n';
import { useSpellImport } from '../../../hooks/useSpellImport';
import { SpellUnlockModal } from '../../components/Modals/SpellUnlockModal';

interface SpellCreateInputProps {
  spell: SpellState;
  // A .spell file: imported as it is (a spell already), instead of created from a PDF.
  spellFile?: File;
  onRemove?: () => void;
  onDone?: (resultDocId?: string) => void;
  // Creating it failed: the card shows why and offers creating it again.
  onError?: () => void;
  // Given up on (a protected .spell whose password wasn't given): nothing to show, the card
  // is as it was.
  onCancel?: () => void;
  autoCreate?: boolean;
}

export const SpellCreateInput = (props: SpellCreateInputProps) => {
  const { spell, spellFile, onRemove, onDone, onError, onCancel, autoCreate } = props;
  const navigate = useNavigate();
  const { importFile, unlockPrompt } = useSpellImport();
  // A .spell file being imported, and the spell it became.
  const [importing, setImporting] = useState(false);
  const [importedId, setImportedId] = useState<string | null>(null);
  const [saveOriginal, setSaveOriginal] = useState(true);
  const [jobId, setJobId] = useState<string | null>(null);
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const { userData } = useAppSelector(state => state.session);
  const job = useAppSelector(state => jobId ? state.spellUpload.queue.find(j => j.id === jobId) : null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  // Why the last attempt failed, shown until the next one starts.
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (autoCreate && !jobId) handleCreate();
    //eslint-disable-next-line
  }, [autoCreate]);

  useEffect(() => {
    if (!job) return;
    if (job.status === 'done') {
      onDoneRef.current?.(job.resultDocId);
    } else if (job.status === 'error') {
      setFailure(job.errorMessage || t.spell.createError);
      setJobId(null);
      onErrorRef.current?.();
    }
    //eslint-disable-next-line
  }, [job?.status]);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (type: string | null | undefined) => {
    switch (type) {
      case 'pdf': return faFilePdf;
      case 'spell': return faScroll;
      case 'doc': return faFileWord;
      default: return faFileCircleCheck;
    }
  };

  const handleImport = async () => {
    if (!spellFile || importing || importedId) return;
    setFailure(null);
    setImporting(true);
    const id = await importFile(spellFile);
    setImporting(false);
    if (id) {
      setImportedId(id);
      onDoneRef.current?.(id);
    } else if (id === null) {
      setFailure(t.spell.importError);
      onErrorRef.current?.();
    } else {
      onCancelRef.current?.();
    }
  };

  const handleCreate = () => {
    if (spellFile) { void handleImport(); return; }
    if (!spell.fileContent || !userData?.id || jobId) return;
    setFailure(null);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    dispatch(enqueueUpload({
      id,
      title: spell.title || t.spell.untitled,
      fileContent: spell.fileContent,
      saveOriginal,
      userId: userData.id,
    }));
    setJobId(id);
  };

  const pct = job?.progress
    ? Math.round(job.progress.current / job.progress.total * 100)
    : 0;

  const isActive = job && (job.status === 'queued' || job.status === 'processing');
  // The spell it became, once created (from its PDF) or imported (a .spell): opened from here.
  const resultId = importedId ?? (job?.status === 'done' ? job.resultDocId ?? null : null);
  const busy = !!jobId || importing || !!importedId;

  return (
    <div data-testid="spell-create-input" className={`${s.container} ${isActive ? s.containerActive : ''}`}>
      <FontAwesomeIcon size="2x" icon={getFileTypeIcon(spell.type)} />
      <div className={s.metadata}>
        {/* Not renamed here: the title comes from the file (the PDF's own, when it has
            one), and is edited afterwards from the spell itself. */}
        <input
          data-testid="spell-create-input-title"
          placeholder={t.spell.titleInputPlaceholder}
          readOnly
          className={s.title}
          value={spell.title}
          type="text"
        />
        <div className={s.metaRow}>
          <small>
            {formatBytes(spell.size || 0)}
            {spell.totalPages > 0 && ` · ${spell.totalPages} ${spell.totalPages === 1 ? t.spell.pageSingular : t.spell.pagePlural}`}
          </small>
          {failure && !busy && (
            <small data-testid="spell-create-input-error" className={s.error} role="alert">{failure}</small>
          )}
          {!busy && !spellFile && (
            <div className={s.toggleGroup}>
              <button
                type="button"
                role="switch"
                aria-checked={saveOriginal}
                className={`${s.toggle} ${saveOriginal ? s.toggleOn : ''}`}
                onClick={() => setSaveOriginal(v => !v)}
                title={t.common.saveOriginal}
              >
                <span className={`${s.toggleThumb} ${saveOriginal ? s.toggleThumbOn : ''}`} />
              </button>
              <span className={s.toggleLabel}>{t.common.saveOriginal}</span>
            </div>
          )}
        </div>
      </div>
      <div className={s.actionCol}>
        {resultId ? (
          <>
            <button data-testid="spell-create-input-open-btn" onClick={() => navigate(`/spell/${resultId}`)} className={s.continueButton} title={t.reader.spellInfo}>
              <FontAwesomeIcon icon={faScroll} />
            </button>
            <button data-testid="spell-create-input-edit-btn" onClick={() => navigate(`/editor/${resultId}`)} className={s.continueButton} title={t.spell.editSpell}>
              <FontAwesomeIcon icon={faWandMagicSparkles} />
            </button>
          </>
        ) : importing || job?.status === 'processing' ? (
          <>
            <div className={s.processingSpinner} />
            {!importing && <span className={s.processingPct}>{pct}%</span>}
          </>
        ) : job?.status === 'queued' ? (
          <FontAwesomeIcon icon={faHourglassHalf} className={s.queuedIcon} />
        ) : job?.status === 'done' ? null : (
          <>
            <button data-testid="spell-create-input-upload-btn" onClick={handleCreate} className={s.continueButton} title={spellFile ? t.editor.importSpell : t.editor.createSpell}>
              <FontAwesomeIcon icon={faUpload} />
            </button>
            {onRemove && (
              <button data-testid="spell-create-input-remove-btn" onClick={onRemove} className={s.removeBtn} title={t.common.delete}>
                <FontAwesomeIcon icon={faTrash} />
              </button>
            )}
          </>
        )}
      </div>
      {isActive && (
        <div className={s.progressBar} style={{ width: `${pct}%` }} />
      )}
      <SpellUnlockModal
        fileName={unlockPrompt?.fileName ?? null}
        wrong={!!unlockPrompt?.wrong}
        busy={!!unlockPrompt?.busy}
        onSubmit={(password) => unlockPrompt?.submit(password)}
        onCancel={() => unlockPrompt?.cancel()}
      />
    </div>
  );
};
