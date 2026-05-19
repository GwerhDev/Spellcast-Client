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
  if (firstNode?.type === 'image') return pages; // already has cover
  const firstPageHasText = pages[0]?.content?.some(node =>
    node.content?.some(child => child.type === 'text' && (child.text ?? '').trim().length > 0)
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

type CTMMatrix = [number, number, number, number, number, number];

const concatCTM = (m1: CTMMatrix, m2: CTMMatrix): CTMMatrix => {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1*a2 + b1*c2, a1*b2 + b1*d2,
    c1*a2 + d1*c2, c1*b2 + d1*d2,
    e1*a2 + f1*c2 + e2, e1*b2 + f1*d2 + f2,
  ];
};

const applyCTM = (m: CTMMatrix, x: number, y: number): [number, number] => [
  m[0]*x + m[2]*y + m[4],
  m[1]*x + m[3]*y + m[5],
];

const analyzePdfPaths = (
  opList: { fnArray: number[]; argsArray: unknown[][] },
  pageWidth: number,
  pageNum: number,
): { curveRegions: { yMin: number; yMax: number }[] } => {
  const curveRegions: { yMin: number; yMax: number }[] = [];
  const OPS = pdfjsLib.OPS as Record<string, number>;
  const constructPathOp = OPS.constructPath;
  const saveOp = OPS.save;
  const restoreOp = OPS.restore;
  const transformOp = OPS.transform;
  const DEBUG = pageNum === 12;

  if (!constructPathOp) return { curveRegions };

  // Track CTM to convert content-stream coordinates → PDF user space
  let ctm: CTMMatrix = [1, 0, 0, 1, 0, 0];
  const ctmStack: CTMMatrix[] = [];

  let pathCount = 0;
  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const rawArgs = (opList.argsArray[i] as unknown[] | null) ?? [];

    if (fn === saveOp) {
      ctmStack.push([...ctm] as CTMMatrix);
      continue;
    }
    if (fn === restoreOp) {
      if (ctmStack.length > 0) ctm = ctmStack.pop()!;
      continue;
    }
    if (fn === transformOp) {
      // argsArray entry may be [a,b,c,d,e,f] or [[a,b,c,d,e,f]] depending on pdfjs version
      const flat = rawArgs.length === 6 ? rawArgs : (rawArgs.length === 1 && Array.isArray(rawArgs[0]) ? (rawArgs[0] as unknown[]) : null);
      if (flat && flat.length === 6) {
        const m = flat as CTMMatrix;
        ctm = concatCTM(m, ctm);
        if (DEBUG) console.log(`[pdfUtils] p${pageNum} transform: [${m.map(v => Number(v).toFixed(3)).join(',')}] → ctm=[${ctm.map(v => v.toFixed(3)).join(',')}]`);
      } else {
        if (DEBUG) console.log(`[pdfUtils] p${pageNum} transform: SKIPPED (rawArgs.length=${rawArgs.length}, types=${rawArgs.map(a => typeof a).join(',')})`);
      }
      continue;
    }
    if (fn !== constructPathOp) continue;

    pathCount++;

    let hasCurve = false;
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;

    const updPdf = (x: number, y: number) => {
      const [px, py] = applyCTM(ctm, x, y);
      if (px < xMin) xMin = px; if (px > xMax) xMax = px;
      if (py < yMin) yMin = py; if (py > yMax) yMax = py;
    };

    // pdfjs v5 format: args = [count: Number, [TypedArray]: the path data, bbox: Float32Array]
    // pdfjs v3/v4 format: args = [subOpsArray, coordsArray]
    const isV5 = typeof rawArgs[0] === 'number' && Array.isArray(rawArgs[1]);

    if (isV5) {
      // Parse typed array: interleaved [opCode, coords..., opCode, coords..., ...]
      // 0=moveTo(x,y)  1=lineTo(x,y)  2=curveTo(x1,y1,x2,y2,x3,y3)  3=closePath
      const inner = rawArgs[1] as unknown[];
      const dataRaw = Array.isArray(inner) ? inner[0] : inner;
      if (!dataRaw || (!Array.isArray(dataRaw) && !ArrayBuffer.isView(dataRaw))) {
        if (DEBUG) console.log(`[pdfUtils] p${pageNum} path#${pathCount} v5: BAD dataRaw type=${Object.prototype.toString.call(dataRaw)}`);
        continue;
      }
      const data = Array.from(dataRaw as Iterable<number>);
      if (DEBUG) console.log(`[pdfUtils] p${pageNum} path#${pathCount} v5: ${data.length} elements, first8=[${data.slice(0,8).join(',')}]`);
      let idx = 0;
      while (idx < data.length) {
        const op = data[idx++];
        if (op === 0) {
          const x = data[idx++], y = data[idx++]; updPdf(x, y);
        } else if (op === 1) {
          const x = data[idx++], y = data[idx++]; updPdf(x, y);
        } else if (op === 2) {
          const x1=data[idx++],y1=data[idx++],x2=data[idx++],y2=data[idx++],x3=data[idx++],y3=data[idx++];
          hasCurve = true;
          updPdf(x1,y1); updPdf(x2,y2); updPdf(x3,y3);
        } else if (op === 3) {
          // closePath — no coords
        } else {
          if (DEBUG) console.log(`[pdfUtils] p${pageNum} path#${pathCount} v5: unknown op ${op} at idx ${idx-1}, stopping`);
          break;
        }
      }
    } else {
      // Old format: args[0] = op codes (array/typed), args[1] = coords (array/typed)
      const isArrayLike = (v: unknown) => Array.isArray(v) || ArrayBuffer.isView(v);
      if (!isArrayLike(rawArgs[0]) || !isArrayLike(rawArgs[1])) continue;
      const subOps = Array.from(rawArgs[0] as Iterable<number>);
      const coords = Array.from(rawArgs[1] as Iterable<number>);
      let idx = 0;
      for (const op of subOps) {
        switch (op) {
          case 0: { const x=coords[idx++],y=coords[idx++]; updPdf(x,y); break; }
          case 1: { const x=coords[idx++],y=coords[idx++]; updPdf(x,y); break; }
          case 2: { const x1=coords[idx++],y1=coords[idx++],x2=coords[idx++],y2=coords[idx++],x3=coords[idx++],y3=coords[idx++]; hasCurve=true; updPdf(x1,y1);updPdf(x2,y2);updPdf(x3,y3); break; }
          case 3: { const x2=coords[idx++],y2=coords[idx++],x3=coords[idx++],y3=coords[idx++]; hasCurve=true; updPdf(x2,y2);updPdf(x3,y3); break; }
          case 4: { const x1=coords[idx++],y1=coords[idx++],x3=coords[idx++],y3=coords[idx++]; hasCurve=true; updPdf(x1,y1);updPdf(x3,y3); break; }
          case 5: break;
          case 6: { const rx=coords[idx++],ry=coords[idx++],rw=coords[idx++],rh=coords[idx++]; updPdf(rx,ry);updPdf(rx+rw,ry+rh); break; }
          default: break;
        }
      }
    }

    const w = xMax - xMin, h = yMax - yMin;
    if (!isFinite(w) || !isFinite(h)) continue;

    if (DEBUG) console.log(`[pdfUtils] p${pageNum} path#${pathCount}(${isV5?'v5':'old'}): w=${w.toFixed(1)} h=${h.toFixed(1)} hasCurve=${hasCurve} yMin=${yMin.toFixed(1)} yMax=${yMax.toFixed(1)}`);

    if (hasCurve && w > pageWidth * 0.05 && h > 10) {
      if (!curveRegions.some(r => Math.abs(r.yMin - yMin) < 10 && Math.abs(r.yMax - yMax) < 10)) {
        if (DEBUG) console.log(`[pdfUtils] p${pageNum}: → CURVE REGION yMin=${yMin.toFixed(1)} yMax=${yMax.toFixed(1)}`);
        curveRegions.push({ yMin, yMax });
      }
    } else {
      if (DEBUG) console.log(`[pdfUtils] p${pageNum}: path skipped (hasCurve=${hasCurve} w=${w.toFixed(1)} thresh>${(pageWidth*0.05).toFixed(1)} h=${h.toFixed(1)} thresh>10)`);
    }
  }

  if (DEBUG) console.log(`[pdfUtils] p${pageNum}: paths=${pathCount} → curveRegions=${curveRegions.length}`);
  return { curveRegions };
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

export const extractPdfPages = async (
  pdf: pdfjsLib.PDFDocumentProxy,
  onProgress?: (current: number, total: number) => void,
): Promise<JSONContent[]> => {
  const allPagesContent: JSONContent[] = [];
  const textRgb = resolveCssColorToRgb();

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const pageViewport = page.getViewport({ scale: 1 });
    const xScale = 800 / pageViewport.width;
    const content = await page.getTextContent();

    const pageDims = { pageWidth: Math.round(pageViewport.width), pageHeight: Math.round(pageViewport.height) };

    if (content.items.length === 0) {
      allPagesContent.push({ ...emptyPageContent, attrs: pageDims });
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
        const threshold = Math.max(Math.min(prevLine.height, capH), Math.min(currLine.height, capH), avgLineHeight) * 1.5;
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

    const leftmostX = lines.length > 0 ? Math.min(...lines.map(l => l.x)) : 0;
    const rightmostExtent = lines.length > 0
      ? Math.max(...lines.flatMap(l => l.items.map(item => item.transform[4] + item.width)))
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

    // Curve regions via vector path analysis
    const opList = await page.getOperatorList();
    const { curveRegions } = analyzePdfPaths(opList, pageViewport.width, pageNum);

    // Top-level (non-nested) curve regions
    const topLevelRegions = curveRegions.filter((r, i) =>
      !curveRegions.some((other, j) => i !== j && other.yMin <= r.yMin && other.yMax >= r.yMax)
    );

    // Use the visual top of the first top-of-page graphic as the marginTop so the paper's
    // top padding matches where the graphic actually starts, not where the text inside it is.
    let marginTop = Math.max(0, Math.round((pageViewport.height - topY) * xScale));
    const topRegion = topLevelRegions.find(r => !lines.some(l => l.y > r.yMax + 5));
    if (topRegion) {
      marginTop = Math.max(0, Math.round((pageViewport.height - topRegion.yMax) * xScale));
    }

    const pageAttrs = { ...pageDims, marginLeft, marginRight, marginTop, marginBottom };

    // Build content items with Y positions for merged sorting
    type Item = { yPdf: number; node: JSONContent };
    const contentItems: Item[] = [];

    // Paragraph items (skip those whose Y falls within a curve region — they'll appear in the rendered image)
    for (const p of paragraphs) {
      if (curveRegions.some(r => p.yTop >= r.yMin - 5 && p.yTop <= r.yMax + 5)) continue;

      if (p.lines.length === 0) {
        contentItems.push({ yPdf: p.yTop, node: { type: 'paragraph' } });
        continue;
      }

      const paragraphX = p.lines[0]?.x ?? leftmostX;
      const pMarginLeft = Math.max(0, Math.round((paragraphX - leftmostX) * xScale));
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
      if (firstLineHeight > avgLineHeight * 1.8) { nodeType = 'heading'; attrs = { level: 1 }; }
      else if (firstLineHeight > avgLineHeight * 1.5) { nodeType = 'heading'; attrs = { level: 2 }; }
      else if (firstLineHeight > avgLineHeight * 1.2) { nodeType = 'heading'; attrs = { level: 3 }; }
      if (pMarginLeft > 0) attrs = { ...attrs, marginLeft: pMarginLeft };

      contentItems.push({ yPdf: p.yTop, node: { type: nodeType, attrs, content: contentNodes } });
    }

    const debugPage = pageNum === 12;

    // Horizontal rule items
    if (debugPage) console.log(`[pdfUtils] p${pageNum}: inserting ${horizontalRules.length} horizontal rules at y=${horizontalRules.map(y => y.toFixed(1)).join(', ')}`);
    for (const y of horizontalRules) {
      contentItems.push({ yPdf: y, node: { type: 'horizontalRule' } });
    }

    if (debugPage) console.log(`[pdfUtils] p${pageNum}: processing ${topLevelRegions.length}/${curveRegions.length} top-level curve regions`);
    for (const region of topLevelRegions) {
      const src = cropCanvasRegion(pageCanvas, pageViewport, xScale, region.yMin, region.yMax, textRgb);
      if (debugPage) console.log(`[pdfUtils] p${pageNum}: cropCanvasRegion result: ${src ? `dataUrl(${src.length} chars)` : 'null'}`);
      if (src) contentItems.push({ yPdf: region.yMax, node: { type: 'image', attrs: { src, alt: null, title: 'pdf-graphic' } } });
    }

    // XObject images — try to get approximate Y from operator list, fallback to bottomY
    const pageImages = await extractPageImages(page);
    const imageYs = extractImageYPositions(opList, pageImages.length, pageViewport.height);
    for (let i = 0; i < pageImages.length; i++) {
      contentItems.push({ yPdf: imageYs[i] ?? bottomY - 1, node: { type: 'image', attrs: { src: pageImages[i], alt: null, title: null } } });
    }

    // Sort by Y descending (top → bottom of page)
    contentItems.sort((a, b) => b.yPdf - a.yPdf);

    const pageContent: JSONContent = { type: 'doc', attrs: pageAttrs, content: contentItems.map(i => i.node) };
    allPagesContent.push(pageContent.content!.length > 0 ? pageContent : { ...emptyPageContent, attrs: pageAttrs });
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
