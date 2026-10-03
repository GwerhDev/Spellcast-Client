import { useState, type FocusEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import s from './HomeStage.module.css';

// Whether focus landing on an element is keyboard focus (Tab), not a click's: only that
// keeps the secondary content in view while idle. Unsupported selector: treated as a click.
const isKeyboardFocus = (el: Element) => {
  try { return el.matches(':focus-visible'); } catch { return false; }
};

// Quoted: blob: URLs can contain characters an unquoted url() rejects.
const cssUrl = (url: string) => `url("${url}")`;

interface HomeStageProps {
  // The loaded spell's cover: the whole stage takes it as its backdrop. None: a plain page.
  coverUrl: string | null;
  // A spell is loaded: the scene is shown on its own (see HomeStage), cover or not.
  immersive: boolean;
  // The pointer has been left alone: the secondary content steps aside.
  idle: boolean;
  // The scene (the altar) and what sits below it (e.g. Last Spells).
  main: ReactNode;
  secondary: ReactNode;
  // Over the page's top right corner (e.g. the altar's settings), stepping aside with the
  // secondary content while the pointer rests.
  corner?: ReactNode;
}

// The home page as a stage: with a spell loaded, its cover fills the whole page (blurred,
// dimmed, glowing behind the center, the altar's own treatment at page size) and the
// secondary content below fades away while the pointer rests, leaving the scene alone.
// The backdrop is attached to the stage's frame, which doesn't scroll: the content scrolls
// over it in its own scroller, so the cover always fills the page, edge to edge.
export const HomeStage = ({ coverUrl, immersive, idle, main, secondary, corner }: HomeStageProps) => {
  // Someone moving through the secondary content with the keyboard isn't touching the
  // pointer, so it goes idle under them: while they're in it, it stays.
  const [keyboardInside, setKeyboardInside] = useState(false);
  const secondaryHidden = immersive && idle && !keyboardInside;
  const handleFocus = (e: FocusEvent<HTMLDivElement>) => setKeyboardInside(isKeyboardFocus(e.target));
  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setKeyboardInside(false);
  };
  return (
  <div data-testid="home-stage" className={`${s.stage} ${immersive ? s.immersive : ''}`}>
    {/* Fades in as a spell loads and out as it's unloaded (or crossfades to the next). */}
    <AnimatePresence>
      {coverUrl && (
        <motion.div
          key={coverUrl}
          className={s.backdrop}
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
          <div data-testid="home-stage-cover" className={s.cover} style={{ backgroundImage: cssUrl(coverUrl) }} />
          <div className={s.glow} style={{ backgroundImage: cssUrl(coverUrl) }} />
        </motion.div>
      )}
    </AnimatePresence>
    {corner && (
      <div data-testid="home-stage-corner" className={`${s.corner} ${immersive && idle ? s.cornerHidden : ''}`}>
        {corner}
      </div>
    )}
    <div data-testid="home-stage-scroller" className={s.scroller}>
      {main}
      <div
        data-testid="home-stage-secondary"
        className={`${s.secondary} ${secondaryHidden ? s.secondaryHidden : ''}`}
        // inert, not aria-hidden: hidden from assistive technology all the same, and it also
        // takes focus out of it (a card clicked keeps focus) -- aria-hidden over a focused
        // element is invalid ARIA, and the browser blocks it.
        inert={secondaryHidden || undefined}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {secondary}
      </div>
    </div>
  </div>
);
};
