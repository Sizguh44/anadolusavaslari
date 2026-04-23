import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import type { FeatureCollection, Geometry } from 'geojson'
import { getFeatureDisplayName, matchFeatureToCityDefinition, type MapFeatureProperties } from '../data/mapMatching'
import { validateCityDefinitionsConsistency, validateMapFeatureCollection } from '../data/mapValidation'
import { getMapCityClassName, getMapCityDecoration, type MapCityRole } from '../game/mapRoles'
import type { CardType } from '../game/cards'
import type { ActionMode, CityState, GameStage, PlayerId } from '../game/types'
import { InfoTag } from './hud/InfoTag'

const MAP_WIDTH = 1000
const MAP_HEIGHT = 620
const MAP_PADDING = 22
const MIN_ZOOM = 1
const MAX_ZOOM = 3.6
const DOUBLE_TAP_ZOOM = 2.0
const PAN_OVERSCAN_X = 30
const PAN_OVERSCAN_Y = 24
const INITIAL_ZOOM = 1.3

// Estimated tooltip dimensions for viewport-aware positioning
const TOOLTIP_W = 220
const TOOLTIP_H = 130

interface ViewState {
  zoom: number
  centerX: number
  centerY: number
}

interface DragState {
  pointerId: number
  pressedCityId: string | null
  startClientX: number
  startClientY: number
  startCenterX: number
  startCenterY: number
  viewWidth: number
  viewHeight: number
  svgWidth: number
  svgHeight: number
  moved: boolean
}

interface HoverState {
  cityId: string
  x: number
  y: number
}

interface FeatureViewModel {
  cityId: string
  label: string
  path: string
  centroid: [number, number]
}

interface LabelState {
  showName: boolean
  showDetail: boolean
}

export interface MapContextMetric {
  label: string
  value: string | number
}

export interface MapContextAction {
  id: string
  label: string
  tone?: 'primary' | 'secondary' | 'danger' | 'ghost'
  disabled?: boolean
  onClick: () => void
}

export interface MapContextAmountControl {
  label: string
  value: number
  min: number
  max: number
  disabled?: boolean
  remaining?: number
  onChange: (value: number) => void
}

export interface MapContextCard {
  cityId: string
  eyebrow: string
  title: string
  ownerLabel: string
  ownerTone: PlayerId | 'neutral'
  subtitle?: string
  helperText?: string
  stats: MapContextMetric[]
  tags?: string[]
  actions?: MapContextAction[]
  amountControl?: MapContextAmountControl
  preview?: MapContextMetric[]
}

interface TurkeyMapBoardProps {
  cities: Record<string, CityState>
  currentPlayer: PlayerId
  stage: GameStage
  actionMode: ActionMode | null
  selectedCityId: string | null
  sourceCityId: string | null
  targetCityId: string | null
  validAnnexSourceIds: string[]
  validAnnexTargetIds: string[]
  validTransferSourceIds: string[]
  validTransferTargetIds: string[]
  validAttackSourceIds: string[]
  validAttackTargetIds: string[]
  validCapitalForbiddenIds: string[]
  globalAnnexableTargetIds: string[]
  /** Aktif kart hedefleme — harita yalnızca ilgili hedefleri parlatır. */
  pendingCardType: CardType | null
  cardTargetIds: string[]
  playerNames: Record<PlayerId, string>
  onCitySelect: (cityId: string) => void
  onMapBackgroundClick: () => void
  contextCard: MapContextCard | null
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
}

function clampView(next: ViewState): ViewState {
  const zoom = clamp(next.zoom, MIN_ZOOM, MAX_ZOOM)
  const viewWidth = MAP_WIDTH / zoom
  const viewHeight = MAP_HEIGHT / zoom
  const minCenterX = viewWidth / 2 - PAN_OVERSCAN_X
  const maxCenterX = MAP_WIDTH - viewWidth / 2 + PAN_OVERSCAN_X
  const minCenterY = viewHeight / 2 - PAN_OVERSCAN_Y
  const maxCenterY = MAP_HEIGHT - viewHeight / 2 + PAN_OVERSCAN_Y

  return {
    zoom,
    centerX: clamp(next.centerX, minCenterX, maxCenterX),
    centerY: clamp(next.centerY, minCenterY, maxCenterY),
  }
}

function getViewBox(view: ViewState) {
  const width = MAP_WIDTH / view.zoom
  const height = MAP_HEIGHT / view.zoom
  return `${view.centerX - width / 2} ${view.centerY - height / 2} ${width} ${height}`
}

function boxesOverlap(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
) {
  return !(
    left.x + left.width < right.x ||
    right.x + right.width < left.x ||
    left.y + left.height < right.y ||
    right.y + right.height < left.y
  )
}

function buildLabelState(
  features: FeatureViewModel[],
  cities: Record<string, CityState>,
  zoom: number,
  importantCityIds: Set<string>,
): Record<string, LabelState> {
  const labelState: Record<string, LabelState> = {}

  // At high zoom, show all labels — no collision filtering needed
  if (zoom >= 2.6) {
    for (const feature of features) {
      if (!cities[feature.cityId]) continue
      labelState[feature.cityId] = { showName: true, showDetail: true }
    }
    return labelState
  }

  // Below name threshold — no names, only compact badges (handled in render)
  if (zoom < 2.0) {
    for (const feature of features) {
      if (!cities[feature.cityId]) continue
      labelState[feature.cityId] = { showName: false, showDetail: false }
    }
    return labelState
  }

  // Mid-zoom (2.0 – 2.6): show names with collision detection
  const occupiedBoxes: Array<{ x: number; y: number; width: number; height: number }> = []
  const ordered = [...features].sort((left, right) => {
    const leftCity = cities[left.cityId]
    const rightCity = cities[right.cityId]
    const leftScore =
      (importantCityIds.has(left.cityId) ? 100 : 0) +
      (leftCity?.isCapital ? 60 : 0) +
      (leftCity?.fortLevel ?? 0) +
      (leftCity?.army ?? 0)
    const rightScore =
      (importantCityIds.has(right.cityId) ? 100 : 0) +
      (rightCity?.isCapital ? 60 : 0) +
      (rightCity?.fortLevel ?? 0) +
      (rightCity?.army ?? 0)
    return rightScore - leftScore
  })

  const collisionScale = 1 / zoom

  for (const feature of ordered) {
    const city = cities[feature.cityId]
    const important = importantCityIds.has(feature.cityId) || city?.isCapital

    if (!city) continue

    const estimatedWidth = Math.max(58, feature.label.length * 6.5) * collisionScale
    const box = {
      x: feature.centroid[0] - estimatedWidth / 2,
      y: feature.centroid[1] - 30 * collisionScale,
      width: estimatedWidth,
      height: 20 * collisionScale,
    }
    const collides = occupiedBoxes.some((current) => boxesOverlap(box, current))

    if (!important && collides) {
      labelState[feature.cityId] = { showName: false, showDetail: false }
      continue
    }

    occupiedBoxes.push(box)
    labelState[feature.cityId] = {
      showName: true,
      showDetail: important || zoom > 2.3,
    }
  }

  return labelState
}

/**
 * Rol bazlı minik glyph. Renk-dışı ikinci sinyal sağlar: oyuncu rengi körlüğü
 * yaşasa bile şeklin kendisi anlamı taşır. `null` dönerse marker basılmaz.
 */
/** Rol → kısa Türkçe ekran okuyucu etiketi. `null` ise etiket eklenmez. */
function getRoleAriaHint(role: MapCityRole): string | null {
  switch (role) {
    case 'annex-target':
      return 'ilhak hedefi'
    case 'transfer-target':
      return 'intikal hedefi'
    case 'attack-target':
      return 'saldırı hedefi'
    case 'target':
      return 'seçilmiş hedef'
    case 'source':
      return 'aktif kaynak'
    case 'source-candidate':
      return 'kaynak adayı'
    case 'capital-choice':
      return 'başkent adayı'
    case 'capital-forbidden':
      return 'başkent olarak seçilemez'
    case 'card-targetable':
      return 'kart hedefi'
    case 'invalid':
      return 'geçersiz hedef'
    case 'dimmed':
      return 'bu mod için oynanmaz'
    default:
      return null
  }
}

function getRoleGlyphForMarker(role: MapCityRole, actionMode: ActionMode | null): string | null {
  switch (role) {
    case 'annex-target':
      return '+'
    case 'transfer-target':
      return '→'
    case 'attack-target':
      return '×'
    case 'target':
      // Seçilmiş hedef: moduna göre ikon; hedef halkası zaten pulse ile ayrışır.
      if (actionMode === 'ANNEX') return '+'
      if (actionMode === 'TRANSFER') return '→'
      if (actionMode === 'ATTACK') return '×'
      return '⦿'
    case 'capital-choice':
      return '♛'
    case 'capital-forbidden':
      return '∅'
    case 'card-targetable':
      return '◈'
    case 'source-candidate':
      return '•'
    default:
      return null
  }
}

function zoomAroundPoint(
  current: ViewState,
  clientX: number,
  clientY: number,
  svgElement: SVGSVGElement,
  nextZoom: number,
) {
  const rect = svgElement.getBoundingClientRect()
  const ratioX = (clientX - rect.left) / rect.width
  const ratioY = (clientY - rect.top) / rect.height
  const currentWidth = MAP_WIDTH / current.zoom
  const currentHeight = MAP_HEIGHT / current.zoom
  const currentLeft = current.centerX - currentWidth / 2
  const currentTop = current.centerY - currentHeight / 2
  const focusX = currentLeft + ratioX * currentWidth
  const focusY = currentTop + ratioY * currentHeight
  const nextWidth = MAP_WIDTH / nextZoom
  const nextHeight = MAP_HEIGHT / nextZoom
  const nextCenterX = focusX - ratioX * nextWidth + nextWidth / 2
  const nextCenterY = focusY - ratioY * nextHeight + nextHeight / 2

  return clampView({
    zoom: nextZoom,
    centerX: nextCenterX,
    centerY: nextCenterY,
  })
}

export function TurkeyMapBoard({
  cities,
  currentPlayer,
  stage,
  actionMode,
  selectedCityId,
  sourceCityId,
  targetCityId,
  validAnnexSourceIds,
  validAnnexTargetIds,
  validTransferSourceIds,
  validTransferTargetIds,
  validAttackSourceIds,
  validAttackTargetIds,
  validCapitalForbiddenIds,
  globalAnnexableTargetIds,
  pendingCardType,
  cardTargetIds,
  playerNames,
  onCitySelect,
  onMapBackgroundClick,
  contextCard,
}: TurkeyMapBoardProps) {
  const definitionValidation = useMemo(() => validateCityDefinitionsConsistency(), [])
  const [geoJson, setGeoJson] = useState<FeatureCollection<Geometry, MapFeatureProperties> | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [retryNonce, setRetryNonce] = useState(0)
  const [view, setView] = useState<ViewState>({
    zoom: INITIAL_ZOOM,
    centerX: MAP_WIDTH / 2,
    centerY: MAP_HEIGHT / 2,
  })
  const [hoverState, setHoverState] = useState<HoverState | null>(null)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const lastDragAtRef = useRef(0)
  const assetPath = `${import.meta.env.BASE_URL}maps/tr-cities.geojson?v=2026-04-15-command-map`

  useEffect(() => {
    if (!definitionValidation.ok) {
      return
    }

    let isMounted = true
    const abortController = new AbortController()

    fetch(assetPath, { cache: 'no-cache', signal: abortController.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Harita verisi yüklenemedi (${response.status}).`)
        }

        return (await response.json()) as FeatureCollection<Geometry, MapFeatureProperties>
      })
      .then((data) => {
        const validation = validateMapFeatureCollection(data)

        if (!validation.ok) {
          throw new Error(validation.issues[0] ?? 'Harita verisi doğrulanamadı.')
        }

        if (!isMounted) {
          return
        }

        setGeoJson(data)
        setLoadError(null)
        setIsLoading(false)
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return
        }

        const message =
          error instanceof Error && error.name === 'AbortError'
            ? 'Harita isteği zaman aşımına uğradı.'
            : error instanceof Error
              ? error.message
              : 'Harita verisi okunamadı.'
        setLoadError(message)
        setIsLoading(false)
      })

    return () => {
      isMounted = false
      abortController.abort()
    }
  }, [assetPath, definitionValidation.ok, retryNonce])

  useEffect(() => {
    const container = containerRef.current

    if (!container || typeof ResizeObserver === 'undefined') {
      return
    }

    const updateSize = () => {
      const rect = container.getBoundingClientRect()
      setStageSize({
        width: rect.width,
        height: rect.height,
      })
    }

    updateSize()
    const observer = new ResizeObserver(() => updateSize())
    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  const derivedLoadError = !definitionValidation.ok ? definitionValidation.issues[0] ?? 'Şehir tanımları doğrulanamadı.' : loadError
  const isMapLoading = definitionValidation.ok && isLoading

  const features = useMemo(() => {
    if (!geoJson) {
      return []
    }

    const projection = geoMercator().fitExtent(
      [
        [MAP_PADDING, MAP_PADDING],
        [MAP_WIDTH - MAP_PADDING, MAP_HEIGHT - MAP_PADDING],
      ],
      geoJson,
    )
    const pathGenerator = geoPath(projection)

    return geoJson.features
      .map((feature) => {
        const properties = (feature.properties ?? {}) as MapFeatureProperties
        const match = matchFeatureToCityDefinition(properties)

        if (!match.cityId) {
          return null
        }

        return {
          cityId: match.cityId,
          label: cities[match.cityId]?.name ?? getFeatureDisplayName(properties, match.cityId),
          path: pathGenerator(feature) ?? '',
          centroid: pathGenerator.centroid(feature) as [number, number],
        }
      })
      .filter((feature): feature is FeatureViewModel => Boolean(feature?.path))
  }, [cities, geoJson])

  const validAnnexSourceSet = useMemo(() => new Set(validAnnexSourceIds), [validAnnexSourceIds])
  const validAnnexTargetSet = useMemo(() => new Set(validAnnexTargetIds), [validAnnexTargetIds])
  const validTransferSourceSet = useMemo(() => new Set(validTransferSourceIds), [validTransferSourceIds])
  const validTransferTargetSet = useMemo(() => new Set(validTransferTargetIds), [validTransferTargetIds])
  const validAttackSourceSet = useMemo(() => new Set(validAttackSourceIds), [validAttackSourceIds])
  const validAttackTargetSet = useMemo(() => new Set(validAttackTargetIds), [validAttackTargetIds])
  const capitalForbiddenSet = useMemo(() => new Set(validCapitalForbiddenIds), [validCapitalForbiddenIds])
  const globalAnnexableSet = useMemo(() => new Set(globalAnnexableTargetIds), [globalAnnexableTargetIds])
  const featureByCityId = useMemo(
    () =>
      features.reduce<Record<string, FeatureViewModel>>((accumulator, feature) => {
        accumulator[feature.cityId] = feature
        return accumulator
      }, {}),
    [features],
  )

  const importantCityIds = useMemo(() => {
    const ids = new Set<string>()

    if (selectedCityId) {
      ids.add(selectedCityId)
    }

    if (sourceCityId) {
      ids.add(sourceCityId)
    }

    if (targetCityId) {
      ids.add(targetCityId)
    }

    for (const city of Object.values(cities)) {
      if (city.isCapital) {
        ids.add(city.id)
      }
    }

    for (const cityId of validAnnexTargetIds) {
      ids.add(cityId)
    }

    for (const cityId of validTransferTargetIds) {
      ids.add(cityId)
    }

    for (const cityId of validAttackTargetIds) {
      ids.add(cityId)
    }

    return ids
  }, [cities, selectedCityId, sourceCityId, targetCityId, validAnnexTargetIds, validAttackTargetIds, validTransferTargetIds])

  const labelStateByCityId = useMemo(
    () => buildLabelState(features, cities, view.zoom, importantCityIds),
    [cities, features, importantCityIds, view.zoom],
  )

  const cardTargetSet = useMemo(() => new Set(cardTargetIds), [cardTargetIds])

  // Tek baskın görsel rol + ikinci-sinyal marker'ı için karar noktası.
  // game/mapRoles.ts içindeki saf selector, çakışma kurallarını yönetir.
  const cityDecorations = useMemo(() => {
    const result: Record<string, {
      role: MapCityRole
      pathClassName: string
      isSelected: boolean
      isSource: boolean
      isTarget: boolean
      isCapital: boolean
    }> = {}
    const ctx = {
      stage,
      currentPlayer,
      actionMode,
      selectedCityId,
      sourceCityId,
      targetCityId,
      pendingCardType,
      validAnnexSourceIds: validAnnexSourceSet,
      validAnnexTargetIds: validAnnexTargetSet,
      validTransferSourceIds: validTransferSourceSet,
      validTransferTargetIds: validTransferTargetSet,
      validAttackSourceIds: validAttackSourceSet,
      validAttackTargetIds: validAttackTargetSet,
      capitalForbiddenIds: capitalForbiddenSet,
      globalAnnexableIds: globalAnnexableSet,
      cardTargetIds: cardTargetSet,
    }

    for (const feature of features) {
      const city = cities[feature.cityId]
      if (!city) continue
      const ownerClass = city.owner === 'P1' ? 'map-city--p1' : city.owner === 'P2' ? 'map-city--p2' : 'map-city--neutral'
      const decoration = getMapCityDecoration(city, ctx)
      result[feature.cityId] = {
        role: decoration.role,
        pathClassName: getMapCityClassName(decoration, ownerClass),
        isSelected: decoration.isSelected,
        isSource: decoration.isSource,
        isTarget: decoration.isTarget,
        isCapital: decoration.isCapital,
      }
    }

    return result
  }, [features, cities, currentPlayer, selectedCityId, sourceCityId, targetCityId, stage, actionMode,
    pendingCardType, capitalForbiddenSet, validAnnexSourceSet, validAnnexTargetSet, validTransferSourceSet,
    validTransferTargetSet, validAttackSourceSet, validAttackTargetSet, globalAnnexableSet, cardTargetSet])

  function retryLoad() {
    setIsLoading(true)
    setLoadError(null)
    setRetryNonce((current) => current + 1)
  }

  function onWheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault()
  }

  function onPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) {
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    dragRef.current = {
      pointerId: event.pointerId,
      pressedCityId:
        event.target instanceof Element ? event.target.closest<SVGPathElement>('.map-city')?.getAttribute('data-city-id') ?? null : null,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startCenterX: view.centerX,
      startCenterY: view.centerY,
      viewWidth: MAP_WIDTH / view.zoom,
      viewHeight: MAP_HEIGHT / view.zoom,
      svgWidth: rect.width,
      svgHeight: rect.height,
      moved: false,
    }
    setHoverState(null)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current

    if (!drag) {
      return
    }

    const deltaX = event.clientX - drag.startClientX
    const deltaY = event.clientY - drag.startClientY

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      drag.moved = true
    }

    const nextCenterX = drag.startCenterX - (deltaX / drag.svgWidth) * drag.viewWidth
    const nextCenterY = drag.startCenterY - (deltaY / drag.svgHeight) * drag.viewHeight

    setView((current) => clampView({ ...current, centerX: nextCenterX, centerY: nextCenterY }))
  }

  function finishDrag(event: React.PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current
    dragRef.current = null

    if (drag?.moved) {
      lastDragAtRef.current = Date.now()
    }

    if (drag && !drag.moved && drag.pressedCityId) {
      onCitySelect(drag.pressedCityId)
    } else if (drag && !drag.moved && !drag.pressedCityId) {
      // Clicked on map background — close popup
      onMapBackgroundClick()
    }

    if (drag && event.currentTarget.hasPointerCapture(drag.pointerId)) {
      event.currentTarget.releasePointerCapture(drag.pointerId)
    }
  }

  function onDoubleClick(event: React.MouseEvent<SVGSVGElement>) {
    event.preventDefault()
    const nextZoom = view.zoom < 1.6 ? DOUBLE_TAP_ZOOM : INITIAL_ZOOM
    const svgElement = event.currentTarget

    setView((current) => {
      if (nextZoom === INITIAL_ZOOM) {
        return {
          zoom: INITIAL_ZOOM,
          centerX: MAP_WIDTH / 2,
          centerY: MAP_HEIGHT / 2,
        }
      }

      return zoomAroundPoint(current, event.clientX, event.clientY, svgElement, nextZoom)
    })
  }

  function updateHover(cityId: string, event: React.MouseEvent<SVGPathElement>) {
    if (!containerRef.current || dragRef.current?.moved) {
      return
    }

    const rect = containerRef.current.getBoundingClientRect()
    const rawX = event.clientX - rect.left
    const rawY = event.clientY - rect.top

    // Flip left/right and up/down to keep tooltip inside viewport
    const x = rawX + TOOLTIP_W + 24 > rect.width ? rawX - TOOLTIP_W - 8 : rawX + 18
    const y = rawY + TOOLTIP_H + 24 > rect.height ? rawY - TOOLTIP_H - 8 : rawY + 18

    setHoverState({
      cityId,
      x: Math.max(8, x),
      y: Math.max(8, y),
    })
  }

  const hoveredCity = hoverState ? cities[hoverState.cityId] : null
  const tooltipStyle = hoverState ? ({ left: hoverState.x, top: hoverState.y } as CSSProperties) : undefined
  const contextCardStyle = useMemo(() => {
    if (!contextCard || !stageSize.width || !stageSize.height) {
      return undefined
    }

    const feature = featureByCityId[contextCard.cityId]

    if (!feature) {
      return undefined
    }

    const viewWidth = MAP_WIDTH / view.zoom
    const viewHeight = MAP_HEIGHT / view.zoom
    const viewLeft = view.centerX - viewWidth / 2
    const viewTop = view.centerY - viewHeight / 2
    const cardWidth = 324
    const estimatedHeight =
      contextCard.preview?.length || contextCard.amountControl ? 286 : contextCard.actions?.length ? 244 : 214

    if (actionMode && sourceCityId && !targetCityId && contextCard.cityId === sourceCityId) {
      return {
        left: stageSize.width - cardWidth - 14,
        top: 14,
      } as CSSProperties
    }

    const anchorX = ((feature.centroid[0] - viewLeft) / viewWidth) * stageSize.width
    const anchorY = ((feature.centroid[1] - viewTop) / viewHeight) * stageSize.height
    const renderBelow = anchorY < 220

    return {
      left: clamp(anchorX + 18, 14, stageSize.width - cardWidth - 14),
      top: renderBelow
        ? clamp(anchorY + 18, 14, stageSize.height - estimatedHeight - 14)
        : clamp(anchorY - estimatedHeight - 18, 14, stageSize.height - estimatedHeight - 14),
    } as CSSProperties
  }, [actionMode, contextCard, featureByCityId, sourceCityId, stageSize.height, stageSize.width, targetCityId, view])

  return (
    <section className="map-card">
      <div className="map-stage" ref={containerRef}>
        {isMapLoading ? (
          <div className="map-overlay">
            <strong>Harita yükleniyor…</strong>
            <p>İller hazırlanıyor. Oyun alanı birkaç saniye içinde hazır olacak.</p>
          </div>
        ) : null}

        {derivedLoadError ? (
          <div className="map-overlay map-overlay--error">
            <strong>Harita açılamadı.</strong>
            <p>{derivedLoadError}</p>
            <button className="button button--ghost" onClick={retryLoad}>
              Yeniden dene
            </button>
          </div>
        ) : null}

        <svg
          className="turkey-map"
          viewBox={getViewBox(view)}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onDoubleClick={onDoubleClick}
          aria-label="Türkiye strateji haritası"
        >
          {/* Layer 1: City region paths */}
          {features.map((feature) => {
            const flags = cityDecorations[feature.cityId]
            if (!flags) return null
            const roleHint = getRoleAriaHint(flags.role)
            const city = cities[feature.cityId]
            const ownerLabel = city?.owner === 'P1'
              ? playerNames.P1
              : city?.owner === 'P2'
                ? playerNames.P2
                : 'sahipsiz'
            const capitalSuffix = flags.isCapital ? ', başkent' : ''
            const roleSuffix = roleHint ? `, ${roleHint}` : ''
            const ariaLabel = `${feature.label}${capitalSuffix}, ${ownerLabel}${roleSuffix}`

            return (
              <path
                key={feature.cityId}
                d={feature.path}
                data-city-id={feature.cityId}
                className={flags.pathClassName}
                aria-label={ariaLabel}
                aria-pressed={flags.isSelected}
                role="button"
                tabIndex={0}
                onMouseEnter={(event) => updateHover(feature.cityId, event)}
                onMouseMove={(event) => updateHover(feature.cityId, event)}
                onMouseLeave={() => setHoverState((current) => (current?.cityId === feature.cityId ? null : current))}
                onClick={() => {
                  if (Date.now() - lastDragAtRef.current < 180) {
                    return
                  }

                  onCitySelect(feature.cityId)
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') {
                    return
                  }

                  event.preventDefault()
                  onCitySelect(feature.cityId)
                }}
              />
            )
          })}

          {/* Layer 2: Markers and labels (always rendered above all city paths) */}
          {features.map((feature) => {
            const city = cities[feature.cityId]
            const flags = cityDecorations[feature.cityId]
            const labelState = labelStateByCityId[feature.cityId] ?? { showName: false, showDetail: false }
            if (!flags || !city) return null

            // Rol marker'ı — renk-dışı ikinci sinyal (ikon) her zaman gösterilir.
            const roleGlyph = getRoleGlyphForMarker(flags.role, actionMode)

            // Neutral & ordusu olmayan şehirler düşük zoom'da tamamen sessiz kalır
            // — tek istisna: bir role marker'ı varsa onu göster.
            if (!city.owner && city.army === 0 && !labelState.showName && !roleGlyph) return null

            // Build compact badge text: ⚔3 🛡2 ★
            const badgeParts: string[] = []
            if (city.army > 0) badgeParts.push(`⚔${city.army}`)
            if (city.fortLevel > 0) badgeParts.push(`🛡${city.fortLevel}`)
            if (city.isCapital) badgeParts.push('★')
            const badgeText = badgeParts.join(' ')
            const showCompactBadge = badgeText.length > 0 && !labelState.showName

            // At name-visible zoom, use richer badges
            const showArmyBadge = labelState.showName && city.army > 0
            const showFortBadge = labelState.showName && city.fortLevel > 0

            if (!showCompactBadge && !showArmyBadge && !showFortBadge && !city.isCapital && !labelState.showName && !roleGlyph) return null

            return (
              <g key={feature.cityId} transform={`translate(${feature.centroid[0]}, ${feature.centroid[1]})`} className="map-marker">
                {/* Role marker — küçük ikon + ton halkası; renk-dışı ikinci sinyal */}
                {roleGlyph ? (
                  <g className={`role-marker role-marker--${flags.role}`} transform="translate(0,-16)">
                    <circle r="7" />
                    <text dy="0.35em">{roleGlyph}</text>
                  </g>
                ) : null}

                {/* Compact badge: zoomed out — single minimal line */}
                {showCompactBadge ? (
                  <g className={`compact-badge ${city.owner === currentPlayer ? 'is-current-player' : ''}`.trim()}>
                    <rect
                      x={-badgeText.length * 2.8}
                      y="-6"
                      width={badgeText.length * 5.6}
                      height="12"
                      rx="4"
                    />
                    <text dy="0.35em">{badgeText}</text>
                  </g>
                ) : null}

                {/* Rich badges: zoomed in — separate army / fort / capital */}
                {showArmyBadge ? (
                  <g className={`army-badge ${city.owner === currentPlayer ? 'is-current-player' : ''}`.trim()}>
                    <circle r="10.5" />
                    <text dy="0.35em">{city.army}</text>
                  </g>
                ) : null}

                {showFortBadge ? (
                  <g className="fort-badge" transform="translate(17,-2)">
                    <rect x="-9" y="-7" width="18" height="14" rx="5" />
                    <text dy="0.32em">{city.fortLevel}</text>
                  </g>
                ) : null}

                {labelState.showName && city.isCapital ? (
                  <g className="capital-star" transform="translate(0,-18)">
                    <circle r="8" />
                    <text dy="0.35em">★</text>
                  </g>
                ) : null}

                {labelState.showName ? (
                  <g className="city-label-card" transform={`translate(0,${city.army > 0 ? 18 : 8})`}>
                    <rect
                      x={-Math.max(30, feature.label.length * 3.6)}
                      y="0"
                      width={Math.max(60, feature.label.length * 7.1)}
                      height={labelState.showDetail ? 30 : 18}
                      rx="9"
                    />
                    <text className="city-label-card__name" dy="12">
                      {feature.label}
                    </text>
                    {labelState.showDetail ? (
                      <text className="city-label-card__detail" dy="24">
                        {city.owner ? `${city.owner === 'P1' ? 'Mavi' : 'Kırmızı'} • ${city.readyArmy}/${city.army}` : 'Sahipsiz'}
                      </text>
                    ) : null}
                  </g>
                ) : null}
              </g>
            )
          })}
        </svg>

        {hoveredCity && tooltipStyle ? (
          <div className="map-tooltip" style={tooltipStyle}>
            <strong>{hoveredCity.name}</strong>
            <span>{hoveredCity.owner ? (hoveredCity.owner === 'P1' ? (playerNames.P1) : (playerNames.P2)) : 'Sahipsiz'}</span>
            <span>⚔ {hoveredCity.army}  ⚡ {hoveredCity.readyArmy}</span>
            <span>Vergi {hoveredCity.baseTax}</span>
            <span>Sur {hoveredCity.fortLevel}{hoveredCity.isCapital ? ' • Başkent' : ''}</span>
          </div>
        ) : null}

        {contextCard && contextCardStyle ? (
          <div
            className={`map-context-card map-context-card--${contextCard.ownerTone}`.trim()}
            style={contextCardStyle}
          >
            <div className="map-context-card__header">
              <div>
                <p className="section-eyebrow">{contextCard.eyebrow}</p>
                <h3>{contextCard.title}</h3>
              </div>
              <span className={`owner-pill owner-pill--${contextCard.ownerTone}`}>{contextCard.ownerLabel}</span>
            </div>

            {contextCard.subtitle ? <p className="map-context-card__subtitle">{contextCard.subtitle}</p> : null}

            <div className="map-context-card__stats">
              {contextCard.stats.map((metric) => (
                <div key={metric.label} className="mini-stat">
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>

            {contextCard.tags?.length ? (
              <div className="tag-row">
                {contextCard.tags.map((tag) => (
                  <InfoTag key={tag}>{tag}</InfoTag>
                ))}
              </div>
            ) : null}

            {contextCard.amountControl ? (
              <div className="map-context-card__amount">
                <div className="planner-block__header">
                  <strong>{contextCard.amountControl.label}</strong>
                  <span>{contextCard.amountControl.value} birlik</span>
                </div>
                <div className="amount-control">
                  <input
                    type="range"
                    min={contextCard.amountControl.min}
                    max={contextCard.amountControl.max}
                    value={contextCard.amountControl.value}
                    disabled={contextCard.amountControl.disabled}
                    onChange={(event) => contextCard.amountControl?.onChange(Number(event.target.value))}
                  />
                  <input
                    type="number"
                    min={contextCard.amountControl.min}
                    max={contextCard.amountControl.max}
                    value={contextCard.amountControl.value}
                    disabled={contextCard.amountControl.disabled}
                    onChange={(event) => contextCard.amountControl?.onChange(Number(event.target.value))}
                  />
                </div>
                {typeof contextCard.amountControl.remaining === 'number' ? (
                  <div className="amount-helper">
                    <span>Gidecek: <strong>{contextCard.amountControl.value}</strong></span>
                    <span>Kaynakta kalacak: <strong>{contextCard.amountControl.remaining}</strong></span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {contextCard.preview?.length ? (
              <div className="map-context-card__preview">
                {contextCard.preview.map((metric) => (
                  <div key={metric.label} className="mini-stat">
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                ))}
              </div>
            ) : null}

            {contextCard.helperText ? <p className="map-context-card__helper">{contextCard.helperText}</p> : null}

            {contextCard.actions?.length ? (
              <div className="map-context-card__actions">
                {contextCard.actions.map((action) => (
                  <button
                    key={action.id}
                    className={`button button--${action.tone ?? 'ghost'} button--compact`.trim()}
                    onClick={action.onClick}
                    disabled={action.disabled}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
