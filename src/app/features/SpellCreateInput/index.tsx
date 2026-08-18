import s from '../../components/Inputs/SpellCreateInput.module.css';
import { useEffect, useRef, useState } from 'react';
import { faUpload, faFileCircleCheck, faFilePdf, faFileWord, faTrash, faHourglassHalf, faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useDispatch } from 'react-redux';
import { setSpellTitle } from '../../../store/spellSlice';
import { SpellState } from '../../../interfaces';
import { useAppSelector } from '../../../store/hooks';
import { enqueueUpload } from '../../../store/pdfUploadSlice';
import { useLanguage } from '../../../i18n';

interface SpellCreateInputProps {
  spell: SpellState;
  onRemove?: () => void;
  onDone?: (resultDocId?: string) => void;
  autoCreate?: boolean;
}

export const SpellCreateInput = (props: SpellCreateInputProps) => {
  const { spell, onRemove, onDone, autoCreate } = props;
  const [editTitle, setEditTitle] = useState(false);
  const [saveOriginal, setSaveOriginal] = useState(true);
  const [jobId, setJobId] = useState<string | null>(null);
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const { userData } = useAppSelector(state => state.session);
  const job = useAppSelector(state => jobId ? state.pdfUpload.queue.find(j => j.id === jobId) : null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (autoCreate && !jobId) handleCreate();
    //eslint-disable-next-line
  }, [autoCreate]);

  useEffect(() => {
    if (!job) return;
    if (job.status === 'done') {
      onDoneRef.current?.(job.resultDocId);
    } else if (job.status === 'error') {
      setJobId(null);
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
      case 'doc': return faFileWord;
      default: return faFileCircleCheck;
    }
  };

  const handleCreate = () => {
    if (!spell.fileContent || !userData?.id || jobId) return;
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

  return (
    <div data-testid="spell-create-input" className={`${s.container} ${isActive ? s.containerActive : ''}`}>
      <FontAwesomeIcon size="2x" icon={getFileTypeIcon(spell.type)} />
      <div className={s.metadata} onMouseLeave={() => setEditTitle(false)}>
        <input
          placeholder={t.spell.titleInputPlaceholder}
          readOnly={spell.title.length > 0 && !editTitle || !!jobId}
          className={s.title}
          onClick={() => { if (!jobId) setEditTitle(true); }}
          value={spell.title}
          onChange={(e) => { if (!jobId) dispatch(setSpellTitle(e.target.value)); }}
          type="text"
        />
        <div className={s.metaRow}>
          <small>
            {formatBytes(spell.size || 0)}
            {spell.totalPages > 0 && ` · ${spell.totalPages} ${spell.totalPages === 1 ? t.spell.pageSingular : t.spell.pagePlural}`}
          </small>
          {!jobId && (
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
        {job?.status === 'processing' ? (
          <>
            <div className={s.processingSpinner} />
            <span className={s.processingPct}>{pct}%</span>
          </>
        ) : job?.status === 'queued' ? (
          <FontAwesomeIcon icon={faHourglassHalf} className={s.queuedIcon} />
        ) : job?.status === 'done' ? (
          <FontAwesomeIcon icon={faCheck} className={s.doneIcon} />
        ) : (
          <>
            <button onClick={handleCreate} className={s.continueButton} title={t.editor.createSpell}>
              <FontAwesomeIcon icon={faUpload} />
            </button>
            {onRemove && (
              <button onClick={onRemove} className={s.removeBtn} title={t.common.delete}>
                <FontAwesomeIcon icon={faTrash} />
              </button>
            )}
          </>
        )}
      </div>
      {isActive && (
        <div className={s.progressBar} style={{ width: `${pct}%` }} />
      )}
    </div>
  );
};
