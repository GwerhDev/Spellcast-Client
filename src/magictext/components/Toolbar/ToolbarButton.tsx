import type { ReactNode } from 'react'

interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: ReactNode
}

export function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault() // keep editor focus
        if (!disabled) onClick()
      }}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`magic-text-editor__btn${active ? ' magic-text-editor__btn--active' : ''}`}
    >
      {children}
    </button>
  )
}
