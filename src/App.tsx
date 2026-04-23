import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { TurkeyMapBoard, type MapContextCard } from './ui/TurkeyMapBoard'
import { VolumeControl } from './ui/topbar/VolumeControl'
import { CardsDialog } from './ui/CardsDialog'
import { BoardCornerActions } from './ui/hud/BoardCornerActions'
import { CityPopover } from './ui/hud/CityPopover'
import { Dialog } from './ui/hud/Dialog'
import { EventStream } from './ui/hud/EventStream'
import { MapLegend } from './ui/hud/MapLegend'
import { StatPill } from './ui/hud/StatPill'
import { HomeScreen } from './ui/screens/HomeScreen'
import { SetupScreen } from './ui/screens/SetupScreen'
import { playAttackSfx, playAnnexSfx, playBuildFortSfx, playBuildArmySfx, playClickSfx, playEndTurnSfx, playCapitalSfx } from './engine/sfxManager'
import { clearSavedGame, loadSavedGame, saveGame } from './game/storage'
import {
  ARMY_COST,
  canBuildArmyInCity,
  canBuildFortInCity,
  CITY_ARMY_LIMIT,
  CITY_FORT_LIMIT,
  FORT_COST,
  gameReducer,
  getAllAnnexableTargetIds,
  getAttackSourceIds,
  getAttackTargetIdsForSource,
  getCapitalForbiddenIds,
  getCardTargetIds,
  getCityEspionageLock,
  getCityOwnerLabel,
  getCurrentPreview,
  getExpandableSourceIds,
  getExpandableTargetIdsForSource,
  getPlayerIncome,
  getRoundNumber,
  getTransferSourceIds,
  getTransferTargetIdsForSource,
  PLAYER_META,
} from './game/state'
import { CARD_CATALOG, type CardType } from './game/cards'
import {
  getActionPrompt,
  getCityActionTags,
  getConfirmLabel,
  getConfirmReady,
  getModeSummary,
  getPhaseSummary,
  getSecondaryHint,
  getSelectedCityPlaceholder,
  getTurnBanner,
  getTurnMeta,
  isEndTurnPrimary,
  isModePillCancelable,
} from './game/ui'
import type { ActionMode } from './game/types'

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
  const pendingCardType = state.pendingCardUse?.type ?? null
  const cardTargetIds = useMemo(
    () => (pendingCardType ? getCardTargetIds(state, pendingCardType) : []),
    [state, pendingCardType],
  )

  const currentPlayerState = state.players[state.currentPlayer]
  const currentIncome = getPlayerIncome(state, state.currentPlayer)
  const selectedCityActionTags = selectedCity
    ? getCityActionTags(selectedCity, state, validAnnexSourceIds, validTransferSourceIds, validAttackSourceIds)
    : []
  const canBuildArmy = canBuildArmyInCity(state, selectedCity?.id ?? null)
  const canBuildFort = canBuildFortInCity(state, selectedCity?.id ?? null)
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
          onCancel={() => dispatch({ type: 'RETURN_HOME' })}
        />
      </>
    )
  }

  const phaseSummary = getPhaseSummary(state)
  const turnMeta = getTurnMeta(state)
  const emptyCityPlaceholder = getSelectedCityPlaceholder(state)
  const secondaryHint = getSecondaryHint(state)
  const modeCancelable = isModePillCancelable(state)
  const endTurnPrimary = isEndTurnPrimary(state)
  const modeLabel = getModeSummary(state)
  // Faz/hamle durumu yalnızca Aktif Oyuncu meta'sında (phaseSummary) yaşar.
  // Mod pill meta'sı sadece "iptal edilebilir" bağlamını taşır; aksi halde
  // gizli — böylece aynı bilgi iki yerde görünmez.
  const modeMeta = modeCancelable ? 'İptal için tıkla' : undefined

  return (
    <div className="app-shell" data-player={state.currentPlayer}>
      <header className="command-bar">
        <div className="command-bar__top">
          <StatPill
            label="Aktif Oyuncu"
            value={names[state.currentPlayer]}
            meta={phaseSummary}
            accent={PLAYER_META[state.currentPlayer].accent}
            title={getTurnBanner(state)}
          />
          <StatPill
            label="Tur"
            value={`Tur ${round}`}
            meta={turnMeta}
            title={`${round}. tur`}
          />
          <StatPill
            label="Kasa"
            value={`${currentPlayerState.treasury} altın`}
            meta={`+${currentIncome} tur geliri`}
            title="Kasadaki toplam altın ve bir sonraki tur başı beklenen vergi"
          />
          <VolumeControl />

          <CityPopover
            selectedCity={selectedCity}
            playerNames={names}
            isHovered={isCityPopoverHovered}
            isPinned={isCityPopoverPinned}
            tags={selectedCityActionTags}
            emptyPlaceholder={emptyCityPlaceholder}
            emptyMeta="Haritadan tıkla"
            onHoverChange={setIsCityPopoverHovered}
            onTogglePin={() => setIsCityPopoverPinned((current) => !current)}
          />

          <StatPill
            label="Mod"
            value={modeLabel}
            meta={modeMeta}
            interactive={modeCancelable}
            active={modeCancelable}
            tone={modeCancelable ? 'alert' : 'neutral'}
            onClick={modeCancelable ? handleClear : undefined}
            title={modeCancelable ? 'Aktif aksiyonu iptal et' : undefined}
            ariaLabel={modeCancelable ? `${modeLabel} modunu iptal et` : undefined}
          />
        </div>

        <div className="status-strip" role="status" aria-live="polite">
          <span className="status-strip__primary">{statusLine}</span>
          {secondaryHint ? (
            <span className="status-strip__secondary">{secondaryHint}</span>
          ) : null}
        </div>
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
          pendingCardType={pendingCardType}
          cardTargetIds={cardTargetIds}
          playerNames={names}
          onCitySelect={handleCitySelect}
          onMapBackgroundClick={handleMapBackgroundClick}
          contextCard={contextCard}
        />

        <MapLegend stage={state.stage} actionMode={state.actionMode} pendingCardType={pendingCardType} />

        <BoardCornerActions
          stage={state.stage}
          actionMode={state.actionMode}
          confirmReady={confirmReady}
          confirmLabel={confirmLabel}
          endTurnPrimary={endTurnPrimary}
          onOpenMenu={() => setIsMenuOpen(true)}
          onOpenCards={() => setIsCardsOpen(true)}
          onOpenLog={() => setIsLogOpen(true)}
          onClear={handleClear}
          onEndTurn={() => {
            playEndTurnSfx()
            dispatch({ type: 'END_TURN' })
          }}
          onConfirm={handleConfirm}
        />
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
          <EventStream events={state.events} playerNames={names} />
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
