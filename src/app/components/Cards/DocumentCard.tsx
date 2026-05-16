import s from './DocumentCard.module.css';
import { useMemo, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faTrash, faPen, faPlay, faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { Document } from 'src/interfaces';
import { useLanguage } from '../../../i18n';

interface DocumentCardProps {
  doc: Document;
  isActive?: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  onPlay?: (e: React.MouseEvent) => void;
}

export const DocumentCard = ({ doc, isActive, onClick, onDelete, onEdit, onPlay }: DocumentCardProps) => {
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

  return (
    <div className={`${s.card} ${isActive ? s.cardActive : ''}`} onClick={onClick}>
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
      {isActive && <span className={s.readingTag}>{t.document.reading}</span>}
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
