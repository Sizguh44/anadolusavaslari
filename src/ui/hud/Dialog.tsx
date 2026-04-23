import { useRef, type ReactNode } from 'react'
import { useFocusTrap, useInertBackground } from './useFocusTrap'

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
 * - açılışta odak ilk odaklanabilir elemana (yoksa container'a) kayar
 * - Tab/Shift+Tab modal sınırları içinde hapsedilir (focus trap)
 * - modal açıkken arka plan kardeş DOM ağacı inert — ekran okuyucu ve klavye
 *   arka plana erişemez
 * - kapanışta odak modal açılmadan önce odaklı olan elemana döner
 */
export function Dialog({ className = '', children, labelledBy, ariaLabel }: DialogProps) {
  const cardRef = useRef<HTMLDivElement | null>(null)

  useFocusTrap(cardRef)
  useInertBackground(cardRef)

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
