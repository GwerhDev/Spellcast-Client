import { useEffect, useState } from 'react';
import { useMediaQuery } from './useMediaQuery';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { PageListPlace, setPageListOpen } from '../store/layoutSlice';

// The page list of the editor and the reader, shown or hidden from their top bar. On a wide
// screen (its own column beside the page) it stays as the caster left it, each one's own,
// kept with the layout (localStorage); on a phone (it would sit over the page) it starts
// hidden each time, and isn't kept.
export const usePageListToggle = (place: PageListPlace) => {
  const narrow = useMediaQuery('(max-width: 768px)');
  const dispatch = useAppDispatch();
  const kept = useAppSelector(state => state.layout.pageListOpen[place]);
  const [overPage, setOverPage] = useState(false);
  useEffect(() => { if (narrow) setOverPage(false); }, [narrow]);

  const open = narrow ? overPage : kept;
  const setOpen = (value: boolean | ((current: boolean) => boolean)) => {
    const next = typeof value === 'function' ? value(open) : value;
    if (narrow) setOverPage(next);
    else dispatch(setPageListOpen({ place, open: next }));
  };
  return { narrow, open, setOpen, toggle: () => setOpen(!open) };
};
