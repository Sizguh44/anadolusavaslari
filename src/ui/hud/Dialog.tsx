import type { ReactNode } from 'react'

interface DialogProps {
  className?: string
  children: ReactNode
}

export function Dialog({ className = '', children }: DialogProps) {
  return (
    <div className="overlay-backdrop">
      <div className={`overlay-card ${className}`.trim()}>{children}</div>
    </div>
  )
}
