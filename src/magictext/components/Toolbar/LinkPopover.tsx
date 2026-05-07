import { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { LinkIcon } from './icons'
import { useTranslations } from '../../i18n'

interface Props {
  editor: Editor
}

export function LinkPopover({ editor }: Props) {
  const t = useTranslations()

  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const textInputRef = useRef<HTMLInputElement>(null)

  const isActive = editor.isActive('link')

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (!btnRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    const editorDom = editor.view.dom
    const handleLinkClick = (e: MouseEvent) => {
      if (!editor.isEditable) return
      if (!(e.target as HTMLElement).closest('a[href]')) return
      e.preventDefault()
      editor.chain().extendMarkRange('link').run()
      const { from, to } = editor.state.selection
      const startCoords = editor.view.coordsAtPos(from)
      const endCoords = editor.view.coordsAtPos(to)
      setPosition({ top: startCoords.top, left: (startCoords.left + endCoords.left) / 2 })
      setText(editor.state.doc.textBetween(from, to))
      setUrl(editor.getAttributes('link').href ?? '')
      setOpen(true)
      setTimeout(() => textInputRef.current?.focus(), 0)
    }
    editorDom.addEventListener('click', handleLinkClick)
    return () => editorDom.removeEventListener('click', handleLinkClick)
  }, [editor])

  const openPopover = () => {
    const { from, to } = editor.state.selection
    const startCoords = editor.view.coordsAtPos(from)
    const endCoords = editor.view.coordsAtPos(to)
    setPosition({
      top: startCoords.top,
      left: (startCoords.left + endCoords.left) / 2,
    })
    setText(editor.state.doc.textBetween(from, to))
    setUrl(editor.getAttributes('link').href ?? '')
    setOpen(true)
    setTimeout(() => textInputRef.current?.focus(), 0)
  }

  const apply = () => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return
    const trimmedText = text.trim()
    editor.chain().focus().extendMarkRange('link').command(({ tr, state }) => {
      const { from, to } = state.selection
      const linkMark = state.schema.marks.link.create({ href: trimmedUrl })
      const node = state.schema.text(trimmedText || trimmedUrl, [linkMark])
      tr.replaceWith(from, to, node)
      return true
    }).run()
    setOpen(false)
  }

  const remove = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); apply() }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
  }

  return (
    <>
      <div ref={btnRef}>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            if (open) { setOpen(false); return }
            openPopover()
          }}
          title={t.link.insertLink}
          aria-label={t.link.insertLink}
          aria-pressed={open}
          className={`magic-text-editor__btn${isActive || open ? ' magic-text-editor__btn--active' : ''}`}
        >
          <LinkIcon />
        </button>
      </div>

      {open && (
        <div
          ref={popoverRef}
          className="magic-text-editor__link-float"
          style={{ top: position.top, left: position.left }}
          role="dialog"
          aria-label={t.link.editorAriaLabel}
        >
          <div className="magic-text-editor__link-body">
            <div className="magic-text-editor__link-fields">
              <div className="magic-text-editor__link-field">
                <label className="magic-text-editor__link-label">{t.link.textLabel}</label>
                <input
                  ref={textInputRef}
                  className="magic-text-editor__var-input"
                  placeholder={t.link.textPlaceholder}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div className="magic-text-editor__link-field">
                <label className="magic-text-editor__link-label">{t.link.urlLabel}</label>
                <input
                  className="magic-text-editor__var-input"
                  placeholder={t.link.urlPlaceholder}
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>
            <button
              type="button"
              className="magic-text-editor__var-add-btn"
              onMouseDown={(e) => { e.preventDefault(); apply() }}
            >
              {t.link.applyButton}
            </button>
          </div>
          {isActive && (
            <button
              type="button"
              className="magic-text-editor__link-remove-btn"
              onMouseDown={(e) => { e.preventDefault(); remove() }}
            >
              {t.link.removeLinkButton}
            </button>
          )}
        </div>
      )}
    </>
  )
}
