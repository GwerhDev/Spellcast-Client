import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faScroll } from '@fortawesome/free-solid-svg-icons';
import s from './EmptySpellCard.module.css';

// A place a spell could be, with none in it: the size of a spell card, dashed like the
// place a dragged card leaves behind. Fills rows that have fewer spells than places.
export const EmptySpellCard = ({ testId = 'empty-spell-card' }: { testId?: string }) => (
  <div data-testid={testId} className={s.card} aria-hidden="true">
    <FontAwesomeIcon icon={faScroll} className={s.icon} />
  </div>
);
