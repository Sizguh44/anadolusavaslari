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
  /** Tur sonu en doğal aksiyonsa buton primary tonda parlasın (ghost yerine). */
  endTurnPrimary?: boolean
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
  endTurnPrimary = false,
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
  // İki birincil buton eş zamanlı parlamasın: aktif aksiyon onaylama bekliyorsa
  // tur sonu görsel olarak geri çekilir.
  const endTurnTone = endTurnPrimary && !showConfirm ? 'primary' : 'ghost'

  return (
    <>
      <div className="corner-actions corner-actions--secondary">
        <button
          className="button button--ghost button--compact"
          onClick={onClear}
          title="Seçimi temizle (ESC)"
          aria-label="Seçimi temizle"
        >
          Temizle
        </button>
        <button
          className="button button--ghost button--compact"
          onClick={onOpenCards}
          title="Strateji kartları"
        >
          Kartlar
        </button>
        <button
          className="button button--ghost button--compact"
          onClick={onOpenLog}
          title="Olay günlüğü"
        >
          Günlük
        </button>
        <button
          className="button button--ghost button--compact"
          onClick={onOpenMenu}
          title="Oyun menüsü"
        >
          Menü
        </button>
      </div>

      <div className="corner-actions corner-actions--primary">
        {showEndTurn ? (
          <button
            className={`button button--${endTurnTone} corner-button`}
            onClick={onEndTurn}
            title="Turu bitir"
            aria-label="Turu bitir"
          >
            Turu Bitir
          </button>
        ) : null}
        {showConfirm ? (
          <button
            className="button button--primary corner-button"
            onClick={onConfirm}
            disabled={!confirmReady}
            title={confirmLabel}
            aria-label={confirmLabel}
          >
            {confirmLabel}
          </button>
        ) : null}
      </div>
    </>
  )
}
