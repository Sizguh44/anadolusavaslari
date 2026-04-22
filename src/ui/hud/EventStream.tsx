import type { GameEvent, PlayerId } from '../../game/types'

const EVENT_STREAM_LIMIT = 10

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
  if (events.length === 0) {
    return <p className="empty-state">Henüz kayıt oluşmadı.</p>
  }

  const recent = [...events].slice(0, EVENT_STREAM_LIMIT)

  return (
    <div className="event-stream">
      {recent.map((event) => (
        <article
          key={event.id}
          className={`event-stream__item tone-${event.tone} ${actorClass(event.actor)}`}
        >
          <div className="event-stream__meta">
            <span className="event-stream__actor">{actorBadge(event.actor, playerNames)}</span>
            <span>Tur {event.turn}</span>
            <span>Raund {event.round}</span>
          </div>
          <p>{event.message}</p>
        </article>
      ))}
    </div>
  )
}
