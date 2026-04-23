import { useEffect, useState } from 'react'
import { audioManager } from '../../engine/audioManager'

/**
 * Müzik aç/kapa utility düğmesi. Önceden stat-pill görünümündeydi; artık
 * kompakt bir icon toggle — komuta çubuğunda pill kalabalığını azaltır,
 * fakat etkileşim ve aria semantiği aynı kalır.
 */
export function VolumeControl() {
  const [isMuted, setIsMuted] = useState(audioManager.getIsMuted())

  useEffect(() => {
    const unsubscribe = audioManager.subscribe(() => {
      setIsMuted(audioManager.getIsMuted())
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const toggleMute = () => audioManager.toggleMute()

  return (
    <button
      type="button"
      className={`utility-button ${!isMuted ? 'is-active' : ''}`.trim()}
      onClick={toggleMute}
      aria-label={isMuted ? 'Sesi aç' : 'Sesi kapat'}
      aria-pressed={!isMuted}
      title={isMuted ? 'Sesi aç' : 'Sesi kapat'}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        {isMuted ? (
          <>
            <line x1="15" y1="9" x2="21" y2="15" />
            <line x1="21" y1="9" x2="15" y2="15" />
          </>
        ) : (
          <>
            <path d="M16 8a4 4 0 0 1 0 8" />
            <path d="M19 5a8 8 0 0 1 0 14" />
          </>
        )}
      </svg>
    </button>
  )
}
