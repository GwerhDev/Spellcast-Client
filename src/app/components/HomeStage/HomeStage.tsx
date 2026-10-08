import React, { useEffect, useRef, useState, type FocusEvent, type ReactNode } from 'react';
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
  // altar): the page gets that much more room below, the scene staying where it is.
  sceneOverflow?: number;
  // A layer over the whole stage (e.g. a 3D scene drawing the secondary content's objects):
  // over the secondary content, under the scene (the altar) -- or over it too while
  // `layerRaised` (e.g. a book being carried onto the altar).
  layer?: ReactNode;
  layerRaised?: boolean;
}

// The home page as a stage: with a spell loaded, its cover fills the whole page (blurred,
// dimmed, glowing behind the center, the altar's own treatment at page size) and the
// secondary content is docked at the bottom of the view, peeking: three quarters of its
// `[data-dock-peek]` part showing, what's above it (`[data-dock-reveal]`, e.g. a link)
// hidden. Pointed at, or near (a band above it counts), or with keyboard focus in it, it
// rises whole; while the pointer rests it goes down out of view, leaving the scene alone.
// The backdrop spans the whole stage, and what it shows sits in a layer as tall as the
// page's visible area, stuck to its top: the page scrolls, the cover stays put (attached),
// filling the visible area edge to edge however far down the page is.
export const HomeStage = ({ coverUrl, immersive, idle, main, secondary, corner, sceneOverflow = 0, layer, layerRaised = false }: HomeStageProps) => {
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
  const secondaryRef = useRef<HTMLDivElement>(null);
  // Making room for the scene's overflow below it, the page gets longer below the scene; the
  // scene keeps its height (it would otherwise grow and, centered, move), so it stays where
  // it is, and the page scrolls down to the rest of it.
  const overflow = immersive ? sceneOverflow : 0;
  // Docked (immersive): how far it sits down while peeking -- what's below its peeking part,
  // and a quarter of that part -- and how much of it shows then (three quarters of that
  // part; what's above it is hidden), which the scene leaves free below it.
  const [peek, setPeek] = useState<{ hidden: number; shown: number } | null>(null);
  useEffect(() => {
    const dock = secondaryRef.current;
    if (!immersive || !dock || typeof ResizeObserver === 'undefined') { setPeek(null); return; }
    const measure = () => {
      const part = dock.querySelector<HTMLElement>('[data-dock-peek]');
      if (!part) { setPeek(null); return; }
      // Rects, not offsets: both moved alike by the dock's own shift, the difference stands.
      const below = dock.getBoundingClientRect().bottom - part.getBoundingClientRect().bottom;
      setPeek({ hidden: Math.round(below + part.offsetHeight / 4), shown: Math.round(part.offsetHeight * 3 / 4) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(dock);
    const part = dock.querySelector('[data-dock-peek]');
    if (part) observer.observe(part);
    return () => observer.disconnect();
  }, [immersive]);
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
      {/* The page's top right corner (the altar's settings): over everything, and with a spell
          loaded, always in view at the top as the page scrolls. */}
      {corner && (
        <div className={immersive ? s.cornerAnchorSticky : s.cornerAnchor}>
          <div data-testid="home-stage-corner" className={`${s.corner} ${immersive && idle ? s.cornerHidden : ''}`}>
            {corner}
          </div>
        </div>
      )}
      <div
        data-testid="home-stage-main"
        className={s.main}
        style={immersive ? { paddingBottom: peek?.shown ?? 0, marginBottom: overflow } : undefined}
      >
        {main}
      </div>
      {/* Docked, it hangs from the bottom of the view (an anchor stuck there, taking no room). */}
      <div className={immersive ? s.dockAnchor : undefined}>
      <div
        ref={secondaryRef}
        data-testid="home-stage-secondary"
        data-docked={immersive || undefined}
        style={immersive ? { '--dock-hidden': `${peek?.hidden ?? 0}px` } as React.CSSProperties : undefined}
        className={`${s.secondary} ${immersive ? s.dock : ''} ${secondaryHidden ? s.secondaryHidden : ''}`}
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
    {layer && (
      <div data-testid="home-stage-layer" className={`${s.layer} ${layerRaised ? s.layerRaised : ''}`}>
        {layer}
      </div>
    )}
  </div>
);
};
