import type { CoverFrame3DConfig } from '../../../utils/coverFrame';

// The covers the page's 3D scene draws (see CoverFrame3DRoot), each where its element is on
// the page (see CoverFrame3DView): a small store outside React, so a card registering its
// cover doesn't re-render anything but the scene.
export interface PageBook {
  // The element the book is drawn over: the cover's box with VIEW_MARGIN_X/Y of room around
  // it (see constants.ts).
  element: HTMLElement;
  config: CoverFrame3DConfig;
  coverUrl: string;
  radius: number;
}

let books: ReadonlyMap<string, PageBook> = new Map();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());

export const setPageBook = (id: string, book: PageBook) => {
  const next = new Map(books);
  next.set(id, book);
  books = next;
  emit();
};

export const removePageBook = (id: string) => {
  if (!books.has(id)) return;
  const next = new Map(books);
  next.delete(id);
  books = next;
  emit();
};

export const subscribePageBooks = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const getPageBooks = () => books;
