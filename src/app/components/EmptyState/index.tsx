import s from './index.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';

interface EmptyStateProps {
  icon: IconProp;
  message: string;
  testId?: string;
}

// Presentational (Layer 4): the "nothing to show here" panel shared by every full-page
// spell list (SpellList, GrimoireLanding, EditorSelectLanding) -- these used to each carry
// their own near-identical copy of this layout with slightly different values. Not used by
// NotificationsButton's dropdown empty state, which is a genuinely different, smaller
// context with its own design tokens.
export const EmptyState = ({ icon, message, testId }: EmptyStateProps) => (
  <div className={s.empty} data-testid={testId}>
    <FontAwesomeIcon icon={icon} className={s.emptyIcon} />
    <p>{message}</p>
  </div>
);
