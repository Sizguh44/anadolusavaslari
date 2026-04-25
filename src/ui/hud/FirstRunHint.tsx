import { useState } from 'react'
import type { GameStage } from '../../game/types'

const STORAGE_KEY = 'anadolu-stratejisi-onboarding-v1'
const SECTIONS = ['capital', 'first-play'] as const
type Section = (typeof SECTIONS)[number]

/**
 * Tek seferlik bağlamsal yönlendirme. Yalnızca ilk oyunda görünür; oyuncu
 * kapatınca veya ilgili faz geçince localStorage'a "okundu" yazılır.
 *
 * Tam ekran tutorial DEĞİL — yalnızca başkent seçimi ve ilk PLAYING turunda
 * tek satırlık nazik yönlendirme. Kapanış davranışı tamamen oyuncuda.
 */
function readSeen(): Set<Section> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((value): value is Section => SECTIONS.includes(value as Section)))
    }
  } catch {
    /* ignore */
  }
  return new Set()
}

function writeSeen(seen: Set<Section>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]))
  } catch {
    /* ignore */
  }
}

interface FirstRunHintProps {
  stage: GameStage
  /** PLAYING içinde tur numarası — sadece ilk turda gösterilir. */
  turn: number
}

function getSection(stage: GameStage, turn: number): Section | null {
  if (stage === 'CAPITAL_SELECTION') return 'capital'
  if (stage === 'PLAYING' && turn === 1) return 'first-play'
  return null
}

function getMessage(section: Section): { title: string; body: string } {
  if (section === 'capital') {
    return {
      title: 'İlk başkentini seç',
      body: 'Sahipsiz bir şehre tıkla; sağ alttaki Başkent Yap ile onayla. Merkez illeri hızlı genişler, kıyı/kenar daha kolay savunulur.',
    }
  }
  return {
    title: 'İlk turun',
    body: 'Kendi şehrini seç → açılan panelden İlhak / İntikal / Saldırı seç. Tur sonunda kasandaki vergi otomatik toplanır.',
  }
}

export function FirstRunHint({ stage, turn }: FirstRunHintProps) {
  const [seen, setSeen] = useState<Set<Section>>(() => readSeen())
  const section = getSection(stage, turn)

  // Render-time derivation: bölüm değişince dismiss bayrağı sıfırlanır.
  const [trackedSection, setTrackedSection] = useState<Section | null>(section)
  const [dismissed, setDismissed] = useState(false)

  if (section !== trackedSection) {
    setTrackedSection(section)
    setDismissed(false)
  }

  if (!section) return null
  if (seen.has(section)) return null
  if (dismissed) return null

  const message = getMessage(section)

  const close = () => {
    const next = new Set(seen)
    next.add(section)
    setSeen(next)
    writeSeen(next)
    setDismissed(true)
  }

  return (
    <aside className="first-run-hint" role="note" aria-label={message.title}>
      <div className="first-run-hint__body">
        <strong>{message.title}</strong>
        <span>{message.body}</span>
      </div>
      <button
        type="button"
        className="first-run-hint__close"
        onClick={close}
        aria-label="İpucunu kapat"
        title="İpucunu kapat"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden
             fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>
    </aside>
  )
}
