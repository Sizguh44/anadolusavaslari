import { getCityOwnerLabel } from '../../game/state'
import type { CityState, PlayerId } from '../../game/types'
import { InfoTag } from './InfoTag'
import { StatPill } from './StatPill'

interface CityPopoverProps {
  selectedCity: CityState | null
  playerNames: Record<PlayerId, string>
  isHovered: boolean
  isPinned: boolean
  tags: string[]
  onHoverChange: (hovered: boolean) => void
  onTogglePin: () => void
}

export function CityPopover({
  selectedCity,
  playerNames,
  isHovered,
  isPinned,
  tags,
  onHoverChange,
  onTogglePin,
}: CityPopoverProps) {
  const isOpen = Boolean(selectedCity && (isHovered || isPinned))

  return (
    <div
      className="city-pill-shell"
      onMouseEnter={() => {
        if (selectedCity) onHoverChange(true)
      }}
      onMouseLeave={() => onHoverChange(false)}
    >
      <StatPill
        label="Seçili Şehir"
        value={selectedCity ? selectedCity.name : 'Şehir seç'}
        meta={
          selectedCity
            ? `${getCityOwnerLabel(selectedCity, playerNames)} • ⚔ ${selectedCity.army}  ⚡ ${selectedCity.readyArmy}`
            : 'Haritadan seç'
        }
        interactive={Boolean(selectedCity)}
        active={isOpen}
        onClick={selectedCity ? onTogglePin : undefined}
      />

      {selectedCity && isOpen ? (
        <div className="city-popover">
          <div className="city-popover__header">
            <div>
              <span className="section-eyebrow">Şehir Özeti</span>
              <h3>{selectedCity.name}</h3>
            </div>
            <span className={`owner-pill owner-pill--${selectedCity.owner ?? 'neutral'}`}>
              {getCityOwnerLabel(selectedCity, playerNames)}
            </span>
          </div>
          <div className="mini-stat-grid">
            <div className="mini-stat">
              <span>Vergi</span>
              <strong>{selectedCity.baseTax}</strong>
            </div>
            <div className="mini-stat">
              <span>Ordu</span>
              <strong>{selectedCity.army}</strong>
            </div>
            <div className="mini-stat">
              <span>⚡ Hazır</span>
              <strong>{selectedCity.readyArmy}</strong>
            </div>
            <div className="mini-stat">
              <span>Sur</span>
              <strong>{selectedCity.fortLevel}</strong>
            </div>
          </div>
          {tags.length > 0 ? (
            <div className="tag-row">
              {tags.map((tag) => (
                <InfoTag key={tag}>{tag}</InfoTag>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
