import type { Editor } from '@tiptap/react'
import type { Variable, TTSMark, TTSPlayPayload } from '../../types'
import { ToolbarButton } from './ToolbarButton'
import { ToolbarDivider } from './ToolbarDivider'
import { VariableDropdown } from './VariableDropdown'
import { LinkPopover } from './LinkPopover'
import { ImagePopover } from './ImagePopover'
import { TTSPopover } from './TTSPopover'
import {
  BoldIcon, ItalicIcon, UnderlineIcon, StrikeIcon,
  UndoIcon, RedoIcon,
  BulletListIcon, OrderedListIcon, BlockquoteIcon,
  CodeIcon, HighlightIcon, HorizontalRuleIcon,
  AlignLeftIcon, AlignCenterIcon, AlignRightIcon,
} from './icons'
import { useTranslations } from '../../i18n'

interface ToolbarProps {
  editor: Editor | null
  className?: string
  variables?: Variable[]
  onVariableAdd?: (variable: Variable) => void
  ttsMarks?: TTSMark[]
  ttsInflections?: string[]
  onTTSPlay?: (payload: TTSPlayPayload) => void
  onTTSStop?: () => void
  ttsPlaying?: boolean
}

export function Toolbar({ editor, className, variables, onVariableAdd, ttsMarks, ttsInflections, onTTSPlay, onTTSStop, ttsPlaying }: ToolbarProps) {
  if (!editor) return null
  const t = useTranslations()

  return (
    <div
      role="toolbar"
      aria-label={t.toolbar.ariaLabel}
      className={`magic-text-editor__toolbar${className ? ` ${className}` : ''}`}
    >
      {/* History */}
      <ToolbarButton
        title={t.history.undo}
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <UndoIcon />
      </ToolbarButton>
      <ToolbarButton
        title={t.history.redo}
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <RedoIcon />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Inline formatting */}
      <ToolbarButton
        title={t.formatting.bold}
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <BoldIcon />
      </ToolbarButton>
      <ToolbarButton
        title={t.formatting.italic}
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <ItalicIcon />
      </ToolbarButton>
      <ToolbarButton
        title={t.formatting.underline}
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon />
      </ToolbarButton>
      <ToolbarButton
        title={t.formatting.strikethrough}
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <StrikeIcon />
      </ToolbarButton>
      <ToolbarButton
        title={t.formatting.highlight}
        active={editor.isActive('highlight')}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <HighlightIcon />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        title={t.headings.heading1}
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        title={t.headings.heading2}
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        title={t.headings.heading3}
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists & blocks */}
      <ToolbarButton
        title={t.blocks.bulletList}
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <BulletListIcon />
      </ToolbarButton>
      <ToolbarButton
        title={t.blocks.orderedList}
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <OrderedListIcon />
      </ToolbarButton>
      <ToolbarButton
        title={t.blocks.blockquote}
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <BlockquoteIcon />
      </ToolbarButton>
      <ToolbarButton
        title={t.blocks.codeBlock}
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <CodeIcon />
      </ToolbarButton>
      <ToolbarButton
        title={t.blocks.horizontalRule}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <HorizontalRuleIcon />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarButton
        title={t.alignment.alignLeft}
        active={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      >
        <AlignLeftIcon />
      </ToolbarButton>
      <ToolbarButton
        title={t.alignment.alignCenter}
        active={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      >
        <AlignCenterIcon />
      </ToolbarButton>
      <ToolbarButton
        title={t.alignment.alignRight}
        active={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      >
        <AlignRightIcon />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Insert */}
      <LinkPopover editor={editor} />
      <ImagePopover editor={editor} />

      {variables !== undefined && (
        <>
          <ToolbarDivider />
          <VariableDropdown editor={editor} variables={variables} onVariableAdd={onVariableAdd} />
        </>
      )}

      {ttsMarks !== undefined && (
        <>
          <ToolbarDivider />
          <TTSPopover editor={editor} characters={ttsMarks} inflections={ttsInflections} onPlay={onTTSPlay} onStop={onTTSStop} playing={ttsPlaying} />
        </>
      )}
    </div>
  )
}
