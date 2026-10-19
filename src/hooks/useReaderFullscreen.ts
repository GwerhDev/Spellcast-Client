import { useCallback, useEffect, useRef, useState } from 'react';

// The reader's fullscreen: the reader filling the window (the app's own mode) and, where the
// browser allows it, the browser's fullscreen too (its tabs and bars hidden, as F11 does).
// Where it doesn't (iOS Safari) or turns the request down, the reader's own mode stays on
// alone. Leaving the browser's fullscreen another way (Esc) leaves the reader's mode too, and
// leaving the reader leaves the browser's fullscreen it asked for.
export const useReaderFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Whether the browser's fullscreen is the one this reader asked for (so it's this reader's
  // to leave, and its ending ends the reader's mode).
  const ownsBrowserFullscreenRef = useRef(false);
  // What the caster wants right now: the browser can answer the request after they changed
  // their mind (left, or left the reader), and then the fullscreen it grants is left at once.
  const wantedRef = useRef(false);

  useEffect(() => {
    const onChange = () => {
      if (document.fullscreenElement) return;
      if (!ownsBrowserFullscreenRef.current) return;
      ownsBrowserFullscreenRef.current = false;
      setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      wantedRef.current = false;
      document.removeEventListener('fullscreenchange', onChange);
      if (ownsBrowserFullscreenRef.current && document.fullscreenElement) {
        ownsBrowserFullscreenRef.current = false;
        document.exitFullscreen?.().catch(() => {});
      }
    };
  }, []);

  const enter = useCallback(() => {
    wantedRef.current = true;
    setIsFullscreen(true);
    if (!document.fullscreenEnabled || document.fullscreenElement || !document.documentElement.requestFullscreen) return;
    document.documentElement.requestFullscreen()
      .then(() => {
        // Left before the browser answered: leave the fullscreen it just granted.
        if (!wantedRef.current) { document.exitFullscreen?.().catch(() => {}); return; }
        ownsBrowserFullscreenRef.current = true;
      })
      .catch(() => { /* turned down: the reader's own mode stays */ });
  }, []);

  const exit = useCallback(() => {
    wantedRef.current = false;
    setIsFullscreen(false);
    if (!ownsBrowserFullscreenRef.current) return;
    ownsBrowserFullscreenRef.current = false;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, []);

  const toggle = useCallback(() => (isFullscreen ? exit() : enter()), [isFullscreen, enter, exit]);

  return { isFullscreen, toggle };
};
