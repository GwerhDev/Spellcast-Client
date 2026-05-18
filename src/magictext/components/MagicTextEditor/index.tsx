import { type ReactNode, useEffect, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import type { JSONContent } from '@tiptap/core'

import type { Variable, TTSMark, TTSPlayPayload } from '../../types'
import type { PartialTranslations } from '../../i18n/types'
import { Toolbar } from '../Toolbar/Toolbar'
import { VariableExtension } from '../../extensions/VariableExtension'
import { TTSMarkExtension } from '../../extensions/TTSMarkExtension'
import { PdfPositionExtension } from '../../extensions/PdfPositionExtension'
import { RulerExtension, DEFAULT_MARGINS } from '../../extensions/RulerExtension'
import type { PageMargins } from '../../extensions/RulerExtension'
import { HorizontalRuler } from '../Ruler/HorizontalRuler'
import { TranslationsContext, resolveTranslations } from '../../i18n'
import '../../styles/editor.css'

export interface RulerConfig {
  enabled: boolean
  margins: PageMargins
  paperWidth?: number
  paperHeight?: number
  onMarginsChange?: (margins: PageMargins) => void
  zoom?: number
}

export interface MagicTextEditorProps {
  content?: string | JSONContent
  /** @default 'json' */
  inputType?: 'html' | 'json'
  /** @default 'json' */
  outputType?: 'html' | 'json'
  onChange?: (value: string | JSONContent) => void
  onBlur?: (value: string | JSONContent) => void
  onFocus?: (value: string | JSONContent) => void
  placeholder?: string
  /** @default true */
  editable?: boolean
  autofocus?: boolean | 'start' | 'end' | 'all' | number
  style?: React.CSSProperties
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
  ruler?: RulerConfig
  /**
   * Optional wrapper for the content area only (not the toolbar or ruler).
   * Use this to apply paper/sheet styling around the editable area.
   */
  wrapContent?: (content: ReactNode) => ReactNode
}

export function MagicTextEditor({
  content = '',
  inputType = 'json',
  outputType = 'json',
  onChange,
  onBlur,
  onFocus,
  placeholder = 'Write something...',
  editable = true,
  autofocus = false,
  style,
  className,
  toolbarClassName,
  contentClassName,
  variables,
  onVariableAdd,
  ttsMarks,
  ttsInflections,
  onTTSPlay,
  onTTSStop,
  ttsPlaying,
  locale,
  translations: translationOverrides,
  ruler,
  wrapContent,
}: MagicTextEditorProps) {
  const t = useMemo(
    () => resolveTranslations(locale, translationOverrides),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale],
  )

  const getOutput = (editor: ReturnType<typeof useEditor>) =>
    outputType === 'json' ? editor!.getJSON() : editor!.getHTML()

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false, underline: false } as Record<string, unknown>),
      TTSMarkExtension,
      VariableExtension.configure({ translations: t.variableNode }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Image.configure({ allowBase64: true }),
      PdfPositionExtension,
      TextStyle,
      Color,
      Placeholder.configure({ placeholder }),
      RulerExtension.configure({
        enabled: ruler?.enabled ?? false,
        defaultMargins: ruler?.margins ?? DEFAULT_MARGINS,
        paperWidth: ruler?.paperWidth ?? 800,
        paperHeight: ruler?.paperHeight ?? 1131,
        onMarginsChange: ruler?.onMarginsChange,
      }),
    ],
    content,
    editable,
    autofocus,
    onUpdate({ editor }) { onChange?.(getOutput(editor)) },
    onBlur({ editor }) { onBlur?.(getOutput(editor)) },
    onFocus({ editor }) { onFocus?.(getOutput(editor)) },
  })

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    onChange?.(outputType === 'json' ? editor.getJSON() : editor.getHTML())
  }, [outputType]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.setEditable(editable)
  }, [editor, editable])

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const isDifferent = inputType === 'json'
      ? JSON.stringify(content) !== JSON.stringify(editor.getJSON())
      : content !== editor.getHTML()
    if (isDifferent) editor.commands.setContent(content as string)
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync ruler options when ruler config changes (margins, paperHeight, etc.)
  useEffect(() => {
    if (!editor || editor.isDestroyed || !ruler?.enabled) return
    const ext = editor.extensionManager.extensions.find(e => e.name === 'ruler')
    if (!ext) return
    ext.options.defaultMargins = ruler.margins
    ext.options.paperHeight = ruler.paperHeight ?? 1131
    ext.options.onMarginsChange = ruler.onMarginsChange
    editor.storage.ruler.margins = ruler.margins
  }, [editor, ruler?.margins, ruler?.paperHeight, ruler?.onMarginsChange]) // eslint-disable-line react-hooks/exhaustive-deps

  const editorContent = (
    <EditorContent
      editor={editor}
      className={`magic-text-editor__content${contentClassName ? ` ${contentClassName}` : ''}`}
    />
  )

  const contentNode = wrapContent ? wrapContent(editorContent) : editorContent

  const paperWidth = ruler?.paperWidth ?? 800
  const paperHeight = ruler?.paperHeight ?? 1131
  const margins = ruler?.margins ?? DEFAULT_MARGINS
  const rulerZoom = ruler?.zoom ?? 1

  const handleMarginsChange = (partial: Partial<PageMargins>) => {
    const next = { ...margins, ...partial }
    ruler?.onMarginsChange?.(next)
  }

  const inner = ruler?.enabled ? (
    <div
      className="magic-text-editor__ruler-grid"
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      {/* Top row: corner + horizontal ruler spanning full width */}
      <div style={{
        display: 'flex',
        flexShrink: 0,
        background: 'var(--magic-ruler-bg, #232323)',
        borderBottom: '1px solid var(--magic-ruler-border, #3c3c3c)',
      }}>
        <div style={{
          width: 20, height: 20, flexShrink: 0,
          borderRight: '1px solid var(--magic-ruler-border, #3c3c3c)',
        }} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <HorizontalRuler
            paperWidth={paperWidth}
            marginLeft={margins.marginLeft}
            marginRight={margins.marginRight}
            onMarginLeftChange={v => handleMarginsChange({ marginLeft: v })}
            onMarginRightChange={v => handleMarginsChange({ marginRight: v })}
            zoom={rulerZoom}
          />
        </div>
      </div>
      {/* Bottom row: scrollable content (VerticalRuler lives inside wrapContent) */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {contentNode}
      </div>
    </div>
  ) : contentNode

  return (
    <TranslationsContext.Provider value={t}>
      <div className={`magic-text-editor${className ? ` ${className}` : ''}`} style={style}>
        {editable && (
          <Toolbar
            editor={editor}
            className={toolbarClassName}
            variables={variables}
            onVariableAdd={onVariableAdd}
            ttsMarks={ttsMarks}
            ttsInflections={ttsInflections}
            onTTSPlay={onTTSPlay}
            onTTSStop={onTTSStop}
            ttsPlaying={ttsPlaying}
          />
        )}
        {inner}
      </div>
    </TranslationsContext.Provider>
  )
}
