import type { JSONContent } from '@tiptap/core'
import type { TTSAttrs, TTSSegment } from '../types'

const SENTENCE_RE = /[^.!?]*[.!?]+(?:\s|$)|[^.!?]+$/g

function splitSentences(text: string): string[] {
  const raw = text.match(SENTENCE_RE) ?? [text]
  return raw.map(s => s.trim()).filter(Boolean)
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

interface InlineChunk {
  text: string
  attrs: TTSAttrs | null
}

function extractChunks(node: JSONContent): InlineChunk[] {
  const chunks: InlineChunk[] = []
  for (const inline of node.content ?? []) {
    if (inline.type === 'text') {
      const marks = (inline.marks ?? []) as { type: string; attrs?: Record<string, unknown> }[]
      chunks.push({ text: inline.text ?? '', attrs: getTTSAttrs(marks) })
    } else if (inline.type === 'hardBreak') {
      chunks.push({ text: ' ', attrs: null })
    }
  }
  return chunks
}

/**
 * Parses a Tiptap JSONContent document into a flat array of TTSSegment,
 * one segment per sentence. Each segment carries any TTS mark attributes
 * assigned to the text in the editor.
 *
 * The voice attribution strategy: each sentence takes the TTS attrs of its
 * first character. If a sentence spans both marked and unmarked text, the
 * mark of the opening character wins.
 */
export function extractTTSSegments(content: JSONContent): TTSSegment[] {
  const result: TTSSegment[] = []
  let globalIndex = 0
  let blockIndex = 0

  const processBlock = (node: JSONContent, blockType: 'paragraph' | 'heading', headingLevel?: number) => {
    const chunks = extractChunks(node)
    if (!chunks.length) { blockIndex++; return }

    // Build a position-indexed attrs array alongside the full text
    let fullText = ''
    const posAttrs: (TTSAttrs | null)[] = []
    for (const chunk of chunks) {
      for (let i = 0; i < chunk.text.length; i++) posAttrs.push(chunk.attrs)
      fullText += chunk.text
    }

    const sentences = splitSentences(fullText)
    let searchFrom = 0

    for (const sentText of sentences) {
      if (!sentText) continue
      const pos = fullText.indexOf(sentText, searchFrom)
      const attrs = pos >= 0 ? (posAttrs[pos] ?? null) : null
      if (pos >= 0) searchFrom = pos + sentText.length

      result.push({
        text: sentText,
        index: globalIndex++,
        ttsAttrs: attrs,
        blockIndex,
        blockType,
        ...(headingLevel !== undefined ? { headingLevel } : {}),
      })
    }

    blockIndex++
  }

  const walk = (node: JSONContent) => {
    if (node.type === 'paragraph') {
      processBlock(node, 'paragraph')
    } else if (node.type === 'heading') {
      const level = (node.attrs as { level?: number })?.level ?? 1
      processBlock(node, 'heading', level)
    } else if (node.content) {
      for (const child of node.content) walk(child)
    }
  }

  if (content) walk(content)
  return result
}
