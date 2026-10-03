import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { JSONContent } from '@tiptap/core';
import { isCoverNode, pageHasText, dropCoverOverText } from './spellPage';

export const emptyPageContent: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

// TCORE-97: prefill for the spell metadata form (description/author/tags/language) --
// read once at import time, never authoritative (the user can always edit or clear it).
export interface PdfMetadata {
  title?: string;
  description?: string;
  author?: string;
  tags?: string[];
  language?: string;
}

export const extractPdfMetadata = async (pdf: pdfjsLib.PDFDocumentProxy): Promise<PdfMetadata> => {
  try {
    const { info, metadata } = await pdf.getMetadata();
    const i = info as Record<string, unknown>;
    const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
    const title = str(i.Title);
    const description = str(i.Subject);
    const author = str(i.Author);
    const keywords = str(i.Keywords);
    const tags = keywords ? keywords.split(/[,;]/).map((k) => k.trim()).filter(Boolean) : undefined;
    const language = str(i.Language) ?? str(metadata?.get('dc:language'));
    return { title, description, author, tags, language };
  } catch {
    // A corrupt or unreadable Info/XMP dictionary must never block the import itself --
    // prefill is a convenience, not a requirement.
    return {};
  }
};

export const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

// A cover image node: marked as one, so the reader and editor know page 1's first image is
// the cover (see isCoverNode) rather than a logo the page starts with.
const coverNodeOf = (src: string): JSONContent => ({ type: 'image', attrs: { src, alt: null, title: null, cover: true } });

export const injectCoverIntoPages = async (pages: JSONContent[], coverBlob: Blob | null): Promise<JSONContent[]> => {
  if (!coverBlob || pages.length === 0) return pages;
  const firstNode = pages[0]?.content?.[0];
  // Not over an image page 1 already starts with (a cover, or the scan of the page itself):
  // it would show twice.
  if (firstNode?.type === 'image' && (firstNode.attrs as Record<string, unknown> | undefined)?.title !== 'pdf-graphic') return pages;
  // Only a page 1 with nothing written on it gets the cover -- its text counted however
  // deep it is (a PDF's columns, boxes, tables). Empty paragraphs from emptyPageContent
  // don't count as text.
  if (pageHasText(pages[0])) return pages;
  try {
    const coverDataUrl = await blobToDataUrl(coverBlob);
    const updated = [...pages];
    updated[0] = {
      ...pages[0],
      content: [
        coverNodeOf(coverDataUrl),
        ...(pages[0].content || []),
      ],
    };
    return updated;
  } catch {
    return pages;
  }
};

export const renderPageToCover = async (pdf: pdfjsLib.PDFDocumentProxy): Promise<Blob | null> => {
  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(1, 400 / viewport.width);
    const scaled = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = scaled.width;
    canvas.height = scaled.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport: scaled, canvas }).promise;
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.75));
  } catch {
    return null;
  }
};

// TCORE-122 (review follow-up): applies a newly picked cover to whatever is shown as the
// first thing on page 1 -- shared by SpellCreateForm and SpellEditForm's applyCover, so a
// cover picked while editing an already-saved spell updates the reader's page 1 the exact
// same way it does at creation time, not just the cover Blob/thumbnail. Replaces an
// existing cover image node in place, or prepends a new one when page 1 has none yet --
// unless page 1 has text: then the cover is only the spell's thumbnail, and the page stays
// as written (without a cover left over it, see dropCoverOverText).
export const applyCoverToPage1 = (pages: JSONContent[], coverDataUrl: string): JSONContent[] => {
  if (pages.length === 0) return pages;
  const page1 = pages[0];
  const coverNode = coverNodeOf(coverDataUrl);
  const firstNode = page1?.content?.[0];
  const hasCoverNode = isCoverNode(firstNode);
  const written = hasCoverNode ? { ...page1, content: (page1.content ?? []).slice(1) } : page1;
  if (pageHasText(written)) return dropCoverOverText(pages);
  const content = hasCoverNode
    ? [coverNode, ...(page1.content ?? []).slice(1)]
    : [coverNode, ...(page1.content ?? [])];
  const updated = [...pages];
  updated[0] = { ...page1, content };
  return updated;
};

// TCORE-122 (review follow-up): caps an uploaded cover image before it's persisted as a
// Blob in IndexedDB -- an unprocessed photo straight from a phone/camera can be several MB,
// counting fully against the same per-spell storage quota TCORE-117 already tracks for
// audio/PDFs, for a cover that's only ever displayed at thumbnail size. Downscales to at
// most `maxDimension` on the longer side (never upscales a smaller image) and re-encodes as
// JPEG, matching renderPageToCover's own format/quality so covers are consistently sized
// regardless of source. Falls back to the original file if decoding/encoding fails for any
// reason (corrupt image, unsupported format) -- a not-yet-downscaled cover beats none.
export const downscaleImageBlob = async (
  blob: Blob,
  maxDimension = 400,
  quality = 0.75,
): Promise<Blob> => {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const downscaled = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', quality));
    return downscaled ?? blob;
  } catch {
    return blob;
  }
};

export const extractPageImages = async (page: pdfjsLib.PDFPageProxy): Promise<string[]> => {
  const dataUrls: string[] = [];
  try {
    const opList = await page.getOperatorList();
    const paintOps: number[] = [];
    for (let i = 0; i < opList.fnArray.length; i++) {
      if (opList.fnArray[i] === pdfjsLib.OPS.paintImageXObject) paintOps.push(i);
    }
    const seen = new Set<string>();
    for (const opIdx of paintOps) {
      const key = opList.argsArray[opIdx][0] as string;
      if (seen.has(key)) continue;
      seen.add(key);
      try {
        const imgData = await new Promise<{ width: number; height: number; [k: string]: unknown } | null>((resolve) => {
          let resolved = false;
          const done = (data: unknown) => { if (!resolved) { resolved = true; resolve(data as { width: number; height: number; [k: string]: unknown } | null); } };
          page.objs.get(key, done);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (page as any).commonObjs?.get?.(key, done);
          setTimeout(() => { if (!resolved) { resolved = true; resolve(null); } }, 2000);
        });
        if (!imgData || imgData.width < 16 || imgData.height < 16) continue;
        const canvas = document.createElement('canvas');
        canvas.width = imgData.width;
        canvas.height = imgData.height;
        const ctx = canvas.getContext('2d')!;
        const typed = imgData as { bitmap?: ImageBitmap; data?: Uint8ClampedArray; width: number; height: number };
        if (typed.bitmap instanceof ImageBitmap) {
          ctx.drawImage(typed.bitmap, 0, 0);
        } else if (imgData instanceof ImageBitmap) {
          ctx.drawImage(imgData, 0, 0);
        } else if (typed.data) {
          const iData = ctx.createImageData(imgData.width, imgData.height);
          iData.data.set(typed.data);
          ctx.putImageData(iData, 0, 0);
        } else {
          continue;
        }
        dataUrls.push(canvas.toDataURL('image/png'));
      } catch {
        // skip unrenderable image
      }
    }
  } catch {
    // skip page if operator list fails
  }
  return dataUrls;
};

type PdfLine = { items: TextItem[]; y: number; height: number; x: number };

const visibleOf = (line: PdfLine) => line.items.filter(i => i.str.trim().length > 0);
const lineStart = (line: PdfLine) => {
  const v = visibleOf(line);
  return v.length ? Math.min(...v.map(i => i.transform[4])) : line.x;
};
const lineEnd = (line: PdfLine) => {
  const v = visibleOf(line);
  return v.length ? Math.max(...v.map(i => i.transform[4] + i.width)) : line.x;
};

export interface FontInfo {
  bold: boolean;
  italic: boolean;
  // A CSS font-family list: the PDF font's own family first, then a generic one.
  family: string;
}

// The CSS family for a PDF font: the common standard fonts by their usual stacks, any other
// named font by its own name (if the system has it) before its generic family.
export const cssFontFamily = (fontName: string, generic?: string): string => {
  const name = fontName.replace(/^[A-Z]{6}\+/, '');
  const base = name.split(/[-,]/)[0].replace(/(PSMT|PS|MT|Std|Pro|LT)$/, '');
  if (/helvetica|arial|arimo|liberation ?sans|nimbus ?sans/i.test(base)) return 'Helvetica, Arial, sans-serif';
  if (/times/i.test(base)) return '"Times New Roman", Times, serif';
  if (/courier/i.test(base)) return '"Courier New", Courier, monospace';
  const fallback = generic === 'serif' || generic === 'sans-serif' || generic === 'monospace'
    ? generic
    : /mono|code|consol/i.test(base) ? 'monospace'
      : (!/sans/i.test(base) && /serif|roman|georgia|garamond|book|antiqua|palatino|minion|cambria|caslon|baskerville/i.test(base)) ? 'serif'
        : 'sans-serif';
  // Generated names (pdf.js's own "g_d0_f1", or none at all) say nothing of the family.
  if (!/^[A-Za-z][A-Za-z ]{2,}$/.test(base) || /^g_d\d/.test(base)) return fallback;
  return `"${base.replace(/([a-z])([A-Z])/g, '$1 $2')}", ${fallback}`;
};

// Bold, italic and family of a text item's font. pdf.js names a font on the text by an id
// ("g_d0_f1"); its real name and style are on the loaded font object, there once the page
// has been rendered or its operator list read.
const readFontInfo = (
  page: pdfjsLib.PDFPageProxy,
  fontName: string,
  styles: Record<string, { fontFamily?: string }> | undefined,
): FontInfo => {
  let font: { name?: string; bold?: boolean; black?: boolean; italic?: boolean; fallbackName?: string } | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    font = (page as any).commonObjs?.get?.(fontName) ?? null;
  } catch {
    font = null; // not loaded: fall back to what the text's own font name says
  }
  const name = font?.name ?? fontName;
  const normName = name.replace(/^[A-Z]{6}\+/, '').toLowerCase();
  const generic = (styles?.[fontName]?.fontFamily ?? '').toLowerCase();
  return {
    bold: !!font?.bold || !!font?.black || /bold|demi|heavy|black|semibold/.test(normName) || /bold|demi|heavy|black/.test(generic),
    italic: !!font?.italic || /italic|oblique|slant/.test(normName) || /italic|oblique/.test(generic),
    family: cssFontFamily(name, font?.fallbackName ?? generic),
  };
};

const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

// A text item's color, read from the rendered page: the ink pixels in its box -- the ones
// furthest from the box's most common color (the paper, or the box it sits on). Null when
// there's no clear ink (an empty or covered-up item).
export const sampleTextColor = (
  pixels: { data: Uint8ClampedArray; width: number; height: number },
  box: { left: number; top: number; right: number; bottom: number },
): string | null => {
  const { data, width, height } = pixels;
  const x0 = Math.max(0, Math.floor(box.left)), x1 = Math.min(width - 1, Math.ceil(box.right));
  const y0 = Math.max(0, Math.floor(box.top)), y1 = Math.min(height - 1, Math.ceil(box.bottom));
  if (x1 <= x0 || y1 <= y0) return null;
  const counts = new Map<number, number>();
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * width + x) * 4;
      const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  let bgKey = 0, bgCount = -1;
  for (const [k, c] of counts) if (c > bgCount) { bgKey = k; bgCount = c; }
  const bg = [((bgKey >> 8) & 15) * 17, ((bgKey >> 4) & 15) * 17, (bgKey & 15) * 17];
  let maxD = 0;
  const dist = (i: number) => Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) maxD = Math.max(maxD, dist((y * width + x) * 4));
  if (maxD < 60) return null;
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * width + x) * 4;
      if (dist(i) >= maxD * 0.85) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
    }
  }
  return n ? toHex(r / n, g / n, b / n) : null;
};

const rgbOfHex = (hex: string): [number, number, number] | null => {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
};

// Greys, black and white: colors that carry no hue. Text in them takes the theme's own text
// color instead (the page is the app's, light or dark, not the PDF's white).
export const isNeutralColor = (hex: string): boolean => {
  const rgb = rgbOfHex(hex);
  if (!rgb) return true;
  const max = Math.max(...rgb), min = Math.min(...rgb);
  return max === 0 || (max - min) / max < 0.15;
};

// How a paragraph's lines run: whether each line break is only where the line ran out of
// room (a soft wrap, joined back so the text wraps again at the reader's own width) or a
// real one, where the text sits (its left edge, the first line's indent) and whether it's
// justified.
export interface TextFlow {
  left: number;
  indent: number;
  justify: boolean;
  // Per line but the last: true when the break after it is only a wrap.
  soft: boolean[];
}

// The width a word takes in an item, from the item's own width (its text, evenly spread).
const leadingWordWidth = (line: PdfLine) => {
  const first = visibleOf(line)[0];
  if (!first) return 0;
  const text = first.str.trimStart();
  const word = text.split(/\s/)[0] ?? '';
  return text.length ? first.width * (word.length / text.length) : 0;
};

// A block of wrapped text: several of its lines ending at the same right edge, where the
// next line's first word wouldn't have fit. A single line ending further right than the
// others (a list of label/value rows) isn't a margin, so those keep their breaks.
export const analyseFlow = (lines: PdfLine[], textAreaWidth: number): TextFlow | null => {
  if (lines.length < 2) return null;
  const ends = lines.map(lineEnd);
  const starts = lines.map(lineStart);
  const right = Math.max(...ends);
  const fonts = lines.map(l => l.height).filter(h => h > 0).sort((a, b) => a - b);
  const font = fonts[Math.floor(fonts.length / 2)] ?? 10;
  const nearEdge = (i: number) => right - ends[i] <= font * 0.6;
  const atEdge = lines.slice(0, -1).filter((_, i) => nearEdge(i)).length;
  const wrapped = atEdge >= 2 && atEdge >= (lines.length - 1) * 0.4;
  // Two lines, the first nearly as wide as the page's text: a wrapped paragraph too.
  const wideFirst = lines.length === 2 && ends[0] - starts[0] >= textAreaWidth * 0.75;
  if (!wrapped && !wideFirst) return null;
  const soft = lines.slice(0, -1).map((_, i) =>
    nearEdge(i) && leadingWordWidth(lines[i + 1]) + font * 0.25 > right - ends[i]);
  if (!soft.some(Boolean)) return null;
  const left = Math.min(...starts);
  const softEnds = soft.map((s, i) => (s ? right - ends[i] : null)).filter((d): d is number => d !== null);
  const justify = softEnds.length >= 2 && softEnds.filter(d => d <= font * 0.3).length >= softEnds.length * 0.7;
  return { left, indent: starts[0] - left, justify, soft };
};

// A wrapped block's paragraphs: a new one at each line set in from the block's left edge (a
// first-line indent), each with its own flow.
export const splitFlowParagraphs = (lines: PdfLine[], flow: TextFlow): { lines: PdfLine[]; flow: TextFlow }[] => {
  const fonts = lines.map(l => l.height).filter(h => h > 0).sort((a, b) => a - b);
  const font = fonts[Math.floor(fonts.length / 2)] ?? 10;
  const out: { lines: PdfLine[]; flow: TextFlow }[] = [];
  let start = 0;
  const close = (end: number) => {
    const part = lines.slice(start, end);
    out.push({
      lines: part,
      flow: { left: flow.left, indent: lineStart(part[0]) - flow.left, justify: flow.justify, soft: flow.soft.slice(start, end - 1) },
    });
    start = end;
  };
  for (let i = 1; i < lines.length; i++) {
    if (lineStart(lines[i]) - flow.left > font * 0.8) close(i);
  }
  close(lines.length);
  return out;
};

// How a paragraph's lines line up against each other: centered when their middles meet but
// their edges don't, right-aligned when their right edges do. Needs two lines or more.
export const lineAlignment = (lines: PdfLine[]): 'center' | 'right' | null => {
  if (lines.length < 2) return null;
  const starts = lines.map(lineStart), ends = lines.map(lineEnd);
  const spread = (v: number[]) => Math.max(...v) - Math.min(...v);
  const fonts = lines.map(l => l.height).filter(h => h > 0);
  const tol = (fonts.length ? Math.min(...fonts) : 10) * 0.5;
  if (spread(starts) <= tol) return null;
  if (spread(starts.map((s, i) => (s + ends[i]) / 2)) <= tol) return 'center';
  if (spread(ends) <= tol) return 'right';
  return null;
};


const resolveCssColorToRgb = (): [number, number, number] => {
  try {
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;color:var(--color-light-100)';
    document.body.appendChild(probe);
    const computed = getComputedStyle(probe).color;
    document.body.removeChild(probe);
    const m = computed.match(/\d+/g);
    if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
  } catch { /* fall through */ }
  return [0, 0, 0];
};

const cropCanvasRegion = (
  canvas: HTMLCanvasElement,
  pageViewport: ReturnType<pdfjsLib.PDFPageProxy['getViewport']>,
  scale: number,
  yMinPdf: number,
  yMaxPdf: number,
  textRgb: [number, number, number],
): string | null => {
  try {
    // PDF Y is from bottom; canvas Y is from top
    const cropTop = Math.max(0, Math.floor((pageViewport.height - yMaxPdf) * scale) - 4);
    const cropBottom = Math.min(canvas.height, Math.ceil((pageViewport.height - yMinPdf) * scale) + 4);
    if (cropBottom <= cropTop) return null;
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = cropBottom - cropTop;
    const ctx = out.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(canvas, 0, cropTop, canvas.width, cropBottom - cropTop, 0, 0, canvas.width, cropBottom - cropTop);

    // Remove white background and recolor to theme text color
    const [tr, tg, tb] = textRgb;
    const img = ctx.getImageData(0, 0, out.width, out.height);
    const { data } = img;
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      // Alpha proportional to darkness; replace RGB with theme text color
      data[i] = tr;
      data[i + 1] = tg;
      data[i + 2] = tb;
      data[i + 3] = Math.round((1 - brightness / 255) * 255);
    }
    ctx.putImageData(img, 0, 0);

    return out.toDataURL('image/png');
  } catch {
    return null;
  }
};

const detectHorizontalRulesCanvas = (
  canvas: HTMLCanvasElement,
  pageViewport: ReturnType<pdfjsLib.PDFPageProxy['getViewport']>,
  scale: number,
  textLines: PdfLine[],
): { y: number; color: string | null; thickness: number }[] => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const w = canvas.width, h = canvas.height;

  // Mark rows that contain text (to exclude them from line detection)
  const textRows = new Set<number>();
  for (const line of textLines) {
    const cy = Math.round((pageViewport.height - line.y) * scale);
    const lh = Math.ceil(line.height * scale) + 3;
    for (let dy = -lh; dy <= lh; dy++) {
      const r = cy + dy;
      if (r >= 0 && r < h) textRows.add(r);
    }
  }

  const isRuleRow: boolean[] = new Array(h).fill(false);
  for (let y = 0; y < h; y++) {
    if (textRows.has(y)) continue;
    let x0 = -1, x1 = -1, darkCount = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (lum < 180) {
        if (x0 === -1) x0 = x;
        x1 = x;
        darkCount++;
      }
    }
    if (x0 === -1) continue;
    const span = x1 - x0 + 1;
    // Must span ≥ 25% of canvas width and be densely filled (≥ 75% of span is dark)
    if (span > w * 0.25 && darkCount / span > 0.75) isRuleRow[y] = true;
  }

  // A rule's color: the average of its drawn pixels.
  const colorOfRows = (from: number, to: number) => {
    let r = 0, g = 0, b = 0, n = 0;
    for (let ry = from; ry < to; ry++) {
      for (let x = 0; x < w; x++) {
        const i = (ry * w + x) * 4;
        if ((data[i] + data[i + 1] + data[i + 2]) / 3 < 180) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
      }
    }
    return n ? toHex(r / n, g / n, b / n) : null;
  };

  const rules: { y: number; color: string | null; thickness: number }[] = [];
  let y = 0;
  while (y < h) {
    if (isRuleRow[y]) {
      const start = y;
      while (y < h && isRuleRow[y]) y++;
      if (y - start <= 6) { // thin cluster = a line, not a filled region
        const midCanvasY = (start + y - 1) / 2;
        rules.push({ y: pageViewport.height - midCanvasY / scale, color: colorOfRows(start, y), thickness: y - start });
      }
    } else {
      y++;
    }
  }
  return rules;
};

const detectDecorativeRegionsFromCanvas = (
  canvas: HTMLCanvasElement,
  pageViewport: ReturnType<pdfjsLib.PDFPageProxy['getViewport']>,
  scale: number,
  textLines: PdfLine[],
): { yMin: number; yMax: number }[] => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  const w = canvas.width, h = canvas.height;
  const { data } = ctx.getImageData(0, 0, w, h);

  // Mask canvas rows covered by extracted text lines (with generous padding)
  const textMask = new Uint8Array(h);
  for (const line of textLines) {
    if (line.height === 0) continue;
    const cy = Math.round((pageViewport.height - line.y) * scale);
    const lh = Math.ceil(line.height * scale);
    for (let dy = -(lh + 6); dy <= lh + 6; dy++) {
      const r = cy + dy;
      if (r >= 0 && r < h) textMask[r] = 1;
    }
  }

  // Find non-text rows with ≥3% dark pixels
  const darkRow = new Uint8Array(h);
  for (let y = 0; y < h; y++) {
    if (textMask[y]) continue;
    let dark = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if ((data[i] + data[i + 1] + data[i + 2]) / 3 < 200) dark++;
    }
    if (dark > w * 0.03) darkRow[y] = 1;
  }

  // Phase 1: collect raw dark-row clusters with a 5-row gap tolerance.
  const rawClusters: { start: number; end: number }[] = [];
  let y = 0;
  while (y < h) {
    if (!darkRow[y]) { y++; continue; }
    const start = y;
    let lastDark = y;
    y++;
    while (y < h) {
      if (darkRow[y]) {
        lastDark = y;
        y++;
      } else if (y - lastDark > 5) {
        break;
      } else {
        y++;
      }
    }
    rawClusters.push({ start, end: lastDark });
  }

  // Phase 2: merge adjacent clusters that have a text zone between them.
  // Handles ornaments where text sits inside a graphic (e.g. an ellipse wrapping
  // a heading): [top arc cluster] | [text rows] | [bottom arc cluster] → one region.
  // Gap is capped at 150px so distant elements (page header + footer) never merge.
  const mergedClusters: { start: number; end: number }[] = [];
  let ci = 0;
  while (ci < rawClusters.length) {
    const { start } = rawClusters[ci];
    let { end } = rawClusters[ci];
    while (ci + 1 < rawClusters.length) {
      const next = rawClusters[ci + 1];
      const gap = next.start - end;
      if (gap > 150) break;
      let hasText = false;
      for (let gy = end + 1; gy < next.start; gy++) {
        if (textMask[gy]) { hasText = true; break; }
      }
      if (hasText) {
        end = next.end;
        ci++;
      } else {
        break;
      }
    }
    mergedClusters.push({ start, end });
    ci++;
  }

  // Phase 3: convert to PDF Y-coordinates and filter by minimum height.
  const minHeightPx = Math.ceil(scale * 15);
  const regions: { yMin: number; yMax: number }[] = [];
  for (const { start, end } of mergedClusters) {
    if (end - start + 1 >= minHeightPx) {
      regions.push({
        yMin: pageViewport.height - end / scale,
        yMax: pageViewport.height - start / scale,
      });
    }
  }

  return regions;
};

// One page of the PDF (1-based), read the same way extractPdfPages reads them all: for
// reading a single page again from the stored PDF (the editor's per-page reset).
export const extractPdfPage = async (pdf: pdfjsLib.PDFDocumentProxy, pageNumber: number): Promise<JSONContent> => {
  const single = { numPages: 1, getPage: () => pdf.getPage(pageNumber) } as unknown as pdfjsLib.PDFDocumentProxy;
  const [page] = await extractPdfPages(single);
  return page;
};

export const extractPdfPages = async (
  pdf: pdfjsLib.PDFDocumentProxy,
  onProgress?: (current: number, total: number) => void,
  onPageExtracted?: (pageNum: number, content: JSONContent) => void,
): Promise<JSONContent[]> => {
  const allPagesContent: JSONContent[] = [];
  const textRgb = resolveCssColorToRgb();

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const pageViewport = page.getViewport({ scale: 1 });
    const displayWidth = Math.round(pageViewport.width * (96 / 72));
    const displayHeight = Math.round(pageViewport.height * (96 / 72));
    const xScale = displayWidth / pageViewport.width;
    const content = await page.getTextContent();

    const pageDims = { pageWidth: Math.round(pageViewport.width), pageHeight: Math.round(pageViewport.height), displayWidth, displayHeight };

    if (content.items.length === 0) {
      const emptyPage = { ...emptyPageContent, attrs: pageDims };
      allPagesContent.push(emptyPage);
      onPageExtracted?.(pageNum, emptyPage);
      onProgress?.(pageNum, pdf.numPages);
      continue;
    }

    const items = content.items as TextItem[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contentStyles = (content as any).styles as Record<string, { fontFamily?: string }> | undefined;


    // Large decorative glyphs (e.g. drop-cap "❝") have a low baseline but tall visual extent.
    // Sort and group them by visual top (baseline + height) so they land next to the text they belong to.
    const itemHeights = items.map(i => i.height).filter(h => h > 0);
    const avgItemH = itemHeights.length ? itemHeights.reduce((s, h) => s + h, 0) / itemHeights.length : 12;
    const groupY = (item: TextItem) =>
      item.height > avgItemH * 2.5 ? item.transform[5] + item.height : item.transform[5];

    items.sort((a, b) => {
      const ya = groupY(a), yb = groupY(b);
      if (ya > yb) return -1;
      if (ya < yb) return 1;
      return a.transform[4] - b.transform[4];
    });

    // Pieces of one line can sit a fraction of a point apart (a bold label and its value,
    // drawn by separate text operations): within a quarter of the font size they're the same
    // line. Lines of text are always further apart than that.
    const sameLine = (a: TextItem, lineHeight: number, dy: number) =>
      dy <= Math.max(1, Math.min(a.height || avgItemH, lineHeight || avgItemH) * 0.25);

    const lines: PdfLine[] = [];
    if (items.length > 0) {
      let currentLine: TextItem[] = [];
      let lastY = groupY(items[0]);
      let currentHeight = items[0].height;
      for (const item of items) {
        const gy = groupY(item);
        if (!sameLine(item, currentHeight, Math.abs(gy - lastY))) {
          currentLine.sort((a, b) => a.transform[4] - b.transform[4]);
          lines.push({ items: currentLine, y: lastY, height: currentLine.reduce((max, i) => Math.max(max, i.height), 0), x: currentLine[0]?.transform[4] || 0 });
          currentLine = [];
          lastY = gy;
          currentHeight = item.height;
        }
        currentLine.push(item);
        lastY = gy;
        currentHeight = Math.max(currentHeight, item.height);
      }
      currentLine.sort((a, b) => a.transform[4] - b.transform[4]);
      lines.push({ items: currentLine, y: lastY, height: currentLine.reduce((max, i) => Math.max(max, i.height), 0), x: currentLine[0]?.transform[4] || 0 });
    }

    const allLineHeights = lines.map(l => l.height).filter(h => h > 0);
    const avgLineHeight = allLineHeights.reduce((sum, h) => sum + h, 0) / (allLineHeights.length || 1);

    // Lines into paragraphs: a new one wherever the gap to the previous line is clearly more
    // than a line's. The gap itself isn't kept as empty lines: each block carries the real
    // space before it (spaceBefore, below), so it renders the same whatever the line height.
    const groupParagraphs = (source: PdfLine[]): { lines: PdfLine[]; yTop: number }[] => {
      const groups: { lines: PdfLine[]; yTop: number }[] = [];
      let current: PdfLine[] = [];
      for (let j = 0; j < source.length; j++) {
        const line = source[j];
        if (j > 0) {
          const prevLine = source[j - 1];
          const yDiff = prevLine.y - line.y;
          const capH = avgLineHeight * 3;
          // Use min of adjacent heights so a large heading followed by smaller text still
          // splits correctly (a max-based threshold is too big across size boundaries like
          // title → subtitle).
          const threshold = Math.max(Math.min(prevLine.height, line.height, capH), avgLineHeight) * 1.5;
          if (yDiff > threshold && current.length > 0) {
            groups.push({ lines: current, yTop: current[0].y });
            current = [];
          }
        }
        if (line.items.length > 0) current.push(line);
      }
      if (current.length > 0) groups.push({ lines: current, yTop: current[0].y });
      return groups;
    };

    // XObject images, with their place on the page from the operator list.
    const opList = await page.getOperatorList();
    const pageImages = await extractPageImages(page);
    const imagePlaces = extractImageYPositions(opList, pageImages.length, pageViewport.height);
    // A scanned page: the whole sheet is one picture, with its text (read by OCR) laid
    // over it. The page is its text then -- the picture isn't kept, or it showed the page a
    // second time above it. Its place still counts as drawn (scanPlaces), so the graphic
    // regions below don't crop it again piece by piece.
    const scanPlaces = splitOffPageScans(pageImages, imagePlaces, pageViewport, lines.some(l => l.items.some(i => i.str.trim())));
    const xobjectPlaces = imagePlaces.filter(p => p.width > 0 && p.height > 0);

    // The page's content area: its text and its images. Not the text alone: on a page of a
    // few short lines (a credits page) the text says nothing of how wide the page's column
    // is, and a narrow one made from it wrapped lines that are whole on the page.
    const visibleLineItems = lines.flatMap(l => l.items.filter(i => i.str.trim().length > 0));
    const leftmostX = Math.min(
      ...(visibleLineItems.length > 0 ? visibleLineItems.map(i => i.transform[4]) : [xobjectPlaces.length ? Infinity : 0]),
      ...xobjectPlaces.map(p => Math.max(0, p.x)),
    );
    const rightmostExtent = Math.max(
      ...(visibleLineItems.length > 0 ? visibleLineItems.map(i => i.transform[4] + i.width) : [xobjectPlaces.length ? -Infinity : pageViewport.width]),
      ...xobjectPlaces.map(p => Math.min(pageViewport.width, p.x + p.width)),
    );
    const topY = lines.length > 0 ? Math.max(...lines.map(l => l.y)) : pageViewport.height;
    const bottomY = lines.length > 0 ? Math.min(...lines.map(l => l.y)) : 0;

    const marginLeft = Math.max(0, Math.round(leftmostX * xScale));
    const marginRight = Math.max(0, Math.round((pageViewport.width - rightmostExtent) * xScale));
    const marginBottom = Math.max(0, Math.round(bottomY * xScale));

    // Render page once — reused for horizontal rule detection and curve region crops
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = Math.round(xScale * pageViewport.width);
    pageCanvas.height = Math.round(xScale * pageViewport.height);
    // willReadFrequently: this canvas is read back via getImageData for rule
    // and decorative-region detection, so hint the browser to keep it CPU-backed.
    const pageCtx = pageCanvas.getContext('2d', { willReadFrequently: true })!;
    const renderVp = page.getViewport({ scale: xScale });
    await page.render({ canvasContext: pageCtx as CanvasRenderingContext2D, viewport: renderVp, canvas: pageCanvas }).promise;

    // Horizontal rules via pixel analysis (robust, version-agnostic)
    const horizontalRules = detectHorizontalRulesCanvas(pageCanvas, pageViewport, xScale, lines);

    // Decorative/graphic regions: detected from the rendered canvas so coordinates are always
    // correct regardless of PDF structure (Form XObjects, unusual CTM, etc.)
    // Not where an image is drawn: the image is already on the page as itself, and cropping
    // the same rows again (recolored) drew it a second time under it.
    const graphicRegions = detectDecorativeRegionsFromCanvas(pageCanvas, pageViewport, xScale, lines).filter(r => {
      const covered = Math.max(0, ...[...xobjectPlaces, ...scanPlaces].map(p => Math.min(r.yMax, p.y + p.height) - Math.max(r.yMin, p.y)));
      return covered < (r.yMax - r.yMin) * 0.5;
    });

    // Top-level (non-nested) regions only
    const topLevelRegions = graphicRegions.filter((r, i) =>
      !graphicRegions.some((other, j) => i !== j && other.yMin <= r.yMin && other.yMax >= r.yMax)
    );

    // Use the visual top of the first top-of-page graphic as marginTop
    let marginTop = Math.max(0, Math.round((pageViewport.height - topY) * xScale));
    const topRegion = topLevelRegions.find(r => !lines.some(l => l.y > r.yMax + 5));
    if (topRegion) {
      marginTop = Math.max(0, Math.round((pageViewport.height - topRegion.yMax) * xScale));
    }

    const pageAttrs = { ...pageDims, marginLeft, marginRight, marginTop, marginBottom };

    // Drawings made of vector shapes, as images in their place like the XObject ones (not
    // the ornaments already cropped whole as graphic regions).
    const textBoxes = items.filter(i => i.str.trim()).map(i => ({
      x: i.transform[4], y: i.transform[5] - (i.height || avgItemH) * 0.25, width: i.width, height: (i.height || avgItemH) * 1.1,
    }));
    for (const g of findVectorGraphics(opList, pageViewport, textBoxes)) {
      if (graphicRegions.some(r => g.y < r.yMax && g.y + g.height > r.yMin)) continue;
      const src = cropVectorGraphic(pageCanvas, pageViewport.height, xScale, g);
      if (!src) continue;
      pageImages.push(src);
      imagePlaces.push({ x: g.x, y: g.y, width: g.width, height: g.height });
    }

    // A text line's box as CSS lays it out at line height `lh`: ~80% of the font above the
    // baseline, ~20% below, plus half the extra leading on each side.
    const fontOf = (line: PdfLine) => line.height || avgLineHeight;
    const lineTop = (line: PdfLine, lh: number) => line.y + fontOf(line) * (0.8 + (lh - 1) / 2);
    const lineBottom = (line: PdfLine, lh: number) => line.y - fontOf(line) * (0.2 + (lh - 1) / 2);
    const toPx = (pt: number) => Math.round(pt * xScale * 10) / 10;

    // ── Side by side: bands of the page laid out in two columns ──
    // A band is a run of lines and images close together vertically with an empty vertical
    // gutter between content on both sides (a form's two columns, a title with a logo or a
    // QR beside it). Each side is then read as its own column, the left one first.
    const bands = detectColumnBands(lines, imagePlaces, { avgLineHeight, fontOf, leftmostX, rightmostExtent });
    const bandOfLine = new Map<PdfLine, { band: number; side: 0 | 1 }>();
    const sideLines: PdfLine[][][] = bands.map(() => [[], []]);
    bands.forEach((band, b) => {
      for (const line of band.lines) {
        const left = line.items.filter(i => i.transform[4] + i.width / 2 < band.gutter);
        const right = line.items.filter(i => i.transform[4] + i.width / 2 >= band.gutter);
        for (const [side, items] of [[0, left], [1, right]] as const) {
          if (items.length === 0) continue;
          const part: PdfLine = { items, y: line.y, height: items.reduce((m, i) => Math.max(m, i.height), 0), x: items[0].transform[4] };
          sideLines[b][side].push(part);
          bandOfLine.set(part, { band: b, side });
        }
        bandOfLine.set(line, { band: b, side: 0 });
      }
    });
    const bandLines = new Set(bands.flatMap(b => b.lines));

    // Its lines as far apart as in the PDF: baseline to baseline over the font size.
    const lineHeightOf = (source: PdfLine[]): number | null => {
      if (source.length < 2) return null;
      const steps = source.slice(1).map((l, i) => source[i].y - l.y);
      const avgStep = steps.reduce((a, b) => a + b, 0) / steps.length;
      const avgFont = source.reduce((a, l) => a + fontOf(l), 0) / source.length;
      return Math.min(2.5, Math.max(1, Math.round((avgStep / avgFont) * 100) / 100));
    };

    // Wrapped text (a page of prose) is kept as text that wraps again, not as the PDF's lines:
    // the reader's font and width aren't the PDF's, so its line breaks never land where the
    // PDF's did, and forced ones leave every line broken twice. A block's paragraphs are split
    // at each first-line indent, all keeping the block's line spacing.
    type Place = { band: number; side: 0 | 1 } | null;
    type Para = { lines: PdfLine[]; yTop: number; place: Place; flow: TextFlow | null; lineHeight: number | null };
    const withFlow = (groups: { lines: PdfLine[]; yTop: number }[], place: Place, width: number): Para[] => groups.flatMap((g): Para[] => {
      const flow = lineAlignment(g.lines) ? null : analyseFlow(g.lines, width);
      if (!flow) return [{ ...g, place, flow: null, lineHeight: null }];
      const lineHeight = lineHeightOf(g.lines);
      return splitFlowParagraphs(g.lines, flow).map(s => ({ lines: s.lines, yTop: s.lines[0].y, place, flow: s.flow, lineHeight }));
    });
    const textAreaWidth = rightmostExtent - leftmostX;
    const paragraphs: Para[] = [
      ...withFlow(groupParagraphs(lines.filter(l => !bandLines.has(l))), null, textAreaWidth),
      ...sideLines.flatMap((sides, b) => sides.flatMap((sl, side) => withFlow(
        groupParagraphs(sl),
        { band: b, side: side as 0 | 1 },
        side === 0 ? bands[b].gutter - leftmostX : rightmostExtent - bands[b].gutter,
      ))),
    ];

    // Each font's bold/italic/family, read once.
    const fontInfos = new Map<string, FontInfo>();
    const fontInfoOf = (fontName: string) => {
      let info = fontInfos.get(fontName);
      if (!info) { info = readFontInfo(page, fontName, contentStyles); fontInfos.set(fontName, info); }
      return info;
    };
    // The page as drawn, for each text's color.
    const pagePixels = pageCtx.getImageData(0, 0, pageCanvas.width, pageCanvas.height);
    const colorOf = (item: TextItem) => {
      const baseline = (pageViewport.height - item.transform[5]) * xScale;
      const size = (item.height || avgItemH) * xScale;
      return sampleTextColor(pagePixels, {
        left: item.transform[4] * xScale,
        right: (item.transform[4] + item.width) * xScale,
        top: baseline - size * 0.75,
        bottom: baseline + size * 0.2,
      });
    };

    // Build content items with their extent on the page (PDF units, y up): sorted by their
    // top, and each text block given the real space between it and what comes before.
    type Item = { yPdf: number; bottom: number; node: JSONContent; place: { band: number; side: 0 | 1 } | null };
    const contentItems: Item[] = [];

    // Paragraph items (skip those whose Y falls within a graphic region — they'll appear in the rendered image)
    for (const p of paragraphs) {
      const inRegion = graphicRegions.some(r => p.yTop >= r.yMin - 5 && p.yTop <= r.yMax + 5);
      if (inRegion) continue;

      if (p.lines.length === 0) continue;

      // Wrapped text from its block's left edge (its first line's indent is its own, below).
      const paragraphX = p.flow ? p.flow.left : (p.lines[0]?.x ?? leftmostX);
      // From the text's left edge -- or, in a right column, from where that column starts.
      const indentFrom = p.place?.side === 1 ? bands[p.place.band].gutter : leftmostX;
      const pMarginLeft = Math.max(0, Math.round((paragraphX - indentFrom) * xScale));

      // Alignment: justified wrapped text; lines centered or right-aligned against each other
      // (in a column too); and for a single line outside columns, its place in the text area.
      // Use the text block's own center/width as reference so that full-width lines
      // (whose center naturally falls near the page center) are NOT flagged as centered.
      // Not inside a column: there the block keeps its real indent, as the page's text area
      // says nothing about where a column's lines sit.
      const firstLine = p.lines[0];
      let textAlign: 'center' | 'right' | 'justify' | undefined;
      if (p.flow?.justify) textAlign = 'justify';
      else if (p.lines.length > 1) textAlign = lineAlignment(p.lines) ?? undefined;
      const visibleFirstLineItems = firstLine?.items.filter(i => i.str.trim().length > 0) ?? [];
      if (visibleFirstLineItems.length > 0 && !p.place && p.lines.length === 1) {
        const lineStartX = visibleFirstLineItems[0].transform[4];
        const lineEndX = Math.max(...visibleFirstLineItems.map(i => i.transform[4] + i.width));
        const lineWidth = lineEndX - lineStartX;
        const lineCenterX = (lineStartX + lineEndX) / 2;
        const textAreaWidth = rightmostExtent - leftmostX;
        const textAreaCenter = (leftmostX + rightmostExtent) / 2;
        if (lineWidth < textAreaWidth * 0.8) {
          if (Math.abs(lineCenterX - textAreaCenter) < textAreaWidth * 0.08) {
            textAlign = 'center';
          } else if (lineStartX > textAreaCenter && lineWidth < textAreaWidth * 0.5) {
            textAlign = 'right';
          }
        }
      }

      const contentNodes: JSONContent[] = [];
      // How many characters at each size: the block's own size is its most common one.
      const sizeCounts = new Map<number, number>();

      for (let i = 0; i < p.lines.length; i++) {
        const line = p.lines[i];
        if (i > 0 && p.flow?.soft[i - 1]) {
          // Only where the line ran out of room: joined back, a word split by a hyphen at the
          // line's end whole again.
          const last = [...contentNodes].reverse().find(n => n.type === 'text');
          const nextStr = visibleOf(line)[0]?.str.trimStart() ?? '';
          if (last?.text && /\p{L}-$/u.test(last.text) && /^\p{Ll}/u.test(nextStr)) {
            last.text = last.text.slice(0, -1);
          } else if (last?.text && !/\s$/.test(last.text) && !/^\s/.test(line.items[0]?.str ?? '')) {
            contentNodes.push({ type: 'text', text: ' ' });
          }
        } else if (i > 0) {
          contentNodes.push({ type: 'hardBreak' });
          // A line set further in than the first: as many spaces (not for wrapped text or
          // lines lined up by alignment, where it's their alignment, not an indent).
          const relativeIndent = line.x - paragraphX;
          if (relativeIndent > 5 && !p.flow && !textAlign) {
            const numSpaces = Math.round(relativeIndent * xScale / 7);
            if (numSpaces > 0) contentNodes.push({ type: 'text', text: ' '.repeat(numSpaces) });
          }
        }
        let previous: TextItem | null = null;
        for (const item of line.items) {
          if (item.str.length === 0) continue;
          // Pieces of a line drawn apart (another column, a label and its value) come with no
          // space between them: one is added where the PDF leaves a visible gap.
          if (previous) {
            const gap = item.transform[4] - (previous.transform[4] + previous.width);
            const size = item.height || previous.height || avgLineHeight;
            if (gap > size * 0.15 && !/\s$/.test(previous.str) && !/^\s/.test(item.str)) {
              contentNodes.push({ type: 'text', text: ' ' });
            }
          }
          previous = item;
          const textNode: JSONContent & { marks: NonNullable<JSONContent['marks']> } = { type: 'text', text: item.str, marks: [] };
          // Its font's real style and family (see readFontInfo), not just what its name says.
          const font = fontInfoOf(item.fontName);
          if (font.bold) textNode.marks.push({ type: 'bold' });
          if (font.italic) textNode.marks.push({ type: 'italic' });
          // Its size, in the same px as the page (pt * 96/72): the text keeps its proportion
          // to the page instead of taking the editor's default size. Its font family, and its
          // color as drawn (kept only where it says something: see keepTextColors).
          const fontPx = toPx(item.height || line.height || avgLineHeight);
          const style: Record<string, string> = { fontFamily: font.family };
          if (fontPx > 0) style.fontSize = `${fontPx}px`;
          const color = item.str.trim() ? colorOf(item) : null;
          if (color) style.color = color;
          textNode.marks.push({ type: 'textStyle', attrs: style });
          if (fontPx > 0 && item.str.trim()) sizeCounts.set(fontPx, (sizeCounts.get(fontPx) ?? 0) + item.str.length);
          contentNodes.push(textNode);
        }
      }
      if (contentNodes.length === 0) continue;

      // Wrapped text's spacing is the reader's own: a justified PDF line often comes with
      // runs of spaces between its words, which the editor would keep (its text keeps every
      // space) and wrap differently from the reader, which collapses them.
      if (p.flow) {
        let previousEndsInSpace = false;
        for (const node of contentNodes) {
          if (node.type !== 'text' || !node.text) { previousEndsInSpace = false; continue; }
          node.text = node.text.replace(/\s+/g, ' ');
          if (previousEndsInSpace) node.text = node.text.replace(/^ /, '');
          if (node.text) previousEndsInSpace = node.text.endsWith(' ');
        }
        for (let n = contentNodes.length - 1; n >= 0; n--) {
          if (contentNodes[n].type === 'text' && !contentNodes[n].text) contentNodes.splice(n, 1);
        }
      }

      const firstLineHeight = p.lines[0]?.height || 0;
      let nodeType = 'paragraph';
      let attrs: Record<string, unknown> = {};
      // Cap the baseline at ~14pt so title pages (where all text is large and avgLineHeight is
      // inflated) still produce proper h1/h2/h3 hierarchy instead of everything being a paragraph.
      const headingBaseline = Math.min(avgLineHeight, 14);
      if (firstLineHeight > headingBaseline * 1.8) { nodeType = 'heading'; attrs = { level: 1 }; }
      else if (firstLineHeight > headingBaseline * 1.5) { nodeType = 'heading'; attrs = { level: 2 }; }
      else if (firstLineHeight > headingBaseline * 1.2) { nodeType = 'heading'; attrs = { level: 3 }; }
      // Justified text keeps its left margin; centered or right-aligned text is placed by its
      // alignment instead.
      if (pMarginLeft > 0 && (!textAlign || textAlign === 'justify')) attrs = { ...attrs, marginLeft: pMarginLeft };
      if (textAlign) attrs = { ...attrs, textAlign };
      if (p.flow && p.flow.indent * xScale > 2) attrs = { ...attrs, textIndent: Math.round(p.flow.indent * xScale) };
      // The block's own size, its text's most common one: its line height is a multiple of
      // it, so a heading's lines aren't spaced by the heading tag's own (bigger) size.
      const blockSize = [...sizeCounts].sort((a, b) => b[1] - a[1])[0]?.[0];
      if (blockSize) attrs = { ...attrs, fontSize: blockSize };

      // Its lines as far apart as in the PDF; a single line gets its block's (when it was
      // split from a wrapped one) or a plain one.
      const lineHeight = lineHeightOf(p.lines) ?? p.lineHeight ?? 1.2;
      attrs = { ...attrs, lineHeight };

      const lastLine = p.lines[p.lines.length - 1];
      contentItems.push({
        yPdf: lineTop(p.lines[0], lineHeight),
        bottom: lineBottom(lastLine, lineHeight),
        node: { type: nodeType, attrs, content: contentNodes },
        place: p.place,
      });
    }

    // Horizontal rule items
    // A colored rule keeps its color (a grey or black one, the theme's); and its thickness.
    // Not the edge of a colored box (its rows above the text in it look like a line): the
    // box is drawn whole, below.
    const boxRects = extractFillRects(opList, pageViewport);
    for (const rule of horizontalRules) {
      if (boxRects.some(r => rule.y >= r.y - 1 && rule.y <= r.y + r.height + 1)) continue;
      const attrs: Record<string, unknown> = {};
      if (rule.color && !isNeutralColor(rule.color)) attrs.ruleColor = rule.color;
      if (rule.thickness > 1) attrs.ruleThickness = rule.thickness;
      contentItems.push({ yPdf: rule.y, bottom: rule.y, node: { type: 'horizontalRule', ...(Object.keys(attrs).length ? { attrs } : {}) }, place: null });
    }

    for (const region of topLevelRegions) {
      const src = cropCanvasRegion(pageCanvas, pageViewport, xScale, region.yMin, region.yMax, textRgb);
      if (src) contentItems.push({ yPdf: region.yMax, bottom: region.yMin, node: { type: 'image', attrs: { src, alt: null, title: 'pdf-graphic' } }, place: null });
    }

    for (let i = 0; i < pageImages.length; i++) {
      const place = imagePlaces[i];
      const y = place?.y ?? bottomY - 1;
      const bandIndex = place ? bands.findIndex(b => b.images.includes(i)) : -1;
      const side: 0 | 1 = bandIndex >= 0 && place!.x + place!.width / 2 >= bands[bandIndex].gutter ? 1 : 0;
      const imageAttrs: Record<string, unknown> = { src: pageImages[i], alt: null, title: null };
      // As wide as it's drawn on the page, not its own pixel size, and as far in (in a right
      // column, from where it starts).
      if (place?.width) imageAttrs.width = Math.round(place.width * xScale);
      const imageIndentFrom = bandIndex >= 0 && side === 1 ? bands[bandIndex].gutter : leftmostX;
      if (place && place.x - imageIndentFrom > 2) imageAttrs.marginLeft = Math.round((place.x - imageIndentFrom) * xScale);
      contentItems.push({
        yPdf: y + (place?.height ?? 0),
        bottom: y,
        node: { type: 'image', attrs: imageAttrs },
        place: bandIndex >= 0 ? { band: bandIndex, side } : null,
      });
    }

    // A band's items become one columns node at the band's top: each column's blocks in
    // their own order, the left column first.
    type Block = { yPdf: number; bottom: number; node: JSONContent };
    const byTop = (a: { yPdf: number }, b: { yPdf: number }) => b.yPdf - a.yPdf;
    // Each block's real space before it: from the bottom of what's above it to its top (none
    // for things drawn side by side, which the flow stacks).
    const spaced = (items: Block[], from: number | null) => {
      let above = from;
      for (const item of items) {
        const gap = above === null ? 0 : Math.max(0, above - item.yPdf);
        item.node.attrs = { ...(item.node.attrs ?? {}), spaceBefore: Math.round(gap * xScale) };
        above = item.bottom;
      }
      return items.map(i => i.node);
    };
    const flow: Block[] = contentItems.filter(i => !i.place);
    bands.forEach((band, b) => {
      const columns = [0, 1].map(side => contentItems.filter(i => i.place?.band === b && i.place.side === side).sort(byTop));
      if (columns.some(c => c.length === 0)) {
        // Nothing left on one side (e.g. its text was part of a graphic): just blocks.
        flow.push(...columns.flat().map(i => ({ ...i, place: null })));
        return;
      }
      const top = Math.max(...columns.flat().map(i => i.yPdf));
      const bottom = Math.min(...columns.flat().map(i => i.bottom));
      flow.push({
        yPdf: top,
        bottom,
        node: {
          type: 'columns',
          content: columns.map((items, side) => ({
            type: 'column',
            // The first column as wide as up to the gutter's middle; the other takes the rest.
            attrs: side === 0 ? { width: Math.round((band.gutter - leftmostX) * xScale) } : {},
            content: spaced(items, top),
          })),
        },
      });
    });
    flow.sort(byTop);

    // Blocks drawn inside a colored box (see extractFillRects) go into one box node of its
    // color, as wide and as far in as the box, its padding the space between the box's
    // edges and its blocks.
    // Only boxes spanning a good part of the text's width: small colored shapes (a logo's
    // pieces) aren't boxes around text.
    const fillRects = extractFillRects(opList, pageViewport).filter(r => r.width >= (rightmostExtent - leftmostX) * 0.3);
    const boxed: Block[] = [];
    for (let i = 0; i < flow.length; i++) {
      const item = flow[i];
      const isText = item.node.type === 'paragraph' || item.node.type === 'heading';
      const inside = (b: Block, r: FillRect) => b.yPdf <= r.y + r.height + 2 && b.bottom >= r.y - 2;
      const rect = isText ? fillRects.find(r => inside(item, r)) : undefined;
      if (!rect) { boxed.push(item); continue; }
      const run: Block[] = [item];
      while (i + 1 < flow.length && ['paragraph', 'heading'].includes(flow[i + 1].node.type ?? '') && inside(flow[i + 1], rect)) run.push(flow[++i]);
      const top = rect.y + rect.height;
      // From the text's left edge; negative for a box reaching out past it (a band as wide as
      // the page's frame).
      const offset = rect.x - leftmostX;
      // The blocks' indents are from the text's left edge: inside the box, from its own.
      for (const b of run) {
        const ml = b.node.attrs?.marginLeft;
        if (typeof ml === 'number') b.node.attrs = { ...b.node.attrs, marginLeft: Math.max(0, Math.round(ml - offset * xScale)) || null };
      }
      boxed.push({
        yPdf: top,
        bottom: rect.y,
        node: {
          type: 'box',
          attrs: {
            background: rect.color,
            ...(Math.abs(offset) > 1 ? { marginLeft: Math.round(offset * xScale) } : {}),
            width: Math.round(rect.width * xScale),
            paddingBottom: Math.max(0, Math.round((run[run.length - 1].bottom - rect.y) * xScale)),
          },
          content: spaced(run, top),
        },
      });
    }
    flow.length = 0;
    flow.push(...boxed);
    for (const item of flow) keepTextColors(item.node, false);

    const contentTop = flow.length > 0 ? flow[0].yPdf : 0;
    const blocks = spaced(flow, null);
    if (flow.length > 0) {
      pageAttrs.marginTop = Math.max(0, Math.round((pageViewport.height - contentTop) * xScale));
    }

    const pageContent: JSONContent = { type: 'doc', attrs: pageAttrs, content: blocks };
    const finalContent = pageContent.content!.length > 0 ? pageContent : { ...emptyPageContent, attrs: pageAttrs };
    allPagesContent.push(finalContent);
    onPageExtracted?.(pageNum, finalContent);
    onProgress?.(pageNum, pdf.numPages);
  }

  return allPagesContent;
};

// Text colors kept only where they say something: a hue of their own (a link's blue), or any
// color inside a box drawn in one (white on a colored band), as that box keeps its own color
// (see BoxExtension). Greys and black elsewhere take the theme's text color instead, so the
// text stays readable on the app's own page, dark or light.
const keepTextColors = (node: JSONContent, inColoredBox: boolean) => {
  const background = node.attrs?.background;
  const colored = node.type === 'box' ? typeof background === 'string' && !isNeutralColor(background) : inColoredBox;
  if (node.type === 'text') {
    for (const mark of node.marks ?? []) {
      const color = mark.attrs?.color;
      if (mark.type === 'textStyle' && typeof color === 'string' && !colored && isNeutralColor(color)) {
        const { color: _drop, ...rest } = mark.attrs!;
        void _drop;
        mark.attrs = rest;
      }
    }
  }
  for (const child of node.content ?? []) keepTextColors(child, colored);
};

// Where each image is drawn: its bottom (y), and how tall and wide (PDF units, y up). An
// image is painted as the unit square under the current transform -- the page's own
// transform composed with every one set since, scoped by save/restore -- so that whole
// transform is tracked, not just the last one set.
type Matrix = [number, number, number, number, number, number];
type ImagePlace = { x: number; y: number; height: number; width: number };

export interface FillRect {
  // Its extent (PDF units, y up) and fill color (#rrggbb).
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

// The colored boxes painted behind the text (a grey details box, a colored footer band):
// filled paths under the whole current transform, big enough to hold a line of text and
// neither white nor the size of the page (the page's own background).
export const extractFillRects = (
  opList: { fnArray: number[]; argsArray: unknown[][] },
  page: { width: number; height: number },
): FillRect[] => {
  const nearWhite = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map(o => parseInt(hex.slice(o, o + 2), 16));
    return r > 248 && g > 248 && b > 248;
  };
  return collectFilledPaths(opList).filter(r =>
    r.width >= 40 && r.height >= 10 && /^#[0-9a-f]{6}$/.test(r.color) && !nearWhite(r.color)
    && r.width * r.height < page.width * page.height * 0.6);
};

// Every filled path on the page: its extent (PDF units, y up) under the whole current
// transform, and its fill color.
const collectFilledPaths = (opList: { fnArray: number[]; argsArray: unknown[][] }): FillRect[] => {
  const ops = pdfjsLib.OPS as Record<string, number>;
  const fills = new Set([ops.fill, ops.eoFill, ops.fillStroke, ops.eoFillStroke].filter(v => v !== undefined));
  if (ops.constructPath === undefined || fills.size === 0) return [];
  const rects: FillRect[] = [];
  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  let color = '#000000';
  const stack: [Matrix, string][] = [];
  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i] as unknown[];
    if (fn === ops.save) stack.push([ctm, color]);
    else if (fn === ops.restore) [ctm, color] = stack.pop() ?? [ctm, color];
    else if (fn === ops.transform) ctm = multiply(ctm, (args as number[]).slice(0, 6) as Matrix);
    else if (fn === ops.setFillRGBColor && typeof args[0] === 'string') color = (args[0] as string).toLowerCase();
    else if (fn === ops.constructPath && fills.has(args[0] as number) && args[2]) {
      // [paint op, path data, bounding box in the path's own space]
      const box = args[2] as ArrayLike<number>;
      const corners = [[box[0], box[1]], [box[2], box[1]], [box[0], box[3]], [box[2], box[3]]]
        .map(([x, y]) => [ctm[0] * x + ctm[2] * y + ctm[4], ctm[1] * x + ctm[3] * y + ctm[5]]);
      const xs = corners.map(c => c[0]), ys = corners.map(c => c[1]);
      rects.push({ x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys), color });
    }
  }
  return rects;
};

type Rect = { x: number; y: number; width: number; height: number };
const overlaps = (a: Rect, b: Rect, pad = 0) =>
  a.x - pad < b.x + b.width && b.x - pad < a.x + a.width && a.y - pad < b.y + b.height && b.y - pad < a.y + a.height;

// Drawings made of filled shapes (an icon or a logo drawn as vector paths, not an image):
// colored shapes that touch, grouped, clear of any text -- shapes behind text are its boxes
// (see extractFillRects) -- and smaller than half the page each way.
export const findVectorGraphics = (
  opList: { fnArray: number[]; argsArray: unknown[][] },
  page: { width: number; height: number },
  textBoxes: Rect[],
): Rect[] => {
  const shapes = collectFilledPaths(opList).filter(r => {
    const rgb = rgbOfHex(r.color);
    if (!rgb || Math.min(...rgb) > 245) return false;
    return r.width * r.height < page.width * page.height * 0.25 && !textBoxes.some(t => overlaps(r, t));
  });
  // Shapes within a couple of points of each other are one drawing.
  const groups: Rect[] = [];
  for (const shape of shapes) {
    let merged: Rect = { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
    for (let i = groups.length - 1; i >= 0; i--) {
      if (!overlaps(groups[i], merged, 2)) continue;
      const g = groups.splice(i, 1)[0];
      const x = Math.min(g.x, merged.x), y = Math.min(g.y, merged.y);
      merged = { x, y, width: Math.max(g.x + g.width, merged.x + merged.width) - x, height: Math.max(g.y + g.height, merged.y + merged.height) - y };
    }
    groups.push(merged);
  }
  return groups.filter(g => g.width >= 6 && g.height >= 6 && g.width <= page.width * 0.5 && g.height <= page.height * 0.5
    && !textBoxes.some(t => overlaps(g, t)));
};

// A region of the rendered page as an image, its white made transparent (the page under it
// is the app's, not white).
const cropVectorGraphic = (canvas: HTMLCanvasElement, pageHeight: number, scale: number, r: Rect): string | null => {
  try {
    const left = Math.max(0, Math.floor(r.x * scale) - 1);
    const top = Math.max(0, Math.floor((pageHeight - r.y - r.height) * scale) - 1);
    const width = Math.min(canvas.width - left, Math.ceil(r.width * scale) + 2);
    const height = Math.min(canvas.height - top, Math.ceil(r.height * scale) + 2);
    if (width <= 0 || height <= 0) return null;
    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    const ctx = out.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(canvas, left, top, width, height, 0, 0, width, height);
    const img = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < img.data.length; i += 4) {
      const whiteness = Math.min(img.data[i], img.data[i + 1], img.data[i + 2]);
      // Fully white is the page; the anti-aliased edge in between fades out with it.
      if (whiteness > 200) img.data[i + 3] = Math.round(img.data[i + 3] * Math.min(1, (255 - whiteness) / 55));
    }
    ctx.putImageData(img, 0, 0);
    return out.toDataURL('image/png');
  } catch {
    return null;
  }
};

export interface ColumnBand {
  // Its vertical extent (PDF units, y up) and where its columns split.
  top: number;
  bottom: number;
  gutter: number;
  lines: PdfLine[];
  // Indices of the images drawn in it.
  images: number[];
}

// Runs of lines and images close together vertically with an empty vertical gutter between
// content on both of its sides: parts of the page laid out in two columns (a form's two
// columns of fields, a title with a QR beside it). The widest gutter wins; a band needs at
// least two pieces, content on each side, and nothing crossing the gutter.
export const detectColumnBands = (
  lines: PdfLine[],
  images: ImagePlace[],
  { avgLineHeight, fontOf, leftmostX, rightmostExtent }: {
    avgLineHeight: number; fontOf: (line: PdfLine) => number; leftmostX: number; rightmostExtent: number;
  },
): ColumnBand[] => {
  type Atom = { top: number; bottom: number; intervals: [number, number][]; line?: PdfLine; image?: number };
  const atoms: Atom[] = [];
  for (const line of lines) {
    const visible = line.items.filter(i => i.str.trim().length > 0);
    if (visible.length === 0) continue;
    const font = fontOf(line);
    // A line's pieces, merged where they're closer than a couple of characters.
    const intervals: [number, number][] = [];
    for (const item of [...visible].sort((a, b) => a.transform[4] - b.transform[4])) {
      const x0 = item.transform[4], x1 = x0 + item.width;
      const last = intervals[intervals.length - 1];
      if (last && x0 - last[1] < font * 2) last[1] = Math.max(last[1], x1);
      else intervals.push([x0, x1]);
    }
    atoms.push({ top: line.y + font * 0.8, bottom: line.y - font * 0.2, intervals, line });
  }
  images.forEach((img, i) => {
    if (img.width > 0 && img.height > 0) atoms.push({ top: img.y + img.height, bottom: img.y, intervals: [[img.x, img.x + img.width]], image: i });
  });
  atoms.sort((a, b) => b.top - a.top);

  const minGutter = Math.max(avgLineHeight * 3, 24);
  // More than a line and a half apart: a new part of the page.
  const maxGap = avgLineHeight * 1.5;
  const widestGutter = (run: Atom[]): [number, number] | null => {
    const spans = run.flatMap(a => a.intervals).map(([a, b]) => [Math.max(a, leftmostX), Math.min(b, rightmostExtent)] as [number, number]);
    spans.sort((a, b) => a[0] - b[0]);
    let best: [number, number] | null = null;
    let reach = spans[0]?.[1] ?? 0;
    for (let i = 1; i < spans.length; i++) {
      if (spans[i][0] - reach >= minGutter && (!best || spans[i][0] - reach > best[1] - best[0])) best = [reach, spans[i][0]];
      reach = Math.max(reach, spans[i][1]);
    }
    return best;
  };

  const bands: ColumnBand[] = [];
  let start = 0;
  while (start < atoms.length) {
    let end = -1;
    let gutter: [number, number] | null = null;
    let lowest = atoms[start].bottom;
    for (let j = start + 1; j < atoms.length; j++) {
      if (atoms[j].top < lowest - maxGap) break;
      const g = widestGutter(atoms.slice(start, j + 1));
      // A gutter shrinking to less than half: what's added is laid out differently.
      const narrowed = g && gutter && g[1] - g[0] < (gutter[1] - gutter[0]) / 2;
      if (g && !narrowed) { end = j; gutter = g; }
      else if (end >= 0) break;
      lowest = Math.min(lowest, atoms[j].bottom);
    }
    if (end < 0 || !gutter) { start++; continue; }
    const run = atoms.slice(start, end + 1);
    const mid = (gutter[0] + gutter[1]) / 2;
    bands.push({
      top: Math.max(...run.map(a => a.top)),
      bottom: Math.min(...run.map(a => a.bottom)),
      gutter: mid,
      lines: run.flatMap(a => (a.line ? [a.line] : [])),
      images: run.flatMap(a => (a.image !== undefined ? [a.image] : [])),
    });
    start = end + 1;
  }
  return bands;
};
const multiply = (m: Matrix, t: Matrix): Matrix => [
  m[0] * t[0] + m[2] * t[1],
  m[1] * t[0] + m[3] * t[1],
  m[0] * t[2] + m[2] * t[3],
  m[1] * t[2] + m[3] * t[3],
  m[0] * t[4] + m[2] * t[5] + m[4],
  m[1] * t[4] + m[3] * t[5] + m[5],
];

// How much of the sheet an image has to cover to be the page's own scan.
const SCAN_COVERAGE = 0.8;

// Takes the page's scans out of its images (and their places, kept in step), when the
// page has text: an image drawn over most of the sheet is the page itself, scanned, and
// the text on it is what was read from it. Returns their places.
export const splitOffPageScans = (
  images: string[],
  places: ImagePlace[],
  page: { width: number; height: number },
  hasText: boolean,
): ImagePlace[] => {
  if (!hasText) return [];
  const scans: ImagePlace[] = [];
  for (let i = Math.min(images.length, places.length) - 1; i >= 0; i--) {
    const p = places[i];
    const covered = Math.max(0, Math.min(p.x + p.width, page.width) - Math.max(p.x, 0))
      * Math.max(0, Math.min(p.y + p.height, page.height) - Math.max(p.y, 0));
    if (covered < page.width * page.height * SCAN_COVERAGE) continue;
    scans.push(p);
    images.splice(i, 1);
    places.splice(i, 1);
  }
  return scans;
};

const extractImageYPositions = (
  opList: { fnArray: number[]; argsArray: unknown[][] },
  count: number,
  pageHeight: number,
): ImagePlace[] => {
  const places: ImagePlace[] = [];
  const ops = pdfjsLib.OPS as Record<string, number>;
  const { paintImageXObject: paintOp, transform: transformOp, save: saveOp, restore: restoreOp } = ops;
  if (!paintOp) return Array(count).fill({ x: 0, y: 0, height: 0, width: 0 });

  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  const stack: Matrix[] = [];
  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    if (saveOp !== undefined && fn === saveOp) stack.push(ctm);
    else if (restoreOp !== undefined && fn === restoreOp) ctm = stack.pop() ?? ctm;
    else if (fn === transformOp) {
      const args = opList.argsArray[i] as number[];
      if (args.length >= 6) ctm = multiply(ctm, args.slice(0, 6) as Matrix);
    } else if (fn === paintOp && places.length < count) {
      // The unit square's corners under the transform: its extent on the page.
      const ys = [ctm[5], ctm[3] + ctm[5], ctm[1] + ctm[5], ctm[1] + ctm[3] + ctm[5]];
      const xs = [ctm[4], ctm[2] + ctm[4], ctm[0] + ctm[4], ctm[0] + ctm[2] + ctm[4]];
      places.push({
        x: Math.min(...xs),
        y: Math.min(...ys),
        height: Math.max(...ys) - Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
      });
    }
  }
  // Fill any remaining with fallback
  while (places.length < count) places.push({ x: 0, y: pageHeight / 2, height: 0, width: 0 });
  return places;
};
