import { useState } from 'react'
import {
  CARD_CATALOG,
  CARD_PRICES,
  CARD_TYPES,
  YATIRIM_MAX_PER_PLAYER,
  type CardDefinition,
  type CardType,
} from '../game/cards'
import type { GameState, PlayerId } from '../game/types'

type Tab = 'INVENTORY' | 'SHOP'

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
  if (definition.targetKind === 'NONE') return 'Hedef yok (kendine)'
  if (definition.targetKind === 'SELF_CITY') return 'Kendi şehrin'
  return 'Rakip şehir'
}

function CardTile({
  definition,
  detail,
  actions,
  badge,
  disabledReason,
}: {
  definition: CardDefinition
  detail?: string
  actions?: React.ReactNode
  badge?: React.ReactNode
  disabledReason?: string | null
}) {
  return (
    <article className="card-tile">
      <div className="card-tile__head">
        <div>
          <p className="section-eyebrow">Kart</p>
          <h3 className="card-tile__title">{definition.name}</h3>
        </div>
        {badge}
      </div>
      <p className="card-tile__desc">{definition.description}</p>
      <dl className="card-tile__meta">
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
      {detail ? <p className="card-tile__hint">{detail}</p> : null}
      {disabledReason ? <p className="card-tile__warn">{disabledReason}</p> : null}
      {actions ? <div className="card-tile__actions">{actions}</div> : null}
    </article>
  )
}

function CardTooltip({ definition }: { definition: CardDefinition }) {
  return (
    <div className="card-tooltip" role="tooltip">
      <strong>{definition.name}</strong>
      <span>{definition.description}</span>
      <span>Hedef: {formatTargetKind(definition)}</span>
      <span>Süre: {definition.duration}</span>
      <span>Kısıt: {definition.usageConstraint}</span>
    </div>
  )
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
  const [tab, setTab] = useState<Tab>('INVENTORY')
  const [hoveredCard, setHoveredCard] = useState<CardType | null>(null)

  const player = state.players[activePlayer]
  const treasury = player.treasury

  const investedCount = player.investedCityIds.length

  function hoverProps(cardType: CardType) {
    return {
      onMouseEnter: () => setHoveredCard(cardType),
      onMouseLeave: () => setHoveredCard((current) => (current === cardType ? null : current)),
      onFocus: () => setHoveredCard(cardType),
      onBlur: () => setHoveredCard((current) => (current === cardType ? null : current)),
    }
  }

  return (
    <div className="overlay-backdrop">
      <div className="overlay-card overlay-card--wide cards-dialog">
        <div className="modal-head">
          <div>
            <p className="section-eyebrow">Kart Arayüzü</p>
            <h2>Kartlar</h2>
          </div>
          <div className="cards-dialog__header-actions">
            {state.pendingCardUse ? (
              <button className="button button--ghost button--compact" onClick={onCancelUse}>
                Kart kullanımını iptal et
              </button>
            ) : null}
            <button className="button button--ghost button--compact" onClick={onClose}>
              Kapat
            </button>
          </div>
        </div>

        <div className="cards-dialog__status">
          <span>
            Kasa: <strong>{treasury}</strong> altın
          </span>
          <span>
            Yatırım kullanılan: <strong>{investedCount}</strong>/{YATIRIM_MAX_PER_PLAYER}
          </span>
          <span>
            Kudret bu tur:{' '}
            <strong>{player.kudretUsedThisTurn ? 'kullanıldı' : 'müsait'}</strong>
          </span>
          <span>
            Ek saldırı hakkı: <strong>{player.bonusAttacksRemaining}</strong>
          </span>
          {state.pendingCardUse ? (
            <span className="cards-dialog__pending">
              Aktif: {CARD_CATALOG[state.pendingCardUse.type].name} için hedef seçiliyor…
            </span>
          ) : null}
        </div>

        <div className="cards-dialog__tabs">
          <button
            className={`tab-button ${tab === 'INVENTORY' ? 'is-active' : ''}`.trim()}
            onClick={() => setTab('INVENTORY')}
          >
            Envanter
          </button>
          <button
            className={`tab-button ${tab === 'SHOP' ? 'is-active' : ''}`.trim()}
            onClick={() => setTab('SHOP')}
          >
            Mağaza
          </button>
        </div>

        {tab === 'INVENTORY' ? (
          <div className="card-grid">
            {CARD_TYPES.map((cardType) => {
              const definition = CARD_CATALOG[cardType]
              const count = player.cards[cardType] ?? 0
              const disabled = count <= 0
              const kudretBlocked = cardType === 'KUDRET' && player.kudretUsedThisTurn
              const yatirimCap = cardType === 'YATIRIM' && investedCount >= YATIRIM_MAX_PER_PLAYER
              const reason = kudretBlocked
                ? 'Bu tur Kudret kartı zaten kullanıldı.'
                : yatirimCap
                  ? 'Oyun boyunca 5 Yatırım hakkınızı kullandınız.'
                  : null
              const isHovered = hoveredCard === cardType

              return (
                <div
                  key={cardType}
                  className="card-grid__item"
                  {...hoverProps(cardType)}
                >
                  <CardTile
                    definition={definition}
                    detail={`Envanter: ${count}`}
                    disabledReason={reason}
                    badge={<span className="card-tile__count">×{count}</span>}
                    actions={
                      <button
                        className="button button--primary button--compact"
                        disabled={disabled || Boolean(reason) || Boolean(state.pendingCardUse)}
                        onClick={() => {
                          if (definition.targetKind === 'NONE') {
                            onUseSelf(cardType)
                          } else {
                            onBeginUse(cardType)
                          }
                        }}
                      >
                        Kullan
                      </button>
                    }
                  />
                  {isHovered ? <CardTooltip definition={definition} /> : null}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card-grid">
            {CARD_TYPES.map((cardType) => {
              const definition = CARD_CATALOG[cardType]
              const price = CARD_PRICES[cardType]
              const tooExpensive = treasury < price
              const isHovered = hoveredCard === cardType

              return (
                <div
                  key={cardType}
                  className="card-grid__item"
                  {...hoverProps(cardType)}
                >
                  <CardTile
                    definition={definition}
                    detail={`Fiyat: ${price} altın`}
                    disabledReason={tooExpensive ? 'Kasa yetersiz.' : null}
                    actions={
                      <button
                        className="button button--secondary button--compact"
                        disabled={tooExpensive}
                        onClick={() => onBuy(cardType)}
                      >
                        Satın Al
                      </button>
                    }
                  />
                  {isHovered ? <CardTooltip definition={definition} /> : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
