import type { CSSProperties } from 'react'
import type { JSONContent } from '@tiptap/core'
import type { Translations, PartialTranslations } from './i18n/types'

export type { JSONContent }
export type ContentType = 'html' | 'json'
export type VariableType = 'text' | 'textarea' | 'select' | 'date' | 'daterange'

export interface Variable {
  label: string
  type?: VariableType
  options?: string[]
}

export interface TTSMark {
  id: string
  name: string
  voices?: string[]
}

export interface TTSPlayPayload {
  text: string
  // Real Tiptap tree of the selection (`editor.state.doc.slice(from, to).toJSON()`), used for
  // the provider-voice TTS request so its marks survive instead of a synthetic one-mark
  // reconstruction. `text` stays required — it's also used for the browser-voice
  // (speechSynthesis) fallback, which only needs plain text.
  doc: JSONContent
  characterId: string
  characterName: string
  voice: string | null
  inflection: string | null
  color: string
}

// ── Reader additions ──────────────────────────────────────────────────────────

export interface TTSAttrs {
  characterId: string | null
  characterName: string | null
  voice: string | null
  inflection: string | null
  color: string | null
}

/**
 * An inline run of text within a sentence, carrying its bold/italic state so the
 * reader can reproduce the editor's inline formatting.
 */
export interface TextRun {
  text: string
  bold: boolean
  italic: boolean
  /** The text's own size (a CSS length, e.g. read from a PDF), when it has one. */
  fontSize?: string
  /** Its own font (a CSS font-family list) and color, when it has them. */
  fontFamily?: string
  color?: string
  /** A line break inside the sentence (a hardBreak in the source), rendered as one. */
  lineBreak?: boolean
}

/**
 * A single sentence extracted from JSONContent, with any TTS mark metadata.
 * Produced by extractTTSSegments / useTTSSegments for use in the reader.
 */
export interface TTSSegment {
  text: string
  index: number
  ttsAttrs: TTSAttrs | null
  blockIndex: number
  blockType: 'paragraph' | 'heading'
  headingLevel?: number
  /** Inline bold/italic runs covering exactly this sentence's characters. */
  runs?: TextRun[]
  /** True when a hardBreak node in the source immediately follows this sentence. */
  breakAfter?: boolean
  /**
   * False when the source has no space right after this sentence (e.g. "7.415" splits after
   * "7."): the renderer then joins it to the next one as written, instead of adding a space.
   */
  spaceAfter?: boolean
}

/**
 * An ordered document block produced by extractDocumentBlocks. Text blocks carry
 * their sentence segments and block-level attrs; image / rule blocks let the
 * reader interleave non-sentence content in document order, matching the editor.
 */
export type DocumentBlock =
  | {
      kind: 'text'
      blockIndex: number
      blockType: 'paragraph' | 'heading'
      headingLevel?: number
      textAlign?: string
      marginLeft?: number
      lineHeight?: number
      /** Its own size and first-line indent, in px (see PdfPositionExtension). */
      fontSize?: number
      textIndent?: number
      /** Its PDF layout attrs (spaceBefore): see PdfPositionExtension. */
      layout?: Record<string, unknown>
      segments: TTSSegment[]
    }
  | { kind: 'image'; src: string; alt: string | null; title: string | null; width?: number; marginLeft?: number; layout?: Record<string, unknown> }
  /** A rule; its own color/thickness (ruleColor/ruleThickness, see PdfPositionExtension). */
  | { kind: 'rule'; layout?: Record<string, unknown>; rule?: Record<string, unknown> }
  /** Columns side by side (see ColumnsExtension): each one's blocks, in reading order. */
  | { kind: 'columns'; layout?: Record<string, unknown>; columns: { width?: number; blocks: DocumentBlock[] }[] }
  /** A colored box around blocks (see BoxExtension). */
  | { kind: 'box'; layout?: Record<string, unknown>; box: Record<string, unknown>; blocks: DocumentBlock[] }

// ── MagicTextEditor props ─────────────────────────────────────────────────────

export interface MagicTextEditorProps {
  content?: string | JSONContent
  inputType?: ContentType
  outputType?: ContentType
  onChange?: (value: string | JSONContent) => void
  onBlur?: (value: string | JSONContent) => void
  onFocus?: (value: string | JSONContent) => void
  placeholder?: string
  editable?: boolean
  autofocus?: boolean | 'start' | 'end' | 'all' | number
  style?: CSSProperties
  className?: string
  toolbarClassName?: string
  contentClassName?: string
  variables?: Variable[]
  onVariableAdd?: (variable: Variable) => void
  ttsMarks?: TTSMark[]
  ttsInflections?: string[]
  onTTSPlay?: (payload: TTSPlayPayload) => void
  onTTSStop?: () => void
  ttsPlaying?: boolean
  locale?: string
  translations?: PartialTranslations
}

export type { Translations, PartialTranslations }
