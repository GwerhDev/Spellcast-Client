import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useState, useRef, useEffect } from 'react'
import type { Translations } from '../i18n/types'
import { en } from '../i18n/locales/en'

type VariableNodeTranslations = Translations['variableNode']
type DateRange = { from: string; to: string }

const parseRange = (val: string): DateRange => {
  try { const p = JSON.parse(val); return { from: p.from ?? '', to: p.to ?? '' } }
  catch { return { from: '', to: '' } }
}

const formatRangeDisplay = (val: string, t: VariableNodeTranslations) => {
  const { from, to } = parseRange(val)
  if (from && to) return `${from} → ${to}`
  if (from) return `${t.fromLabel} ${from}`
  if (to) return `${t.toLabel} ${to}`
  return ''
}

function VariableNodeView({ node, updateAttributes, editor, extension }: NodeViewProps) {
  const t: VariableNodeTranslations = extension.options.translations ?? en.variableNode
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(node.attrs.value ?? '')
  const [draftFrom, setDraftFrom] = useState(() => parseRange(node.attrs.value ?? '').from)
  const [draftTo, setDraftTo] = useState(() => parseRange(node.attrs.value ?? '').to)
  const [isEditable, setIsEditable] = useState(editor.isEditable)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const selectRef = useRef<HTMLSelectElement>(null)
  const rangeWrapRef = useRef<HTMLSpanElement>(null)

  const varType = node.attrs.type ?? 'text'
  const isSelect = varType === 'select'
  const isDateRange = varType === 'daterange'
  const options: string[] = node.attrs.options ?? []

  useEffect(() => {
    const sync = () => setIsEditable(editor.isEditable)
    editor.on('update', sync)
    return () => { editor.off('update', sync) }
  }, [editor])

  useEffect(() => {
    if (editing) { inputRef.current?.select(); textareaRef.current?.focus(); selectRef.current?.focus() }
  }, [editing])

  useEffect(() => { if (!isEditable && editing) setEditing(false) }, [isEditable, editing])

  const confirm = () => { updateAttributes({ value: draft.trim() }); setEditing(false) }
  const confirmRange = () => { updateAttributes({ value: JSON.stringify({ from: draftFrom, to: draftTo }) }); setEditing(false) }
  const cancel = () => { setDraft(node.attrs.value ?? ''); setEditing(false) }
  const cancelRange = () => { const { from, to } = parseRange(node.attrs.value ?? ''); setDraftFrom(from); setDraftTo(to); setEditing(false) }

  const startEditing = () => {
    if (!isEditable) return
    if (isDateRange) { const { from, to } = parseRange(node.attrs.value ?? ''); setDraftFrom(from); setDraftTo(to) }
    setEditing(true)
  }

  const hasFill = Boolean(node.attrs.value)
  const chipClass = ['magic-text-editor__variable-chip', hasFill ? 'magic-text-editor__variable-chip--filled' : '', !isEditable ? 'magic-text-editor__variable-chip--readonly' : ''].filter(Boolean).join(' ')
  const displayValue = hasFill ? (isDateRange ? formatRangeDisplay(node.attrs.value, t) : node.attrs.value) : '[' + node.attrs.label + ']'
  const chipTitle = hasFill ? t.variableTitle(node.attrs.label, displayValue) : isEditable ? t.clickToFill(node.attrs.label) : node.attrs.label

  return (
    <NodeViewWrapper as="span" className="magic-text-editor__variable" contentEditable={false}>
      {editing && isEditable ? (
        isSelect ? (
          <select ref={selectRef} className="magic-text-editor__variable-edit" value={draft} onChange={e => setDraft(e.target.value)} onBlur={confirm} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); confirm() } if (e.key === 'Escape') { e.preventDefault(); cancel() } }}>
            <option value="">— {node.attrs.label} —</option>
            {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : isDateRange ? (
          <span ref={rangeWrapRef} className="magic-text-editor__variable-daterange" onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); cancelRange() } }}>
            <label className="magic-text-editor__variable-daterange-field"><span>{t.fromLabel}</span><input type="date" className="magic-text-editor__variable-edit" value={draftFrom} onChange={e => setDraftFrom(e.target.value)} /></label>
            <label className="magic-text-editor__variable-daterange-field"><span>{t.toLabel}</span><input type="date" className="magic-text-editor__variable-edit" value={draftTo} onChange={e => setDraftTo(e.target.value)} /></label>
            <button type="button" className="magic-text-editor__variable-daterange-confirm" onMouseDown={(e) => { e.preventDefault(); confirmRange() }}>✓</button>
            <button type="button" className="magic-text-editor__variable-daterange-cancel" onMouseDown={(e) => { e.preventDefault(); cancelRange() }}>✕</button>
          </span>
        ) : varType === 'textarea' ? (
          <textarea ref={textareaRef} className="magic-text-editor__variable-edit magic-text-editor__variable-edit--textarea" value={draft} onChange={e => setDraft(e.target.value)} onBlur={confirm} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); cancel() } }} placeholder={node.attrs.label} rows={3} />
        ) : (
          <input ref={inputRef} className="magic-text-editor__variable-edit" type={varType === 'date' ? 'date' : 'text'} value={draft} onChange={e => setDraft(e.target.value)} onBlur={confirm} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); confirm() } if (e.key === 'Escape') { e.preventDefault(); cancel() } }} placeholder={node.attrs.label} size={varType === 'date' ? undefined : Math.max((draft || node.attrs.label).length, 4)} />
        )
      ) : (
        <span className={chipClass} onClick={startEditing} title={chipTitle}>{displayValue}</span>
      )}
    </NodeViewWrapper>
  )
}

export const VariableExtension = Node.create<{ translations: VariableNodeTranslations }>({
  name: 'variable',
  group: 'inline',
  inline: true,
  atom: true,
  addOptions() { return { translations: en.variableNode } },
  addAttributes() {
    return {
      label: { default: null },
      value: { default: '' },
      type: { default: 'text' },
      options: { default: [], parseHTML: el => { const raw = el.getAttribute('data-options'); try { return raw ? JSON.parse(raw) : [] } catch { return [] } }, renderHTML: attrs => ({ 'data-options': JSON.stringify(attrs.options ?? []) }) },
    }
  },
  parseHTML() { return [{ tag: 'span[data-type="variable"]' }] },
  renderHTML({ HTMLAttributes }) { return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'variable' })] },
  addNodeView() { return ReactNodeViewRenderer(VariableNodeView) },
})
