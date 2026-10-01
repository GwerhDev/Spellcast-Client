import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { JSONContent } from '@tiptap/core';

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

export const injectCoverIntoPages = async (pages: JSONContent[], coverBlob: Blob | null): Promise<JSONContent[]> => {
  if (!coverBlob || pages.length === 0) return pages;
  const firstNode = pages[0]?.content?.[0];
  // Skip if already has a non-graphic cover image
  if (firstNode?.type === 'image' && (firstNode?.attrs as Record<string, unknown>)?.title !== 'pdf-graphic') return pages;
  // Only treat the first page as a decorative cover if it has no text content.
  // Empty paragraphs from emptyPageContent don't count as text.
  const firstPageHasText = (pages[0]?.content ?? []).some(
    node => (node.type === 'paragraph' || node.type === 'heading') && (node.content ?? []).length > 0
  );
  if (firstPageHasText) return pages;
  try {
    const coverDataUrl = await blobToDataUrl(coverBlob);
    const updated = [...pages];
    updated[0] = {
      ...pages[0],
      content: [
        { type: 'image', attrs: { src: coverDataUrl, alt: null, title: null } },
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
// existing cover image node in place, or prepends a new one when page 1 has none yet.
export const applyCoverToPage1 = (pages: JSONContent[], coverDataUrl: string): JSONContent[] => {
  if (pages.length === 0) return pages;
  const page1 = pages[0];
  const coverNode = { type: 'image', attrs: { src: coverDataUrl, alt: null, title: null } };
  const firstNode = page1?.content?.[0];
  const hasCoverNode = firstNode?.type === 'image' && (firstNode?.attrs as Record<string, unknown>)?.title !== 'pdf-graphic';
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
): number[] => {
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

  const rules: number[] = [];
  let y = 0;
  while (y < h) {
    if (isRuleRow[y]) {
      const start = y;
      while (y < h && isRuleRow[y]) y++;
      if (y - start <= 6) { // thin cluster = a line, not a filled region
        const midCanvasY = (start + y - 1) / 2;
        rules.push(pageViewport.height - midCanvasY / scale);
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

    const lines: PdfLine[] = [];
    if (items.length > 0) {
      let currentLine: TextItem[] = [];
      let lastY = groupY(items[0]);
      for (const item of items) {
        const gy = groupY(item);
        if (Math.abs(gy - lastY) > 1) {
          currentLine.sort((a, b) => a.transform[4] - b.transform[4]);
          lines.push({ items: currentLine, y: lastY, height: currentLine.reduce((max, i) => Math.max(max, i.height), 0), x: currentLine[0]?.transform[4] || 0 });
          currentLine = [];
          lastY = gy;
        }
        currentLine.push(item);
        lastY = gy;
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

    const visibleLineItems = lines.flatMap(l => l.items.filter(i => i.str.trim().length > 0));
    const leftmostX = visibleLineItems.length > 0 ? Math.min(...visibleLineItems.map(i => i.transform[4])) : 0;
    const rightmostExtent = visibleLineItems.length > 0
      ? Math.max(...visibleLineItems.map(i => i.transform[4] + i.width))
      : pageViewport.width;
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
    const graphicRegions = detectDecorativeRegionsFromCanvas(pageCanvas, pageViewport, xScale, lines);

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

    // XObject images, with their place on the page from the operator list.
    const opList = await page.getOperatorList();
    const pageImages = await extractPageImages(page);
    const imagePlaces = extractImageYPositions(opList, pageImages.length, pageViewport.height);

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
    const paragraphs = [
      ...groupParagraphs(lines.filter(l => !bandLines.has(l))).map(p => ({ ...p, place: null as { band: number; side: 0 | 1 } | null })),
      ...sideLines.flatMap((sides, b) => sides.flatMap((sl, side) => groupParagraphs(sl).map(p => ({ ...p, place: { band: b, side: side as 0 | 1 } })))),
    ];

    // Build content items with their extent on the page (PDF units, y up): sorted by their
    // top, and each text block given the real space between it and what comes before.
    type Item = { yPdf: number; bottom: number; node: JSONContent; place: { band: number; side: 0 | 1 } | null };
    const contentItems: Item[] = [];

    // Paragraph items (skip those whose Y falls within a graphic region — they'll appear in the rendered image)
    for (const p of paragraphs) {
      const inRegion = graphicRegions.some(r => p.yTop >= r.yMin - 5 && p.yTop <= r.yMax + 5);
      if (inRegion) continue;

      if (p.lines.length === 0) continue;

      const paragraphX = p.lines[0]?.x ?? leftmostX;
      // From the text's left edge -- or, in a right column, from where that column starts.
      const indentFrom = p.place?.side === 1 ? bands[p.place.band].gutter : leftmostX;
      const pMarginLeft = Math.max(0, Math.round((paragraphX - indentFrom) * xScale));

      // Detect text alignment from X coordinates of the first line.
      // Use the text block's own center/width as reference so that full-width lines
      // (whose center naturally falls near the page center) are NOT flagged as centered.
      // Not inside a column: there the block keeps its real indent, as the page's text area
      // says nothing about where a column's lines sit.
      const firstLine = p.lines[0];
      let textAlign: 'center' | 'right' | undefined;
      const visibleFirstLineItems = firstLine?.items.filter(i => i.str.trim().length > 0) ?? [];
      if (visibleFirstLineItems.length > 0 && !p.place) {
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

      const contentNodes: object[] = [];

      for (let i = 0; i < p.lines.length; i++) {
        const line = p.lines[i];
        if (i > 0) {
          contentNodes.push({ type: 'hardBreak' });
          const relativeIndent = line.x - paragraphX;
          if (relativeIndent > 5) {
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
          const textNode: { type: 'text'; text: string; marks?: object[] } = { type: 'text', text: item.str, marks: [] };
          // Strip 6-char subset prefix (e.g. "ABCDEF+BookAntiqua-Bold" → "bookantiqua-bold")
          const normFontName = item.fontName.replace(/^[A-Z]{6}\+/, '').toLowerCase();
          // pdfjs may expose computed CSS font-family which often includes style info
          const fontFamily = (contentStyles?.[item.fontName]?.fontFamily ?? '').toLowerCase();
          const isBold = /bold|demi|heavy|black/.test(normFontName) || /bold|demi|heavy|black/.test(fontFamily);
          const isItalic = /italic|oblique|slant/.test(normFontName) || /italic|oblique/.test(fontFamily);
          if (isBold) textNode.marks!.push({ type: 'bold' });
          if (isItalic) textNode.marks!.push({ type: 'italic' });
          // Its size, in the same px as the page (pt * 96/72): the text keeps its proportion
          // to the page instead of taking the editor's default size.
          const fontPx = toPx(item.height || line.height || avgLineHeight);
          if (fontPx > 0) textNode.marks!.push({ type: 'textStyle', attrs: { fontSize: `${fontPx}px` } });
          if (textNode.marks?.length === 0) delete textNode.marks;
          contentNodes.push(textNode);
        }
      }
      if (contentNodes.length === 0) continue;

      const firstLineHeight = p.lines[0]?.height || 0;
      let nodeType = 'paragraph';
      let attrs: Record<string, unknown> = {};
      // Cap the baseline at ~14pt so title pages (where all text is large and avgLineHeight is
      // inflated) still produce proper h1/h2/h3 hierarchy instead of everything being a paragraph.
      const headingBaseline = Math.min(avgLineHeight, 14);
      if (firstLineHeight > headingBaseline * 1.8) { nodeType = 'heading'; attrs = { level: 1 }; }
      else if (firstLineHeight > headingBaseline * 1.5) { nodeType = 'heading'; attrs = { level: 2 }; }
      else if (firstLineHeight > headingBaseline * 1.2) { nodeType = 'heading'; attrs = { level: 3 }; }
      if (pMarginLeft > 0 && !textAlign) attrs = { ...attrs, marginLeft: pMarginLeft };
      if (textAlign) attrs = { ...attrs, textAlign };

      // Its lines as far apart as in the PDF (baseline to baseline over the font size); a
      // single line gets a plain one.
      let lineHeight = 1.2;
      if (p.lines.length > 1) {
        const steps = p.lines.slice(1).map((l, i) => p.lines[i].y - l.y);
        const avgStep = steps.reduce((a, b) => a + b, 0) / steps.length;
        const avgFont = p.lines.reduce((a, l) => a + fontOf(l), 0) / p.lines.length;
        lineHeight = Math.min(2.5, Math.max(1, Math.round((avgStep / avgFont) * 100) / 100));
      }
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
    for (const y of horizontalRules) {
      contentItems.push({ yPdf: y, bottom: y, node: { type: 'horizontalRule' }, place: null });
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
      const offset = Math.max(0, rect.x - leftmostX);
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
            ...(offset > 1 ? { marginLeft: Math.round(offset * xScale) } : {}),
            width: Math.round(rect.width * xScale),
            paddingBottom: Math.max(0, Math.round((run[run.length - 1].bottom - rect.y) * xScale)),
          },
          content: spaced(run, top),
        },
      });
    }
    flow.length = 0;
    flow.push(...boxed);

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
  const nearWhite = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map(o => parseInt(hex.slice(o, o + 2), 16));
    return r > 248 && g > 248 && b > 248;
  };
  return rects.filter(r =>
    r.width >= 40 && r.height >= 10 && /^#[0-9a-f]{6}$/.test(r.color) && !nearWhite(r.color)
    && r.width * r.height < page.width * page.height * 0.6);
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
