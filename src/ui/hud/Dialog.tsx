import { useEffect, useRef, type ReactNode } from 'react'

interface DialogProps {
  className?: string
  children: ReactNode
  /**
   * Modal başlığını etiketleyen element id'si. Boş bırakılırsa fallback
   * aria-label "İletişim kutusu" kullanılır.
   */
  labelledBy?: string
  /** Ekran okuyucuya açıklama — aria-labelledby yoksa bu devreye girer. */
  ariaLabel?: string
}

/**
 * Tüm overlay modalları için ortak, erişilebilir kabuk.
 * - role=dialog + aria-modal=true
 * - açılışta odak bu yüzeye kayar (screen reader modal bildirimi alır)
 * - kapanışta odağı çağıranın sağlamasına bırakırız (ESC/buton akışları zaten var)
 */
export function Dialog({ className = '', children, labelledBy, ariaLabel }: DialogProps) {
  const cardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    // İçinde zaten odaklanmış bir eleman varsa onu bozmayız.
    if (card.contains(document.activeElement)) return
    card.focus({ preventScroll: true })
  }, [])

  return (
    <div className="overlay-backdrop">
      <div
        ref={cardRef}
        className={`overlay-card ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : ariaLabel ?? 'İletişim kutusu'}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  )
}
