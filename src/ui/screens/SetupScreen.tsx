import { useState } from 'react'
import { audioManager } from '../../engine/audioManager'
import { DEFAULT_PLAYER_NAMES } from '../../game/state'
import type { PlayerId } from '../../game/types'

interface SetupScreenProps {
  onStart: (names: Record<PlayerId, string>) => void
  onCancel: () => void
}

export function SetupScreen({ onStart, onCancel }: SetupScreenProps) {
  const [p1Name, setP1Name] = useState(DEFAULT_PLAYER_NAMES.P1)
  const [p2Name, setP2Name] = useState(DEFAULT_PLAYER_NAMES.P2)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    onStart({
      P1: p1Name.trim() || DEFAULT_PLAYER_NAMES.P1,
      P2: p2Name.trim() || DEFAULT_PLAYER_NAMES.P2,
    })
  }

  return (
    <div className="overlay-backdrop">
      <div className="overlay-card setup-card">
        <header className="setup-card__head">
          <div>
            <p className="section-eyebrow">Komutanlık Kurulumu</p>
            <h2>Kuvvetlerinizi adlandırın</h2>
          </div>
          <button type="button" className="button button--ghost button--compact" onClick={onCancel}>
            Vazgeç
          </button>
        </header>

        <p className="setup-card__hint">
          İsimler boş bırakılırsa varsayılanlar atanır. Sonraki adımda harita üzerinden başkentlerinizi seçeceksiniz.
        </p>

        <form className="setup-form" onSubmit={handleSubmit}>
          <div className="setup-row">
            <label className="setup-label" htmlFor="name-p1">
              <span className="setup-label__dot setup-label__dot--p1" />
              Mavi Komutanlık
            </label>
            <input
              id="name-p1"
              className="setup-input"
              type="text"
              value={p1Name}
              maxLength={32}
              placeholder={DEFAULT_PLAYER_NAMES.P1}
              onChange={(e) => setP1Name(e.target.value)}
              autoFocus
            />
          </div>
          <div className="setup-row">
            <label className="setup-label" htmlFor="name-p2">
              <span className="setup-label__dot setup-label__dot--p2" />
              Kırmızı Komutanlık
            </label>
            <input
              id="name-p2"
              className="setup-input"
              type="text"
              value={p2Name}
              maxLength={32}
              placeholder={DEFAULT_PLAYER_NAMES.P2}
              onChange={(e) => setP2Name(e.target.value)}
            />
          </div>

          <dl className="setup-facts">
            <div>
              <dt>Başlangıç kasası</dt>
              <dd>2000 altın</dd>
            </div>
            <div>
              <dt>Başkent vergisi</dt>
              <dd>200/tur</dd>
            </div>
            <div>
              <dt>Ordu / Sur</dt>
              <dd>1000 altın</dd>
            </div>
            <div>
              <dt>Harp aksiyonu</dt>
              <dd>1/tur (+Kudret)</dd>
            </div>
          </dl>

          <div className="setup-actions">
            <button
              type="submit"
              className="button button--primary button--hero"
              onClick={() => audioManager.playContext()}
            >
              Savaşı Başlat
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
