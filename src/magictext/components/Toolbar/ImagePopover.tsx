import { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { ImageIcon } from './icons'
import { useTranslations } from '../../i18n'

interface Props {
  editor: Editor
}

type Tab = 'url' | 'upload'

export function ImagePopover({ editor }: Props) {
  const t = useTranslations()

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('url')
  const [src, setSrc] = useState('')
  const [alt, setAlt] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (open) {
      setSrc('')
      setAlt('')
      setPreview(null)
      setFileName(null)
      setTab('url')
      setTimeout(() => urlInputRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => {
    if (open && tab === 'url') setTimeout(() => urlInputRef.current?.focus(), 0)
  }, [tab])

  const insert = (imageSrc: string) => {
    const trimmed = imageSrc.trim()
    if (!trimmed) return
    editor.chain().focus().setImage({ src: trimmed, alt: alt.trim() || undefined }).run()
    setOpen(false)
  }

  const handleFile = (file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setPreview(result)
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) handleFile(file)
  }

  return (
    <div className="magic-text-editor__var-wrap" ref={wrapRef}>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault()
          setOpen(o => !o)
        }}
        title={t.image.insertImage}
        aria-label={t.image.insertImage}
        aria-pressed={open}
        aria-expanded={open}
        className={`magic-text-editor__btn${open ? ' magic-text-editor__btn--active' : ''}`}
      >
        <ImageIcon />
      </button>

      {open && (
        <div className="magic-text-editor__var-dropdown magic-text-editor__image-popover" role="dialog" aria-label={t.image.inserterAriaLabel}>
          <div className="magic-text-editor__image-tabs">
            <button
              type="button"
              className={`magic-text-editor__image-tab${tab === 'url' ? ' magic-text-editor__image-tab--active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); setTab('url') }}
            >
              {t.image.urlTab}
            </button>
            <button
              type="button"
              className={`magic-text-editor__image-tab${tab === 'upload' ? ' magic-text-editor__image-tab--active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); setTab('upload') }}
            >
              {t.image.uploadTab}
            </button>
          </div>

          {tab === 'url' ? (
            <div className="magic-text-editor__link-body">
              <div className="magic-text-editor__link-fields">
                <div className="magic-text-editor__link-field">
                  <label className="magic-text-editor__link-label">{t.image.imageUrlLabel}</label>
                  <input
                    ref={urlInputRef}
                    className="magic-text-editor__var-input"
                    placeholder={t.image.urlPlaceholder}
                    value={src}
                    onChange={e => setSrc(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); insert(src) }
                      if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
                    }}
                  />
                </div>
                <div className="magic-text-editor__link-field">
                  <label className="magic-text-editor__link-label">{t.image.altTextLabel}</label>
                  <input
                    className="magic-text-editor__var-input"
                    placeholder={t.image.altTextPlaceholder}
                    value={alt}
                    onChange={e => setAlt(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); insert(src) }
                      if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
                    }}
                  />
                </div>
              </div>
              <button
                type="button"
                className="magic-text-editor__var-add-btn"
                onMouseDown={(e) => { e.preventDefault(); insert(src) }}
              >
                {t.image.insertButton}
              </button>
            </div>
          ) : (
            <div className="magic-text-editor__image-upload-body">
              <div
                className="magic-text-editor__image-dropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {preview ? (
                  <img src={preview} alt="preview" className="magic-text-editor__image-preview" />
                ) : (
                  <span className="magic-text-editor__image-dropzone-hint">
                    {t.image.dropzoneHint}
                  </span>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="magic-text-editor__image-file-input"
                  onChange={handleFileChange}
                />
              </div>
              {fileName && (
                <span className="magic-text-editor__image-filename">{fileName}</span>
              )}
              <button
                type="button"
                className="magic-text-editor__var-add-btn"
                disabled={!preview}
                onMouseDown={(e) => { e.preventDefault(); if (preview) insert(preview) }}
              >
                {t.image.insertButton}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
