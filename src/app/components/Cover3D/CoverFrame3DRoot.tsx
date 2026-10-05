import React, { useRef, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { Book3D, readLook, tint } from './CoverFrame3DScene';
import { VIEW_MARGIN_X, VIEW_MARGIN_Y } from './constants';
import { getPageBooks, subscribePageBooks, type PageBook } from './pageBooks';

// The camera's distance from the page, in px: how strong the perspective is.
const CAMERA_DISTANCE = 1400;

// The page's 3D scene: the covers on it (see CoverFrame3DView) as books, each drawn where
// its element is and as it looks -- moved, turned, scaled and faded with it (the Grimoire's
// deal, a card's hover, scrolling) -- so the page's cards behave exactly as they do flat,
// with depth. One canvas for the whole app's pages (browsers cap WebGL contexts, and a grid
// can show dozens of covers), mounted once 3D covers are on (see DefaultLayout), on
// .dashboard-container: a box that doesn't reflow with the sidebar's rail/panel toggle.
// Covers shown where this canvas can't reach them right (a modal over it, a coverflow's
// overlapping cards, the home's own scene) have canvases of their own instead.
//
// Its frame of reference is the canvas': 1 unit = 1 px on the page plane (z = 0), x right
// from its left edge, y up from its top edge. The camera looks at the canvas' middle from
// CAMERA_DISTANCE in front, its frustum set so the page plane lines up with the page: what's
// flat on it sits exactly at its page position, and a book's depth shows the more it is off
// to the side.

// The camera, kept lined up with the canvas.
const PageCamera: React.FC = () => {
  const camera = useRef<THREE.PerspectiveCamera>(null);
  const { size } = useThree();
  useFrame(() => {
    const cam = camera.current;
    if (!cam) return;
    const cx = size.width / 2;
    const cy = size.height / 2;
    const near = 10;
    const k = near / CAMERA_DISTANCE;
    cam.position.set(cx, -cy, CAMERA_DISTANCE);
    cam.near = near;
    cam.far = CAMERA_DISTANCE * 4;
    cam.projectionMatrix.makePerspective(-cx * k, cx * k, cy * k, -cy * k, near, cam.far);
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    cam.updateMatrixWorld();
  }, -2);
  return <PerspectiveCamera ref={camera} makeDefault manual />;
};

// One cover as a book, over its element.
const PageBookObject: React.FC<{ book: PageBook }> = ({ book }) => {
  const group = useRef<THREE.Group>(null);
  const { gl } = useThree();
  // The cover's own size: the element's layout size (its box on screen is bigger while it's
  // turned) less the room around the cover.
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  useFrame(() => {
    const g = group.current;
    const el = book.element;
    if (!g) return;
    if (!el.isConnected) { g.visible = false; return; }
    const width = el.offsetWidth - 2 * VIEW_MARGIN_X;
    const height = el.offsetHeight - 2 * VIEW_MARGIN_Y;
    if (width !== size.width || height !== size.height) setSize({ width, height });
    const canvas = gl.domElement.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    // Off the canvas: nothing to draw.
    if (r.right < canvas.left || r.left > canvas.right || r.bottom < canvas.top || r.top > canvas.bottom) { g.visible = false; return; }
    const { matrix: m, opacity } = readLook(el);
    // Its middle (a box's middle stays its middle however it's turned or scaled), and its
    // turn and scale -- the page's y runs down, the scene's up.
    const x = r.left + r.width / 2 - canvas.left;
    const y = -(r.top + r.height / 2 - canvas.top);
    g.matrix.set(m.a, -m.c, 0, x, -m.b, m.d, 0, y, 0, 0, 1, 0, 0, 0, 0, 1);
    g.matrixWorldNeedsUpdate = true;
    g.visible = opacity > 0.02;
    tint(g, 1, opacity);
  });
  return (
    <group ref={group} matrixAutoUpdate={false} visible={false}>
      {size.width > 0 && size.height > 0 && (
        <Book3D coverUrl={book.coverUrl} frame3D={book.config} width={size.width} height={size.height} radius={book.radius} />
      )}
    </group>
  );
};

const PageBooks: React.FC = () => {
  const books = useSyncExternalStore(subscribePageBooks, getPageBooks);
  return (
    <>
      {Array.from(books.entries()).map(([id, book]) => <PageBookObject key={id} book={book} />)}
    </>
  );
};

export const CoverFrame3DRoot: React.FC = () => {
  const books = useSyncExternalStore(subscribePageBooks, getPageBooks);
  return (
    <Canvas
      data-testid="cover-frame-3d-root"
      style={{
        position: 'absolute',
        inset: 0,
        // Only draws: the cards under it take the pointer, as they do flat.
        pointerEvents: 'none',
        // Over the page's content, under its chrome (modals, menus, the player); the sidebar
        // keeps itself on top (its own stacking context, see globals.css).
        zIndex: 1,
      }}
      // Drawn every frame while there's a book on the page (it follows the page as it
      // scrolls and animates); with none, only when something changes.
      frameloop={books.size > 0 ? 'always' : 'demand'}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      dpr={[1, 2]}
    >
      <PageCamera />
      <ambientLight intensity={1.1} />
      <directionalLight position={[300, 500, 900]} intensity={1.6} />
      <directionalLight position={[-400, -200, 600]} intensity={0.5} />
      <PageBooks />
    </Canvas>
  );
};
