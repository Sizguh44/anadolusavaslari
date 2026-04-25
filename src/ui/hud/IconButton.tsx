import type { ReactNode } from 'react'

interface IconButtonProps {
  onClick: () => void
  ariaLabel: string
  title?: string
  children: ReactNode
  variant?: 'utility' | 'ghost'
}

/**
 * Küçük utility ikonu — modal kapatma, panel toggle gibi yan eylemler için.
 * Standart `.utility-button` görünümünü kullanır; içinde SVG glyph beklenir.
 */
export function IconButton({
  onClick,
  ariaLabel,
  title,
  children,
  variant = 'utility',
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={variant === 'ghost' ? 'utility-button utility-button--ghost' : 'utility-button'}
      onClick={onClick}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
    >
      {children}
    </button>
  )
}

/** Standart "kapat" (×) glyph'i — IconButton içinde kullanılmak üzere. */
export function CloseGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden
         fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}
