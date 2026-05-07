import s from './EditorPickerCard.module.css';
import { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf } from '@fortawesome/free-solid-svg-icons';
import { Document } from 'src/interfaces';

interface EditorPickerCardProps {
  doc: Document;
  onClick: () => void;
}

export const EditorPickerCard = ({ doc, onClick }: EditorPickerCardProps) => {
  const totalPages = useMemo(() => {
    if (!doc.pagesContent) return null;
    try { return JSON.parse(doc.pagesContent).length; } catch { return null; }
  }, [doc.pagesContent]);

  return (
    <div className={s.card} onClick={onClick}>
      <FontAwesomeIcon icon={faFilePdf} className={s.icon} />
      <span className={s.title}>{doc.title}</span>
      <small className={s.meta}>
        {new Date(doc.createdAt).toLocaleDateString()}
        {totalPages ? ` · ${totalPages}p` : ''}
      </small>
    </div>
  );
};
