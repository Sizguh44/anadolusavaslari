import { Dialog } from './Dialog'
import { getMatchSummary, getVictoryNarrative } from '../../game/ui'
import type { GameState, PlayerId } from '../../game/types'

interface VictoryDialogProps {
  state: GameState
  onRematch: () => void
  onNewGame: () => void
  onHome: () => void
}

/**
 * Maç sonu özet kartı. Kazanan adı + tek satır dramatik özet + süre +
 * 3 kompakt karşılaştırma satırı + 3 net aksiyon (Rövanş / Yeni Savaş /
 * Ana Sayfa).
 *
 * Kazanan rengiyle uyumlu hafif vurgu için `victory-card--p1|p2` modifier'ı
 * kart bordürünü ve glow tonunu ayarlar (CSS'te tanımlı).
 */
export function VictoryDialog({ state, onRematch, onNewGame, onHome }: VictoryDialogProps) {
  if (state.stage !== 'GAME_OVER' || !state.winner || !state.victorySummary) {
    return null
  }

  const winner: PlayerId = state.winner
  const summary = getMatchSummary(state)
  const narrative = getVictoryNarrative(state)
  const winnerName = state.playerNames[winner]
  const loserName = state.playerNames[winner === 'P1' ? 'P2' : 'P1']

  return (
    <Dialog
      className={`victory-card victory-card--${winner.toLowerCase()}`}
      ariaLabel={`Savaş sonu — ${winnerName} kazandı`}
    >
      <p className="section-eyebrow">Büyük Zafer</p>
      <h2 className="victory-card__winner">{winnerName}</h2>
      <p className="victory-card__lead">{narrative}</p>

      <p className="victory-card__duration">
        <strong>{summary.totalRounds}</strong> raund
        <span className="victory-card__duration-sep" aria-hidden>·</span>
        <strong>{summary.totalTurns}</strong> hamle
      </p>

      <div className="victory-card__compare" aria-label="Maç özeti">
        <div className="victory-card__compare-head">
          <span />
          <span className="victory-card__player victory-card__player--p1">{state.playerNames.P1}</span>
          <span className="victory-card__player victory-card__player--p2">{state.playerNames.P2}</span>
        </div>
        {summary.stats.map((row) => (
          <div key={row.label} className="victory-card__compare-row">
            <span className="victory-card__compare-label">{row.label}</span>
            <span className="victory-card__compare-value victory-card__compare-value--p1">{row.p1}</span>
            <span className="victory-card__compare-value victory-card__compare-value--p2">{row.p2}</span>
          </div>
        ))}
      </div>

      <div className="victory-card__actions">
        <button
          className="button button--primary"
          onClick={onRematch}
          title={`${winnerName} ve ${loserName} ile rövanş`}
        >
          Rövanş
        </button>
        <button className="button button--secondary" onClick={onNewGame}>
          Yeni Savaş
        </button>
        <button className="button button--ghost" onClick={onHome}>
          Ana Sayfa
        </button>
      </div>
    </Dialog>
  )
}
