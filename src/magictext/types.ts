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
      segments: TTSSegment[]
    }
  | { kind: 'image'; src: string; alt: string | null; title: string | null }
  | { kind: 'rule' }

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
