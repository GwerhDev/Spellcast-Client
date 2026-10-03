import { useEffect, useState } from 'react';
import { useMediaQuery } from './useMediaQuery';

// The page list of the editor and the reader, shown or hidden from their top bar. On a wide
// screen it starts shown (it has its own column beside the page); on a phone, hidden (it
// would sit over the page) -- and goes back to that whenever the screen changes between
// the two.
export const usePageListToggle = () => {
  const narrow = useMediaQuery('(max-width: 768px)');
  const [open, setOpen] = useState(!narrow);
  useEffect(() => { setOpen(!narrow); }, [narrow]);
  return { narrow, open, setOpen, toggle: () => setOpen(v => !v) };
};
