// Haritanın köşesine yerleşen, sadece aktif moda özgü sembolleri gösteren
// minimal bir legend. Default kapalı; kullanıcı (i) butonuna tıklayınca
// açılır. Eğitim paneline dönüşmesin diye yalnızca 2-4 satır içerir.

import { useState } from 'react'
import type { ActionMode, GameStage } from '../../game/types'
import type { CardType } from '../../game/cards'

interface LegendEntry {
  glyph: string
  label: string
  tone: string
}

interface MapLegendProps {
  stage: GameStage
  actionMode: ActionMode | null
  pendingCardType: CardType | null
}

function getLegendEntries(
  stage: GameStage,
  actionMode: ActionMode | null,
  pendingCardType: CardType | null,
): LegendEntry[] {
  if (stage === 'CAPITAL_SELECTION') {
    return [
      { glyph: '♛', label: 'Başkent adayı', tone: 'capital-choice' },
      { glyph: '∅', label: 'Seçilemez (yakın)', tone: 'capital-forbidden' },
    ]
  }

  if (pendingCardType) {
    return [
      { glyph: '◈', label: 'Kart hedefi', tone: 'card-targetable' },
    ]
  }

  if (actionMode === 'ANNEX') {
    return [
      { glyph: '•', label: 'Kaynak adayı', tone: 'source-candidate' },
      { glyph: '+', label: 'İlhak hedefi', tone: 'annex-target' },
    ]
  }

  if (actionMode === 'TRANSFER') {
    return [
      { glyph: '•', label: 'Kaynak adayı', tone: 'source-candidate' },
      { glyph: '→', label: 'İntikal hedefi', tone: 'transfer-target' },
    ]
  }

  if (actionMode === 'ATTACK') {
    return [
      { glyph: '•', label: 'Kaynak adayı', tone: 'source-candidate' },
      { glyph: '×', label: 'Saldırı hedefi', tone: 'attack-target' },
    ]
  }

  return [
    { glyph: '★', label: 'Başkent', tone: 'capital' },
  ]
}

export function MapLegend({ stage, actionMode, pendingCardType }: MapLegendProps) {
  const [open, setOpen] = useState(false)
  const entries = getLegendEntries(stage, actionMode, pendingCardType)

  if (stage === 'HOME' || stage === 'SETUP' || stage === 'GAME_OVER') return null

  return (
    <div className={`map-legend ${open ? 'is-open' : ''}`.trim()}>
      <button
        type="button"
        className="map-legend__toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open ? 'Harita göstergesini kapat' : 'Harita göstergesini aç'}
        title="Harita göstergesi"
      >
        <span aria-hidden>{open ? '×' : 'i'}</span>
      </button>

      {open ? (
        <ul className="map-legend__list">
          {entries.map((entry) => (
            <li key={entry.label} className={`map-legend__item map-legend__item--${entry.tone}`}>
              <span className="map-legend__glyph" aria-hidden>
                {entry.glyph}
              </span>
              <span className="map-legend__label">{entry.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
