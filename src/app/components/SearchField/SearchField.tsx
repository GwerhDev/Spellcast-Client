import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import s from './SearchField.module.css';

interface SearchFieldProps {
  // Its placeholder.
  label: string;
  onClick: () => void;
}

// The header's search: looks like a search field, and opens the app's search (a modal).
export const SearchField = ({ label, onClick }: SearchFieldProps) => (
  <button type="button" className={s.field} onClick={onClick} data-testid="search-field">
    <FontAwesomeIcon icon={faMagnifyingGlass} className={s.icon} />
    <span className={s.placeholder}>{label}</span>
  </button>
);
