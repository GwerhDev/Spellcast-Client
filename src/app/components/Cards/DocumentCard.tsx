import s from './DocumentCard.module.css';
import { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faTrash, faPen, faPlay } from '@fortawesome/free-solid-svg-icons';
import { Document } from 'src/interfaces';

interface DocumentCardProps {
  doc: Document;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  onPlay?: (e: React.MouseEvent) => void;
}

export const DocumentCard = ({ doc, onClick, onDelete, onEdit, onPlay }: DocumentCardProps) => {
  const totalPages = useMemo(() => {
    if (!doc.pagesContent) return null;
    try { return JSON.parse(doc.pagesContent).length; } catch { return null; }
  }, [doc.pagesContent]);

  const currentPage = doc.progress?.currentPage ?? 0;
  const progressPct = (totalPages && currentPage > 0)
    ? Math.min(Math.round(currentPage / totalPages * 100), 100)
    : null;

  return (
    <div className={s.card} onClick={onClick}>
      <div className={s.actions}>
        <button className={s.actionButton} onClick={onEdit}>
          <FontAwesomeIcon icon={faPen} />
        </button>
        <button className={`${s.actionButton} ${s.deleteButton}`} onClick={onDelete}>
          <FontAwesomeIcon icon={faTrash} />
        </button>
      </div>
      {onPlay && (
        <button className={s.playAction} onClick={(e) => { e.stopPropagation(); onPlay(e); }}>
          <FontAwesomeIcon icon={faPlay} />
        </button>
      )}
      <FontAwesomeIcon icon={faFilePdf} size="3x" className={s.icon} />
      <span className={s.title}>{doc.title}</span>
      {progressPct !== null ? (
        <div className={s.progressBar}>
          <div className={s.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
      ) : (
        <small className={s.date}>{new Date(doc.createdAt).toLocaleDateString()}</small>
      )}
      {currentPage > 0 && (
        <small className={s.progress}>
          p. {currentPage}{totalPages ? ` / ${totalPages}` : ''}
        </small>
      )}
    </div>
  );
};
