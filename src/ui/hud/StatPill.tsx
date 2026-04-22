import type { CSSProperties, ReactNode } from 'react'

interface StatPillProps {
  label: string
  value: ReactNode
  meta?: ReactNode
  accent?: string
  interactive?: boolean
  active?: boolean
  tone?: 'neutral' | 'alert'
  title?: string
  ariaLabel?: string
  onClick?: () => void
}

export function StatPill({
  label,
  value,
  meta,
  accent,
  interactive = false,
  active = false,
  tone = 'neutral',
  title,
  ariaLabel,
  onClick,
}: StatPillProps) {
  const style = accent ? ({ '--accent': accent } as CSSProperties) : undefined
  const className = [
    'stat-pill',
    accent ? 'has-accent' : '',
    interactive ? 'is-interactive' : '',
    active ? 'is-active' : '',
    tone === 'alert' ? 'is-alert' : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        style={style}
        onClick={onClick}
        title={title}
        aria-label={ariaLabel}
      >
        <span className="stat-pill__label">{label}</span>
        <strong className="stat-pill__value">{value}</strong>
        {meta ? <span className="stat-pill__meta">{meta}</span> : null}
      </button>
    )
  }

  return (
    <div className={className} style={style} title={title}>
      <span className="stat-pill__label">{label}</span>
      <strong className="stat-pill__value">{value}</strong>
      {meta ? <span className="stat-pill__meta">{meta}</span> : null}
    </div>
  )
}
