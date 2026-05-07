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
import { TranslationsContext, resolveTranslations } from '../../i18n'
import '../../styles/editor.css'

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
  /**
   * Optional wrapper for the content area only (not the toolbar).
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
      // Tiptap v3 StarterKit already bundles Link and Underline — disable to avoid duplicates
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
      Image,
      TextStyle,
      Color,
      Placeholder.configure({ placeholder }),
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

  const editorContent = (
    <EditorContent
      editor={editor}
      className={`magic-text-editor__content${contentClassName ? ` ${contentClassName}` : ''}`}
    />
  )

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
        {wrapContent ? wrapContent(editorContent) : editorContent}
      </div>
    </TranslationsContext.Provider>
  )
}
