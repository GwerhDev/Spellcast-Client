import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import s from './SearchButton.module.css';

interface SearchButtonProps {
  // What it's called for a screen reader (and its tooltip).
  label: string;
  onClick: () => void;
}

// The header's search: a magnifying glass, beside the notifications' bell, that opens the
// app's search (a modal).
export const SearchButton = ({ label, onClick }: SearchButtonProps) => (
  <button type="button" className={s.button} onClick={onClick} title={label} aria-label={label} data-testid="search-button">
    <FontAwesomeIcon icon={faMagnifyingGlass} />
  </button>
);
