import { useLayoutEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { spellArriving, type ScreenRect } from '../store/altarSlice';

// A spell conjured some other way than dropped on the altar (played from its detail, the
// player, the reader...) flies there from its card in the quick start, if it's there and on
// screen: `locate` says where a spell's card is right now (the view's own way of knowing).
// Measured in the commit the spell is conjured in, while its card is still in the row (see
// useQuickStartSpells). One dropped on the altar was carried there: it melts in from the
// drop instead (see the Altar); one conjured from its detail flies from the detail's cover.
export const useFlightToAltar = (locate: (spellId: string) => ScreenRect | null) => {
  const dispatch = useAppDispatch();
  const spellId = useAppSelector(state => state.spellReader.spellId);
  const arrival = useAppSelector(state => state.altar.arrival);
  const previous = useRef(spellId);
  const locateRef = useRef(locate);
  locateRef.current = locate;

  useLayoutEffect(() => {
    if (spellId === previous.current) return;
    previous.current = spellId;
    // One already on its way (dropped, or flown from where it was conjured, e.g. its detail)
    // isn't flown again from its card.
    if (!spellId || arrival?.spellId === spellId) return;
    const from = locateRef.current(spellId);
    const onScreen = from && from.width > 0 && from.height > 0
      && from.left < window.innerWidth && from.left + from.width > 0 && from.top < window.innerHeight && from.top + from.height > 0;
    if (onScreen) dispatch(spellArriving({ spellId, via: 'flight', from }));
    //eslint-disable-next-line
  }, [spellId]);
};
