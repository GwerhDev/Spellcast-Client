import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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
// The bar opens its place in the layout (its height, and the layout's gap above it) while
// the player rises into it, and closes it the same way when unloaded -- instead of the page
// jumping to make room. Clipped only while it moves, so the player's shadows and menus
// aren't cut once it's there.
const GAP = '0.5rem'; // .app-container's gap (globals.css)
const slotIn = { height: 'auto', marginTop: 0, transitionEnd: { overflow: 'visible' } };
const slotOut = { height: 0, marginTop: `-${GAP}`, overflow: 'hidden' };
const barIn = { opacity: 1, y: 0 };
const barOut = { opacity: 0, y: 24 };

export const PlayerDock = ({ children, showEmpty, highlighted, hint, onDragEnter, onDragOver, onDragLeave, onDrop }: PlayerDockProps) => {
  const hasPlayer = !!children;
  const dropHandlers = { onDragEnter, onDragOver, onDragLeave, onDrop };
  const reduced = useReducedMotion();
  const transition = reduced ? { duration: 0 } : { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <>
      {/* The empty slot isn't part of the layout at all: it floats over the bottom of the
          window, portaled to <body>, so appearing mid-drag can never resize or add a
          scrollbar to anything on the page (the spells being dragged from included). */}
      {!hasPlayer && showEmpty && createPortal(
        <div
          data-testid="player-dock"
          className={`${s.floating} ${highlighted ? s.highlighted : ''}`}
          {...dropHandlers}
        >
          <div data-testid="player-dock-empty" className={s.emptyHint}>
            <FontAwesomeIcon icon={faRightToBracket} rotation={90} />
            <span>{hint}</span>
          </div>
        </div>,
        document.body,
      )}
      {/* Not on the first paint: a player already loaded then is just there. */}
      <AnimatePresence initial={false}>
        {hasPlayer && (
          <motion.div
            key="dock"
            data-testid="player-dock-slot"
            className={s.slot}
            initial={slotOut}
            animate={slotIn}
            exit={slotOut}
            transition={transition}
          >
            <motion.div
              data-testid="player-dock"
              // .audioplayer-container keeps the layout's own rules for this bar (globals.css).
              className={`audioplayer-container ${s.dock} ${highlighted ? s.highlighted : ''}`}
              initial={barOut}
              animate={barIn}
              exit={barOut}
              transition={transition}
              {...dropHandlers}
            >
              {children}
              {highlighted && (
                <div data-testid="player-dock-overlay" className={s.overlay} aria-hidden="true">
                  <FontAwesomeIcon icon={faRightToBracket} rotation={90} />
                  <span>{hint}</span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
