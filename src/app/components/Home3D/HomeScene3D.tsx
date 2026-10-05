import React, { Suspense, useEffect, useMemo, useReducer, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, events as pointerEvents, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { CoverObjectLayout } from '../Cover3D/CoverFrame3DView';
import { CoverTexturePlane } from '../Cover3D/CoverTexturePlane';
import { VIEW_MARGIN_X, VIEW_MARGIN_Y } from '../Cover3D/constants';
import { startSyntheticSpellDrag } from '../../../utils/touchSpellDrag';
import type { CoverFrame3DConfig } from '../../../utils/coverFrame';

export interface SceneBook {
  id: string;
  coverUrl: string | null;
  frame3D: CoverFrame3DConfig | null;
}

export interface SceneRect { top: number; left: number; width: number; height: number }

// How a card looks at its place in the row (see Coverflow's placeValues): its center (in card
// widths from the row's), size, brightness, whether it shows, and its order over the others.
export interface SceneLook { x: number; scale: number; brightness: number; opacity: number; zIndex: number }

// One place in the row and what's in it: a spell's book, an empty place, or the card that
// leads to the rest of the spells.
export interface ScenePlace {
  key: string;
  kind: 'book' | 'empty' | 'more';
  book?: SceneBook;
  // The item it shows (to bring it to the center).
  index: number;
  // Behind the front row: a click only brings it to the center.
  behind: boolean;
  look: SceneLook;
  // How it comes in, when it first shows up: from where, how, and after how long (s).
  enter: SceneLook & { delay: number };
}

interface HomeScene3DProps {
  places: ScenePlace[];
  // Where the row is on the page: the scene draws the cards over this element, at the size
  // its --spell-card-width / --spell-cover-height say, cut at its sides as the row is, and
  // faded with it.
  anchor: React.RefObject<HTMLElement | null>;
  // A card behind the front row was clicked: its item is brought to the center.
  onBring: (index: number) => void;
  // A book in the front row was clicked: its cover's place on screen, for its detail to open
  // from.
  onOpen: (index: number, rect: SceneRect) => void;
  // The card leading to the rest of the spells was clicked.
  onMore: () => void;
  // A book is being dragged (e.g. to the altar), or no longer is.
  onDragChange: (dragging: boolean) => void;
  // Every card has come to rest at its place, for the first time.
  onSettled?: () => void;
  // A spell shown elsewhere right now (its cover lifted into its open detail): not drawn.
  hiddenId: string | null;
  // What the card leading to the rest of the spells says, and its icon; the empty place's icon.
  moreLabel: string;
  moreIcon: IconDefinition;
  emptyIcon: IconDefinition;
}

// How far (px) the pointer moves on a book before it's a drag rather than a click.
const DRAG_THRESHOLD_PX = 6;
// The camera's distance from the page, in px: how strong the perspective is.
const CAMERA_DISTANCE = 1400;
// A book's thickness, behind its cover (px).
const BOOK_DEPTH = 22;
// A book being dragged, toward the viewer (px).
const DRAG_LIFT = 140;
// The row's spring, as the page's coverflow moves its cards (see Coverflow).
const STIFFNESS = 260;
const DAMPING = 30;
// How far a book is turned toward the middle (radians) by how far out it is (card widths),
// between these points: square in the middle, more the further out -- following it as it
// moves, so it turns as it goes.
const TURN_AT: [number, number][] = [[0, 0], [1.06, 0.3], [1.92, 0.6], [2.6, 0.72]];
const turnAt = (x: number) => {
  const d = Math.abs(x);
  for (let i = 1; i < TURN_AT.length; i++) {
    const [x0, t0] = TURN_AT[i - 1];
    const [x1, t1] = TURN_AT[i];
    if (d <= x1) return -Math.sign(x) * (t0 + ((d - x0) / (x1 - x0)) * (t1 - t0));
  }
  return -Math.sign(x) * TURN_AT[TURN_AT.length - 1][1];
};
// How far apart (px) the places' order sets them in depth: enough that a turned book never
// reaches through the one in front of it.
const DEPTH_STEP = 30;

const pxVar = (el: HTMLElement, name: string, fallback: number) => {
  const v = parseFloat(getComputedStyle(el).getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
};

// The page's own opacity at an element: its own and all of its ancestors'.
const opacityAt = (el: HTMLElement) => {
  let opacity = 1;
  for (let node: HTMLElement | null = el; node; node = node.parentElement) opacity *= parseFloat(getComputedStyle(node).opacity) || 0;
  return opacity;
};

// The scene's frame of reference is the page's: 1 unit = 1 px on the page plane (z = 0),
// x to the right from the canvas' left edge, y up from its top edge (so negative down the
// page). The camera looks at the row's middle from CAMERA_DISTANCE in front, its frustum
// skewed so the page plane still lines up with the page everywhere on the canvas: the
// perspective centers on the row, and what's flat on the page plane sits exactly where its
// page position is.
interface Layout { cardW: number; cardH: number; cx: number; cy: number; left: number; width: number; opacity: number }

const CameraRig: React.FC<{ anchor: React.RefObject<HTMLElement | null>; layout: React.MutableRefObject<Layout | null> }> = ({ anchor, layout }) => {
  const camera = useRef<THREE.PerspectiveCamera>(null);
  const { gl, size } = useThree();
  useFrame(() => {
    const cam = camera.current;
    const el = anchor.current;
    if (!cam || !el) return;
    const canvas = gl.domElement.getBoundingClientRect();
    const a = el.getBoundingClientRect();
    const cx = a.left + a.width / 2 - canvas.left;
    const cy = a.top + a.height / 2 - canvas.top;
    layout.current = {
      cardW: pxVar(el, '--spell-card-width', 160),
      cardH: pxVar(el, '--spell-cover-height', 240),
      cx,
      cy,
      left: a.left - canvas.left,
      width: a.width,
      opacity: opacityAt(el),
    };
    const near = 10;
    const k = near / CAMERA_DISTANCE;
    cam.position.set(cx, -cy, CAMERA_DISTANCE);
    cam.near = near;
    cam.far = CAMERA_DISTANCE * 4;
    cam.projectionMatrix.makePerspective(-cx * k, (size.width - cx) * k, cy * k, (cy - size.height) * k, near, cam.far);
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    cam.updateMatrixWorld();
  }, -2);
  return <PerspectiveCamera ref={camera} makeDefault manual />;
};

// A book: its cover (with its frame, in 3D, when it has one) on the front of a block of
// pages, the cover centered on the group's origin.
const Book: React.FC<{ book: SceneBook; width: number; height: number }> = ({ book, width, height }) => (
  <>
    {book.coverUrl && book.frame3D ? (
      <Suspense fallback={null}>
        <CoverObjectLayout
          config={book.frame3D}
          coverUrl={book.coverUrl}
          radius={3.2}
          marginX={VIEW_MARGIN_X}
          marginY={VIEW_MARGIN_Y}
          size={{ width: width + 2 * VIEW_MARGIN_X, height: height + 2 * VIEW_MARGIN_Y }}
        />
      </Suspense>
    ) : book.coverUrl ? (
      <group position={[0, 0, -4]}>
        <CoverTexturePlane url={book.coverUrl} width={width} height={height} radius={3.2} />
      </group>
    ) : (
      <mesh position={[0, 0, -4]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#2c2f36" />
      </mesh>
    )}
    {/* The pages, behind the cover. */}
    <mesh position={[0, 0, -4.5 - BOOK_DEPTH / 2]}>
      <boxGeometry args={[width - 4, height - 4, BOOK_DEPTH]} />
      <meshStandardMaterial color="#d9cfb8" roughness={0.9} />
    </mesh>
  </>
);

// The page's theme colors, for the flat cards drawn as the page draws them.
const themeColor = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

// A flat card drawn as the page draws it (an empty place, or the card leading to the rest of
// the spells): its box, border, icon and label, on a texture at the card's size.
const useCardTexture = (width: number, height: number, draw: 'empty' | 'more', icon: IconDefinition, label?: string) => useMemo(() => {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const g = canvas.getContext('2d')!;
  g.scale(scale, scale);
  const primary = themeColor('--color-primary', '#6aa7e0');
  const muted = themeColor('--color-light-400', '#9aa0aa');
  g.beginPath();
  g.roundRect(0.5, 0.5, width - 1, height - 1, draw === 'more' ? 8 : 3.2);
  g.fillStyle = themeColor('--component-background', '#2a2c33');
  g.fill();
  if (draw === 'empty') {
    // A tint of the accent, with a dashed border of it.
    g.globalAlpha = 0.05;
    g.fillStyle = primary;
    g.fill();
    g.globalAlpha = 0.35;
    g.setLineDash([3, 3]);
    g.strokeStyle = primary;
  } else {
    g.strokeStyle = themeColor('--color-dark-300', '#3a3d45');
  }
  g.lineWidth = 1;
  g.stroke();
  g.globalAlpha = 1;
  g.setLineDash([]);
  // The icon (a FontAwesome definition: its width, height and SVG path).
  const [iw, ih, , , path] = icon.icon;
  const size = draw === 'empty' ? 32 : 28;
  const s = size / Math.max(iw, ih);
  g.save();
  g.translate(width / 2 - (iw * s) / 2, height / 2 - (ih * s) / 2 - (label ? 10 : 0));
  g.scale(s, s);
  g.fillStyle = draw === 'empty' ? primary : muted;
  g.globalAlpha = draw === 'empty' ? 0.3 : 1;
  g.fill(new Path2D(Array.isArray(path) ? path.join(' ') : path));
  g.restore();
  if (label) {
    g.fillStyle = muted;
    g.font = '500 13px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText(label, width / 2, height / 2 + 22);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}, [width, height, draw, icon, label]);

const FlatCard: React.FC<{ width: number; height: number; draw: 'empty' | 'more'; icon: IconDefinition; label?: string }> = ({ width, height, draw, icon, label }) => {
  const texture = useCardTexture(width, height, draw, icon, label);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, 0, -4]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
};

// Brightness and opacity on every material of a card, from what each one was made with.
const tint = (group: THREE.Group, light: number, opacity: number) => {
  group.traverse(object => {
    const material = (object as THREE.Mesh).material as (THREE.Material & { color?: THREE.Color }) | undefined;
    if (!material || Array.isArray(material)) return;
    if (material.userData.baseColor === undefined && material.color) material.userData.baseColor = material.color.clone();
    material.userData.baseOpacity ??= material.opacity;
    if (material.color && material.userData.baseColor) material.color.copy(material.userData.baseColor).multiplyScalar(light);
    material.transparent = material.transparent || opacity < 1;
    material.opacity = material.userData.baseOpacity * opacity;
  });
};

// Where the cover of a card is on screen: its corners, as the camera sees them.
const coverRectOnScreen = (group: THREE.Group, camera: THREE.Camera, canvas: HTMLCanvasElement, width: number, height: number): SceneRect => {
  const box = canvas.getBoundingClientRect();
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const p = new THREE.Vector3((x * width) / 2, (y * height) / 2, 0).applyMatrix4(group.matrixWorld).project(camera);
    xs.push(box.left + ((p.x + 1) / 2) * box.width);
    ys.push(box.top + ((1 - p.y) / 2) * box.height);
  }
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
};

// The page's own controls over the scene (the altar's, the row's arrows...) take the pointer
// there: the cards behind them don't.
const onPageControl = (event: Event) =>
  event.target instanceof Element && !!event.target.closest('button, a, input, select, textarea, [role="button"], [role="menuitem"], [role="link"], [role="dialog"]');

// A value springing toward its target, as the page's coverflow springs its cards.
interface Spring { value: number; velocity: number }
const springTo = (s: Spring, target: number, dt: number) => {
  // Small steps: a stiff spring over a long frame would overshoot wildly.
  const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    s.velocity += (-STIFFNESS * (s.value - target) - DAMPING * s.velocity) * h;
    s.value += s.velocity * h;
  }
};
const springAt = (value: number): Spring => ({ value, velocity: 0 });

// A card in the scene: the place it's at (or was at, as it fades out leaving), and how it
// looks right now on its way there.
interface Card {
  place: ScenePlace;
  leaving: boolean;
  delay: number;
  x: Spring; scale: Spring; brightness: Spring; opacity: Spring; z: Spring;
}

const Row: React.FC<Omit<HomeScene3DProps, 'anchor'> & { layout: React.MutableRefObject<Layout | null> }> = ({
  places, layout, onBring, onOpen, onMore, onDragChange, onSettled, hiddenId, moreLabel, moreIcon, emptyIcon,
}) => {
  const settled = useRef(false);
  const cards = useRef(new Map<string, Card>());
  const groups = useRef(new Map<string, THREE.Group>());
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  // The book being dragged, where the pointer is (on screen), and the drag it fires.
  const drag = useRef<{ key: string; at: { x: number; y: number }; syn: ReturnType<typeof startSyntheticSpellDrag> } | null>(null);
  const { camera, gl } = useThree();
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), -DRAG_LIFT));
  const raycaster = useRef(new THREE.Raycaster());
  const handlers = useRef({ onBring, onOpen, onMore, onDragChange, onSettled });
  useEffect(() => { handlers.current = { onBring, onOpen, onMore, onDragChange, onSettled }; });

  // Every place's card, kept as the row turns (a card moving to its next place keeps going
  // from where it is); a card no longer in the row fades out where it was, then is gone.
  const present = new Set(places.map(p => p.key));
  for (const place of places) {
    const card = cards.current.get(place.key);
    if (card) { card.place = place; card.leaving = false; continue; }
    const e = place.enter;
    cards.current.set(place.key, {
      place, leaving: false, delay: e.delay,
      x: springAt(e.x), scale: springAt(e.scale), brightness: springAt(e.brightness), opacity: springAt(e.opacity), z: springAt(e.zIndex),
    });
  }
  for (const [key, card] of cards.current) if (!present.has(key)) card.leaving = true;

  // The point on the dragged book's plane under a point on the screen.
  const pointUnder = (at: { x: number; y: number }) => {
    const box = gl.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((at.x - box.left) / box.width) * 2 - 1, -((at.y - box.top) / box.height) * 2 + 1);
    raycaster.current.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    return raycaster.current.ray.intersectPlane(plane.current, hit) ? hit : null;
  };

  useFrame((_, delta) => {
    const l = layout.current;
    if (!l) return;
    const dt = Math.min(delta, 1 / 20);
    // Cut at the row's sides, as the page's row is -- except while a book is carried off it.
    // All of it cleared first: a cut frame clears only what it draws.
    gl.setScissorTest(false);
    gl.clear();
    if (!drag.current) {
      gl.setScissor(l.left, 0, l.width, gl.domElement.clientHeight);
      gl.setScissorTest(true);
    }
    let gone = false;
    let moving = false;
    for (const [key, card] of cards.current) {
      const g = groups.current.get(key);
      if (card.delay > 0) {
        moving = true;
        card.delay -= dt;
        if (g) g.visible = false;
        continue;
      }
      const look = card.place.look;
      springTo(card.x, look.x, dt);
      springTo(card.scale, look.scale, dt);
      springTo(card.brightness, look.brightness, dt);
      springTo(card.opacity, card.leaving ? 0 : look.opacity, dt);
      springTo(card.z, look.zIndex, dt);
      if (Math.abs(card.x.velocity) + Math.abs(card.scale.velocity) + Math.abs(card.opacity.velocity) > 0.01) moving = true;
      if (card.leaving && card.opacity.value < 0.01) { cards.current.delete(key); gone = true; continue; }
      if (!g) continue;
      let x = l.cx + card.x.value * l.cardW;
      let y = -l.cy;
      // Its order over the others, as depth.
      let z = (card.z.value - 10) * DEPTH_STEP;
      const dragged = drag.current?.key === key;
      if (dragged) {
        const p = pointUnder(drag.current!.at);
        if (p) { x = p.x; y = p.y; z = DRAG_LIFT; }
        g.position.lerp(new THREE.Vector3(x, y, z), 0.35);
      } else g.position.set(x, y, z);
      g.scale.setScalar(dragged ? 1.04 : card.scale.value);
      g.rotation.y = dragged ? g.rotation.y * 0.65 : turnAt(card.x.value);
      const opacity = Math.max(0, Math.min(1, card.opacity.value)) * l.opacity;
      const hidden = card.place.kind === 'book' && card.place.book?.id === hiddenId;
      // Faded out, or shown elsewhere: not drawn, and nothing to point at.
      g.visible = !hidden && opacity > 0.02;
      tint(g, card.brightness.value, opacity);
    }
    if (gone) redraw();
    if (!moving && !settled.current && cards.current.size > 0) {
      settled.current = true;
      handlers.current.onSettled?.();
    }
  });

  const handleDown = (key: string) => (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0 || onPageControl(e.nativeEvent)) return;
    e.stopPropagation();
    const card = cards.current.get(key);
    if (!card || card.leaving) return;
    const start = { x: e.clientX, y: e.clientY };
    const draggable = card.place.kind === 'book' && !card.place.behind;
    const move = (ev: PointerEvent) => {
      const at = { x: ev.clientX, y: ev.clientY };
      if (draggable && !drag.current && Math.hypot(at.x - start.x, at.y - start.y) > DRAG_THRESHOLD_PX) {
        drag.current = { key, at, syn: startSyntheticSpellDrag(card.place.book!.id, at) };
        document.body.style.cursor = 'grabbing';
        // Carrying a book selects nothing on the page it passes over.
        document.body.style.userSelect = 'none';
        window.getSelection()?.removeAllRanges();
        handlers.current.onDragChange(true);
      }
      if (drag.current) {
        drag.current.at = at;
        drag.current.syn.move(at);
      }
    };
    const finish = (dropped: boolean) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      if (!drag.current) return false;
      drag.current.syn.end(dropped);
      drag.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      handlers.current.onDragChange(false);
      return true;
    };
    const up = () => {
      if (finish(true)) {
        // The click the browser sends after the button is let go goes to what's under the
        // pointer (e.g. the altar's button): the drag was the gesture, not a click there.
        window.addEventListener('click', swallow, { capture: true, once: true });
        return;
      }
      // Acted on with the click that follows, not before it: what opens now (the detail's
      // modal) would otherwise take that click, as one outside it.
      window.addEventListener('click', act, { capture: true, once: true });
    };
    const cancel = () => { finish(false); };
    const swallow = (ev: MouseEvent) => { ev.preventDefault(); ev.stopPropagation(); };
    const act = () => {
      const { place } = card;
      if (place.behind) {
        if (place.kind !== 'empty') handlers.current.onBring(place.index);
      } else if (place.kind === 'more') handlers.current.onMore();
      else if (place.kind === 'book') {
        const g = groups.current.get(key);
        const l = layout.current;
        if (g && l) handlers.current.onOpen(place.index, coverRectOnScreen(g, camera, gl.domElement, l.cardW, l.cardH));
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  };

  const l = layout.current;
  return (
    <>
      {Array.from(cards.current.entries()).map(([key, card]) => (
        <group
          key={key}
          ref={g => { if (g) groups.current.set(key, g); else groups.current.delete(key); }}
          visible={false}
          onPointerDown={handleDown(key)}
          onPointerOver={e => {
            if (onPageControl(e.nativeEvent) || card.place.kind === 'empty') return;
            e.stopPropagation();
            document.body.style.cursor = drag.current ? 'grabbing' : 'pointer';
          }}
          onPointerOut={() => { if (!drag.current) document.body.style.cursor = ''; }}
        >
          {l && (card.place.kind === 'book'
            ? <Book book={card.place.book!} width={l.cardW} height={l.cardH} />
            : card.place.kind === 'more'
              ? <FlatCard width={l.cardW} height={l.cardH} draw="more" icon={moreIcon} label={moreLabel} />
              : <FlatCard width={l.cardW} height={l.cardH} draw="empty" icon={emptyIcon} />)}
        </group>
      ))}
    </>
  );
};

// Re-renders once the row's size is first known (and when it changes), so the cards are
// built at it.
const useLayoutReady = (layout: React.MutableRefObject<Layout | null>) => {
  const [ready, setReady] = React.useState<{ w: number; h: number } | null>(null);
  useFrame(() => {
    const l = layout.current;
    if (l && (!ready || ready.w !== l.cardW || ready.h !== l.cardH)) setReady({ w: l.cardW, h: l.cardH });
  });
  return ready;
};

const SceneContents: React.FC<HomeScene3DProps> = (props) => {
  const layout = useRef<Layout | null>(null);
  const ready = useLayoutReady(layout);
  return (
    <>
      <CameraRig anchor={props.anchor} layout={layout} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[300, 500, 900]} intensity={1.6} />
      <directionalLight position={[-400, -200, 600]} intensity={0.5} />
      {ready && <Row {...props} layout={layout} />}
    </>
  );
};

// The home page's 3D scene: the quick start's row (see Coverflow) as objects -- the spells'
// books, laid out, turned and moving exactly as the page's row does -- over the page, which
// stays HTML (the altar, its menus, the settings, the row's arrows) and lays out where the
// row goes (`anchor`). Covering the whole page so a book can be carried anywhere on it (e.g.
// onto the altar, which takes it as it takes any dragged spell). It doesn't take pointer
// events itself: those the page gets are read from the document, so the page under it works
// as usual.
export const HomeScene3D: React.FC<HomeScene3DProps> = (props) => (
  <Canvas
    style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    eventSource={document.body}
    events={store => ({
      ...pointerEvents(store),
      // The pointer's place on the canvas, from where the canvas is on screen right now: the
      // events come from the whole page, not the canvas, so their own offsets are the page's.
      compute: (event, state) => {
        const box = state.gl.domElement.getBoundingClientRect();
        state.pointer.set(((event.clientX - box.left) / box.width) * 2 - 1, -((event.clientY - box.top) / box.height) * 2 + 1);
        state.raycaster.setFromCamera(state.pointer, state.camera);
      },
    })}
    gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
    dpr={[1, 2]}
  >
    <SceneContents {...props} />
  </Canvas>
);
