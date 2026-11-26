import { useEffect } from 'react';

// The light on a `.glow-card` follows the pointer across it (see globals.css): one listener for
// the whole app, writing the pointer's place in the card it's over as `--glow-x` / `--glow-y`,
// at most once a frame. Only a mouse: a touch has no hover to light.
export function useGlowCards() {
  useEffect(() => {
    let frame = 0;
    let last: PointerEvent | null = null;

    const paint = () => {
      frame = 0;
      const event = last;
      if (!event) return;
      const card = (event.target as Element | null)?.closest?.<HTMLElement>('.glow-card');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--glow-x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--glow-y', `${event.clientY - rect.top}px`);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      last = event;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}
