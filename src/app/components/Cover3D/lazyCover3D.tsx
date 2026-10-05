import React from 'react';

// The 3D covers' components, loaded only once they're needed: three, react-three-fiber and
// drei are a real bundle cost a session with 3D covers off never pays. A lazy component
// suspends the first time it renders, and React holds a suspended part back for a while
// before showing it (even when what it waited for is already here) -- a cover sat empty for
// that long on every page's first render. Preloaded as soon as 3D covers are on (see
// DefaultLayout), each one is rendered directly once loaded, never suspending again.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const preloadable = <P extends Record<string, any>>(load: () => Promise<React.ComponentType<P>>) => {
  let loaded: React.ComponentType<P> | null = null;
  let pending: Promise<React.ComponentType<P>> | null = null;
  const preload = () => (pending ??= load().then(component => (loaded = component)));
  const Lazy = React.lazy(() => preload().then(component => ({ default: component })));
  const Component = (props: P) => {
    const Loaded = loaded;
    return Loaded ? <Loaded {...props} /> : <Lazy {...props} />;
  };
  return { Component, preload };
};

const view = preloadable(() => import('./CoverFrame3DView').then(m => m.CoverFrame3DView));
const canvas = preloadable(() => import('./CoverFrame3DCanvas').then(m => m.CoverFrame3DCanvas));

const homeScene = preloadable(() => import('../Home3D/HomeScene3D').then(m => m.HomeScene3D));

// A cover drawn into the app's shared 3D canvas (see CoverFrame3DView).
export const LazyCoverFrame3DView = view.Component;
// A cover in a canvas of its own (see CoverFrame3DCanvas).
export const LazyCoverFrame3DCanvas = canvas.Component;
// The home page's 3D scene (see HomeScene3D).
export const LazyHomeScene3D = homeScene.Component;

export const preloadCover3D = () => Promise.all([view.preload(), canvas.preload(), homeScene.preload()]);
