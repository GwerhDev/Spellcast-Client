import s from './AppLaunch.module.css';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// The apps whose splash a launch fades into: each one's first frame is drawn here as its own
// splash draws it (Spellcast's, Spectra's, StreamBy's), its logo the one it publishes at
// /nhexa-splash.* (an <img>, so no CORS is needed). Any other app is just opened.
export type SplashKind = 'spellcast' | 'spectra' | 'streamby';
const KINDS: SplashKind[] = ['spellcast', 'spectra', 'streamby'];

export const splashOf = (label: string): SplashKind | null =>
  KINDS.find(kind => label.toLowerCase().includes(kind)) ?? null;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface AppLaunchProps {
  kind: SplashKind;
  // The app's address: its splash logo is published there.
  url: string;
  // Where it opens from (the hexagon chosen's center, px of the viewport).
  from: { x: number; y: number };
  // Its splash covers the screen: the app can be opened now.
  onDone: () => void;
}

const Frame = ({ kind, origin }: { kind: SplashKind; origin: string }) => {
  if (kind === 'spellcast') return (
    <div className={s.spellcastWrapper}>
      <img className={s.spellcastLogo} src={`${origin}/nhexa-splash.png`} alt="" />
      <span className={s.spellcastWordmark}>Spellcast</span>
      <div className={s.spellcastBar} />
      {/* Its message's room (the splash has one under the bar), so the rest sits where it does. */}
      <span className={s.spellcastMessage} aria-hidden="true">·</span>
    </div>
  );
  if (kind === 'spectra') return (
    <div className={s.spectraInner}>
      <img className={s.spectraLogo} src={`${origin}/nhexa-splash.png`} alt="" />
      <span className={s.spectraWordmark}>SPECTRA</span>
      <div className={s.spectraBar} />
      <span className={s.spectraMessage} aria-hidden="true">·</span>
    </div>
  );
  return (
    <>
      <img className={s.streambyLogo} src={`${origin}/nhexa-splash.svg`} alt="" />
      <div className={s.streambyBar} />
    </>
  );
};

// Choosing an app on the desktop: its splash opens out of the hexagon chosen until it covers the
// screen (the first frame of that app's own splash), and only then the app is opened -- where its
// splash starts on that same frame. Without motion, it's opened at once.
export function AppLaunch({ kind, url, from, onDone }: AppLaunchProps) {
  const [open, setOpen] = useState(false);
  const done = useRef(false);
  const finish = () => { if (!done.current) { done.current = true; onDone(); } };

  useEffect(() => {
    if (prefersReducedMotion()) { finish(); return; }
    // Drawn closed first, then opened, so it's a transition.
    let second = 0;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setOpen(true)); });
    // In case the transition's end never comes (a hidden tab), it's opened anyway.
    const fallback = setTimeout(finish, 1500);
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); clearTimeout(fallback); };
    //eslint-disable-next-line
  }, []);

  let origin = url;
  try { origin = new URL(url).origin; } catch { /* as given */ }

  return createPortal(
    <div
      className={`${s.launch} ${s[kind]} ${open ? s.open : ''}`}
      style={{ '--x': `${from.x}px`, '--y': `${from.y}px` } as React.CSSProperties}
      // Its own transition (its clip's: the only one it has), not one of its children's.
      onTransitionEnd={e => { if (e.target === e.currentTarget) finish(); }}
      data-testid="app-launch"
      data-kind={kind}
      aria-hidden="true"
    >
      <Frame kind={kind} origin={origin} />
    </div>,
    document.body,
  );
}
