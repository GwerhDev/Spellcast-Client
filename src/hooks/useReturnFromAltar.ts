import { useLayoutEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { departureTargeted, spellReturned, type ScreenRect } from '../store/altarSlice';

// How many frames to look for a card that's back in the row before giving up (the 3D row's
// book is made by its own renderer, a frame or so after the page's); and, found, how many to
// wait for its cover to show before flying without it.
const LOOK_FRAMES = 10;
const COVER_FRAMES = 3;

const onScreen = (r: ScreenRect) => r.width > 0 && r.height > 0
  && r.left < window.innerWidth && r.left + r.width > 0 && r.top < window.innerHeight && r.top + r.height > 0;

// A spell dispelled goes back from the altar to its card in the quick start: once the row has
// it back, `locate` says where its card is and with what cover (the view's own way of
// knowing), and its cover flies there (see the Altar). The spell coming back, hidden in the
// row until it has arrived; with no card for it on screen, it's back at once.
export const useReturnFromAltar = (locate: (spellId: string) => { rect: ScreenRect; coverUrl: string | null } | null): string | null => {
  // (A card whose cover isn't there yet is given a few frames: it's put in place a render
  // after the card, and one without a cover flies with the altar's light.)
  const dispatch = useAppDispatch();
  const departure = useAppSelector(state => state.altar.departure);
  const locateRef = useRef(locate);
  locateRef.current = locate;

  useLayoutEffect(() => {
    if (!departure || departure.to) return;
    const { spellId } = departure;
    let frame = 0;
    let request = 0;
    const look = () => {
      const found = locateRef.current(spellId);
      if (found && onScreen(found.rect) && (found.coverUrl || frame >= COVER_FRAMES)) {
        dispatch(departureTargeted({ to: found.rect, coverUrl: found.coverUrl }));
        return;
      }
      if (++frame >= LOOK_FRAMES) { dispatch(spellReturned()); return; }
      request = requestAnimationFrame(look);
    };
    look();
    return () => cancelAnimationFrame(request);
    //eslint-disable-next-line
  }, [departure?.spellId, departure?.to]);

  return departure?.spellId ?? null;
};
