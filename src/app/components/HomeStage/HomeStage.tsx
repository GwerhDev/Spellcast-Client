import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import s from './HomeStage.module.css';

// Whether focus landing on an element is keyboard focus (Tab), not a click's: only that
// keeps the secondary content in view while idle. Unsupported selector: treated as a click.
const isKeyboardFocus = (el: Element) => {
  try { return el.matches(':focus-visible'); } catch { return false; }
};

// The nearest ancestor that scrolls: the page's own scroller.
const scrollParentOf = (el: HTMLElement | null): HTMLElement | null => {
  for (let node = el?.parentElement ?? null; node; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
  }
  return null;
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
  // The scene (the altar) and what sits below it (e.g. the quick start).
  main: ReactNode;
  secondary: ReactNode;
  // Over the page's top right corner (e.g. the altar's settings), stepping aside with the
  // secondary content while the pointer rests.
  corner?: ReactNode;
  // How far the scene's content runs down past it, in px (e.g. a long sentence on the
  // altar): the secondary content moves down that much, the scene staying where it is.
  sceneOverflow?: number;
}

// The home page as a stage: with a spell loaded, its cover fills the whole page (blurred,
// dimmed, glowing behind the center, the altar's own treatment at page size) and the
// secondary content below fades away while the pointer rests, leaving the scene alone.
// The backdrop spans the whole stage, and what it shows sits in a layer as tall as the
// page's visible area, stuck to its top: the page scrolls, the cover stays put (attached),
// filling the visible area edge to edge however far down the page is.
export const HomeStage = ({ coverUrl, immersive, idle, main, secondary, corner, sceneOverflow = 0 }: HomeStageProps) => {
  // Someone moving through the secondary content with the keyboard isn't touching the
  // pointer, so it goes idle under them: while they're in it, it stays.
  const [keyboardInside, setKeyboardInside] = useState(false);
  const secondaryHidden = immersive && idle && !keyboardInside;
  const handleFocus = (e: FocusEvent<HTMLDivElement>) => setKeyboardInside(isKeyboardFocus(e.target));
  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setKeyboardInside(false);
  };
  // The page's visible height, for the attached layer (the window's until it's measured).
  const stageRef = useRef<HTMLDivElement>(null);
  const [viewHeight, setViewHeight] = useState<number | null>(null);
  useEffect(() => {
    const scroller = scrollParentOf(stageRef.current);
    if (!scroller || typeof ResizeObserver === 'undefined') return;
    const measure = () => setViewHeight(scroller.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);
  // The secondary content's height: with it, the scene's height when it fills the page.
  const secondaryRef = useRef<HTMLDivElement>(null);
  const [secondaryHeight, setSecondaryHeight] = useState<number | null>(null);
  useEffect(() => {
    const el = secondaryRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => setSecondaryHeight(el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // Making room for the scene's overflow below it, the secondary content moves down; the
  // scene keeps the height it fills the page with (it would otherwise give that room up and,
  // centered, rise), so it stays where it is.
  const overflow = immersive ? sceneOverflow : 0;
  const sceneMinHeight = overflow > 0 && viewHeight != null && secondaryHeight != null ? viewHeight - secondaryHeight : undefined;
  return (
  <div ref={stageRef} data-testid="home-stage" className={`${s.stage} ${immersive ? s.immersive : ''}`}>
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
          <div data-testid="home-stage-attached" className={s.attached} style={{ height: viewHeight ? `${viewHeight}px` : '100vh' }}>
            <div data-testid="home-stage-cover" className={s.cover} style={{ backgroundImage: cssUrl(coverUrl) }} />
            <div className={s.glow} style={{ backgroundImage: cssUrl(coverUrl) }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    <div data-testid="home-stage-scroller" className={s.scroller}>
      {/* With a spell loaded, everything above the quick start -- the scene and its corner
          (the altar's settings) -- stays in view at the top while the page scrolls, the
          quick start passing under it. */}
      <div data-testid="home-stage-main" className={immersive ? s.mainSticky : s.main} style={sceneMinHeight ? { minHeight: sceneMinHeight } : undefined}>
        {corner && (
          <div data-testid="home-stage-corner" className={`${s.corner} ${immersive && idle ? s.cornerHidden : ''}`}>
            {corner}
          </div>
        )}
        {main}
      </div>
      <div
        ref={secondaryRef}
        data-testid="home-stage-secondary"
        style={overflow > 0 ? { marginTop: overflow } : undefined}
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
