import type { ReactNode, Ref } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import s from './Altar.module.css';

// Quoted: blob: URLs (and Vite's inlined SVG data URIs) can contain characters an unquoted
// url() rejects.
const cssUrl = (url: string) => `url("${url}")`;

interface AltarPanelProps {
  // The loaded spell's cover, filling the panel; without one the panel is transparent.
  coverUrl: string | null;
  // Something droppable is over the panel: its border lights up.
  highlighted: boolean;
  // The central button's menu is open (the hint steps aside, the rings react).
  menuOpen: boolean;
  // The page around the altar already shows the cover (see HomeStage): the panel drops its
  // own box and cover, and is only its contents, larger, over that backdrop.
  immersive?: boolean;
  panelRef?: Ref<HTMLDivElement>;
  stageRef?: Ref<HTMLDivElement>;
  centerRef?: Ref<HTMLDivElement>;
  // Corner slots: typically AltarCornerButtons.
  leftCorner?: ReactNode;
  rightCorner?: ReactNode;
  // Floats over the stage, anchored to the center (e.g. the button's radial menu).
  stageOverlay?: ReactNode;
  // What sits in the middle of the rings: the button, or the waveform. `centerKey` names
  // which one it is, so switching between them (a spell loading or unloading) animates.
  center: ReactNode;
  centerKey?: string;
  // Under the stage: AltarNowReading or AltarHint; `footerKey` names which, the same way.
  footer: ReactNode;
  footerKey?: string;
  // A spell is being summoned (loaded, its pages still being read): the rings pulse.
  summoning?: boolean;
  onDragEnter?: React.DragEventHandler<HTMLDivElement>;
  onDragOver?: React.DragEventHandler<HTMLDivElement>;
  onDragLeave?: React.DragEventHandler<HTMLDivElement>;
  onDrop?: React.DragEventHandler<HTMLDivElement>;
  children?: ReactNode;
}

// The altar's frame: the panel (which is also the whole drop target), the cover filling it,
// the corner slots, the stage with its rings around the center, and the footer line. The
// light beam and its spark are drawn from CSS variables the owner writes on panelRef and
// stageRef while a spell is dragged (see the Altar feature).
export const AltarPanel = ({
  coverUrl, highlighted, menuOpen, immersive = false, panelRef, stageRef, centerRef,
  leftCorner, rightCorner, stageOverlay, center, centerKey = 'center', footer, footerKey = 'footer', summoning = false,
  onDragEnter, onDragOver, onDragLeave, onDrop, children,
}: AltarPanelProps) => (
  <div
    ref={panelRef}
    data-testid="altar"
    className={`${s.container} ${highlighted ? s.dragActive : ''} ${immersive ? `${s.hasCover} ${s.immersive}` : coverUrl ? s.hasCover : s.noCover} ${menuOpen ? s.menuOpen : ''} ${summoning ? s.summoning : ''}`}
    onDragEnter={onDragEnter}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onDrop={onDrop}
  >
    {coverUrl && !immersive && (
      <>
        <div data-testid="altar-cover" className={s.panelCover} style={{ backgroundImage: cssUrl(coverUrl) }} aria-hidden="true" />
        <div className={s.panelGlow} style={{ backgroundImage: cssUrl(coverUrl) }} aria-hidden="true" />
      </>
    )}
    <span data-testid="altar-beam" className={s.beam} aria-hidden="true">
      <span className={s.beamCore} />
    </span>
    <span className={s.spark} aria-hidden="true" />
    {leftCorner && <div data-testid="altar-corner-left" className={`${s.cornerStack} ${s.cornerStackLeft}`}>{leftCorner}</div>}
    {rightCorner && <div data-testid="altar-corner-right" className={`${s.cornerStack} ${s.cornerStackRight}`}>{rightCorner}</div>}
    <div ref={stageRef} data-testid="altar-stage" className={s.stage}>
      <span className={s.ring} aria-hidden="true" />
      <span className={`${s.ring} ${s.ringOuter}`} aria-hidden="true" />
      {stageOverlay}
      <div ref={centerRef} className={s.button}>
        {/* One out, then the next in: shrinking and blurring away, growing into focus. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={centerKey}
            className={s.centerSwap}
            initial={{ opacity: 0, scale: 0.6, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.25, filter: 'blur(8px)' }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            {center}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
    {/* A fixed-height slot: whatever the footer shows (the title, the sentence being read,
        a hint), the altar keeps its size, so pausing or playing never moves it. */}
    <div data-testid="altar-footer" className={s.footerSlot}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={footerKey}
          className={s.footerSwap}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {footer}
        </motion.div>
      </AnimatePresence>
    </div>
    {children}
  </div>
);
