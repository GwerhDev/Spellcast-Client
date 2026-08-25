import '@testing-library/jest-dom';
import { createCanvas } from 'canvas';

// happy-dom has no global ImageBitmap at all -- pdfUtils.ts's `x instanceof
// ImageBitmap` checks throw ReferenceError here regardless of what `x` is, since the
// identifier itself doesn't exist, not just because no real instance is ever
// created in tests. A minimal stub is enough to make the identifier resolve; nothing
// in this codebase's tests actually needs to construct or satisfy an instance of it.
if (typeof globalThis.ImageBitmap === 'undefined') {
  class ImageBitmapStub {}
  globalThis.ImageBitmap = ImageBitmapStub as unknown as typeof ImageBitmap;
}

// happy-dom's HTMLCanvasElement has no real 2D rendering backend (getContext('2d')
// returns null), which pdfUtils.ts's paragraph/heading/decorative-region detection
// depends on heavily (getImageData/putImageData/toDataURL/toBlob). Backing it with
// the `canvas` package (real Cairo-based rendering) instead of stubbing it out lets
// tests exercise those pixel-based heuristics for real, not just the parts of
// pdfUtils.ts that happen to avoid canvas entirely.
interface CanvasBacked extends HTMLCanvasElement {
  __nodeCanvas?: ReturnType<typeof createCanvas>;
}
const getNodeCanvas = (el: CanvasBacked) => {
  if (!el.__nodeCanvas) el.__nodeCanvas = createCanvas(el.width || 300, el.height || 150);
  // Canvas semantics: assigning .width/.height clears the drawing buffer, even to
  // the SAME value. Code under test (pdfUtils.ts) calls getContext('2d') multiple
  // times on the same already-sized element -- an unconditional reassignment here
  // would wipe out everything a prior getContext('2d') call (or the render mock
  // that drew through it) had already painted, well before pdfUtils.ts's own pixel
  // analysis ever gets to read it back.
  if (el.__nodeCanvas.width !== el.width) el.__nodeCanvas.width = el.width;
  if (el.__nodeCanvas.height !== el.height) el.__nodeCanvas.height = el.height;
  return el.__nodeCanvas;
};
// node-canvas's drawImage() requires a REAL node-canvas Canvas/Image as its source --
// it throws "Image or Canvas expected" given a happy-dom HTMLCanvasElement, which is
// exactly what pdfUtils.ts passes (e.g. cropCanvasRegion draws one canvas onto
// another). Unwrap any HTMLCanvasElement argument to its backing node-canvas
// instance before forwarding, so code under test can keep passing around ordinary
// HTMLCanvasElements without knowing about the polyfill.
//
// This overrides drawImage directly on the context instance rather than wrapping it
// in a Proxy: node-canvas's context is a native binding whose OTHER accessors (e.g.
// the fillStyle setter) expect `this` to be the exact native object, and calling them
// through a Proxy around it breaks with "Invalid argument" -- only drawImage itself
// needs interception, so only it gets overridden.
// node-canvas's context type doesn't structurally match lib.dom's
// CanvasRenderingContext2D (different, incompatible overloads for drawImage/
// toDataURL/etc.), even though it's used here specifically to back a real DOM
// CanvasRenderingContext2D at runtime -- so this glue code deals in `any` rather
// than fighting two incompatible canvas type definitions for code that exists
// purely to bridge them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const unwrapCanvasArg = (arg: unknown): any =>
  arg instanceof window.HTMLCanvasElement ? getNodeCanvas(arg as CanvasBacked) : arg;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const patchDrawImage = (ctx: any) => {
  const original = ctx.drawImage.bind(ctx);
  ctx.drawImage = (...args: unknown[]) => original(unwrapCanvasArg(args[0]), ...args.slice(1));
  return ctx;
};
Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: function (this: CanvasBacked, contextType: string, options?: unknown) {
    if (contextType !== '2d') return null;
    return patchDrawImage(getNodeCanvas(this).getContext('2d', options as never));
  },
});
Object.defineProperty(window.HTMLCanvasElement.prototype, 'toDataURL', {
  configurable: true,
  value: function (this: CanvasBacked, type?: string, quality?: number) {
    return (getNodeCanvas(this).toDataURL as (t?: string, q?: number) => string)(type, quality);
  },
});
Object.defineProperty(window.HTMLCanvasElement.prototype, 'toBlob', {
  configurable: true,
  value: function (this: CanvasBacked, callback: (blob: Blob | null) => void, type?: string, quality?: number) {
    const mime = type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
    const toBuffer = getNodeCanvas(this).toBuffer as (mime: string, opts: { quality?: number }) => Buffer;
    const buffer = toBuffer(mime, { quality });
    callback(new Blob([buffer], { type: mime }));
  },
});

// Deterministic ResizeObserver stub (never fires) so components that observe elements —
// e.g. CompanionOverlay measuring its overlay — don't depend on the DOM env's own
// implementation or timing.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// The test DOM has no real viewport model, so width-based media queries always resolve to
// `matches: false`. Stub it so tests can opt into "matches: true" per query (see
// src/test/mockMatchMedia.ts) to exercise mobile-breakpoint code paths.
window.matchMedia = window.matchMedia || ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
}) as unknown as MediaQueryList);
