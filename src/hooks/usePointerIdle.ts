import { useEffect, useState } from 'react';

// Any of these means the person is using the page: the idle countdown starts over.
const ACTIVITY_EVENTS = ['mousemove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'dragover'] as const;

// Whether the person has left the pointer (and keyboard) alone for `delayMs`, so a view can
// step aside while they just listen. Always false while disabled; any activity makes it
// false again right away.
export const usePointerIdle = (delayMs: number, enabled = true): boolean => {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    if (!enabled) { setIdle(false); return; }
    let timer = window.setTimeout(() => setIdle(true), delayMs);
    const onActivity = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), delayMs);
    };
    ACTIVITY_EVENTS.forEach(type => window.addEventListener(type, onActivity, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      ACTIVITY_EVENTS.forEach(type => window.removeEventListener(type, onActivity));
    };
  }, [delayMs, enabled]);

  return idle;
};
