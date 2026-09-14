import { useEffect } from 'react';
import { invalidate } from '@react-three/fiber';

// TCORE-127: the shared 3D cover-frame Canvas (CoverFrame3DRoot) runs frameloop="demand" --
// it only renders when something calls invalidate(), instead of ticking every browser frame
// regardless of whether anything on screen actually changed. react-three-fiber already
// auto-invalidates on its OWN scene-graph changes (a <View> mounting/unmounting -- covers a
// card list changing -- and its `visible` prop toggling -- covers a View entering/leaving
// the viewport gate, see useCoverFrame3DGate); this hook covers everything that moves a
// tracked card WITHOUT touching that scene graph at all, which r3f has no way to notice on
// its own.

// Only these actually move/resize an element's own box -- deliberately excludes color/
// opacity/box-shadow/etc, which don't move a tracked card's geometry and would otherwise
// spin the render loop back up on every unrelated hover-color transition in the app.
const LAYOUT_TRANSITION_PROPERTIES = new Set([
  'width', 'height', 'top', 'left', 'right', 'bottom', 'inset',
  'transform', 'flex-basis', 'flex-grow', 'flex-shrink',
  'margin', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom',
  'padding', 'padding-left', 'padding-right', 'padding-top', 'padding-bottom',
]);

// Safety cap in case a transitionend/transitioncancel is somehow missed for a started
// transition (removing an element mid-transition fires transitioncancel per spec, so this
// is defense-in-depth, not the expected path) -- caps how long a wedged counter could keep
// rendering, rather than forever.
const MAX_TRANSITION_INVALIDATE_MS = 2000;

export const useCoverFrame3DInvalidate = (): void => {
  useEffect(() => {
    // Any scroll (capture: true catches it from ANY scrollable descendant anywhere in the
    // document -- 'scroll' itself doesn't bubble, but IS dispatched to capture-phase
    // ancestor listeners, the same technique react-three-fiber's own Canvas measurement
    // uses for its ancestor scroll containers) or window resize moves/resizes some card's
    // tracked <View> element without touching r3f's scene graph at all.
    const onScrollOrResize = () => invalidate();
    window.addEventListener('scroll', onScrollOrResize, { capture: true, passive: true });
    window.addEventListener('resize', onScrollOrResize);

    // A pure CSS transition (the sidebar's rail<->panel `transition: width`, for one) also
    // moves a card without firing scroll/resize or touching r3f's scene graph -- demand mode
    // would otherwise render once at the transition's start and not again until something
    // else happens to invalidate, leaving the 3D content visibly frozen mid-transition while
    // the real DOM cover animates smoothly underneath it (the exact desync TCORE-124 already
    // fixed for the sidebar case specifically, by stabilizing the canvas' own measured size
    // -- switching to demand mode without this would silently reopen an equivalent gap for
    // ANY such transition). transitionrun/transitionend/transitioncancel all bubble, so one
    // set of listeners at the document root catches any qualifying transition anywhere, not
    // just the sidebar's.
    let activeTransitions = 0;
    let rafId: number | null = null;
    let hardStopAt = 0;
    const tick = () => {
      invalidate();
      if (activeTransitions > 0 && performance.now() < hardStopAt) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
        activeTransitions = 0;
      }
    };
    const onTransitionRun = (e: TransitionEvent) => {
      if (!LAYOUT_TRANSITION_PROPERTIES.has(e.propertyName)) return;
      activeTransitions++;
      hardStopAt = performance.now() + MAX_TRANSITION_INVALIDATE_MS;
      if (rafId === null) rafId = requestAnimationFrame(tick);
    };
    const onTransitionSettled = (e: TransitionEvent) => {
      if (!LAYOUT_TRANSITION_PROPERTIES.has(e.propertyName)) return;
      activeTransitions = Math.max(0, activeTransitions - 1);
    };
    document.addEventListener('transitionrun', onTransitionRun);
    document.addEventListener('transitionend', onTransitionSettled);
    document.addEventListener('transitioncancel', onTransitionSettled);

    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      document.removeEventListener('transitionrun', onTransitionRun);
      document.removeEventListener('transitionend', onTransitionSettled);
      document.removeEventListener('transitioncancel', onTransitionSettled);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);
};
