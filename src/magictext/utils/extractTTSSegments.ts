import type { JSONContent } from '@tiptap/core'
import type { TTSAttrs, TTSSegment, TextRun, DocumentBlock } from '../types'

/**
 * Sentence splitter — kept identical to SpellProcessor.extractSentencesFromJSON (browser-voice
 * `sentences`) and, as of TCORE-77, to the backend's own app.utils.parser.split_sentences
 * (Spellcast-API). Both this file's buildCharInfo() (below) and the backend's
 * _build_char_info() apply this same regex to a whole paragraph's *merged* inline text (not
 * per text node) — Tiptap represents any inline mark spanning only part of a sentence (bold,
 * a `tts` mark on one character) as multiple adjacent text nodes, so splitting node-by-node
 * would fragment normal sentences instead of matching the provider-voice `timeline`'s entries to
 * this function's indices. Splits after .!? that is not followed by another dot, then trims.
 */
function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])(?!\s*\.)/).map(s => s.trim()).filter(Boolean)
}

function getTTSAttrs(marks: { type: string; attrs?: Record<string, unknown> }[]): TTSAttrs | null {
  const m = marks.find(mk => mk.type === 'tts')
  if (!m) return null
  return {
    characterId: (m.attrs?.characterId as string) ?? null,
    characterName: (m.attrs?.characterName as string) ?? null,
    voice: (m.attrs?.voice as string) ?? null,
    inflection: (m.attrs?.inflection as string) ?? null,
    color: (m.attrs?.color as string) ?? null,
  }
}

interface CharInfo {
  tts: TTSAttrs | null
  bold: boolean
  italic: boolean
  fontSize?: string
  fontFamily?: string
  color?: string
  // A hardBreak: a space for the sentence text (so sentences split the same way), but a
  // line break where it's drawn.
  lineBreak?: boolean
}

// The text style a run carries (see TextRun): equal for every char of one run.
const STYLE_KEYS = ['fontSize', 'fontFamily', 'color'] as const
const sameStyle = (a: CharInfo | undefined, b: CharInfo | undefined) =>
  STYLE_KEYS.every(k => a?.[k] === b?.[k])
const styleOf = (c: CharInfo | undefined): Partial<Pick<CharInfo, typeof STYLE_KEYS[number]>> => {
  const out: Partial<Pick<CharInfo, typeof STYLE_KEYS[number]>> = {}
  for (const k of STYLE_KEYS) if (c?.[k]) out[k] = c[k]
  return out
}

/** Flatten a block's inline content into a string plus per-character mark info. */
function buildCharInfo(node: JSONContent): { fullText: string; chars: CharInfo[]; hardBreakOffsets: number[] } {
  let fullText = ''
  const chars: CharInfo[] = []
  const hardBreakOffsets: number[] = []
  for (const inline of node.content ?? []) {
    if (inline.type === 'text') {
      const marks = (inline.marks ?? []) as { type: string; attrs?: Record<string, unknown> }[]
      const tts = getTTSAttrs(marks)
      const bold = marks.some(m => m.type === 'bold')
      const italic = marks.some(m => m.type === 'italic')
      const style = marks.find(m => m.type === 'textStyle')?.attrs ?? {}
      const own: Partial<Pick<CharInfo, typeof STYLE_KEYS[number]>> = {}
      for (const k of STYLE_KEYS) if (typeof style[k] === 'string' && style[k]) own[k] = style[k] as string
      const text = inline.text ?? ''
      for (let i = 0; i < text.length; i++) chars.push({ tts, bold, italic, ...own })
      fullText += text
    } else if (inline.type === 'hardBreak') {
      hardBreakOffsets.push(fullText.length)
      chars.push({ tts: null, bold: false, italic: false, lineBreak: true })
      fullText += ' '
    }
  }
  return { fullText, chars, hardBreakOffsets }
}

/** Group [start, end) of fullText into runs of the same bold/italic/size/font/color. */
function buildRuns(fullText: string, chars: CharInfo[], start: number, end: number): TextRun[] {
  const runs: TextRun[] = []
  let i = start
  while (i < end) {
    if (chars[i]?.lineBreak) {
      runs.push({ text: '', bold: false, italic: false, lineBreak: true })
      i++
      continue
    }
    const bold = chars[i]?.bold ?? false
    const italic = chars[i]?.italic ?? false
    let j = i + 1
    while (
      j < end
      && !chars[j]?.lineBreak
      && (chars[j]?.bold ?? false) === bold
      && (chars[j]?.italic ?? false) === italic
      && sameStyle(chars[j], chars[i])
    ) j++
    runs.push({ text: fullText.slice(i, j), bold, italic, ...styleOf(chars[i]) })
    i = j
  }
  return runs
}

const LAYOUT_ATTRS = ['spaceBefore'] as const

/** A block's PDF layout attrs (see PdfPositionExtension), when it has any. */
function layoutOf(node: JSONContent): { layout?: Record<string, unknown> } {
  const attrs = (node.attrs ?? {}) as Record<string, unknown>
  const layout: Record<string, unknown> = {}
  for (const key of LAYOUT_ATTRS) if (attrs[key] !== null && attrs[key] !== undefined) layout[key] = attrs[key]
  return Object.keys(layout).length ? { layout } : {}
}

/**
 * Parses a Tiptap JSONContent document into an ordered list of document blocks:
 * text blocks (paragraph/heading) carrying their sentence segments + block attrs,
 * plus image and horizontal-rule blocks interleaved in document order. This lets
 * a read-only renderer reproduce the editor's output exactly (inline formatting,
 * images, rules, alignment) while preserving sentence highlight indices.
 *
 * Sentence indices increment only across paragraph/heading sentences (images and
 * rules do not consume an index), matching the host app's TTS segmentation.
 */
export function extractDocumentBlocks(content: JSONContent | null | undefined): DocumentBlock[] {
  if (!content) return []
  // Where blocks go: the page itself, or the column being walked.
  let blocks: DocumentBlock[] = []
  const page = blocks
  let globalIndex = 0
  let blockIndex = 0

  const processText = (node: JSONContent, blockType: 'paragraph' | 'heading', headingLevel?: number) => {
    const { fullText, chars, hardBreakOffsets } = buildCharInfo(node)
    const attrs = node.attrs as { textAlign?: string; marginLeft?: number; lineHeight?: number | null; fontSize?: number | null; textIndent?: number | null } | undefined
    const segments: TTSSegment[] = []

    if (fullText.trim()) {
      const sentences = splitSentences(fullText)
      // First pass: resolve each sentence's position in fullText.
      const positions: { pos: number; end: number }[] = []
      let searchFrom = 0
      for (const sentText of sentences) {
        const pos = fullText.indexOf(sentText, searchFrom)
        const end = pos >= 0 ? pos + sentText.length : searchFrom
        positions.push({ pos, end })
        if (pos >= 0) searchFrom = end
      }
      for (let si = 0; si < sentences.length; si++) {
        const sentText = sentences[si]
        const { pos, end } = positions[si]
        const ttsAttrs = pos >= 0 ? (chars[pos]?.tts ?? null) : null
        const runs = pos >= 0
          ? buildRuns(fullText, chars, pos, end)
          : [{ text: sentText, bold: false, italic: false }]
        const nextStart = si < positions.length - 1 ? positions[si + 1].pos : fullText.length
        const breakAfter = hardBreakOffsets.some(h => h >= end && h < nextStart)
        // Whether the source has a space after it (the next sentence starts right after
        // otherwise, as in "7." + "415").
        const spaceAfter = end >= fullText.length || /\s/.test(fullText[end] ?? '')
        segments.push({
          text: sentText,
          index: globalIndex++,
          ttsAttrs,
          blockIndex,
          blockType,
          ...(headingLevel !== undefined ? { headingLevel } : {}),
          runs,
          ...(breakAfter ? { breakAfter: true } : {}),
          ...(spaceAfter ? {} : { spaceAfter: false }),
        })
      }
    }

    blocks.push({
      kind: 'text',
      blockIndex,
      blockType,
      ...(headingLevel !== undefined ? { headingLevel } : {}),
      ...(attrs?.textAlign ? { textAlign: attrs.textAlign } : {}),
      ...(attrs?.marginLeft ? { marginLeft: attrs.marginLeft } : {}),
      ...(attrs?.lineHeight ? { lineHeight: attrs.lineHeight } : {}),
      ...(attrs?.fontSize ? { fontSize: attrs.fontSize } : {}),
      ...(attrs?.textIndent ? { textIndent: attrs.textIndent } : {}),
      ...layoutOf(node),
      segments,
    })
    blockIndex++
  }

  const walk = (node: JSONContent) => {
    if (node.type === 'paragraph') {
      processText(node, 'paragraph')
    } else if (node.type === 'heading') {
      processText(node, 'heading', (node.attrs as { level?: number })?.level ?? 1)
    } else if (node.type === 'image') {
      const a = (node.attrs ?? {}) as { src?: string; alt?: string | null; title?: string | null; width?: number | null; marginLeft?: number | null }
      if (a.src) blocks.push({
        kind: 'image', src: a.src, alt: a.alt ?? null, title: a.title ?? null,
        ...(a.width ? { width: a.width } : {}),
        ...(a.marginLeft ? { marginLeft: a.marginLeft } : {}),
        ...layoutOf(node),
      })
    } else if (node.type === 'horizontalRule') {
      const a = (node.attrs ?? {}) as Record<string, unknown>
      const rule = Object.fromEntries(['ruleColor', 'ruleThickness'].filter(k => a[k] != null).map(k => [k, a[k]]))
      blocks.push({ kind: 'rule', ...layoutOf(node), ...(Object.keys(rule).length ? { rule } : {}) })
    } else if (node.type === 'columns') {
      // Each column's blocks in turn -- sentence indices running on through them in that
      // order, the same reading order everything else walks the page in.
      const columns: { width?: number; blocks: DocumentBlock[] }[] = []
      const outer = blocks
      for (const column of node.content ?? []) {
        blocks = []
        for (const child of column.content ?? []) walk(child)
        const width = (column.attrs as { width?: number | null } | undefined)?.width
        columns.push({ ...(width ? { width } : {}), blocks })
      }
      blocks = outer
      blocks.push({ kind: 'columns', ...layoutOf(node), columns })
    } else if (node.type === 'box') {
      const outer = blocks
      blocks = []
      for (const child of node.content ?? []) walk(child)
      const inner = blocks
      blocks = outer
      blocks.push({ kind: 'box', ...layoutOf(node), box: (node.attrs ?? {}) as Record<string, unknown>, blocks: inner })
    } else if (node.content) {
      for (const child of node.content) walk(child)
    }
  }

  walk(content)
  return page
}

/**
 * Flat list of sentence segments (one per sentence), derived from
 * extractDocumentBlocks. Backward-compatible with prior consumers: indices,
 * ordering, blockIndex and ttsAttrs are unchanged for text content.
 */
export function extractTTSSegments(content: JSONContent): TTSSegment[] {
  const result: TTSSegment[] = []
  const collect = (blocks: DocumentBlock[]) => {
    for (const block of blocks) {
      if (block.kind === 'text') result.push(...block.segments)
      else if (block.kind === 'columns') for (const column of block.columns) collect(column.blocks)
      else if (block.kind === 'box') collect(block.blocks)
    }
  }
  collect(extractDocumentBlocks(content))
  return result
}
