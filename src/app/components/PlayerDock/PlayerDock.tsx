import type { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightToBracket } from '@fortawesome/free-solid-svg-icons';
import s from './PlayerDock.module.css';

interface PlayerDockProps {
  // The player, when a spell is loaded; null leaves the dock empty.
  children?: ReactNode;
  // Show the empty dock (nothing loaded) -- e.g. while a spell is dragged near it.
  showEmpty: boolean;
  // A spell is being dragged over the dock itself.
  highlighted: boolean;
  // What dropping does here, shown over the player or inside the empty dock.
  hint: string;
  onDragEnter?: React.DragEventHandler<HTMLDivElement>;
  onDragOver?: React.DragEventHandler<HTMLDivElement>;
  onDragLeave?: React.DragEventHandler<HTMLDivElement>;
  onDrop?: React.DragEventHandler<HTMLDivElement>;
}

// The bar at the bottom where the player lives, and a drop target for spells: with a spell
// loaded it's the player itself (dropping switches spells); with none it only appears when
// asked to (showEmpty), as an empty slot to drop one into.
export const PlayerDock = ({ children, showEmpty, highlighted, hint, onDragEnter, onDragOver, onDragLeave, onDrop }: PlayerDockProps) => {
  const hasPlayer = !!children;
  if (!hasPlayer && !showEmpty) return null;

  return (
    <div
      data-testid="player-dock"
      // .audioplayer-container keeps the layout's own rules for this bar (globals.css).
      className={`audioplayer-container ${s.dock} ${hasPlayer ? '' : s.empty} ${highlighted ? s.highlighted : ''}`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {hasPlayer ? children : (
        <div data-testid="player-dock-empty" className={s.emptyHint}>
          <FontAwesomeIcon icon={faRightToBracket} rotation={90} />
          <span>{hint}</span>
        </div>
      )}
      {hasPlayer && highlighted && (
        <div data-testid="player-dock-overlay" className={s.overlay} aria-hidden="true">
          <FontAwesomeIcon icon={faRightToBracket} rotation={90} />
          <span>{hint}</span>
        </div>
      )}
    </div>
  );
};
