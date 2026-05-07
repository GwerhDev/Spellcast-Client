import { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import type { Variable, VariableType } from '../../types'
import { VariableIcon } from './icons'
import { useTranslations } from '../../i18n'

interface Props {
  editor: Editor
  variables?: Variable[]
  onVariableAdd?: (variable: Variable) => void
}

export function VariableDropdown({ editor, variables = [], onVariableAdd }: Props) {
  const t = useTranslations()

  const VARIABLE_TYPES: { value: VariableType; label: string }[] = [
    { value: 'text', label: t.variables.typeLabels.text },
    { value: 'textarea', label: t.variables.typeLabels.textarea },
    { value: 'select', label: t.variables.typeLabels.select },
    { value: 'date', label: t.variables.typeLabels.date },
    { value: 'daterange', label: t.variables.typeLabels.daterange },
  ]

  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'list' | 'add'>('list')
  const [customVars, setCustomVars] = useState<Variable[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState<VariableType>('text')
  const [newOptions, setNewOptions] = useState<string[]>([])
  const [newOption, setNewOption] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) {
      setView('list')
      setNewLabel('')
      setNewType('text')
      setNewOptions([])
      setNewOption('')
    }
  }, [open])

  const insert = (variable: Variable) => {
    editor.chain().focus().insertContent({
      type: 'variable',
      attrs: { label: variable.label, value: '', type: variable.type ?? 'text', options: variable.options ?? [] },
    }).run()
    setOpen(false)
  }

  const addOption = () => {
    const trimmed = newOption.trim()
    if (!trimmed || newOptions.includes(trimmed)) return
    setNewOptions(prev => [...prev, trimmed])
    setNewOption('')
  }

  const removeOption = (index: number) => {
    setNewOptions(prev => prev.filter((_, i) => i !== index))
  }

  const addCustom = () => {
    if (!newLabel.trim()) return
    const variable: Variable = {
      label: newLabel.trim(),
      type: newType,
      options: newType === 'select' ? newOptions : undefined,
    }
    setCustomVars(prev => [...prev, variable])
    onVariableAdd?.(variable)
    insert(variable)
  }

  const allVars = [...variables, ...customVars]

  return (
    <div className="magic-text-editor__var-wrap" ref={wrapRef}>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault()
          setOpen(o => !o)
        }}
        title={t.variables.insertVariable}
        aria-label={t.variables.insertVariable}
        aria-pressed={open}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`magic-text-editor__btn${open ? ' magic-text-editor__btn--active' : ''}`}
      >
        <VariableIcon />
      </button>

      {open && (
        <div className="magic-text-editor__var-dropdown" role="dialog" aria-label={t.variables.pickerAriaLabel}>
          {view === 'list' ? (
            <ul className="magic-text-editor__var-list" role="listbox">
              {allVars.map((v, i) => (
                <li key={i} role="option">
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); insert(v) }}
                    className="magic-text-editor__var-btn"
                  >
                    {v.label}
                  </button>
                </li>
              ))}
              <li role="option">
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setView('add') }}
                  className="magic-text-editor__var-btn magic-text-editor__var-btn--new"
                >
                  {t.variables.addCustomVariable}
                </button>
              </li>
            </ul>
          ) : (
            <div className="magic-text-editor__var-new">
              <div className="magic-text-editor__var-new-header">
                <button
                  type="button"
                  className="magic-text-editor__var-back-btn"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setView('list') }}
                  aria-label={t.variables.backAriaLabel}
                >
                  {t.variables.back}
                </button>
                <span className="magic-text-editor__var-new-title">{t.variables.newVariableTitle}</span>
              </div>
              <div className="magic-text-editor__var-new-body">
                <input
                  className="magic-text-editor__var-input"
                  placeholder={t.variables.namePlaceholder}
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addCustom() }}
                  autoFocus
                />
                <select
                  className="magic-text-editor__var-type-select"
                  value={newType}
                  onChange={e => { setNewType(e.target.value as VariableType); setNewOptions([]); setNewOption('') }}
                >
                  {VARIABLE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>

                {newType === 'select' && (
                  <div className="magic-text-editor__var-options">
                    {newOptions.length > 0 && (
                      <ul className="magic-text-editor__var-options-list">
                        {newOptions.map((opt, i) => (
                          <li key={i} className="magic-text-editor__var-option-item">
                            <span>{opt}</span>
                            <button
                              type="button"
                              className="magic-text-editor__var-option-remove"
                              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); removeOption(i) }}
                              aria-label={t.variables.removeOption(opt)}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="magic-text-editor__var-option-add">
                      <input
                        className="magic-text-editor__var-input"
                        placeholder={t.variables.addOptionPlaceholder}
                        value={newOption}
                        onChange={e => setNewOption(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption() } }}
                      />
                      <button
                        type="button"
                        className="magic-text-editor__var-add-btn"
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); addOption() }}
                      >
                        {t.variables.addOptionButton}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="magic-text-editor__var-add-btn"
                  onMouseDown={(e) => { e.preventDefault(); addCustom() }}
                >
                  {t.variables.addButton}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
