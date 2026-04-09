import s from './DocumentCard.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faTrash, faPen } from '@fortawesome/free-solid-svg-icons';
import { Document } from 'src/interfaces';

interface DocumentCardProps {
  doc: Document;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
}

export const DocumentCard = ({ doc, onClick, onDelete, onEdit }: DocumentCardProps) => {
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
      <FontAwesomeIcon icon={faFilePdf} size="3x" className={s.icon} />
      <span className={s.title}>{doc.title}</span>
      <small className={s.date}>{new Date(doc.createdAt).toLocaleDateString()}</small>
    </div>
  );
};
