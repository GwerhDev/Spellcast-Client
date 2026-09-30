import type { ReactNode, Ref } from 'react';
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
  panelRef?: Ref<HTMLDivElement>;
  stageRef?: Ref<HTMLDivElement>;
  centerRef?: Ref<HTMLDivElement>;
  // Corner slots: typically AltarCornerButtons.
  leftCorner?: ReactNode;
  rightCorner?: ReactNode;
  // Floats over the stage, anchored to the center (e.g. the button's radial menu).
  stageOverlay?: ReactNode;
  // What sits in the middle of the rings: the button, or the waveform.
  center: ReactNode;
  // Under the stage: AltarNowReading or AltarHint.
  footer: ReactNode;
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
  coverUrl, highlighted, menuOpen, panelRef, stageRef, centerRef,
  leftCorner, rightCorner, stageOverlay, center, footer,
  onDragEnter, onDragOver, onDragLeave, onDrop, children,
}: AltarPanelProps) => (
  <div
    ref={panelRef}
    data-testid="altar"
    className={`${s.container} ${highlighted ? s.dragActive : ''} ${coverUrl ? s.hasCover : s.noCover} ${menuOpen ? s.menuOpen : ''}`}
    onDragEnter={onDragEnter}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onDrop={onDrop}
  >
    {coverUrl && (
      <>
        <div data-testid="altar-cover" className={s.panelCover} style={{ backgroundImage: cssUrl(coverUrl) }} aria-hidden="true" />
        <div className={s.panelGlow} style={{ backgroundImage: cssUrl(coverUrl) }} aria-hidden="true" />
      </>
    )}
    <span data-testid="altar-beam" className={s.beam} aria-hidden="true" />
    <span className={s.spark} aria-hidden="true" />
    {leftCorner && <div data-testid="altar-corner-left" className={`${s.cornerStack} ${s.cornerStackLeft}`}>{leftCorner}</div>}
    {rightCorner && <div data-testid="altar-corner-right" className={`${s.cornerStack} ${s.cornerStackRight}`}>{rightCorner}</div>}
    <div ref={stageRef} data-testid="altar-stage" className={s.stage}>
      <span className={s.ring} aria-hidden="true" />
      <span className={`${s.ring} ${s.ringOuter}`} aria-hidden="true" />
      {stageOverlay}
      <div ref={centerRef} className={s.button}>
        {center}
      </div>
    </div>
    {footer}
    {children}
  </div>
);
