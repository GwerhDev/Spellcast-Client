import s from './DocumentCard.module.css';
import { useMemo, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faTrash, faPen, faPlay, faPause, faEllipsisVertical, faHourglassHalf, faCheck } from '@fortawesome/free-solid-svg-icons';
import { Document } from '../../../interfaces';
import { useLanguage } from '../../../i18n';
import { Tag } from '../Tag/Tag';
import { Waveform } from '../Waveform/Waveform';

interface UploadJob {
  status: 'queued' | 'processing' | 'done' | 'error';
  progress: { current: number; total: number } | null;
}

interface DocumentCardProps {
  doc: Document;
  isActive?: boolean;
  isPlaying?: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  onPlay?: (e: React.MouseEvent) => void;
  uploadJob?: UploadJob | null;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export const DocumentCard = ({ doc, isActive, isPlaying, onClick, onDelete, onEdit, onPlay, uploadJob, selectionMode, selected, onToggleSelect }: DocumentCardProps) => {
  const { t } = useLanguage();
  const totalPages = useMemo(() => {
    if (!doc.pagesContent) return null;
    try { return JSON.parse(doc.pagesContent).length; } catch { return null; }
  }, [doc.pagesContent]);

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!doc.cover) return;
    const url = URL.createObjectURL(doc.cover);
    setCoverUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [doc.cover]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.left });
    setMenuOpen(o => !o);
  };

  const currentPage = doc.progress?.currentPage ?? 0;
  const progressPct = (totalPages && currentPage > 0)
    ? Math.min(Math.round(currentPage / totalPages * 100), 100)
    : null;

  const handleClick = () => {
    if (selectionMode) { onToggleSelect?.(); return; }
    onClick();
  };

  return (
    <div
      data-testid={`document-card-${doc.id}`}
      className={`${s.card} ${isActive ? s.cardActive : ''} ${selected ? s.cardSelected : ''}`}
      onClick={handleClick}
    >
      {selectionMode && (
        <div className={s.selectionOverlay}>
          <span className={`${s.checkbox} ${selected ? s.checkboxSelected : ''}`}>
            {selected && <FontAwesomeIcon icon={faCheck} style={{ fontSize: '0.6rem', color: '#0a0c10' }} />}
          </span>
        </div>
      )}
      <div className={`${s.actions} ${menuOpen ? s.actionsVisible : ''}`}>
        <button ref={btnRef} className={s.menuButton} onClick={openMenu}>
          <FontAwesomeIcon icon={faEllipsisVertical} />
        </button>
      </div>
      {menuOpen && createPortal(
        <div
          ref={menuRef}
          className={s.contextMenu}
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          <button className={s.menuItem} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(e); }}>
            <FontAwesomeIcon icon={faPen} />
            {t.common.edit}
          </button>
          <button className={`${s.menuItem} ${s.menuItemDanger}`} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(e); }}>
            <FontAwesomeIcon icon={faTrash} />
            {t.common.delete}
          </button>
        </div>,
        document.body
      )}
      {onPlay && (
        <button
          className={`${s.playAction} ${isPlaying ? s.playActionPlaying : isActive ? s.playActionActive : ''}`}
          onClick={(e) => { e.stopPropagation(); onPlay(e); }}
        >
          <span className={s.playIcon}>
            <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
          </span>
        </button>
      )}
      <div className={s.coverWrapper}>
        {coverUrl
          ? <img src={coverUrl} alt={doc.title} className={s.cover} />
          : <div className={s.iconWrapper}><FontAwesomeIcon icon={faFilePdf} className={s.icon} /></div>
        }
        <div className={s.coverTags}>
          {isPlaying && <Tag tone="live" size="sm" dot>{t.document.reading}</Tag>}
          {isActive && !isPlaying && <Tag tone="primary" size="sm">{t.document.reading}</Tag>}
        </div>
        {uploadJob && (
          <div className={s.uploadOverlay}>
            {uploadJob.status === 'processing' ? (
              <>
                <div className={s.uploadSpinnerRing} />
                <span className={s.uploadPct}>
                  {uploadJob.progress
                    ? `${Math.round(uploadJob.progress.current / uploadJob.progress.total * 100)}%`
                    : '…'}
                </span>
              </>
            ) : (
              <FontAwesomeIcon icon={faHourglassHalf} className={s.uploadPendingIcon} />
            )}
          </div>
        )}
      </div>
      <div className={s.footer}>
        <div className={s.titleRow}>
          <span className={s.title}>{doc.title}</span>
          {isPlaying && <Waveform active bars={3} height={10} />}
        </div>
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
