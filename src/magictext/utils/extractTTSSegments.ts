import type { JSONContent } from '@tiptap/core'
import type { TTSAttrs, TTSSegment, TextRun, DocumentBlock } from '../types'

/**
 * Sentence splitter — kept identical to the host app's TTS pipeline
 * (PdfProcessor.extractSentencesFromJSON and services/tts.buildSegments) so that
 * the reader's sentence indices line up exactly with the browser-voice
 * `sentences` array and the AI-voice `timeline`. Splits after .!? that is not
 * followed by another dot, then trims.
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
      const text = inline.text ?? ''
      for (let i = 0; i < text.length; i++) chars.push({ tts, bold, italic })
      fullText += text
    } else if (inline.type === 'hardBreak') {
      hardBreakOffsets.push(fullText.length)
      chars.push({ tts: null, bold: false, italic: false })
      fullText += ' '
    }
  }
  return { fullText, chars, hardBreakOffsets }
}

/** Group [start, end) of fullText into bold/italic-consistent runs. */
function buildRuns(fullText: string, chars: CharInfo[], start: number, end: number): TextRun[] {
  const runs: TextRun[] = []
  let i = start
  while (i < end) {
    const bold = chars[i]?.bold ?? false
    const italic = chars[i]?.italic ?? false
    let j = i + 1
    while (j < end && (chars[j]?.bold ?? false) === bold && (chars[j]?.italic ?? false) === italic) j++
    runs.push({ text: fullText.slice(i, j), bold, italic })
    i = j
  }
  return runs
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
  const blocks: DocumentBlock[] = []
  let globalIndex = 0
  let blockIndex = 0

  const processText = (node: JSONContent, blockType: 'paragraph' | 'heading', headingLevel?: number) => {
    const { fullText, chars, hardBreakOffsets } = buildCharInfo(node)
    const attrs = node.attrs as { textAlign?: string; marginLeft?: number } | undefined
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
        segments.push({
          text: sentText,
          index: globalIndex++,
          ttsAttrs,
          blockIndex,
          blockType,
          ...(headingLevel !== undefined ? { headingLevel } : {}),
          runs,
          ...(breakAfter ? { breakAfter: true } : {}),
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
      const a = (node.attrs ?? {}) as { src?: string; alt?: string | null; title?: string | null }
      if (a.src) blocks.push({ kind: 'image', src: a.src, alt: a.alt ?? null, title: a.title ?? null })
    } else if (node.type === 'horizontalRule') {
      blocks.push({ kind: 'rule' })
    } else if (node.content) {
      for (const child of node.content) walk(child)
    }
  }

  walk(content)
  return blocks
}

/**
 * Flat list of sentence segments (one per sentence), derived from
 * extractDocumentBlocks. Backward-compatible with prior consumers: indices,
 * ordering, blockIndex and ttsAttrs are unchanged for text content.
 */
export function extractTTSSegments(content: JSONContent): TTSSegment[] {
  const result: TTSSegment[] = []
  for (const block of extractDocumentBlocks(content)) {
    if (block.kind === 'text') result.push(...block.segments)
  }
  return result
}
