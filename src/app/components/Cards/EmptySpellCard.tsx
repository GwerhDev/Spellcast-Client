import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { SPELL_ICON } from '../../../config/consts';
import s from './EmptySpellCard.module.css';

// A place a spell could be, with none in it: the size of a spell card, dashed like the
// place a dragged card leaves behind. Fills rows that have fewer spells than places.
export const EmptySpellCard = ({ testId = 'empty-spell-card' }: { testId?: string }) => (
  <div data-testid={testId} className={s.card} aria-hidden="true">
    <FontAwesomeIcon icon={SPELL_ICON} className={s.icon} />
  </div>
);
