import React, { useState } from 'react';
import s from './index.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../../store';
import { dismissUpload, PdfUploadJob } from '../../../store/pdfUploadSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFile, faXmark, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../../i18n';

const JobRow: React.FC<{ job: PdfUploadJob }> = ({ job }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const pct = job.progress
    ? Math.round((job.progress.current / job.progress.total) * 100)
    : job.status === 'processing' ? 4 : 0;

  const handleClick = () => {
    if (job.status === 'done' && job.resultDocId) {
      navigate(`/document/${job.resultDocId}`);
      dispatch(dismissUpload(job.id));
    }
  };

  const statusLabel = () => {
    switch (job.status) {
      case 'queued':     return t.document.creating;
      case 'processing': return job.progress
        ? `${t.document.processingPdf} ${job.progress.current}/${job.progress.total}`
        : t.document.processingPdf;
      case 'done':       return job.resultDocId ? t.document.created : t.common.saved;
      case 'error':      return job.errorMessage ?? 'Error';
    }
  };

  return (
    <div
      className={`${s.job} ${job.status === 'done' ? s.jobDone : ''}`}
      onClick={handleClick}
      title={job.status === 'done' && job.resultDocId ? t.document.continueReading : undefined}
    >
      {job.coverUrl
        ? <img src={job.coverUrl} className={s.jobThumb} alt="" />
        : <div className={s.jobIcon}><FontAwesomeIcon icon={faFile} /></div>
      }
      <div className={s.jobInfo}>
        <span className={s.jobTitle}>{job.title}</span>
        <span className={`${s.jobStatus} ${job.status === 'done' ? s.jobStatusDone : ''} ${job.status === 'error' ? s.jobStatusError : ''}`}>
          {statusLabel()}
        </span>
        {(job.status === 'processing' || job.status === 'queued') && (
          <div className={s.jobProgressTrack}>
            <div className={s.jobProgressFill} style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      {(job.status === 'done' || job.status === 'error') && (
        <button
          className={s.dismissBtn}
          onClick={(e) => { e.stopPropagation(); dispatch(dismissUpload(job.id)); }}
          title={t.common.close}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      )}
    </div>
  );
};

export const PdfUploadQueue: React.FC = () => {
  const { t } = useLanguage();
  const queue = useSelector((state: RootState) => state.pdfUpload.queue);
  const [minimized, setMinimized] = useState(false);

  if (queue.length === 0) return null;

  const activeCount = queue.filter(j => j.status === 'queued' || j.status === 'processing').length;

  if (minimized) {
    return (
      <div className={s.wrapper}>
        <button className={s.chip} onClick={() => setMinimized(false)}>
          {activeCount > 0 && <span className={s.chipDot} />}
          <span>
            {activeCount > 0
              ? `${activeCount} PDF${activeCount > 1 ? 's' : ''} ${t.document.processingPdf.toLowerCase()}`
              : `${queue.length} PDF${queue.length > 1 ? 's' : ''}`
            }
          </span>
          <FontAwesomeIcon icon={faChevronUp} style={{ fontSize: '0.6rem' }} />
        </button>
      </div>
    );
  }

  return (
    <div className={s.wrapper}>
      <div className={s.panel}>
        <div className={s.panelHeader}>
          <span className={s.panelTitle}>
            {activeCount > 0
              ? `${t.document.processingPdf} (${activeCount})`
              : `${queue.length} PDF${queue.length > 1 ? 's' : ''}`
            }
          </span>
          <button className={s.minimizeBtn} onClick={() => setMinimized(true)}>
            <FontAwesomeIcon icon={faChevronDown} />
          </button>
        </div>
        <div className={s.jobList}>
          {queue.map(job => <JobRow key={job.id} job={job} />)}
        </div>
      </div>
    </div>
  );
};
