import s from './ChronicleModal.module.css';
import { CustomModal } from './CustomModal';
import { Spinner } from '../Spinner';

export interface ChronicleItem {
  id: string;
  date: string;
  summary: string;
}

interface ChronicleModalProps {
  show: boolean;
  title: string;
  // null while it's being read.
  items: ChronicleItem[] | null;
  onClose: () => void;
}

// A version's chronicle: its seals, newest first, each with when it was made and what changed.
export const ChronicleModal = ({ show, title, items, onClose }: ChronicleModalProps) => (
  <CustomModal compact show={show} onClose={onClose} title={title}>
    {items === null ? (
      <div className={s.loading}><Spinner isLoading /></div>
    ) : (
      <ol className={s.list} data-testid="chronicle-list">
        {items.map(item => (
          <li key={item.id} className={s.item} data-testid="chronicle-item">
            <span className={s.dot} aria-hidden="true" />
            <span className={s.date}>{item.date}</span>
            <span className={s.summary}>{item.summary}</span>
          </li>
        ))}
      </ol>
    )}
  </CustomModal>
);
