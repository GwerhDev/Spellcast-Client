import React, { useRef } from 'react';
import { resolveCoverFrameId, getCoverFrame3D } from '../utils/coverFrame';
import { useCoverFrame3DGate } from './useCoverFrame3DGate';
import type { CardFrameAnchor } from '../app/components/Cover3D/CoverFrame3DOverlay';

// TCORE-124: the full "3D cover-frame corners over a grid/carousel of SpellCards" mechanism,
// factored out of LastSpells (its first user) so every other place that renders a grid of
// SpellCards (Grimoire/SpellList today, more later) can opt in with a few lines instead of
// re-deriving the anchor/gate/hide-2D wiring each time. Deliberately NOT a component that
// owns the section's own markup -- every caller's layout (carousel vs. grid, header, nav
// buttons, pagination) is different enough that a shared wrapper component would fight each
// one's own CSS. Instead this hands back three things a caller drops into its own JSX:
// `sectionRef` (put on whatever DOM element bounds "is this section visible" -- gates on it
// being in the viewport, via IntersectionObserver), `hide2DFrameCSS` (a <style> tag's content
// the caller renders once, at the top of its own fragment), and `overlay` (the ready-to-
// render <CoverFrame3DOverlay>, or null when the gate hasn't passed -- caller renders
// `{overlay}` anywhere in its tree; the canvas itself is position: fixed to the whole browser
// viewport, not to sectionRef's own box, so it doesn't need to sit inside any particular
// positioned ancestor -- see CoverFrame3DOverlay's own comment for why: a long
// infinite-scroll grid can be far taller than the screen, and only cards currently on screen
// get a positioned mesh at all).
//
// three/@react-three/fiber are only downloaded once the gate actually passes (Mode3D user
// setting on, desktop, motion ok, section in view) -- lazy so a 3D-off session's bundle for
// this section stays free of the whole 3D stack, same reasoning as SpellReader's own lazy
// CompanionOverlay import.
const CoverFrame3DOverlay = React.lazy(() =>
  import('../app/components/Cover3D/CoverFrame3DOverlay').then(m => ({ default: m.CoverFrame3DOverlay }))
);

// The subset of Spell this hook actually needs -- callers pass their own doc list (Spell[]
// today) without this hook importing that whole interface just for two fields.
export interface CoverFrame3DDoc {
  id: string;
  coverFrameId?: string | null;
}

interface UseCoverFrame3DSectionOptions {
  // The visible docs this render pass actually shows -- an infinite-scroll grid's own
  // `visible` slice, a carousel's own MAX-capped slice, whatever the caller already computes
  // for its 2D render. Anchors are only built for these, matching what's really in the DOM.
  docs: CoverFrame3DDoc[];
  // The global per-user default cover frame (casterInventory.activeCoverFrameId) -- same
  // resolution rule every 2D render site already uses via resolveCoverFrameId.
  activeCoverFrameId: string | null;
  // Element whose data-testid="spell-card-<id>" descendants get looked up for each anchor's
  // getRect() -- normally the same scrollable/grid container the caller's SpellCards render
  // into. Defaults to searching from `document` if omitted (fine for a page-level grid with
  // no other spell-card-* ids on the page, but pass an explicit ref for anything nested/
  // multi-instance, e.g. more than one of these grids on screen at once).
  cardsContainerRef?: React.RefObject<HTMLElement | null>;
}

interface UseCoverFrame3DSectionResult {
  // Put on the element that bounds "is this section visible" -- typically the same
  // scrollable wrapper cardsContainerRef points to, or an ancestor of it.
  sectionRef: React.RefObject<HTMLDivElement | null>;
  // True once the shared 3D canvas is actually mounted for this section (gate passed).
  active: boolean;
  // <style>{hide2DFrameCSS}</style>'s content -- empty string when nothing needs hiding
  // (gate not passed, or no visible doc resolves to a 3D-capable frame), so callers can
  // render it unconditionally: `{hide2DFrameCSS && <style>{hide2DFrameCSS}</style>}`.
  hide2DFrameCSS: string;
  // Ready-to-render overlay JSX, or null when the gate hasn't passed -- position: fixed to
  // the viewport internally, so `{overlay}` can be rendered anywhere in the caller's tree
  // (it doesn't need a positioned ancestor the way an absolutely-positioned element would).
  overlay: React.ReactNode;
}

export const useCoverFrame3DSection = ({ docs, activeCoverFrameId, cardsContainerRef }: UseCoverFrame3DSectionOptions): UseCoverFrame3DSectionResult => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const active = useCoverFrame3DGate(sectionRef);

  // TCORE-124: which visible docs resolve to a frame that also has 3D geometry
  // (getCoverFrame3D) -- only those get an anchor, everything else keeps the plain 2D
  // CoverFrameCorners the card component already renders. getRect is a closure (not a
  // stored value) so CoverFrame3DOverlay always reads the CURRENT position, including
  // mid-scroll -- doc.id matches SpellCard's own data-testid, so no ref/prop needs to be
  // threaded into SpellCard for this to find it, keeping SpellCard itself untouched.
  const anchors: CardFrameAnchor[] = active
    ? docs.reduce<CardFrameAnchor[]>((acc, doc) => {
        const config = getCoverFrame3D(resolveCoverFrameId(doc.coverFrameId, activeCoverFrameId));
        if (!config) return acc;
        acc.push({
          id: doc.id,
          config,
          getRect: () => {
            const root = cardsContainerRef?.current ?? document;
            const card = root.querySelector(`[data-testid="spell-card-${doc.id}"]`);
            // Matches the 2D CoverFrameCorners' own anchor box exactly (see its comment in
            // CoverFrameCorners.tsx) -- the cover art itself, not the whole card (which also
            // includes the title/date footer below it).
            return card ? card.querySelector('[class*="coverWrapper"]')?.getBoundingClientRect() ?? null : null;
          },
        });
        return acc;
      }, [])
    : [];

  // TCORE-124: hides each 3D-anchored card's own 2D CoverFrameCorners overlay (its
  // .coverFrameSlot, a SpellCard-internal element -- SpellCard itself stays untouched) so
  // the flat SVG frame doesn't show through/behind the 3D mesh sitting on top of it. Scoped
  // per-card by data-testid rather than a blanket "hide all coverFrameSlots" rule, since a
  // card without 3D geometry for its resolved frame (getCoverFrame3D returned null) must
  // keep its 2D corners visible as the fallback.
  const hide2DFrameCSS = anchors
    .map(a => `[data-testid="spell-card-${a.id}"] [class*="coverFrameSlot"] { visibility: hidden; }`)
    .join('\n');

  const overlay = active ? (
    <React.Suspense fallback={null}>
      <CoverFrame3DOverlay anchors={anchors} />
    </React.Suspense>
  ) : null;

  return { sectionRef, active, hide2DFrameCSS, overlay };
};
