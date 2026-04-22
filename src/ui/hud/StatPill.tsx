import type { CSSProperties, ReactNode } from 'react'

interface StatPillProps {
  label: string
  value: ReactNode
  meta?: ReactNode
  accent?: string
  interactive?: boolean
  active?: boolean
  onClick?: () => void
}

export function StatPill({
  label,
  value,
  meta,
  accent,
  interactive = false,
  active = false,
  onClick,
}: StatPillProps) {
  const style = accent ? ({ '--accent': accent } as CSSProperties) : undefined
  const className = [
    'stat-pill',
    accent ? 'has-accent' : '',
    interactive ? 'is-interactive' : '',
    active ? 'is-active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (onClick) {
    return (
      <button type="button" className={className} style={style} onClick={onClick}>
        <span className="stat-pill__label">{label}</span>
        <strong className="stat-pill__value">{value}</strong>
        {meta ? <span className="stat-pill__meta">{meta}</span> : null}
      </button>
    )
  }

  return (
    <div className={className} style={style}>
      <span className="stat-pill__label">{label}</span>
      <strong className="stat-pill__value">{value}</strong>
      {meta ? <span className="stat-pill__meta">{meta}</span> : null}
    </div>
  )
}
