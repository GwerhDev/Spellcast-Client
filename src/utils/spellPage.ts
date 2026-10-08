import type { JSONContent } from '@tiptap/core';

// A spell page's sheet: its size, margins and whether it's the spell's cover. The one place
// this is decided -- the reader and the editor both draw a page from it (see PaperSheet),
// so a page looks the same in either.

export interface PageMargins {
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
}

export const DEFAULT_PAGE_MARGINS: PageMargins = { marginTop: 48, marginRight: 64, marginBottom: 48, marginLeft: 64 };
const NO_MARGINS: PageMargins = { marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0 };
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 1131;

const hasText = (node: JSONContent | undefined): boolean =>
  node?.type === 'text' ? !!node.text?.trim() : (node?.content ?? []).some(hasText);

// The spell's cover image node: marked as one (`cover`, set wherever a cover is put on page
// 1). Older spells' covers carry no mark: there, an image that isn't a cropped page graphic
// and has no width of its own (images read from a PDF always have one).
export const isCoverNode = (node: JSONContent | undefined): boolean => {
  if (node?.type !== 'image') return false;
  const attrs = (node.attrs ?? {}) as Record<string, unknown>;
  if (attrs.cover === true) return true;
  return attrs.title !== 'pdf-graphic' && !attrs.width;
};

// Only page 1 can be the cover page: its first block the cover, and (an older, unmarked
// cover) nothing written on it. Any other page starting with an image -- a logo on a title
// page -- is a page like any other.
export const isCoverPage = (page: JSONContent | undefined, index: number): boolean => {
  if (index !== 0) return false;
  const first = page?.content?.[0];
  if (!isCoverNode(first)) return false;
  return (first?.attrs as Record<string, unknown> | undefined)?.cover === true || !hasText(page);
};

// Whether anything is written on the page, however deep (in columns, boxes, tables...):
// a page read from a PDF keeps its layout, so its text needn't be in top-level paragraphs.
export const pageHasText = (page: JSONContent | undefined): boolean => hasText(page);

// The cover only goes on a page 1 with nothing written on it -- one with text shows its
// text, not the PDF page's picture over it. Takes off a (marked) cover that ended up over
// page 1's text: spells imported before the text in columns/boxes counted as text got one.
// The same array back when there's nothing to take off.
export const dropCoverOverText = (pages: JSONContent[]): JSONContent[] => {
  const page1 = pages[0];
  const [first, ...rest] = page1?.content ?? [];
  if ((first?.attrs as Record<string, unknown> | undefined)?.cover !== true || first?.type !== 'image') return pages;
  if (!rest.some(hasText)) return pages;
  const updated = [...pages];
  updated[0] = { ...page1, content: rest };
  return updated;
};

export interface PageFrame {
  width: number;
  height: number;
  margins: PageMargins;
  cover: boolean;
  // A page read from the PDF as a picture of the whole page (see extractPdfPages): exactly
  // the PDF page's size, never taller.
  whole: boolean;
}

type PageAttrs = Partial<PageMargins> & { pageWidth?: number; pageHeight?: number; displayWidth?: number; displayHeight?: number };

// The page as it was on its PDF (its size and margins, read at import), or the defaults for
// a page written here. A cover page has no margins: its cover is the whole sheet.
export const pageFrame = (page: JSONContent | undefined, index: number): PageFrame => {
  const a = (page?.attrs ?? {}) as PageAttrs;
  const width = a.displayWidth ?? DEFAULT_WIDTH;
  const height = a.displayHeight ?? (a.pageWidth && a.pageHeight ? Math.round((a.pageHeight / a.pageWidth) * width) : DEFAULT_HEIGHT);
  const cover = isCoverPage(page, index);
  const margins = cover ? NO_MARGINS : {
    marginTop: a.marginTop ?? DEFAULT_PAGE_MARGINS.marginTop,
    marginRight: a.marginRight ?? DEFAULT_PAGE_MARGINS.marginRight,
    marginBottom: a.marginBottom ?? DEFAULT_PAGE_MARGINS.marginBottom,
    marginLeft: a.marginLeft ?? DEFAULT_PAGE_MARGINS.marginLeft,
  };
  const first = page?.content?.[0];
  const whole = first?.type === 'image' && a.displayWidth !== undefined && (first.attrs as Record<string, unknown> | undefined)?.width === a.displayWidth
    && a.marginTop === 0 && a.marginRight === 0 && a.marginBottom === 0 && a.marginLeft === 0;
  return { width, height, margins, cover, whole };
};
