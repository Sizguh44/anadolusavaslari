import { useRef } from 'react'
import {
  CARD_CATALOG,
  CARD_PRICES,
  CARD_TYPES,
  YATIRIM_MAX_PER_PLAYER,
  type CardDefinition,
  type CardType,
} from '../game/cards'
import type { GameState, PlayerId } from '../game/types'
import { useFocusTrap, useInertBackground } from './hud/useFocusTrap'

interface CardsDialogProps {
  state: GameState
  activePlayer: PlayerId
  onBuy: (cardType: CardType) => void
  onBeginUse: (cardType: CardType) => void
  onUseSelf: (cardType: CardType) => void
  onCancelUse: () => void
  onClose: () => void
}

function formatTargetKind(definition: CardDefinition): string {
  if (definition.targetKind === 'NONE') return 'Kendine'
  if (definition.targetKind === 'SELF_CITY') return 'Kendi şehrin'
  return 'Rakip şehir'
}

export function CardsDialog({
  state,
  activePlayer,
  onBuy,
  onBeginUse,
  onUseSelf,
  onCancelUse,
  onClose,
}: CardsDialogProps) {
  const player = state.players[activePlayer]
  const treasury = player.treasury
  const investedCount = player.investedCityIds.length
  const pendingType = state.pendingCardUse?.type ?? null
  const panelRef = useRef<HTMLDivElement | null>(null)
  useFocusTrap(panelRef)
  useInertBackground(panelRef)

  return (
    <div className="overlay-backdrop">
      <div
        ref={panelRef}
        className="cards-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Kart arayüzü"
        tabIndex={-1}
      >
        <header className="cards-panel__head">
          <div className="cards-panel__title">
            <p className="section-eyebrow">Strateji Kartları</p>
            <h2>Kartlar</h2>
          </div>
          <div className="cards-panel__stats">
            <span>
              Kasa <strong>{treasury}</strong>
            </span>
            <span>
              Yatırım <strong>{investedCount}</strong>/{YATIRIM_MAX_PER_PLAYER}
            </span>
            <span>
              Kudret <strong>{player.kudretUsedThisTurn ? 'kullanıldı' : 'müsait'}</strong>
            </span>
            <span>
              Ek saldırı <strong>{player.bonusAttacksRemaining}</strong>
            </span>
          </div>
          <div className="cards-panel__actions">
            {pendingType ? (
              <button className="button button--ghost button--compact" onClick={onCancelUse}>
                İptal
              </button>
            ) : null}
            <button className="button button--ghost button--compact" onClick={onClose}>
              Kapat
            </button>
          </div>
        </header>

        {pendingType ? (
          <div className="cards-panel__pending">
            {CARD_CATALOG[pendingType].name} için hedefi haritadan seç.
          </div>
        ) : null}

        <div className="cards-panel__grid">
          {CARD_TYPES.map((cardType) => {
            const definition = CARD_CATALOG[cardType]
            const count = player.cards[cardType] ?? 0
            const price = CARD_PRICES[cardType]
            const kudretBlocked = cardType === 'KUDRET' && player.kudretUsedThisTurn
            const yatirimCap = cardType === 'YATIRIM' && investedCount >= YATIRIM_MAX_PER_PLAYER
            const useBlocked = count <= 0 || kudretBlocked || yatirimCap || Boolean(pendingType)
            const buyBlocked = treasury < price
            const statusNote = kudretBlocked
              ? 'Bu tur kullanıldı.'
              : yatirimCap
                ? '5 yatırım hakkı dolu.'
                : null

            return (
              <article key={cardType} className="card-column">
                <div className="card-column__head">
                  <h3>{definition.name}</h3>
                  <span className="card-column__count" data-empty={count === 0 ? 'true' : undefined}>
                    ×{count}
                  </span>
                </div>

                <p className="card-column__desc">{definition.description}</p>

                <dl className="card-column__meta">
                  <div>
                    <dt>Hedef</dt>
                    <dd>{formatTargetKind(definition)}</dd>
                  </div>
                  <div>
                    <dt>Süre</dt>
                    <dd>{definition.duration}</dd>
                  </div>
                  <div>
                    <dt>Kısıt</dt>
                    <dd>{definition.usageConstraint}</dd>
                  </div>
                </dl>

                {statusNote ? <p className="card-column__warn">{statusNote}</p> : null}

                <div className="card-column__cta">
                  <button
                    className="button button--primary button--compact"
                    disabled={useBlocked}
                    onClick={() => {
                      if (definition.targetKind === 'NONE') onUseSelf(cardType)
                      else onBeginUse(cardType)
                    }}
                  >
                    Kullan
                  </button>
                  <button
                    className="button button--secondary button--compact"
                    disabled={buyBlocked}
                    onClick={() => onBuy(cardType)}
                  >
                    Al · {price}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
