import { useEffect, useState } from 'react'
import type { GameEvent, PlayerId } from '../../game/types'

const EVENT_STREAM_LIMIT = 10
const FRESH_DURATION_MS = 700

interface EventStreamProps {
  events: GameEvent[]
  playerNames: Record<PlayerId, string>
}

function actorClass(actor: GameEvent['actor']): string {
  if (actor === 'P1') return 'event-stream__item--p1'
  if (actor === 'P2') return 'event-stream__item--p2'
  return 'event-stream__item--system'
}

function actorBadge(actor: GameEvent['actor'], playerNames: Record<PlayerId, string>): string {
  if (actor === 'P1' || actor === 'P2') return playerNames[actor]
  return 'Sistem'
}

export function EventStream({ events, playerNames }: EventStreamProps) {
  const recent = events.slice(0, EVENT_STREAM_LIMIT)
  const newestId = recent[0]?.id ?? null

  // Render-time derivation: en üstteki olay id'si değiştiyse, yalnızca yeni
  // satıra kısa süreli "arrival" sinyali ver. Bu pattern React'in tavsiye
  // ettiği yol — useEffect içinde setState çağırmak yerine koşullu setState.
  const [seenNewestId, setSeenNewestId] = useState<number | null>(newestId)
  const [freshId, setFreshId] = useState<number | null>(null)

  if (newestId !== seenNewestId) {
    setSeenNewestId(newestId)
    setFreshId(newestId)
  }

  // Fresh işareti kısa süre sonra sönsün; tek efekt yalnızca timer'ı yönetir.
  useEffect(() => {
    if (freshId === null) return
    const handle = window.setTimeout(() => setFreshId(null), FRESH_DURATION_MS)
    return () => window.clearTimeout(handle)
  }, [freshId])

  if (events.length === 0) {
    return <p className="empty-state">Henüz kayıt oluşmadı.</p>
  }

  return (
    <div className="event-stream" role="log" aria-live="polite">
      {recent.map((event) => {
        const isFresh = event.id === freshId
        const className = [
          'event-stream__item',
          `tone-${event.tone}`,
          actorClass(event.actor),
          isFresh ? 'is-fresh' : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <article key={event.id} className={className}>
            <div className="event-stream__meta">
              <span className="event-stream__actor">{actorBadge(event.actor, playerNames)}</span>
              <span>Tur {event.turn}</span>
              <span>Raund {event.round}</span>
            </div>
            <p>{event.message}</p>
          </article>
        )
      })}
    </div>
  )
}
