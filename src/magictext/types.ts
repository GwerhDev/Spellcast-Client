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
}

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
