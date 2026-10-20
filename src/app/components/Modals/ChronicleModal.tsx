import s from './ChronicleModal.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
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
  // Opening a seal: what it changed.
  onOpen?: (id: string) => void;
  // The work's changes not sealed yet, first in the list (when there are any).
  unsealed?: { label: string; onOpen: () => void } | null;
  openLabel?: string;
  onClose: () => void;
}

// A version's chronicle: its seals, newest first, each with when it was made and what changed;
// each one opens what it changed.
export const ChronicleModal = ({ show, title, items, onOpen, unsealed, openLabel, onClose }: ChronicleModalProps) => (
  <CustomModal compact show={show} onClose={onClose} title={title}>
    {items === null ? (
      <div className={s.loading}><Spinner isLoading /></div>
    ) : (
      <ol className={s.list} data-testid="chronicle-list">
        {unsealed && (
          <li className={`${s.item} ${s.itemUnsealed}`}>
            <span className={s.dot} aria-hidden="true" />
            <button type="button" className={s.open} data-testid="chronicle-unsealed" onClick={unsealed.onOpen} title={openLabel}>
              <span className={s.date}>{unsealed.label}</span>
              <FontAwesomeIcon icon={faChevronRight} className={s.chevron} />
            </button>
          </li>
        )}
        {items.map(item => (
          <li key={item.id} className={s.item} data-testid="chronicle-item">
            <span className={s.dot} aria-hidden="true" />
            {onOpen ? (
              <button type="button" className={s.open} data-testid={`chronicle-open-${item.id}`} onClick={() => onOpen(item.id)} title={openLabel}>
                <span className={s.date}>{item.date}</span>
                <span className={s.summary}>{item.summary}</span>
                <FontAwesomeIcon icon={faChevronRight} className={s.chevron} />
              </button>
            ) : (
              <span className={s.entry}>
                <span className={s.date}>{item.date}</span>
                <span className={s.summary}>{item.summary}</span>
              </span>
            )}
          </li>
        ))}
      </ol>
    )}
  </CustomModal>
);
