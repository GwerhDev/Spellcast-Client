import { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import type { TTSMark, TTSPlayPayload } from '../../types'
import { TTSIcon, PlayIcon, StopIcon, CheckIcon, TrashIcon, SpeakerIcon, WavesIcon } from './icons'
import { useTranslations } from '../../i18n'

const PALETTE = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899']

function getSelectionPopoverPosition(): { top: number; left: number } | null {
  const domSel = window.getSelection()
  if (!domSel || domSel.rangeCount === 0) return null
  const rect = domSel.getRangeAt(0).getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null
  return { top: rect.top, left: rect.left + rect.width / 2 }
}

type Tab = 'assign' | 'marks'

interface Props {
  editor: Editor
  characters?: TTSMark[]
  inflections?: string[]
  onPlay?: (payload: TTSPlayPayload) => void
  onStop?: () => void
  playing?: boolean
}

export function TTSPopover({ editor, characters = [], inflections = [], onPlay, onStop, playing = false }: Props) {
  const t = useTranslations()

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('assign')
  const [markId, setMarkId] = useState('')
  const [markName, setMarkName] = useState('')
  const [color, setColor] = useState(PALETTE[0])
  const [voice, setVoice] = useState('')
  const [inflection, setInflection] = useState('')
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [sideVariant, setSideVariant] = useState<'top' | 'bottom' | null>(null)

  const [showHoverIcon, setShowHoverIcon] = useState(false)
  const [hoverIconPos, setHoverIconPos] = useState({ top: 0, left: 0 })

  const btnRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const hoverIconRef = useRef<HTMLDivElement>(null)
  const hideIconTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipNextOutsideClickRef = useRef(false)
  const mouseOverIconRef = useRef(false)

  const isActive = editor.isActive('tts')

  const selectedMark = characters.find(c => c.id === markId) ?? null
  const allVoices = [...new Set(characters.flatMap(c => c.voices ?? []))]
  const availableVoices = selectedMark ? (selectedMark.voices ?? []) : allVoices

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const cancelHideIcon = () => {
    if (hideIconTimerRef.current) {
      clearTimeout(hideIconTimerRef.current)
      hideIconTimerRef.current = null
    }
  }

  const scheduleHideIcon = () => {
    cancelHideIcon()
    hideIconTimerRef.current = setTimeout(() => {
      hideIconTimerRef.current = null
      setShowHoverIcon(false)
    }, 500)
  }

  const fillFromAttrs = (attrs: Record<string, unknown>) => {
    setMarkId((attrs.characterId as string) ?? '')
    setMarkName((attrs.characterName as string) ?? '')
    setColor((attrs.color as string) ?? PALETTE[0])
    setVoice((attrs.voice as string) ?? '')
    setInflection((attrs.inflection as string) ?? '')
  }

  const openAt = (pos: { top: number; left: number }, side?: 'top' | 'bottom') => {
    setPosition(pos)
    setSideVariant(side ?? null)
    if (editor.isActive('tts')) {
      fillFromAttrs(editor.getAttributes('tts'))
    } else {
      setMarkId('')
      setMarkName('')
      setColor(PALETTE[0])
      setVoice('')
      setInflection('')
    }
    setTab('assign')
    setOpen(true)
  }

  // ── Close on outside click ────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (skipNextOutsideClickRef.current) {
        skipNextOutsideClickRef.current = false
        return
      }
      const target = e.target as Node
      if (!btnRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // ── Hide hover icon when popover closes ──────────────────────────────────────

  useEffect(() => {
    if (!open) {
      cancelHideIcon()
      setShowHoverIcon(false)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Hover over selection → show floating TTS icon ────────────────────────────

  useEffect(() => {
    const editorDom = editor.view.dom

    const handleMouseMove = (e: MouseEvent) => {
      if (!editor.isEditable || open) {
        cancelHideIcon()
        return
      }

      const { from, to } = editor.state.selection
      if (from === to) return

      const hit = editor.view.posAtCoords({ left: e.clientX, top: e.clientY })
      const isOverSelection = hit !== null && hit.pos >= from && hit.pos <= to

      if (isOverSelection) {
        cancelHideIcon()
        const pos = getSelectionPopoverPosition()
        if (pos) {
          setHoverIconPos(pos)
          setShowHoverIcon(true)
        }
      }
    }

    const handleMouseLeave = () => { if (!open && !mouseOverIconRef.current) scheduleHideIcon() }

    editorDom.addEventListener('mousemove', handleMouseMove)
    editorDom.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      editorDom.removeEventListener('mousemove', handleMouseMove)
      editorDom.removeEventListener('mouseleave', handleMouseLeave)
      cancelHideIcon()
    }
  }, [editor, open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Click on existing TTS mark ────────────────────────────────────────────────

  useEffect(() => {
    const editorDom = editor.view.dom
    const handleClick = (e: MouseEvent) => {
      if (!editor.isEditable) return
      const target = (e.target as HTMLElement).closest('span[data-type="tts"]')
      if (!target) return
      e.preventDefault()
      editor.chain().extendMarkRange('tts').run()
      const pos = getSelectionPopoverPosition()
      if (pos) {
        fillFromAttrs(editor.getAttributes('tts'))
        setPosition(pos)
        setTab('assign')
        setOpen(true)
      }
    }
    editorDom.addEventListener('click', handleClick)
    return () => editorDom.removeEventListener('click', handleClick)
  }, [editor]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toolbar button ────────────────────────────────────────────────────────────

  const openFromButton = () => {
    if (open) { setOpen(false); return }
    const pos = getSelectionPopoverPosition() ?? (() => {
      const { from, to } = editor.state.selection
      const start = editor.view.coordsAtPos(from)
      const end = editor.view.coordsAtPos(to)
      return { top: start.top, left: (start.left + end.left) / 2 }
    })()
    openAt(pos)
  }

  // ── Select a mark preset from the Marks tab ───────────────────────────────────

  const selectMark = (mark: TTSMark) => {
    setMarkId(mark.id)
    setMarkName(mark.name)
    const markVoices = mark.voices ?? []
    if (markVoices.length > 0 && !markVoices.includes(voice)) setVoice('')
    setTab('assign')
  }

  // ── Apply / Remove ────────────────────────────────────────────────────────────

  const play = () => {
    const name = markName.trim()
    if (!name || !onPlay) return
    const id = markId || name.toLowerCase().replace(/\s+/g, '-')
    const { from, to } = editor.state.selection
    const text = editor.state.doc.textBetween(from, to, ' ')
    onPlay({ text, characterId: id, characterName: name, voice: voice || null, inflection: inflection || null, color })
  }

  const apply = () => {
    const name = markName.trim()
    if (!name) return
    const id = markId || name.toLowerCase().replace(/\s+/g, '-')
    editor.chain().focus()
      .setMark('tts', { characterId: id, characterName: name, voice: voice || null, inflection: inflection || null, color })
      .run()
    setOpen(false)
  }

  const remove = () => {
    editor.chain().focus().extendMarkRange('tts').unsetMark('tts').run()
    setOpen(false)
  }

  const hasTabs = characters.length > 0

  const openFromHoverIcon = () => {
    cancelHideIcon()
    skipNextOutsideClickRef.current = true
    const iconRect = hoverIconRef.current?.getBoundingClientRect()
    if (iconRect) {
      const isUpperHalf = iconRect.top < window.innerHeight / 2
      const pos = isUpperHalf
        ? { top: iconRect.top, left: iconRect.right + 8 }
        : { top: iconRect.bottom, left: iconRect.right + 8 }
      openAt(pos, isUpperHalf ? 'top' : 'bottom')
    } else {
      openAt(hoverIconPos)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <div ref={btnRef}>
        {showHoverIcon && (
          <div
            ref={hoverIconRef}
            className="magic-text-editor__tts-hover-icon"
            style={{ top: hoverIconPos.top, left: hoverIconPos.left }}
            onMouseEnter={() => { mouseOverIconRef.current = true; cancelHideIcon() }}
            onMouseLeave={() => { mouseOverIconRef.current = false; if (!open) scheduleHideIcon() }}
          >
            <button
              type="button"
              className="magic-text-editor__btn"
              onMouseDown={(e) => { e.preventDefault(); openFromHoverIcon() }}
              title={t.tts.insertTTS}
              aria-label={t.tts.insertTTS}
            >
              <TTSIcon />
            </button>
          </div>
        )}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); openFromButton() }}
          title={t.tts.insertTTS}
          aria-label={t.tts.insertTTS}
          aria-pressed={open}
          className={`magic-text-editor__btn${isActive || open ? ' magic-text-editor__btn--active' : ''}`}
        >
          <TTSIcon />
        </button>
      </div>

      {open && (
        <div
          ref={popoverRef}
          className={`magic-text-editor__link-float magic-text-editor__tts-popover${sideVariant ? ` magic-text-editor__link-float--side-${sideVariant}` : ''}`}
          style={{ top: position.top, left: position.left, ...(sideVariant === 'bottom' ? { transform: 'translateY(-100%)' } : sideVariant === 'top' ? { transform: 'none' } : {}) }}
          role="dialog"
          aria-label={t.tts.popoverAriaLabel}
          onKeyDown={(e) => e.key === 'Escape' && (e.preventDefault(), setOpen(false))}
        >
          {hasTabs && (
            <div className="magic-text-editor__image-tabs">
              <button
                type="button"
                className={`magic-text-editor__image-tab${tab === 'assign' ? ' magic-text-editor__image-tab--active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); setTab('assign') }}
              >
                {t.tts.assignTab}
              </button>
              <button
                type="button"
                className={`magic-text-editor__image-tab${tab === 'marks' ? ' magic-text-editor__image-tab--active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); setTab('marks') }}
              >
                {t.tts.marksTab}
              </button>
            </div>
          )}

          <div className="magic-text-editor__tts-panels">
            {/* Assign panel */}
            <div className={`magic-text-editor__tts-panel${hasTabs && tab !== 'assign' ? ' magic-text-editor__tts-panel--hidden' : ''}`}>
              <div className="magic-text-editor__link-body">
                <div className="magic-text-editor__link-fields">

                  <div className="magic-text-editor__link-field">
                    <label className="magic-text-editor__link-label magic-text-editor__tts-field-label">
                      <TTSIcon />{t.tts.markLabel}
                    </label>
                    <div className="magic-text-editor__tts-mark-row">
                      <input
                        className="magic-text-editor__var-input"
                        placeholder={t.tts.markPlaceholder}
                        value={markName}
                        onChange={e => {
                          setMarkName(e.target.value)
                          if (markId && characters.find(c => c.id === markId)?.name !== e.target.value) {
                            setMarkId('')
                            setVoice('')
                          }
                        }}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), apply())}
                      />
                      <label className="magic-text-editor__tts-color-custom" style={{ background: color } as React.CSSProperties}>
                        <input type="color" value={color} onChange={e => setColor(e.target.value)} className="magic-text-editor__tts-color-input-hidden" />
                      </label>
                    </div>
                  </div>

                  {availableVoices.length > 0 && (
                    <div className="magic-text-editor__link-field">
                      <label className="magic-text-editor__link-label magic-text-editor__tts-field-label">
                        <SpeakerIcon />{t.tts.voiceLabel}
                      </label>
                      <select
                        className="magic-text-editor__var-input"
                        value={voice}
                        onChange={e => setVoice(e.target.value)}
                      >
                        <option value="">{t.tts.voiceSelectDefault}</option>
                        {availableVoices.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {inflections.length > 0 && (
                    <div className="magic-text-editor__link-field">
                      <label className="magic-text-editor__link-label magic-text-editor__tts-field-label">
                        <WavesIcon />{t.tts.inflectionLabel}
                      </label>
                      <select
                        className="magic-text-editor__var-input"
                        value={inflection}
                        onChange={e => setInflection(e.target.value)}
                      >
                        <option value="">{t.tts.inflectionSelectDefault}</option>
                        {inflections.map(infl => (
                          <option key={infl} value={infl}>{infl}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="magic-text-editor__tts-actions">
                  {onPlay && (
                    <button
                      type="button"
                      className={`magic-text-editor__tts-play-btn${playing ? ' magic-text-editor__tts-play-btn--playing' : ''}`}
                      onMouseDown={(e) => { e.preventDefault(); playing ? onStop?.() : play() }}
                      disabled={!playing && !markName.trim()}
                    >
                      {playing ? <><StopIcon />{t.tts.stopButton}</> : <><PlayIcon />{t.tts.playButton}</>}
                    </button>
                  )}
                  <button
                    type="button"
                    className="magic-text-editor__var-add-btn magic-text-editor__tts-apply-btn"
                    onMouseDown={(e) => { e.preventDefault(); apply() }}
                    disabled={!markName.trim()}
                  >
                    <CheckIcon />{t.tts.applyButton}
                  </button>
                </div>
              </div>

              {isActive && (
                <button
                  type="button"
                  className="magic-text-editor__link-remove-btn magic-text-editor__tts-remove-btn"
                  onMouseDown={(e) => { e.preventDefault(); remove() }}
                >
                  <TrashIcon />{t.tts.removeButton}
                </button>
              )}
            </div>

            {/* Marks panel */}
            {hasTabs && (
              <div className={`magic-text-editor__tts-panel${tab !== 'marks' ? ' magic-text-editor__tts-panel--hidden' : ''}`}>
                <div className="magic-text-editor__tts-marks">
                  {characters.map((mark) => (
                    <button
                      key={mark.id}
                      type="button"
                      className="magic-text-editor__tts-mark-btn"
                      onMouseDown={(e) => { e.preventDefault(); selectMark(mark) }}
                    >
                      {mark.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
