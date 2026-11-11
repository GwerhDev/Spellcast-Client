import s from './AppLaunch.module.css';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// The apps whose splash a launch fades into, by the background each one's splash starts with
// (Spellcast's, Spectra's, StreamBy's: see BACKGROUNDS). Any other app is just opened.
export type SplashKind = 'spellcast' | 'spectra' | 'streamby';
const KINDS: SplashKind[] = ['spellcast', 'spectra', 'streamby'];

export const splashOf = (label: string): SplashKind | null =>
  KINDS.find(kind => label.toLowerCase().includes(kind)) ?? null;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// How long the page takes to come undone (ms), the size of the bits it comes undone in (px),
// and the light at their edge (Nhexa's celeste).
const DURATION = 950;
const CELL = 8;
const SPARK = '115, 165, 204';

// Each splash's starting background, as its CSS draws it: keep these in step with Spellcast's
// fixed desktop gradient (its root.css), Spectra's #root (its globals.css) and StreamBy's
// --color-bg-gradient (its root.css).
const glowOf = (ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number, rx: number, ry: number, alpha: number) => {
  ctx.save();
  ctx.translate(cx * w, cy * h);
  ctx.scale(rx * w, ry * h);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(${SPARK}, ${alpha})`);
  g.addColorStop(0.7, `rgba(${SPARK}, 0)`);
  ctx.fillStyle = g;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
};

const BACKGROUNDS: Record<SplashKind, (ctx: CanvasRenderingContext2D, w: number, h: number) => void> = {
  spellcast: (ctx, w, h) => {
    BACKGROUNDS.streamby(ctx, w, h);
    glowOf(ctx, w, h, 0.2, 0.8, 0.6, 0.4, 0.08);
    glowOf(ctx, w, h, 0.7, 0.4, 0.8, 0.6, 0.12);
  },
  spectra: (ctx, w, h) => BACKGROUNDS.spellcast(ctx, w, h),
  streamby: (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, h, w, 0);
    g.addColorStop(0, '#1a1a1c');
    g.addColorStop(1, '#2f2f2f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  },
};

// Smooth noise (0..1) over the cells, so the page comes undone in drifting patches, not grain.
const hash = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
const noise = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

interface AppLaunchProps {
  kind: SplashKind;
  // Where it opens from (the hexagon chosen's center, px of the viewport).
  from: { x: number; y: number };
  // Its splash's background covers the screen: the app can be opened now.
  onDone: () => void;
}

// Choosing an app on the desktop: what's on screen comes undone, bit by bit from the hexagon
// chosen out, the bits' edge glowing as they go, leaving the background the app's splash starts
// with -- and only then the app is opened, its own splash drawing its logo on that background,
// once (nothing else is drawn here). Without motion, it's opened at once.
export function AppLaunch({ kind, from, onDone }: AppLaunchProps) {
  const baseRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<HTMLCanvasElement>(null);
  const done = useRef(false);
  const finish = () => { if (!done.current) { done.current = true; onDone(); } };

  useEffect(() => {
    if (prefersReducedMotion()) { finish(); return; }
    // However it goes (a hidden tab pauses frames), it's opened in the end.
    const fallback = setTimeout(finish, DURATION + 400);
    const base = baseRef.current, sparks = sparksRef.current;
    const ctx = base?.getContext('2d'), sctx = sparks?.getContext('2d');
    if (!base || !sparks || !ctx || !sctx) return () => clearTimeout(fallback);

    const w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const [c, x] of [[base, ctx], [sparks, sctx]] as const) {
      c.width = w * dpr;
      c.height = h * dpr;
      x.scale(dpr, dpr);
    }

    // The splash's background, whole, to take each bit from as it's undone.
    const bg = document.createElement('canvas');
    bg.width = w * dpr;
    bg.height = h * dpr;
    const bctx = bg.getContext('2d');
    if (!bctx) return () => clearTimeout(fallback);
    bctx.scale(dpr, dpr);
    BACKGROUNDS[kind](bctx, w, h);

    // When each bit comes undone (0..1): sooner near the hexagon, with noise for its patches;
    // in that order, so each frame only draws the bits it undoes and those glowing at the edge.
    const cols = Math.ceil(w / CELL), rows = Math.ceil(h / CELL);
    const far = Math.hypot(Math.max(from.x, w - from.x), Math.max(from.y, h - from.y));
    const at = new Float32Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const d = Math.hypot(c * CELL - from.x, r * CELL - from.y) / far;
        at[r * cols + c] = Math.min(1, d * 0.62 + noise(c / 7, r / 7) * 0.38);
      }
    }
    const order = Array.from(at.keys()).sort((a, b) => at[a] - at[b]);
    const EDGE = 0.06;
    let undone = 0;

    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      // Eased: slow to begin, then the rest goes quickly; past 1 by the edge, so all goes.
      const p = t * t * (3 - 2 * t) * (1 + EDGE);
      // The bits undone now: the background shows through them, for good.
      while (undone < order.length && at[order[undone]] <= p - EDGE) {
        const i = order[undone++];
        const x = (i % cols) * CELL, y = Math.floor(i / cols) * CELL;
        ctx.drawImage(bg, x * dpr, y * dpr, CELL * dpr, CELL * dpr, x, y, CELL, CELL);
      }
      // The bits about to go glow, brighter the nearer they are.
      sctx.clearRect(0, 0, w, h);
      for (let k = undone; k < order.length; k++) {
        const i = order[k];
        const left = at[i] - (p - EDGE);
        if (left >= EDGE) break;
        sctx.fillStyle = `rgba(${SPARK}, ${(1 - left / EDGE) * 0.85})`;
        sctx.fillRect((i % cols) * CELL + 1, Math.floor(i / cols) * CELL + 1, CELL - 2, CELL - 2);
      }
      if (t < 1) frame = requestAnimationFrame(step);
      else {
        sctx.clearRect(0, 0, w, h);
        ctx.drawImage(bg, 0, 0, w, h);
        finish();
      }
    };
    frame = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(frame); clearTimeout(fallback); };
    //eslint-disable-next-line
  }, []);

  return createPortal(
    <div className={s.launch} data-testid="app-launch" data-kind={kind} aria-hidden="true">
      <canvas ref={baseRef} className={s.layer} />
      <canvas ref={sparksRef} className={`${s.layer} ${s.sparks}`} />
    </div>,
    document.body,
  );
}
