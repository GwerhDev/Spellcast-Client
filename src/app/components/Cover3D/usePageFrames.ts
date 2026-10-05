import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

// A 3D scene drawn over the page (frameloop="demand") draws only when asked. What it shows
// follows elements of the page -- where they are and how they look -- so it has to be asked
// whenever the page moves them: a scroll or resize, a CSS transition or animation, a style
// set from JS (framer-motion writes them inline) or animated through the Web Animations API
// (framer-motion does so for opacity), and for as long as any of those keeps running.

// What changes how an element looks where it is: its turn, scale and place, and its fade.
const LOOK = new Set(['transform', 'translate', 'scale', 'rotate', 'opacity', 'visibility']);
// What moves elements around it too, wherever it's animated (a sidebar opening, say).
const LAYOUT = new Set([
  'width', 'height', 'top', 'left', 'right', 'bottom', 'inset',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'flex', 'flex-basis', 'flex-grow', 'flex-shrink', 'grid-template-columns', 'grid-template-rows',
]);

const kebab = (name: string) => name.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);

// The properties an animation changes.
const animatedProperties = (animation: Animation): string[] => {
  if (typeof CSSTransition !== 'undefined' && animation instanceof CSSTransition) return [animation.transitionProperty];
  const effect = animation.effect as KeyframeEffect | null;
  if (!effect || typeof effect.getKeyframes !== 'function') return [];
  try {
    return effect.getKeyframes()
      .flatMap(frame => Object.keys(frame))
      .filter(key => key !== 'offset' && key !== 'computedOffset' && key !== 'easing' && key !== 'composite')
      .map(kebab);
  } catch {
    return [];
  }
};

// Whether an animation moves or fades what the scene follows: it changes the layout, or the
// look of one of the followed elements or of something holding one.
export const movesFollowed = (animation: Animation, followed: readonly Element[]): boolean => {
  const target = (animation.effect as KeyframeEffect | null)?.target;
  if (!target) return false;
  const properties = animatedProperties(animation);
  if (properties.some(p => LAYOUT.has(p))) return true;
  return properties.some(p => LOOK.has(p)) && followed.some(el => target.contains(el));
};

// Whether a style change on an element (set from JS) can change how the followed ones look.
const holdsFollowed = (node: Node, followed: readonly Element[]) => followed.some(el => node.contains(el));

// Asks the scene for a frame whenever the page changes what it follows -- `follow` lists those
// elements (read fresh each time), `version` changes when that list does -- and keeps asking
// while something keeps moving them.
export const usePageFrames = (follow: () => readonly Element[], version: unknown): void => {
  const invalidate = useThree(state => state.invalidate);

  // While an animation or transition that moves them runs, the next frame too.
  useFrame(() => {
    if (typeof document.getAnimations !== 'function') return;
    const followed = follow();
    if (followed.length === 0) return;
    if (document.getAnimations().some(a => a.playState === 'running' && movesFollowed(a, followed))) invalidate();
  });

  useEffect(() => {
    const draw = () => invalidate();
    // Scrolling anywhere (capture: scroll doesn't bubble) or resizing moves them on screen; a
    // transition or animation starting anywhere is drawn, and the frame above keeps drawing
    // while it runs.
    window.addEventListener('scroll', draw, { capture: true, passive: true });
    window.addEventListener('resize', draw);
    document.addEventListener('transitionrun', draw, true);
    document.addEventListener('animationstart', draw, true);

    // A style set from JS on them or on what holds them (framer-motion writes its values
    // inline every frame; one starting a Web Animation sets its first values the same way).
    const styles = typeof MutationObserver !== 'undefined'
      ? new MutationObserver(records => {
        const followed = follow();
        if (records.some(r => holdsFollowed(r.target, followed))) invalidate();
      })
      : null;
    styles?.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'], subtree: true });

    // Their size changing, or the page's (content added above them moves them down).
    const sizes = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null;
    if (sizes) {
      sizes.observe(document.body);
      for (const el of follow()) sizes.observe(el);
    }

    draw();
    return () => {
      window.removeEventListener('scroll', draw, true);
      window.removeEventListener('resize', draw);
      document.removeEventListener('transitionrun', draw, true);
      document.removeEventListener('animationstart', draw, true);
      styles?.disconnect();
      sizes?.disconnect();
    };
    // `follow` is read fresh on every change; `version` is what re-observes the sizes.
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invalidate, version]);
};
