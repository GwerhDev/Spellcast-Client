import s from './EditorPickerCard.module.css';
import { useMemo, useEffect, useState } from 'react';
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

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!doc.cover) return;
    const url = URL.createObjectURL(doc.cover);
    setCoverUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [doc.cover]);

  return (
    <div className={s.card} onClick={onClick}>
      {coverUrl
        ? <img src={coverUrl} alt={doc.title} className={s.cover} />
        : <div className={s.iconWrapper}><FontAwesomeIcon icon={faFilePdf} className={s.icon} /></div>
      }
      <div className={s.footer}>
        <span className={s.title}>{doc.title}</span>
        <small className={s.meta}>
          {new Date(doc.createdAt).toLocaleDateString()}
          {totalPages ? ` · ${totalPages}p` : ''}
        </small>
      </div>
    </div>
  );
};
