import s from './DocumentCard.module.css';
import { useMemo, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faTrash, faPen, faPlay } from '@fortawesome/free-solid-svg-icons';
import { Document } from 'src/interfaces';

interface DocumentCardProps {
  doc: Document;
  isActive?: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  onPlay?: (e: React.MouseEvent) => void;
}

export const DocumentCard = ({ doc, isActive, onClick, onDelete, onEdit, onPlay }: DocumentCardProps) => {
  const totalPages = useMemo(() => {
    if (!doc.pagesContent) return null;
    try { return JSON.parse(doc.pagesContent).length; } catch { return null; }
  }, [doc.pagesContent]);

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!doc.cover) return;
    const url = URL.createObjectURL(doc.cover);
    setCoverUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [doc.cover]);

  const currentPage = doc.progress?.currentPage ?? 0;
  const progressPct = (totalPages && currentPage > 0)
    ? Math.min(Math.round(currentPage / totalPages * 100), 100)
    : null;

  return (
    <div className={`${s.card} ${isActive ? s.cardActive : ''}`} onClick={onClick}>
      <div className={s.actions}>
        <button className={s.actionButton} onClick={onEdit}>
          <FontAwesomeIcon icon={faPen} />
        </button>
        <button className={`${s.actionButton} ${s.deleteButton}`} onClick={onDelete}>
          <FontAwesomeIcon icon={faTrash} />
        </button>
      </div>
      {isActive && <span className={s.readingTag}>READING</span>}
      {onPlay && (
        <button className={s.playAction} onClick={(e) => { e.stopPropagation(); onPlay(e); }}>
          <FontAwesomeIcon icon={faPlay} />
        </button>
      )}
      <div className={s.coverWrapper}>
        {coverUrl
          ? <img src={coverUrl} alt={doc.title} className={s.cover} />
          : <div className={s.iconWrapper}><FontAwesomeIcon icon={faFilePdf} className={s.icon} /></div>
        }
      </div>
      <div className={s.footer}>
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
    </div>
  );
};
