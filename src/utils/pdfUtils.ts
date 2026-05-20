import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { JSONContent } from '@tiptap/core';

export const emptyPageContent: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
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
    const ctx = out.getContext('2d')!;
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
  const ctx = canvas.getContext('2d');
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
  const ctx = canvas.getContext('2d');
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

  console.log('[pdfUtils] detectDecorativeRegions — canvas', w, 'x', h, '| raw clusters:', rawClusters.length, rawClusters.map(c => `[${c.start}–${c.end}]`));

  // Phase 2: merge adjacent clusters that have a text zone between them.
  // Handles ornaments where text sits inside a graphic (e.g. an ellipse wrapping
  // a heading): [top arc cluster] | [text rows] | [bottom arc cluster] → one region.
  // Gap is capped at 150px so distant elements (page header + footer) never merge.
  const mergedClusters: { start: number; end: number }[] = [];
  let ci = 0;
  while (ci < rawClusters.length) {
    let { start, end } = rawClusters[ci];
    while (ci + 1 < rawClusters.length) {
      const next = rawClusters[ci + 1];
      const gap = next.start - end;
      if (gap > 150) break;
      let hasText = false;
      for (let gy = end + 1; gy < next.start; gy++) {
        if (textMask[gy]) { hasText = true; break; }
      }
      console.log(`[pdfUtils]   gap [${end}–${next.start}] (${gap}px) hasText=${hasText}`);
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

  console.log('[pdfUtils] merged clusters:', mergedClusters.length, mergedClusters.map(c => `[${c.start}–${c.end}]`));

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

  console.log('[pdfUtils] final regions (PDF coords):', regions.map(r => `yMin=${r.yMin.toFixed(1)} yMax=${r.yMax.toFixed(1)}`));
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
    const paragraphs: { lines: PdfLine[]; yTop: number }[] = [];

    if (lines.length > 0) {
      let currentParagraph: PdfLine[] = [];
      if (lines[0].items.length > 0) currentParagraph.push(lines[0]);
      for (let j = 1; j < lines.length; j++) {
        const prevLine = lines[j - 1];
        const currLine = lines[j];
        const yDiff = prevLine.y - currLine.y;
        const capH = avgLineHeight * 3;
        // Use min of adjacent heights so a large heading followed by smaller text still
        // splits correctly (the old max-based formula required gap > 1.5× the LARGER height,
        // which was too big when crossing size boundaries like title → subtitle).
        const threshold = Math.max(Math.min(prevLine.height, currLine.height, capH), avgLineHeight) * 1.5;
        if (yDiff > threshold) {
          if (currentParagraph.length > 0) paragraphs.push({ lines: currentParagraph, yTop: currentParagraph[0].y });
          const numEmpty = Math.floor(yDiff / avgLineHeight) - 1;
          const gapY = prevLine.y - prevLine.height;
          for (let k = 0; k < numEmpty; k++) paragraphs.push({ lines: [], yTop: gapY - k * avgLineHeight });
          currentParagraph = [];
          if (currLine.items.length > 0) currentParagraph.push(currLine);
        } else {
          if (currLine.items.length > 0) currentParagraph.push(currLine);
        }
      }
      if (currentParagraph.length > 0) paragraphs.push({ lines: currentParagraph, yTop: currentParagraph[0].y });
    }

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
    const pageCtx = pageCanvas.getContext('2d')!;
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

    // Build content items with Y positions for merged sorting
    type Item = { yPdf: number; node: JSONContent };
    const contentItems: Item[] = [];

    // Paragraph items (skip those whose Y falls within a graphic region — they'll appear in the rendered image)
    for (const p of paragraphs) {
      const inRegion = graphicRegions.some(r => p.yTop >= r.yMin - 5 && p.yTop <= r.yMax + 5);
      if (inRegion) {
        const text = p.lines.flatMap(l => l.items.map(i => i.str)).join(' ');
        console.log(`[pdfUtils] p${pageNum} skipping paragraph yTop=${p.yTop.toFixed(1)} — inside graphic region. text="${text.slice(0, 60)}"`);
        continue;
      }

      if (p.lines.length === 0) {
        contentItems.push({ yPdf: p.yTop, node: { type: 'paragraph' } });
        continue;
      }

      const paragraphX = p.lines[0]?.x ?? leftmostX;
      const pMarginLeft = Math.max(0, Math.round((paragraphX - leftmostX) * xScale));

      // Detect text alignment from X coordinates of the first line.
      // Use the text block's own center/width as reference so that full-width lines
      // (whose center naturally falls near the page center) are NOT flagged as centered.
      const firstLine = p.lines[0];
      let textAlign: 'center' | 'right' | undefined;
      const visibleFirstLineItems = firstLine?.items.filter(i => i.str.trim().length > 0) ?? [];
      if (visibleFirstLineItems.length > 0) {
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
        for (const item of line.items) {
          if (item.str.length === 0) continue;
          const textNode: { type: 'text'; text: string; marks?: object[] } = { type: 'text', text: item.str, marks: [] };
          // Strip 6-char subset prefix (e.g. "ABCDEF+BookAntiqua-Bold" → "bookantiqua-bold")
          const normFontName = item.fontName.replace(/^[A-Z]{6}\+/, '').toLowerCase();
          // pdfjs may expose computed CSS font-family which often includes style info
          const fontFamily = (contentStyles?.[item.fontName]?.fontFamily ?? '').toLowerCase();
          const isBold = /bold|demi|heavy|black/.test(normFontName) || /bold|demi|heavy|black/.test(fontFamily);
          const isItalic = /italic|oblique|slant/.test(normFontName) || /italic|oblique/.test(fontFamily);
          if (isBold) textNode.marks!.push({ type: 'bold' });
          if (isItalic) textNode.marks!.push({ type: 'italic' });
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

      contentItems.push({ yPdf: p.yTop, node: { type: nodeType, attrs, content: contentNodes } });
    }

    // Horizontal rule items
    for (const y of horizontalRules) {
      contentItems.push({ yPdf: y, node: { type: 'horizontalRule' } });
    }

    for (const region of topLevelRegions) {
      const src = cropCanvasRegion(pageCanvas, pageViewport, xScale, region.yMin, region.yMax, textRgb);
      if (src) contentItems.push({ yPdf: region.yMax, node: { type: 'image', attrs: { src, alt: null, title: 'pdf-graphic' } } });
    }

    // XObject images — try to get approximate Y from operator list, fallback to bottomY
    const opList = await page.getOperatorList();
    const pageImages = await extractPageImages(page);
    const imageYs = extractImageYPositions(opList, pageImages.length, pageViewport.height);
    for (let i = 0; i < pageImages.length; i++) {
      contentItems.push({ yPdf: imageYs[i] ?? bottomY - 1, node: { type: 'image', attrs: { src: pageImages[i], alt: null, title: null } } });
    }

    // Sort by Y descending (top → bottom of page)
    contentItems.sort((a, b) => b.yPdf - a.yPdf);

    const pageContent: JSONContent = { type: 'doc', attrs: pageAttrs, content: contentItems.map(i => i.node) };
    const finalContent = pageContent.content!.length > 0 ? pageContent : { ...emptyPageContent, attrs: pageAttrs };
    allPagesContent.push(finalContent);
    onPageExtracted?.(pageNum, finalContent);
    onProgress?.(pageNum, pdf.numPages);
  }

  return allPagesContent;
};

const extractImageYPositions = (
  opList: { fnArray: number[]; argsArray: unknown[][] },
  count: number,
  pageHeight: number,
): number[] => {
  const ys: number[] = [];
  const paintOp = (pdfjsLib.OPS as Record<string, number>).paintImageXObject;
  const transformOp = (pdfjsLib.OPS as Record<string, number>).transform;
  if (!paintOp) return Array(count).fill(0);

  let lastTranslateY = pageHeight / 2;
  for (let i = 0; i < opList.fnArray.length; i++) {
    if (opList.fnArray[i] === transformOp) {
      const args = opList.argsArray[i] as number[];
      // transform matrix: [a, b, c, d, e, f] — e=translateX, f=translateY
      if (args.length >= 6) lastTranslateY = args[5];
    }
    if (opList.fnArray[i] === paintOp && ys.length < count) {
      ys.push(lastTranslateY);
    }
  }
  // Fill any remaining with fallback
  while (ys.length < count) ys.push(0);
  return ys;
};
