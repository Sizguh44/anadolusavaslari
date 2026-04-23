import { useEffect, type RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Modal içindeki klavye odağını hapseder. Tab / Shift+Tab modal sınırları
 * içinde döngü yapar; dışarıya sızmaz. Açılışta ilk odaklanabilir elemana
 * geçer (yoksa container'a). Kapanışta önceki odak elemanına geri döner.
 *
 * Etkin olduğu sürece modal dışı DOM'a `inert` uygulamak için
 * `inertSiblings` ayrıca kullanılabilir (şu an Dialog bileşeni çağırıyor).
 */
export function useFocusTrap<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  enabled: boolean = true,
) {
  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    // Başlangıç odağı: modalda zaten odaklı eleman varsa onu bozma; yoksa
    // ilk odaklanabilir elemana, o da yoksa container'ın kendisine odaklan.
    if (!container.contains(document.activeElement)) {
      const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      if (firstFocusable) {
        firstFocusable.focus({ preventScroll: true })
      } else {
        container.focus({ preventScroll: true })
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab') return
      const liveContainer = containerRef.current
      if (!liveContainer) return

      const focusables = Array.from(
        liveContainer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null)

      if (focusables.length === 0) {
        event.preventDefault()
        liveContainer.focus({ preventScroll: true })
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (event.shiftKey) {
        if (active === first || !liveContainer.contains(active)) {
          event.preventDefault()
          last.focus({ preventScroll: true })
        }
      } else {
        if (active === last) {
          event.preventDefault()
          first.focus({ preventScroll: true })
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus({ preventScroll: true })
      }
    }
  }, [containerRef, enabled])
}

/**
 * Verilen eleman dışındaki kardeş DOM ağacına `inert` uygular — screen reader
 * ve klavye erişimini modal dışında keser. Modal kapanınca tüm kardeşler eski
 * durumuna döner.
 */
export function useInertBackground(containerRef: RefObject<HTMLElement | null>, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return

    const root = container.parentElement?.parentElement ?? document.body
    const touched: HTMLElement[] = []

    for (const sibling of Array.from(root.children)) {
      if (!(sibling instanceof HTMLElement)) continue
      if (sibling.contains(container)) continue
      if (sibling.hasAttribute('inert')) continue
      sibling.setAttribute('inert', '')
      touched.push(sibling)
    }

    return () => {
      for (const el of touched) el.removeAttribute('inert')
    }
  }, [containerRef, enabled])
}
