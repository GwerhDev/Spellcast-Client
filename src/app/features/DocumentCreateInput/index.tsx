import s from '../../components/Inputs/DocumentCreateInput.module.css';
import { useEffect, useRef, useState } from 'react';
import { faUpload, faFileCircleCheck, faFilePdf, faFileWord, faXmark, faHourglassHalf, faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useDispatch } from 'react-redux';
import { setDocumentTitle } from '../../../store/documentSlice';
import { DocumentState } from '../../../interfaces';
import { useAppSelector } from '../../../store/hooks';
import { enqueueUpload } from '../../../store/pdfUploadSlice';
import { useLanguage } from '../../../i18n';

interface DocumentCreateInputProps {
  document: DocumentState;
  onRemove?: () => void;
  onDone?: (resultDocId?: string) => void;
  autoCreate?: boolean;
}

export const DocumentCreateInput = (props: DocumentCreateInputProps) => {
  const { document, onRemove, onDone, autoCreate } = props;
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
    if (!document.fileContent || !userData?.id || jobId) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    dispatch(enqueueUpload({
      id,
      title: document.title || t.document.untitled,
      fileContent: document.fileContent,
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
    <div data-testid="document-create-input" className={`${s.container} ${isActive ? s.containerActive : ''}`}>
      {onRemove && !jobId && (
        <button className={s.removeBtn} onClick={onRemove} title="Remove">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      )}
      <FontAwesomeIcon size="2x" icon={getFileTypeIcon(document.type)} />
      <div className={s.metadata} onMouseLeave={() => setEditTitle(false)}>
        <input
          placeholder={t.document.titleInputPlaceholder}
          readOnly={document.title.length > 0 && !editTitle || !!jobId}
          className={s.title}
          onClick={() => { if (!jobId) setEditTitle(true); }}
          value={document.title}
          onChange={(e) => { if (!jobId) dispatch(setDocumentTitle(e.target.value)); }}
          type="text"
        />
        <div className={s.metaRow}>
          <small>
            {formatBytes(document.size || 0)}
            {document.totalPages > 0 && ` · ${document.totalPages} ${document.totalPages === 1 ? t.document.pageSingular : t.document.pagePlural}`}
          </small>
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
            <button onClick={handleCreate} className={s.continueButton} title={t.editor.createDocument}>
              <FontAwesomeIcon icon={faUpload} />
            </button>
            <div className={s.toggleGroup}>
              <span className={s.toggleLabel}>{t.common.saveOriginal}</span>
              <button
                type="button"
                role="switch"
                aria-checked={saveOriginal}
                className={`${s.toggle} ${saveOriginal ? s.toggleOn : ''}`}
                onClick={() => setSaveOriginal(v => !v)}
              >
                <span className={`${s.toggleThumb} ${saveOriginal ? s.toggleThumbOn : ''}`} />
              </button>
            </div>
          </>
        )}
      </div>
      {isActive && (
        <div className={s.progressBar} style={{ width: `${pct}%` }} />
      )}
    </div>
  );
};
