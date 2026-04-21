import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react'
import { TurkeyMapBoard, type MapContextCard } from './ui/TurkeyMapBoard'
import { VolumeControl } from './ui/topbar/VolumeControl'
import { CardsDialog } from './ui/CardsDialog'
import { audioManager } from './engine/audioManager'
import { playAttackSfx, playAnnexSfx, playBuildFortSfx, playBuildArmySfx, playClickSfx, playEndTurnSfx, playCapitalSfx } from './engine/sfxManager'
import { clearSavedGame, loadSavedGame, saveGame } from './game/storage'
import {
  ARMY_COST,
  canBuildArmyInCity,
  canBuildFortInCity,
  CITY_ARMY_LIMIT,
  CITY_FORT_LIMIT,
  DEFAULT_PLAYER_NAMES,
  FORT_COST,
  gameReducer,
  getAllAnnexableTargetIds,
  getAttackSourceIds,
  getAttackTargetIdsForSource,
  getCapitalForbiddenIds,
  getCityEspionageLock,
  getCityOwnerLabel,
  getCurrentPreview,
  getExpandableSourceIds,
  getExpandableTargetIdsForSource,
  getModeLabel,
  getPlayerIncome,
  getRoundNumber,
  getTransferSourceIds,
  getTransferTargetIdsForSource,
  PLAYER_META,
} from './game/state'
import { CARD_CATALOG, type CardType } from './game/cards'
import type { ActionMode, CityState, GameEvent, GameState, PlayerId } from './game/types'

function Dialog({
  className = '',
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className="overlay-backdrop">
      <div className={`overlay-card ${className}`.trim()}>{children}</div>
    </div>
  )
}

// ─── Setup Screen ────────────────────────────────────────────────────────────

function SetupScreen({ onStart }: { onStart: (names: Record<PlayerId, string>) => void }) {
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
        <p className="section-eyebrow">Komutanlık Kurulumu</p>
        <h2>Kuvvetlerinizi adlandırın</h2>
        <p className="setup-card__hint">
          İsimler değiştirilmezse varsayılan olarak kalır.
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

// ─── Home Screen ─────────────────────────────────────────────────────────────

function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="home-shell">
      <section className="hero-card">
        <p className="section-eyebrow">Sıra Tabanlı Harp Oyunu</p>
        <h1>Anadolu Savaşları</h1>
        <p className="hero-card__copy">
          Başkentini seç, her tur vergi topla, şehirlerine ordu ve sur ekle, cepheyi komşuluk üzerinden genişlet.
          Aynı tur içinde çok iş yapabilirsin ama yalnızca bir büyük fetih hamlesi hakkın vardır.
        </p>
        <div className="hero-card__actions">
          <button 
            className="button button--primary button--hero" 
            onClick={() => {
              audioManager.playContext();
              onStart();
            }}
          >
            Yeni savaşı başlat
          </button>
        </div>
      </section>

      <section className="home-grid">
        <article className="info-panel">
          <p className="section-eyebrow">Tur Döngüsü</p>
          <h2>Kontrollü ama derin akış</h2>
          <ul className="bullet-list">
            <li>Tur başında şehir vergilerin ortak kasana toplanır.</li>
            <li>Aynı turda istediğin kadar ordu basabilir ve sur inşa edebilirsin.</li>
            <li>Dost şehirler arasında, yalnızca hazır birlikleri komşu şehirlere aktarabilirsin.</li>
            <li>Her tur en fazla 1 ilhak veya 1 saldırı yapabilirsin.</li>
          </ul>
        </article>

        <article className="info-panel">
          <p className="section-eyebrow">Muharebe</p>
          <h2>Deterministik çözümleme</h2>
          <ul className="bullet-list">
            <li>Saldırı gücü gönderdiğin birlik sayısıdır.</li>
            <li>Her 2 saldırı birimi, hedefte 1 sur seviyesi yıkar.</li>
            <li>Savunma = şehir ordusu + kalan sur + başkent bonusu.</li>
            <li>Başkent düşerse savaş anında biter.</li>
          </ul>
        </article>

        <article className="info-panel">
          <p className="section-eyebrow">Harita Kullanımı</p>
          <h2>Akıcı kontrol</h2>
          <ul className="bullet-list">
            <li>Haritayı farenle basılı tutup sürükleyerek kaydır.</li>
            <li>Çift tıkla yakınlaştır; tekrar çift tıkla uzaklaştır.</li>
            <li>Her şehirde en az 1 birlik kalır; bu garnizondan intikal yapılamaz.</li>
            <li>Vurgular, o an seçili aksiyona göre şehirleri bağlama duyarlı gösterir.</li>
          </ul>
        </article>
      </section>
    </main>
  )
}

// ─── Event Stream ─────────────────────────────────────────────────────────────

const EVENT_STREAM_LIMIT = 10

function EventStream({ events }: { events: GameEvent[] }) {
  if (events.length === 0) {
    return <p className="empty-state">Henüz kayıt oluşmadı.</p>
  }

  const recent = [...events].slice(-EVENT_STREAM_LIMIT).reverse()

  return (
    <div className="event-stream">
      {recent.map((event) => (
        <article key={event.id} className={`event-stream__item tone-${event.tone}`}>
          <div className="event-stream__meta">
            <span>Tur {event.turn}</span>
            <span>Raund {event.round}</span>
          </div>
          <p>{event.message}</p>
        </article>
      ))}
    </div>
  )
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  meta,
  accent,
  interactive = false,
  active = false,
  onClick,
}: {
  label: string
  value: React.ReactNode
  meta?: React.ReactNode
  accent?: string
  interactive?: boolean
  active?: boolean
  onClick?: () => void
}) {
  const style = accent ? ({ '--accent': accent } as CSSProperties) : undefined
  const className = ['stat-pill', accent ? 'has-accent' : '', interactive ? 'is-interactive' : '', active ? 'is-active' : '']
    .filter(Boolean)
    .join(' ')

  if (onClick) {
    return (
      <button type="button" className={className} style={style} onClick={onClick}>
        <span className="stat-pill__label">{label}</span>
        <strong className="stat-pill__value">{value}</strong>
        {meta ? <span className="stat-pill__meta">{meta}</span> : null}
      </button>
    )
  }

  return (
    <div className={className} style={style}>
      <span className="stat-pill__label">{label}</span>
      <strong className="stat-pill__value">{value}</strong>
      {meta ? <span className="stat-pill__meta">{meta}</span> : null}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTurnBanner(state: GameState) {
  const names = state.playerNames

  if (state.stage === 'CAPITAL_SELECTION') {
    return `${names[state.capitalSelectionPlayer]} başkent seçiyor`
  }

  if (state.stage === 'GAME_OVER' && state.winner) {
    return `${names[state.winner]} kazandı`
  }

  return `${names[state.currentPlayer]} oyuncunun sırası`
}

function getActionPrompt(state: GameState, sourceCity: CityState | null, targetCity: CityState | null) {
  if (state.stage === 'CAPITAL_SELECTION') {
    return 'Sahipsiz bir şehir seç ve Başkent Yap ile onayla.'
  }

  if (state.stage === 'GAME_OVER') {
    return 'Savaş sona erdi. Yeni oyun veya ana sayfa için menüyü kullan.'
  }

  if (!state.actionMode) {
    return state.conquestUsed
      ? 'Ana fetih hakkı kullanıldı. Takviye yapabilir veya turu bitirebilirsin.'
      : 'Bir şehir seç ve harita kartından aksiyon başlat.'
  }

  if (state.actionMode === 'ANNEX') {
    if (!sourceCity) {
      return 'İlhak için kendi şehirlerinden birini kaynak seç.'
    }

    return `${sourceCity.name} hazır. Komşu sahipsiz şehre tıkla → ilhak anında gerçekleşir.`
  }

  if (state.actionMode === 'TRANSFER') {
    if (!sourceCity) {
      return 'İntikal için kaynak şehir seç.'
    }

    if (!targetCity) {
      return `${sourceCity.name} kaynağından dost bir hedef seç.`
    }

    return `${sourceCity.name} → ${targetCity.name} için birlik miktarını ayarla ve onayla.`
  }

  if (!sourceCity) {
    return 'Saldırı için kaynak şehir seç.'
  }

  if (!targetCity) {
    return `${sourceCity.name} hazır. Komşu düşman hedef seç.`
  }

  return `${sourceCity.name} → ${targetCity.name} için gücü ayarla ve onayla.`
}

function getCityActionTags(
  city: CityState,
  state: GameState,
  validAnnexSourceIds: string[],
  validTransferSourceIds: string[],
  validAttackSourceIds: string[],
) {
  const tags: string[] = []

  if (city.owner !== state.currentPlayer || state.stage !== 'PLAYING') {
    return tags
  }

  if (validAnnexSourceIds.includes(city.id) && !state.conquestUsed) {
    tags.push('İlhak')
  }

  if (validTransferSourceIds.includes(city.id)) {
    tags.push('İntikal')
  }

  if (validAttackSourceIds.includes(city.id) && !state.conquestUsed) {
    tags.push('Saldırı')
  }

  if (city.army >= CITY_ARMY_LIMIT) {
    tags.push('Ordu tavan')
  }

  if (city.fortLevel >= CITY_FORT_LIMIT) {
    tags.push('Sur tavan')
  }

  if (city.isCapital) {
    tags.push('Başkent')
  }

  return tags
}

function getModeSummary(state: GameState) {
  if (state.stage === 'CAPITAL_SELECTION') {
    return 'Kurulum'
  }

  if (state.stage === 'GAME_OVER') {
    return 'Zafer'
  }

  if (state.actionMode) {
    return getModeLabel(state.actionMode)
  }

  return state.conquestUsed ? 'Takviye' : 'Serbest'
}

function getConfirmLabel(state: GameState) {
  if (state.stage === 'CAPITAL_SELECTION') {
    return 'Başkent Yap'
  }

  return 'Onayla'
}

function getConfirmReady(state: GameState) {
  if (state.stage === 'CAPITAL_SELECTION') {
    return Boolean(state.selectedCityId)
  }

  if (state.stage !== 'PLAYING' || !state.actionMode) {
    return false
  }

  if (state.actionMode === 'ANNEX') {
    return Boolean(state.actionSourceCityId && state.actionTargetCityId)
  }

  return Boolean(state.actionSourceCityId && state.actionTargetCityId && state.actionAmount > 0)
}

// ─── App ─────────────────────────────────────────────────────────────────────

const POPUP_CLOSE_DELAY = 30_000 // 30 seconds

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadSavedGame)
  const [isLogOpen, setIsLogOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCardsOpen, setIsCardsOpen] = useState(false)
  const [isCityPopoverPinned, setIsCityPopoverPinned] = useState(false)
  const [isCityPopoverHovered, setIsCityPopoverHovered] = useState(false)
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Theme: apply data-player attribute to root whenever current player changes
  useEffect(() => {
    document.documentElement.setAttribute('data-player', state.currentPlayer)

    return () => {
      document.documentElement.removeAttribute('data-player')
    }
  }, [state.currentPlayer])

  // ── ESC key: cascading dismiss (dialogs → card use → action mode → selection)
  useEffect(() => {
    function handleEsc(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (isLogOpen) { setIsLogOpen(false); return }
      if (isMenuOpen) { setIsMenuOpen(false); return }
      if (isCardsOpen) { setIsCardsOpen(false); return }
      if (state.pendingCardUse) { dispatch({ type: 'CANCEL_CARD_USE' }); return }
      closePopup()
      if (state.actionMode || state.selectedCityId) {
        dispatch({ type: 'CLEAR_ACTION_SELECTION' })
      }
    }

    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  })

  // ── Save on every state change
  useEffect(() => {
    saveGame(state)
  }, [state])

  // ── Popup: 30-second auto-close timer
  useEffect(() => {
    if (!state.selectedCityId) {
      clearPopupTimer()
      return
    }

    resetPopupTimer()
    return clearPopupTimer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedCityId])

  function clearPopupTimer() {
    if (popupTimerRef.current !== null) {
      clearTimeout(popupTimerRef.current)
      popupTimerRef.current = null
    }
  }

  function resetPopupTimer() {
    clearPopupTimer()
    popupTimerRef.current = setTimeout(() => {
      dispatch({ type: 'CLEAR_ACTION_SELECTION' })
      setIsCityPopoverPinned(false)
    }, POPUP_CLOSE_DELAY)
  }

  function closePopup() {
    clearPopupTimer()
    setIsCityPopoverPinned(false)
    setIsCityPopoverHovered(false)
  }

  // Called when user clicks the map background (not a city)
  function handleMapBackgroundClick() {
    closePopup()
    if (state.actionMode || state.selectedCityId) {
      dispatch({ type: 'CLEAR_ACTION_SELECTION' })
    }
  }

  const names = state.playerNames

  const selectedCity = state.selectedCityId ? state.cities[state.selectedCityId] : null
  const sourceCity = state.actionSourceCityId ? state.cities[state.actionSourceCityId] : null
  const targetCity = state.actionTargetCityId ? state.cities[state.actionTargetCityId] : null
  const preview = useMemo(() => getCurrentPreview(state), [state])
  const round = getRoundNumber(state.turn)
  const validAnnexSourceIds = useMemo(() => getExpandableSourceIds(state), [state])
  const validTransferSourceIds = useMemo(() => getTransferSourceIds(state), [state])
  const validAttackSourceIds = useMemo(() => getAttackSourceIds(state), [state])
  const validAnnexTargetIds = useMemo(
    () => getExpandableTargetIdsForSource(state, state.actionSourceCityId),
    [state],
  )
  const validTransferTargetIds = useMemo(
    () => getTransferTargetIdsForSource(state, state.actionSourceCityId),
    [state],
  )
  const validAttackTargetIds = useMemo(
    () => getAttackTargetIdsForSource(state, state.actionSourceCityId),
    [state],
  )
  const globalAnnexableTargetIds = useMemo(
    () => getAllAnnexableTargetIds(state),
    [state],
  )
  const capitalForbiddenIds = useMemo(() => getCapitalForbiddenIds(state), [state])

  const currentPlayerState = state.players[state.currentPlayer]
  const currentIncome = getPlayerIncome(state, state.currentPlayer)
  const selectedCityActionTags = selectedCity
    ? getCityActionTags(selectedCity, state, validAnnexSourceIds, validTransferSourceIds, validAttackSourceIds)
    : []
  const canBuildArmy = canBuildArmyInCity(state, selectedCity?.id ?? null)
  const canBuildFort = canBuildFortInCity(state, selectedCity?.id ?? null)
  const cityPopoverOpen = Boolean(selectedCity && (isCityPopoverPinned || isCityPopoverHovered))
  const confirmReady = getConfirmReady(state)
  const confirmLabel = getConfirmLabel(state)
  const statusLine = state.pendingCardUse
    ? `${CARD_CATALOG[state.pendingCardUse.type].name} kartı aktif — hedefi haritadan seç. (ESC ile iptal)`
    : getActionPrompt(state, sourceCity, targetCity)
  const transferAmountMax =
    sourceCity && state.actionMode === 'TRANSFER'
      ? Math.max(1, Math.min(sourceCity.readyArmy - 1, CITY_ARMY_LIMIT - (targetCity?.army ?? 0)))
      : sourceCity && state.actionMode === 'ATTACK'
        ? Math.max(1, sourceCity.readyArmy - 1)
        : sourceCity
          ? Math.max(1, sourceCity.readyArmy - 1)
          : 1

  const startModeFromCity = (mode: ActionMode, cityId: string) => {
    if (state.stage !== 'PLAYING') {
      return
    }

    if (state.actionMode === mode && state.actionSourceCityId === cityId) {
      return
    }

    dispatch({ type: 'SET_ACTION_MODE', mode })
    dispatch({ type: 'SELECT_CITY', cityId })
  }

  const handleCitySelect = (cityId: string) => {
    resetPopupTimer()
    // Hedef gerektiren bir kart kullanımı aktifse, tıklama doğrudan kart için hedef olur.
    if (state.pendingCardUse) {
      dispatch({ type: 'USE_CARD_ON_CITY', cardType: state.pendingCardUse.type, cityId })
      return
    }
    dispatch({ type: 'SELECT_CITY', cityId })
  }

  const handleClear = () => {
    closePopup()
    setIsLogOpen(false)
    setIsMenuOpen(false)

    if (state.actionMode || state.actionSourceCityId || state.actionTargetCityId) {
      dispatch({ type: 'CLEAR_ACTION_SELECTION' })
    }
  }

  const handleConfirm = () => {
    if (state.stage === 'CAPITAL_SELECTION') {
      playCapitalSfx()
      dispatch({ type: 'CONFIRM_CAPITAL' })
      return
    }

    if (state.actionMode === 'ATTACK') playAttackSfx()
    else if (state.actionMode === 'ANNEX') playAnnexSfx()
    else playClickSfx()

    dispatch({ type: 'CONFIRM_ACTION' })
  }

  const selectedCityEspionageLock = selectedCity ? getCityEspionageLock(state, selectedCity.id) : 0
  const selectedCityInvested = selectedCity?.investmentApplied ?? false
  const effectiveTaxOnSelected = selectedCity
    ? selectedCity.investmentApplied
      ? selectedCity.baseTax * 2
      : selectedCity.baseTax
    : 0

  const contextCard: MapContextCard | null = selectedCity
    ? {
        cityId: selectedCity.id,
        eyebrow:
          state.stage === 'CAPITAL_SELECTION'
            ? 'Başkent Adayı'
            : state.actionTargetCityId === selectedCity.id
              ? 'Hedef Şehir'
              : state.actionSourceCityId === selectedCity.id
                ? 'Kaynak Şehir'
                : 'Seçili Şehir',
        title: selectedCity.name,
        ownerLabel: getCityOwnerLabel(selectedCity, names),
        ownerTone: selectedCity.owner ?? 'neutral',
        subtitle: `${selectedCity.neighbors.length} komşu • Vergi ${effectiveTaxOnSelected}${selectedCityInvested ? ' (2×)' : ''}`,
        helperText: getActionPrompt(state, sourceCity, targetCity),
        stats: [
          { label: 'Ordu', value: `${selectedCity.army}/${CITY_ARMY_LIMIT}` },
          { label: '⚡', value: selectedCity.readyArmy },
          { label: 'Sur', value: `${selectedCity.fortLevel}/${CITY_FORT_LIMIT}` },
          { label: 'Komşu', value: selectedCity.neighbors.length },
        ],
        tags: [
          ...new Set([
            ...selectedCityActionTags,
            state.actionSourceCityId === selectedCity.id ? 'Kaynak' : '',
            state.actionTargetCityId === selectedCity.id ? 'Hedef' : '',
            selectedCityEspionageLock > 0 ? `Casus: -${selectedCityEspionageLock}` : '',
            selectedCityInvested ? 'Yatırım 2×' : '',
          ].filter(Boolean)),
        ],
        actions:
          state.stage === 'PLAYING' && !state.actionMode && selectedCity.owner === state.currentPlayer
            ? [
                {
                  id: 'build-army',
                  label: `+ Ordu (${ARMY_COST})`,
                  tone: 'ghost',
                  disabled: !canBuildArmy,
                  onClick: () => { playBuildArmySfx(); dispatch({ type: 'BUILD_ARMY', cityId: selectedCity.id }) },
                },
                {
                  id: 'build-fort',
                  label: `+ Sur (${FORT_COST})`,
                  tone: 'ghost',
                  disabled: !canBuildFort,
                  onClick: () => { playBuildFortSfx(); dispatch({ type: 'BUILD_FORT', cityId: selectedCity.id }) },
                },
                ...(validAnnexSourceIds.includes(selectedCity.id) && !state.conquestUsed
                  ? [
                      {
                        id: 'start-annex',
                        label: 'İlhak',
                        tone: 'primary' as const,
                        onClick: () => { playClickSfx(); startModeFromCity('ANNEX', selectedCity.id) },
                      },
                    ]
                  : []),
                ...(validTransferSourceIds.includes(selectedCity.id)
                  ? [
                      {
                        id: 'start-transfer',
                        label: 'İntikal',
                        tone: 'secondary' as const,
                        onClick: () => { playClickSfx(); startModeFromCity('TRANSFER', selectedCity.id) },
                      },
                    ]
                  : []),
                ...(validAttackSourceIds.includes(selectedCity.id) && !state.conquestUsed
                  ? [
                      {
                        id: 'start-attack',
                        label: 'Saldırı',
                        tone: 'danger' as const,
                        onClick: () => { playClickSfx(); startModeFromCity('ATTACK', selectedCity.id) },
                      },
                    ]
                  : []),
              ]
            : [],
        amountControl:
          state.stage === 'PLAYING' &&
          state.actionMode &&
          state.actionMode !== 'ANNEX' &&
          sourceCity &&
          (selectedCity.id === sourceCity.id || selectedCity.id === targetCity?.id)
            ? {
                label: 'Gönderim',
                value: Math.max(1, state.actionAmount || 1),
                min: 1,
                max: transferAmountMax,
                disabled: state.actionMode === 'TRANSFER' ? !targetCity : false,
                onChange: (amount: number) => dispatch({ type: 'SET_ACTION_AMOUNT', amount }),
                remaining: sourceCity.army - Math.max(1, state.actionAmount || 1),
              }
            : undefined,
        preview:
          state.stage === 'PLAYING' && state.actionMode === 'ATTACK' && preview
            ? [
                { label: 'Güç', value: preview.attackAmount },
                { label: 'Savunma', value: preview.defensePower },
                { label: 'Yıkım', value: preview.fortBroken },
                { label: 'Sonuç', value: preview.willCapture ? `${preview.survivors} kalan` : 'Düşmez' },
              ]
            : state.stage === 'PLAYING' &&
                state.actionMode === 'TRANSFER' &&
                sourceCity &&
                targetCity &&
                (selectedCity.id === sourceCity.id || selectedCity.id === targetCity.id)
              ? [
                  { label: 'Gönderim', value: state.actionAmount || 0 },
                  { label: 'Hedef', value: `${targetCity.army + (state.actionAmount || 0)}/${CITY_ARMY_LIMIT}` },
                ]
              : undefined,
      }
    : null

  // ── Stage: HOME
  if (state.stage === 'HOME') {
    return <HomeScreen onStart={() => dispatch({ type: 'START_SETUP' })} />
  }

  // ── Stage: SETUP
  if (state.stage === 'SETUP') {
    return (
      <>
        <HomeScreen onStart={() => dispatch({ type: 'START_SETUP' })} />
        <SetupScreen
          onStart={(names) => dispatch({ type: 'SET_PLAYER_NAMES', names })}
        />
      </>
    )
  }

  return (
    <div className="app-shell" data-player={state.currentPlayer}>
      <header className="command-bar">
        <div className="command-bar__top">
          <StatPill
            label="Aktif Oyuncu"
            value={names[state.currentPlayer]}
            meta={getTurnBanner(state)}
            accent={PLAYER_META[state.currentPlayer].accent}
          />
          <StatPill label="Tur" value={`Tur ${round}`} meta={state.stage === 'CAPITAL_SELECTION' ? 'Kurulum' : 'Cephe'} />
          <StatPill label="Kasa" value={`${currentPlayerState.treasury} altın`} meta={`+${currentIncome} gelir`} />
          <VolumeControl />

          <div
            className="city-pill-shell"
            onMouseEnter={() => {
              if (selectedCity) {
                setIsCityPopoverHovered(true)
              }
            }}
            onMouseLeave={() => setIsCityPopoverHovered(false)}
          >
            <StatPill
              label="Seçili Şehir"
              value={selectedCity ? selectedCity.name : 'Şehir seç'}
              meta={selectedCity ? `${getCityOwnerLabel(selectedCity, names)} • ⚔ ${selectedCity.army}  ⚡ ${selectedCity.readyArmy}` : 'Haritadan seç'}
              interactive={Boolean(selectedCity)}
              active={cityPopoverOpen}
              onClick={
                selectedCity
                  ? () => {
                      setIsCityPopoverPinned((current) => !current)
                    }
                  : undefined
              }
            />

            {selectedCity && cityPopoverOpen ? (
              <div className="city-popover">
                <div className="city-popover__header">
                  <div>
                    <span className="section-eyebrow">Şehir Özeti</span>
                    <h3>{selectedCity.name}</h3>
                  </div>
                  <span className={`owner-pill owner-pill--${selectedCity.owner ?? 'neutral'}`}>
                    {getCityOwnerLabel(selectedCity, names)}
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
                {selectedCityActionTags.length > 0 ? (
                  <div className="tag-row">
                    {selectedCityActionTags.map((tag) => (
                      <span key={tag} className="info-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <StatPill
            label="Mod"
            value={getModeSummary(state)}
            meta={state.conquestUsed ? 'Ana hamle kullanıldı' : 'Ana hamle hazır'}
          />
        </div>

        <div className="command-bar__actions">
          <div className="mode-cluster mode-cluster--passive">
            <span className="info-tag">
              {state.stage === 'CAPITAL_SELECTION'
                ? 'Kurulum'
                : state.stage === 'GAME_OVER'
                  ? 'Savaş Sonu'
                  : state.actionMode
                    ? getModeLabel(state.actionMode)
                    : state.conquestUsed
                      ? 'Takviye Modu'
                      : 'Serbest Komut'}
            </span>
            {state.stage === 'PLAYING' && state.conquestUsed ? (
              <span className="info-tag">Ana hamle kullanıldı</span>
            ) : null}
          </div>
        </div>

        <div className="status-strip">{statusLine}</div>
      </header>

      <main className="board-area">
        <TurkeyMapBoard
          cities={state.cities}
          currentPlayer={state.currentPlayer}
          stage={state.stage}
          actionMode={state.actionMode}
          selectedCityId={state.selectedCityId}
          sourceCityId={state.actionSourceCityId}
          targetCityId={state.actionTargetCityId}
          validAnnexSourceIds={validAnnexSourceIds}
          validAnnexTargetIds={validAnnexTargetIds}
          validTransferSourceIds={validTransferSourceIds}
          validTransferTargetIds={validTransferTargetIds}
          validAttackSourceIds={validAttackSourceIds}
          validAttackTargetIds={validAttackTargetIds}
          validCapitalForbiddenIds={capitalForbiddenIds}
          globalAnnexableTargetIds={globalAnnexableTargetIds}
          playerNames={names}
          onCitySelect={handleCitySelect}
          onMapBackgroundClick={handleMapBackgroundClick}
          contextCard={contextCard}
        />

        {state.stage !== 'GAME_OVER' ? (
          <>
            <div className="corner-actions corner-actions--secondary">
              <button className="button button--ghost button--compact" onClick={handleClear}>
                Temizle
              </button>
              <button className="button button--ghost button--compact" onClick={() => setIsCardsOpen(true)}>
                Kartlar
              </button>
              <button className="button button--ghost button--compact" onClick={() => setIsLogOpen(true)}>
                Günlük
              </button>
              <button className="button button--ghost button--compact" onClick={() => setIsMenuOpen(true)}>
                Menü
              </button>
            </div>

            <div className="corner-actions corner-actions--primary">
              {state.stage === 'PLAYING' ? (
                <button className="button button--ghost corner-button" onClick={() => { playEndTurnSfx(); dispatch({ type: 'END_TURN' }) }}>
                  Turu Bitir
                </button>
              ) : null}
              {(state.stage === 'CAPITAL_SELECTION' || state.actionMode) && (
                <button className="button button--primary corner-button" onClick={handleConfirm} disabled={!confirmReady}>
                  {confirmLabel}
                </button>
              )}
            </div>
          </>
        ) : null}
      </main>

      {isLogOpen ? (
        <Dialog className="overlay-card--wide">
          <div className="modal-head">
            <div>
              <p className="section-eyebrow">Olay Günlüğü</p>
              <h2>Son kararlar</h2>
            </div>
            <button className="button button--ghost button--compact" onClick={() => setIsLogOpen(false)}>
              Kapat
            </button>
          </div>
          <EventStream events={state.events} />
        </Dialog>
      ) : null}

      {isMenuOpen ? (
        <Dialog className="overlay-card--narrow">
          <div className="modal-head">
            <div>
              <p className="section-eyebrow">Oyun Menüsü</p>
              <h2>Hızlı işlemler</h2>
            </div>
            <button className="button button--ghost button--compact" onClick={() => setIsMenuOpen(false)}>
              Kapat
            </button>
          </div>
          <div className="menu-stack">
            <button className="button button--primary" onClick={() => { setIsMenuOpen(false); dispatch({ type: 'START_SETUP' }) }}>
              Yeni oyun
            </button>
            <button
              className="button button--ghost"
              onClick={() => {
                clearSavedGame()
                dispatch({ type: 'RETURN_HOME' })
              }}
            >
              Ana sayfa
            </button>
          </div>
        </Dialog>
      ) : null}

      {isCardsOpen ? (
        <CardsDialog
          state={state}
          activePlayer={state.currentPlayer}
          onClose={() => setIsCardsOpen(false)}
          onBuy={(cardType: CardType) => { playClickSfx(); dispatch({ type: 'BUY_CARD', cardType }) }}
          onBeginUse={(cardType: CardType) => {
            playClickSfx()
            dispatch({ type: 'BEGIN_CARD_USE', cardType })
            setIsCardsOpen(false)
          }}
          onUseSelf={(cardType: CardType) => {
            playClickSfx()
            dispatch({ type: 'USE_CARD_SELF', cardType })
          }}
          onCancelUse={() => dispatch({ type: 'CANCEL_CARD_USE' })}
        />
      ) : null}

      {state.stage === 'GAME_OVER' && state.winner && state.victorySummary ? (
        <Dialog className="victory-card">
          <p className="section-eyebrow">Büyük Zafer</p>
          <h2>{names[state.winner]}</h2>
          <p className="victory-card__lead">
            {state.victorySummary.cityName} başkenti düştü. {state.victorySummary.attackingCityName} şehrinden çıkan
            {` ${state.victorySummary.attackAmount}`} birlikten {state.victorySummary.survivors} kadarı şehri ele
            geçirerek savaşı bitirdi.
          </p>
          <div className="victory-card__actions">
            <button className="button button--primary" onClick={() => dispatch({ type: 'START_SETUP' })}>
              Yeni savaşa başla
            </button>
            <button
              className="button button--ghost"
              onClick={() => {
                clearSavedGame()
                dispatch({ type: 'RETURN_HOME' })
              }}
            >
              Ana sayfa
            </button>
          </div>
        </Dialog>
      ) : null}
    </div>
  )
}
