// Harita üzerindeki kalıcı köşe butonları.
// Soldaki panel (menüler) ile sağdaki panel (tur sonu + onay) sınırları
// App.tsx orkestrasyonundan ayrık tutulur; ama dispatch / SFX çağrı yeri
// değişmez — yalnızca UI yerleşimini sarmalar.

import type { ActionMode, GameStage } from '../../game/types'

interface BoardCornerActionsProps {
  stage: GameStage
  actionMode: ActionMode | null
  confirmReady: boolean
  confirmLabel: string
  onOpenMenu: () => void
  onOpenCards: () => void
  onOpenLog: () => void
  onClear: () => void
  onEndTurn: () => void
  onConfirm: () => void
}

export function BoardCornerActions({
  stage,
  actionMode,
  confirmReady,
  confirmLabel,
  onOpenMenu,
  onOpenCards,
  onOpenLog,
  onClear,
  onEndTurn,
  onConfirm,
}: BoardCornerActionsProps) {
  if (stage === 'GAME_OVER') {
    return null
  }

  const showConfirm = stage === 'CAPITAL_SELECTION' || Boolean(actionMode)
  const showEndTurn = stage === 'PLAYING'

  return (
    <>
      <div className="corner-actions corner-actions--secondary">
        <button className="button button--ghost button--compact" onClick={onClear}>
          Temizle
        </button>
        <button className="button button--ghost button--compact" onClick={onOpenCards}>
          Kartlar
        </button>
        <button className="button button--ghost button--compact" onClick={onOpenLog}>
          Günlük
        </button>
        <button className="button button--ghost button--compact" onClick={onOpenMenu}>
          Menü
        </button>
      </div>

      <div className="corner-actions corner-actions--primary">
        {showEndTurn ? (
          <button className="button button--ghost corner-button" onClick={onEndTurn}>
            Turu Bitir
          </button>
        ) : null}
        {showConfirm ? (
          <button
            className="button button--primary corner-button"
            onClick={onConfirm}
            disabled={!confirmReady}
          >
            {confirmLabel}
          </button>
        ) : null}
      </div>
    </>
  )
}
