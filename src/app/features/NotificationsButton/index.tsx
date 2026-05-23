import React, { useRef, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faFile, faXmark } from '@fortawesome/free-solid-svg-icons';
import { RootState } from '../../../store';
import { clearHistory, markHistoryRead, UploadHistoryEntry } from '../../../store/pdfUploadSlice';
import { useLanguage } from '../../../i18n';
import s from './index.module.css';

const timeAgo = (ts: number, t: { justNow: string; minutesAgo: string; hoursAgo: string }): string => {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return t.justNow;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return t.minutesAgo.replace('{n}', String(mins));
  return t.hoursAgo.replace('{n}', String(Math.floor(mins / 60)));
};

const HistoryRow: React.FC<{ entry: UploadHistoryEntry; t: ReturnType<typeof useLanguage>['t'] }> = ({ entry, t }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isDone = entry.status === 'done';

  const handleClick = () => {
    if (isDone && entry.resultDocId) {
      navigate(`/document/${entry.resultDocId}`);
    }
  };

  return (
    <div
      className={`${s.row} ${isDone && entry.resultDocId ? s.rowClickable : ''}`}
      onClick={handleClick}
      title={isDone && entry.resultDocId ? t.document.continueReading : undefined}
    >
      <div className={`${s.rowIcon} ${isDone ? s.rowIconDone : s.rowIconError}`}>
        <FontAwesomeIcon icon={faFile} />
      </div>
      <div className={s.rowInfo}>
        <span className={s.rowTitle}>{entry.title}</span>
        <span className={`${s.rowStatus} ${isDone ? s.rowStatusDone : s.rowStatusError}`}>
          {isDone ? t.document.created : (entry.errorMessage ?? 'Error')}
        </span>
      </div>
      <span className={s.rowTime}>{timeAgo(entry.completedAt, t.notifications)}</span>
    </div>
  );
};

export const NotificationsButton: React.FC = () => {
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const history = useSelector((state: RootState) => state.pdfUpload.history);
  const unread = useSelector((state: RootState) => state.pdfUpload.unreadHistory);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(o => !o);
    if (unread > 0) dispatch(markHistoryRead());
  };

  return (
    <div data-testid="notifications-button" className={s.root} ref={ref}>
      <button className={s.btn} onClick={handleOpen}>
        <FontAwesomeIcon icon={faBell} />
        {unread > 0 && <span className={s.badge} />}
      </button>

      {open && (
        <div className={s.popover}>
          <div className={s.popoverHeader}>
            <span className={s.popoverTitle}>{t.notifications.title}</span>
            {history.length > 0 && (
              <button className={s.clearBtn} onClick={() => dispatch(clearHistory())}>
                <FontAwesomeIcon icon={faXmark} />
                {t.notifications.clearAll}
              </button>
            )}
          </div>
          {history.length === 0
            ? <p className={s.empty}>{t.notifications.empty}</p>
            : <div className={s.list}>
                {history.map(entry => (
                  <HistoryRow key={entry.id} entry={entry} t={t} />
                ))}
              </div>
          }
        </div>
      )}
    </div>
  );
};
