import { useEffect, useState } from 'react'
import { audioManager } from '../../engine/audioManager'

export function VolumeControl() {
  const [isMuted, setIsMuted] = useState(audioManager.getIsMuted())

  useEffect(() => {
    const handleUpdate = () => {
      setIsMuted(audioManager.getIsMuted())
    }

    const unsubscribe = audioManager.subscribe(handleUpdate)
    return () => {
      unsubscribe()
    }
  }, [])

  const toggleMute = () => {
    audioManager.toggleMute()
  }

  return (
    <div className="volume-control-shell">
      <button 
        type="button" 
        className={`stat-pill is-interactive ${!isMuted ? 'is-active' : ''}`}
        onClick={toggleMute}
        aria-label={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
        title="Oyun Müziği"
      >
        <span className="stat-pill__label">Müzik</span>
        <strong className="stat-pill__value" style={{ width: '20px', textAlign: 'center' }}>
          {isMuted ? '🔇' : '🔉'}
        </strong>
      </button>
    </div>
  )
}
