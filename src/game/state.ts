import { CITY_DEFINITIONS, getCityBaseTaxByName } from '../data/cityDefinitions'
import type { ActionMode, AttackPreview, CityState, EventTone, GameAction, GameState, PlayerId } from './types'

export const GAME_STATE_VERSION = 2
export const STARTING_CAPITAL_ARMY = 6
export const STARTING_CAPITAL_FORT = 1
export const NEUTRAL_CAPTURE_GARRISON = 1
export const CITY_ARMY_LIMIT = 50
export const CITY_FORT_LIMIT = 10
export const STARTING_TREASURY = 2000
export const ARMY_COST = 1000
export const FORT_COST = 1000
export const CAPITAL_DEFENSE_BONUS = 1

export const PLAYER_META: Record<
  PlayerId,
  { label: string; shortLabel: string; accent: string; border: string; surface: string }
> = {
  P1: {
    label: 'Mavi Komutanlık',
    shortLabel: 'Mavi',
    accent: '#3f80ff',
    border: '#9dc0ff',
    surface: 'rgba(33, 73, 132, 0.24)',
  },
  P2: {
    label: 'Kırmızı Komutanlık',
    shortLabel: 'Kırmızı',
    accent: '#d5614d',
    border: '#f1a18f',
    surface: 'rgba(133, 47, 33, 0.22)',
  },
}

export const DEFAULT_PLAYER_NAMES: Record<PlayerId, string> = {
  P1: 'Mavi Komutanlık',
  P2: 'Kırmızı Komutanlık',
}

function buildBidirectionalNeighbors(definitionId: string) {
  const definition = CITY_DEFINITIONS.find((city) => city.id === definitionId)

  if (!definition) {
    return []
  }

  const neighborSet = new Set(definition.neighbors)

  for (const candidate of CITY_DEFINITIONS) {
    if (candidate.id !== definition.id && candidate.neighbors.includes(definition.id)) {
      neighborSet.add(candidate.id)
    }
  }

  return [...neighborSet].sort((left, right) => left.localeCompare(right))
}

function createCities(): Record<string, CityState> {
  return CITY_DEFINITIONS.reduce<Record<string, CityState>>((accumulator, city) => {
    accumulator[city.id] = {
      id: city.id,
      name: city.name,
      neighbors: buildBidirectionalNeighbors(city.id),
      owner: null,
      isCapital: false,
      army: 0,
      readyArmy: 0,
      fortLevel: 0,
      baseTax: getCityBaseTaxByName(city.name),
    }
    return accumulator
  }, {})
}

function createPlayers(): GameState['players'] {
  return {
    P1: {
      id: 'P1',
      treasury: STARTING_TREASURY,
      lastCollectedTax: 0,
    },
    P2: {
      id: 'P2',
      treasury: STARTING_TREASURY,
      lastCollectedTax: 0,
    },
  }
}

export function createInitialGameState(): GameState {
  return {
    version: GAME_STATE_VERSION,
    stage: 'HOME',
    currentPlayer: 'P1',
    capitalSelectionPlayer: 'P1',
    turn: 1,
    selectedCityId: null,
    actionMode: null,
    actionSourceCityId: null,
    actionTargetCityId: null,
    actionAmount: 0,
    conquestUsed: false,
    statusMessage: 'Yeni oyunu başlatın.',
    winner: null,
    victorySummary: null,
    cities: createCities(),
    players: createPlayers(),
    playerNames: { P1: DEFAULT_PLAYER_NAMES.P1, P2: DEFAULT_PLAYER_NAMES.P2 },
    events: [],
    nextEventId: 1,
  }
}

export function createSetupState(): GameState {
  return {
    ...createInitialGameState(),
    stage: 'SETUP',
    statusMessage: 'Komutanlık isimlerini belirleyin.',
  }
}

export function createNewGameState(playerNames?: Record<PlayerId, string>): GameState {
  return {
    ...createInitialGameState(),
    stage: 'CAPITAL_SELECTION',
    playerNames: playerNames ?? { P1: DEFAULT_PLAYER_NAMES.P1, P2: DEFAULT_PLAYER_NAMES.P2 },
    statusMessage: 'Mavi komutanlık için boş bir şehir seçin ve başkent olarak onaylayın.',
  }
}

export function getOpponentId(playerId: PlayerId): PlayerId {
  return playerId === 'P1' ? 'P2' : 'P1'
}

export function getRoundNumber(turn: number): number {
  return Math.ceil(turn / 2)
}

function getCity(state: GameState, cityId: string | null): CityState | null {
  if (!cityId) {
    return null
  }

  return state.cities[cityId] ?? null
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
}

function setCityArmy(city: CityState, army: number, readyArmy = city.readyArmy): CityState {
  const safeArmy = clamp(Math.trunc(army), 0, CITY_ARMY_LIMIT)
  const safeReadyArmy = clamp(Math.trunc(readyArmy), 0, safeArmy)
  return {
    ...city,
    army: safeArmy,
    readyArmy: safeReadyArmy,
  }
}

function setCityFort(city: CityState, fortLevel: number): CityState {
  return {
    ...city,
    fortLevel: clamp(Math.trunc(fortLevel), 0, CITY_FORT_LIMIT),
  }
}

function createEvent(state: GameState, tone: EventTone, message: string): GameState {
  return {
    ...state,
    events: [
      {
        id: state.nextEventId,
        turn: state.turn,
        round: getRoundNumber(state.turn),
        tone,
        message,
      },
      ...state.events,
    ].slice(0, 48),
    nextEventId: state.nextEventId + 1,
  }
}

function withStatus(state: GameState, statusMessage: string, tone?: EventTone): GameState {
  const nextState = {
    ...state,
    statusMessage,
  }

  return tone ? createEvent(nextState, tone, statusMessage) : nextState
}

function clearActionPlan(state: GameState): GameState {
  return {
    ...state,
    actionMode: null,
    actionSourceCityId: null,
    actionTargetCityId: null,
    actionAmount: 0,
  }
}

function resetActionPlanForMode(state: GameState, mode: ActionMode, statusMessage: string): GameState {
  return {
    ...state,
    actionMode: mode,
    actionSourceCityId: null,
    actionTargetCityId: null,
    actionAmount: 0,
    statusMessage,
  }
}

export function getPlayerCities(state: GameState, playerId: PlayerId): CityState[] {
  return Object.values(state.cities).filter((city) => city.owner === playerId)
}

export function getPlayerCityCount(state: GameState, playerId: PlayerId): number {
  return getPlayerCities(state, playerId).length
}

export function getPlayerArmyTotal(state: GameState, playerId: PlayerId): number {
  return getPlayerCities(state, playerId).reduce((total, city) => total + city.army, 0)
}

export function getPlayerCapital(state: GameState, playerId: PlayerId): CityState | null {
  return getPlayerCities(state, playerId).find((city) => city.isCapital) ?? null
}

export function getPlayerIncome(state: GameState, playerId: PlayerId): number {
  return getPlayerCities(state, playerId).reduce((total, city) => total + city.baseTax, 0)
}

export function getCityOwnerLabel(city: CityState, playerNames?: Record<PlayerId, string>): string {
  if (!city.owner) {
    return 'Sahipsiz'
  }

  return playerNames?.[city.owner] ?? PLAYER_META[city.owner].shortLabel
}

export function getModeLabel(actionMode: ActionMode | null): string {
  if (actionMode === 'ANNEX') {
    return 'İlhak'
  }

  if (actionMode === 'TRANSFER') {
    return 'İntikal'
  }

  if (actionMode === 'ATTACK') {
    return 'Saldırı'
  }

  return 'Serbest'
}

function describeFocusedCity(city: CityState | null): string {
  if (!city) {
    return 'Bir şehir seçin.'
  }

  const ownerLabel = getCityOwnerLabel(city)
  const capitalLabel = city.isCapital ? ' Başkent konumunda.' : ''
  return `${city.name}, ${ownerLabel} kontrolünde. Vergi ${city.baseTax}, birlik ${city.army}, hazır birlik ${city.readyArmy}, sur ${city.fortLevel}.${capitalLabel}`
}

function refreshPlayerArmyReadiness(state: GameState, playerId: PlayerId) {
  return Object.entries(state.cities).reduce<GameState['cities']>((accumulator, [cityId, city]) => {
    accumulator[cityId] = city.owner === playerId ? setCityArmy(city, city.army, city.army) : city
    return accumulator
  }, {})
}

function startTurn(state: GameState, playerId: PlayerId, turn: number): GameState {
  const round = getRoundNumber(turn)
  const cities = refreshPlayerArmyReadiness(state, playerId)
  const interimState = {
    ...state,
    cities,
  }
  const income = getPlayerIncome(interimState, playerId)
  const players = {
    ...interimState.players,
    [playerId]: {
      ...interimState.players[playerId],
      treasury: interimState.players[playerId].treasury + income,
      lastCollectedTax: income,
    },
  }

  return {
    ...interimState,
    stage: 'PLAYING',
    currentPlayer: playerId,
    turn,
    players,
    selectedCityId: null,
    actionMode: null,
    actionSourceCityId: null,
    actionTargetCityId: null,
    actionAmount: 0,
    conquestUsed: false,
    victorySummary: null,
    statusMessage: `${state.playerNames?.[playerId] ?? PLAYER_META[playerId].shortLabel} ${round}. turunu başlattı. ${income} altın vergi toplandı.`,
  }
}

export function getCapitalForbiddenIds(state: GameState): string[] {
  // Only relevant when P2 is choosing their capital
  if (state.capitalSelectionPlayer !== 'P2') {
    return []
  }

  const p1Capital = getPlayerCapital(state, 'P1')

  if (!p1Capital) {
    return []
  }

  // P2 cannot select P1's capital or any of its direct neighbors
  return [p1Capital.id, ...p1Capital.neighbors]
}

function selectCapitalCity(state: GameState, cityId: string): GameState {
  const city = state.cities[cityId]

  if (!city) {
    return withStatus(state, 'Bu şehir bulunamadı.')
  }

  if (city.owner) {
    return withStatus(state, 'Başkent seçimi için boş bir şehir seçmeniz gerekiyor.')
  }

  const forbiddenIds = getCapitalForbiddenIds(state)

  if (forbiddenIds.includes(cityId)) {
    const playerName = state.playerNames?.P2 ?? PLAYER_META.P2.shortLabel
    return withStatus(state, `${city.name}, rakip başkentine çok yakın. ${playerName} için bu şehir seçilemez.`)
  }

  return {
    ...state,
    selectedCityId: cityId,
    statusMessage: `${city.name} başkent adayı olarak seçildi. Uygunsa onaylayabilirsiniz.`,
  }
}

function confirmCapital(state: GameState): GameState {
  if (state.stage !== 'CAPITAL_SELECTION') {
    return state
  }

  const selectedCity = getCity(state, state.selectedCityId)

  if (!selectedCity || selectedCity.owner) {
    return withStatus(state, 'Önce boş bir şehir seçmelisiniz.')
  }

  // Enforce adjacency rule: P2 cannot pick a city adjacent to P1's capital
  const forbiddenIds = getCapitalForbiddenIds(state)

  if (forbiddenIds.includes(selectedCity.id)) {
    return withStatus(state, `${selectedCity.name} başkentler arasında yeterli mesafe olmadığı için seçilemez.`)
  }

  const activePlayer = state.capitalSelectionPlayer
  const playerLabel = state.playerNames?.[activePlayer] ?? PLAYER_META[activePlayer].shortLabel
  const nextCities = {
    ...state.cities,
    [selectedCity.id]: setCityFort(
      setCityArmy(
        {
          ...selectedCity,
          owner: activePlayer,
          isCapital: true,
          fortLevel: STARTING_CAPITAL_FORT,
        },
        STARTING_CAPITAL_ARMY,
        0,
      ),
      STARTING_CAPITAL_FORT,
    ),
  }

  const capitalMessage = `${playerLabel} başkentini ${selectedCity.name} olarak belirledi.`
  const capitalState = createEvent(
    {
      ...state,
      cities: nextCities,
      selectedCityId: null,
      statusMessage: capitalMessage,
    },
    'success',
    capitalMessage,
  )

  if (activePlayer === 'P1') {
    const p2Label = state.playerNames?.P2 ?? PLAYER_META.P2.shortLabel
    return {
      ...capitalState,
      capitalSelectionPlayer: 'P2',
      currentPlayer: 'P2',
      statusMessage: `${p2Label} için boş bir şehir seçin. Rakibe komşu şehirler seçilemez.`,
    }
  }

  return createEvent(
    {
      ...startTurn(
        {
          ...capitalState,
          currentPlayer: 'P1',
        },
        'P1',
        1,
      ),
      statusMessage: 'Başkent seçimi tamamlandı. Mavi komutanlık ilk turunda vergi toplayıp komuta başlayabilir.',
    },
    'info',
    'Başkent seçimi tamamlandı. Oyun başladı.',
  )
}

export function getExpandableSourceIds(state: GameState, playerId = state.currentPlayer): string[] {
  return Object.values(state.cities)
    .filter(
      (city) =>
        city.owner === playerId &&
        city.neighbors.some((neighborId) => state.cities[neighborId]?.owner === null),
    )
    .map((city) => city.id)
}

export function getExpandableTargetIdsForSource(state: GameState, sourceCityId: string | null): string[] {
  const source = getCity(state, sourceCityId)

  if (!source || source.owner !== state.currentPlayer) {
    return []
  }

  return source.neighbors.filter((neighborId) => state.cities[neighborId]?.owner === null)
}

export function getTransferSourceIds(state: GameState, playerId = state.currentPlayer): string[] {
  return Object.values(state.cities)
    .filter(
      (city) =>
        city.owner === playerId &&
        city.readyArmy > 1 &&
        city.neighbors.some((neighborId) => {
          const neighbor = state.cities[neighborId]
          return Boolean(neighbor && neighbor.owner === playerId && neighbor.army < CITY_ARMY_LIMIT)
        }),
    )
    .map((city) => city.id)
}

export function getTransferTargetIdsForSource(state: GameState, sourceCityId: string | null): string[] {
  const source = getCity(state, sourceCityId)

  if (!source || source.owner !== state.currentPlayer || source.readyArmy <= 1) {
    return []
  }

  return source.neighbors.filter((neighborId) => {
    const neighbor = state.cities[neighborId]
    return Boolean(neighbor && neighbor.owner === state.currentPlayer && neighbor.army < CITY_ARMY_LIMIT)
  })
}

export function getAttackSourceIds(state: GameState, playerId = state.currentPlayer): string[] {
  return Object.values(state.cities)
    .filter(
      (city) =>
        city.owner === playerId &&
        city.readyArmy > 1 &&
        city.neighbors.some((neighborId) => {
          const neighbor = state.cities[neighborId]
          return Boolean(neighbor && neighbor.owner && neighbor.owner !== playerId)
        }),
    )
    .map((city) => city.id)
}

/** Tüm sahipsiz şehirler içinden, en az bir dost komşusu olan (global ilhak edilebilir) şehirleri döner. */
export function getAllAnnexableTargetIds(state: GameState, playerId = state.currentPlayer): string[] {
  return Object.values(state.cities)
    .filter(
      (city) =>
        city.owner === null &&
        city.neighbors.some((neighborId) => state.cities[neighborId]?.owner === playerId),
    )
    .map((city) => city.id)
}

export function getAttackTargetIdsForSource(state: GameState, sourceCityId: string | null): string[] {
  const source = getCity(state, sourceCityId)

  if (!source || source.owner !== state.currentPlayer || source.readyArmy <= 0) {
    return []
  }

  return source.neighbors.filter((neighborId) => {
    const neighbor = state.cities[neighborId]
    return Boolean(neighbor && neighbor.owner && neighbor.owner !== state.currentPlayer)
  })
}

export function getActionTargets(state: GameState): string[] {
  if (state.actionMode === 'ANNEX') {
    return getExpandableTargetIdsForSource(state, state.actionSourceCityId)
  }

  if (state.actionMode === 'TRANSFER') {
    return getTransferTargetIdsForSource(state, state.actionSourceCityId)
  }

  if (state.actionMode === 'ATTACK') {
    return getAttackTargetIdsForSource(state, state.actionSourceCityId)
  }

  return []
}

export function canCurrentPlayerExpand(state: GameState): boolean {
  return !state.conquestUsed && getExpandableSourceIds(state).length > 0
}

export function canCurrentPlayerTransfer(state: GameState): boolean {
  return getTransferSourceIds(state).length > 0
}

export function canCurrentPlayerAttack(state: GameState): boolean {
  return !state.conquestUsed && getAttackSourceIds(state).length > 0
}

export function canBuildArmyInCity(state: GameState, cityId: string | null): boolean {
  const city = getCity(state, cityId)

  if (!city || city.owner !== state.currentPlayer) {
    return false
  }

  return city.army < CITY_ARMY_LIMIT && state.players[state.currentPlayer].treasury >= ARMY_COST
}

export function canBuildFortInCity(state: GameState, cityId: string | null): boolean {
  const city = getCity(state, cityId)

  if (!city || city.owner !== state.currentPlayer) {
    return false
  }

  return city.fortLevel < CITY_FORT_LIMIT && state.players[state.currentPlayer].treasury >= FORT_COST
}

function getTransferAmountMax(source: CityState, target: CityState | null) {
  // Always leave at least 1 unit in the source city
  const capacity = target ? CITY_ARMY_LIMIT - target.army : CITY_ARMY_LIMIT
  return Math.max(0, Math.min(source.readyArmy - 1, capacity))
}

function getActionAmountMax(state: GameState, source: CityState | null, target: CityState | null) {
  if (!source) {
    return 0
  }

  if (state.actionMode === 'TRANSFER') {
    return getTransferAmountMax(source, target)
  }

  if (state.actionMode === 'ATTACK') {
    // Garnizon kuralı: kaynak şehirde en az 1 birlik kalmalı
    return Math.max(0, source.readyArmy - 1)
  }

  return 0
}

function getDefaultActionAmount(state: GameState, source: CityState | null, target: CityState | null) {
  const max = getActionAmountMax(state, source, target)
  return max > 0 ? max : 0
}

function clampActionAmount(state: GameState, amount: number) {
  const source = getCity(state, state.actionSourceCityId)
  const target = getCity(state, state.actionTargetCityId)
  const max = getActionAmountMax(state, source, target)

  if (max <= 0) {
    return 0
  }

  return clamp(Math.trunc(amount), 1, max)
}

function getCapitalDefenseBonus(city: CityState | null) {
  return city?.isCapital ? CAPITAL_DEFENSE_BONUS : 0
}

export function getCurrentPreview(state: GameState): AttackPreview | null {
  const source = getCity(state, state.actionSourceCityId)
  const target = getCity(state, state.actionTargetCityId)

  if (!source || !target || state.actionMode !== 'ATTACK') {
    return null
  }

  const attackAmount = clampActionAmount(state, state.actionAmount)

  if (attackAmount <= 0 || target.owner === null || target.owner === state.currentPlayer) {
    return null
  }

  const fortBroken = Math.min(target.fortLevel, Math.floor(attackAmount / 2))
  const fortAfter = target.fortLevel - fortBroken
  const capitalBonus = getCapitalDefenseBonus(target)
  const defensePower = target.army + fortAfter + capitalBonus
  const survivors = Math.max(0, attackAmount - defensePower)

  return {
    attackAmount,
    sourceArmy: source.army,
    readyArmy: source.readyArmy,
    defenderArmy: target.army,
    fortBefore: target.fortLevel,
    fortBroken,
    fortAfter,
    capitalBonus,
    defensePower,
    survivors,
    willCapture: attackAmount > defensePower,
  }
}

function selectAnnexCity(state: GameState, cityId: string): GameState {
  const city = state.cities[cityId]

  if (!city) {
    return withStatus(state, 'Bu şehir bulunamadı.')
  }

  if (city.owner === state.currentPlayer) {
    const targets = getExpandableTargetIdsForSource(state, cityId)

    if (targets.length === 0) {
      return {
        ...state,
        selectedCityId: cityId,
        actionSourceCityId: cityId,
        actionTargetCityId: null,
        actionAmount: 0,
        statusMessage: `${city.name} üzerinden ilhak yapılamaz; komşu sahipsiz şehir yok.`,
      }
    }

    return {
      ...state,
      selectedCityId: cityId,
      actionSourceCityId: cityId,
      actionTargetCityId: null,
      actionAmount: 0,
      statusMessage: `${city.name} ilhak kaynağı olarak seçildi. Şimdi komşu sahipsiz hedefi seçin.`,
    }
  }

  if (city.owner === null) {
    const validTargets = getExpandableTargetIdsForSource(state, state.actionSourceCityId)

    if (!state.actionSourceCityId) {
      return {
        ...state,
        selectedCityId: cityId,
        statusMessage: `${city.name} sahipsiz. Önce ona komşu olan kendi şehrinizi seçin.`,
      }
    }

    if (!validTargets.includes(cityId)) {
      return {
        ...state,
        selectedCityId: cityId,
        statusMessage: `${city.name}, seçtiğiniz kaynak şehre komşu değil.`,
      }
    }

    // Auto-execute annex immediately — no extra confirm step
    return confirmAnnex({
      ...state,
      selectedCityId: cityId,
      actionTargetCityId: cityId,
    })
  }

  return {
    ...state,
    selectedCityId: cityId,
    statusMessage: 'İlhak modu yalnızca kendi şehriniz ve komşu sahipsiz şehirler için kullanılabilir.',
  }
}

function selectTransferCity(state: GameState, cityId: string): GameState {
  const city = state.cities[cityId]

  if (!city) {
    return withStatus(state, 'Bu şehir bulunamadı.')
  }

  const currentSource = getCity(state, state.actionSourceCityId)

  if (!currentSource || currentSource.id === cityId || !currentSource.neighbors.includes(cityId)) {
    if (city.owner !== state.currentPlayer) {
      return {
        ...state,
        selectedCityId: cityId,
        statusMessage: 'İntikal için önce kendi ve hareket edebilecek bir şehir seçmelisiniz.',
      }
    }

    const targets = getTransferTargetIdsForSource(state, cityId)

    if (city.readyArmy <= 0) {
      return {
        ...state,
        selectedCityId: cityId,
        actionSourceCityId: cityId,
        actionTargetCityId: null,
        actionAmount: 0,
        statusMessage: `${city.name} şehrindeki tüm birlikler bu tur yorulmuş durumda.`,
      }
    }

    if (targets.length === 0) {
      return {
        ...state,
        selectedCityId: cityId,
        actionSourceCityId: cityId,
        actionTargetCityId: null,
        actionAmount: 0,
        statusMessage: `${city.name} şehrinin uygun dost hedefi yok veya komşular dolu.`,
      }
    }

    return {
      ...state,
      selectedCityId: cityId,
      actionSourceCityId: cityId,
      actionTargetCityId: null,
      actionAmount: getDefaultActionAmount(state, city, null),
      statusMessage: `${city.name} intikal kaynağı olarak seçildi. Şimdi komşu dost hedefi seçin.`,
    }
  }

  if (city.owner !== state.currentPlayer) {
    return {
      ...state,
      selectedCityId: cityId,
      statusMessage: 'İntikal yalnızca dost şehirler arasında yapılabilir.',
    }
  }

  const maxAmount = getTransferAmountMax(currentSource, city)

  if (maxAmount <= 0) {
    return {
      ...state,
      selectedCityId: cityId,
      statusMessage: `${city.name} şehrinde yer kalmadı.`,
    }
  }

  return {
    ...state,
    selectedCityId: cityId,
    actionTargetCityId: cityId,
    actionAmount: clamp(state.actionAmount || maxAmount, 1, maxAmount),
    statusMessage: `${city.name} intikal hedefi olarak seçildi. Gönderilecek birlik sayısını ayarlayın.`,
  }
}

function selectAttackCity(state: GameState, cityId: string): GameState {
  const city = state.cities[cityId]

  if (!city) {
    return withStatus(state, 'Bu şehir bulunamadı.')
  }

  const currentSource = getCity(state, state.actionSourceCityId)

  if (!currentSource || currentSource.id === cityId || !currentSource.neighbors.includes(cityId)) {
    if (city.owner !== state.currentPlayer) {
      return {
        ...state,
        selectedCityId: cityId,
        statusMessage: 'Saldırı için önce kendi ve hazır birlik barındıran bir şehir seçmelisiniz.',
      }
    }

    const targets = getAttackTargetIdsForSource(state, cityId)

    if (city.readyArmy <= 0) {
      return {
        ...state,
        selectedCityId: cityId,
        actionSourceCityId: cityId,
        actionTargetCityId: null,
        actionAmount: 0,
        statusMessage: `${city.name} şehrinde saldırıya çıkabilecek hazır birlik yok.`,
      }
    }

    if (targets.length === 0) {
      return {
        ...state,
        selectedCityId: cityId,
        actionSourceCityId: cityId,
        actionTargetCityId: null,
        actionAmount: 0,
        statusMessage: `${city.name} düşman sınırına temas etmiyor; bu şehirden saldırı yapılamaz.`,
      }
    }

    return {
      ...state,
      selectedCityId: cityId,
      actionSourceCityId: cityId,
      actionTargetCityId: null,
      actionAmount: getDefaultActionAmount(state, city, null),
      statusMessage: `${city.name} saldırı kaynağı olarak seçildi. Şimdi komşu düşman şehri seçin.`,
    }
  }

  if (!city.owner || city.owner === state.currentPlayer) {
    return {
      ...state,
      selectedCityId: cityId,
      statusMessage: 'Saldırı hedefi olarak komşu düşman şehir seçmelisiniz.',
    }
  }

  const previewState = {
    ...state,
    actionTargetCityId: cityId,
  }
  const preview = getCurrentPreview(previewState)

  return {
    ...previewState,
    selectedCityId: cityId,
    actionAmount: preview ? preview.attackAmount : state.actionAmount,
    statusMessage: `${city.name} saldırı hedefi olarak seçildi. ${preview?.willCapture ? 'Bu güçle şehir düşebilir.' : 'Bu güçle şehir düşmez.'}`,
  }
}

function selectCity(state: GameState, cityId: string): GameState {
  if (state.stage === 'CAPITAL_SELECTION') {
    return selectCapitalCity(state, cityId)
  }

  if (state.actionMode === 'ANNEX') {
    return selectAnnexCity(state, cityId)
  }

  if (state.actionMode === 'TRANSFER') {
    return selectTransferCity(state, cityId)
  }

  if (state.actionMode === 'ATTACK') {
    return selectAttackCity(state, cityId)
  }

  const city = state.cities[cityId]
  return {
    ...state,
    selectedCityId: cityId,
    statusMessage: describeFocusedCity(city),
  }
}

function setActionMode(state: GameState, mode: ActionMode): GameState {
  if (state.stage !== 'PLAYING') {
    return state
  }

  if (mode === 'ANNEX') {
    if (state.conquestUsed) {
      return withStatus(state, 'Bu tur ana fetih aksiyonu zaten kullanıldı.', 'warning')
    }

    if (!canCurrentPlayerExpand(state)) {
      return withStatus(state, 'İlhak için komşu sahipsiz şehir bulunmuyor.', 'warning')
    }

    return resetActionPlanForMode(state, 'ANNEX', 'İlhak modu açıldı. Önce kaynak, sonra sahipsiz hedef seçin.')
  }

  if (mode === 'TRANSFER') {
    if (!canCurrentPlayerTransfer(state)) {
      return withStatus(state, 'İntikal için uygun şehir veya hazır birlik bulunmuyor.', 'warning')
    }

    return resetActionPlanForMode(state, 'TRANSFER', 'İntikal modu açıldı. Önce kaynak, sonra dost hedef seçin.')
  }

  if (state.conquestUsed) {
    return withStatus(state, 'Bu tur ana fetih aksiyonu zaten kullanıldı.', 'warning')
  }

  if (!canCurrentPlayerAttack(state)) {
    return withStatus(state, 'Saldırı için hazır birlikli ve düşmana komşu bir şehir gerekiyor.', 'warning')
  }

  return resetActionPlanForMode(state, 'ATTACK', 'Saldırı modu açıldı. Önce kaynak, sonra düşman hedefi seçin.')
}

function confirmAnnex(state: GameState): GameState {
  if (state.conquestUsed) {
    return withStatus(state, 'Bu tur ilhak veya saldırı hakkınız kalmadı.')
  }

  const source = getCity(state, state.actionSourceCityId)
  const target = getCity(state, state.actionTargetCityId)

  if (!source || !target || target.owner !== null) {
    return withStatus(state, 'Geçerli bir sahipsiz hedef seçmelisiniz.')
  }

  if (source.owner !== state.currentPlayer || !source.neighbors.includes(target.id)) {
    return withStatus(state, 'Seçilen ilhak hedefi bu kaynak şehre komşu değil.')
  }

  const nextCities = {
    ...state.cities,
    [target.id]: setCityFort(
      setCityArmy(
        {
          ...target,
          owner: state.currentPlayer,
          isCapital: false,
          fortLevel: 0,
        },
        NEUTRAL_CAPTURE_GARRISON,
        0,
      ),
      0,
    ),
  }

  const message = `${PLAYER_META[state.currentPlayer].shortLabel} oyuncu ${target.name} şehrini ücretsiz ilhak etti. Şehir 1 birlikle açıldı.`

  return createEvent(
    {
      ...clearActionPlan({
        ...state,
        cities: nextCities,
        selectedCityId: target.id,
        conquestUsed: true,
        statusMessage: message,
      }),
    },
    'success',
    message,
  )
}

function confirmTransfer(state: GameState): GameState {
  const source = getCity(state, state.actionSourceCityId)
  const target = getCity(state, state.actionTargetCityId)

  if (!source || !target) {
    return withStatus(state, 'İntikal için kaynak ve hedef şehir seçmelisiniz.')
  }

  if (source.owner !== state.currentPlayer || target.owner !== state.currentPlayer) {
    return withStatus(state, 'İntikal yalnızca dost şehirler arasında yapılabilir.')
  }

  if (!source.neighbors.includes(target.id)) {
    return withStatus(state, 'İntikal yalnızca komşu şehirler arasında yapılabilir.')
  }

  const amount = clampActionAmount(state, state.actionAmount)

  if (amount <= 0) {
    return withStatus(state, 'Gönderilecek birlik sayısı geçersiz.')
  }

  if (source.readyArmy < amount) {
    return withStatus(state, 'Kaynak şehirde yeterli hazır birlik yok.')
  }

  if (target.army + amount > CITY_ARMY_LIMIT) {
    return withStatus(state, `${target.name} şehir kapasitesi dolu olduğu için bu kadar birlik alamaz.`)
  }

  const nextSource = setCityArmy(source, source.army - amount, source.readyArmy - amount)
  const nextTarget = setCityArmy(target, target.army + amount, target.readyArmy)
  const nextCities = {
    ...state.cities,
    [source.id]: nextSource,
    [target.id]: nextTarget,
  }
  const message = `${source.name} şehrinden ${target.name} şehrine ${amount} birlik intikal etti. Yeni gelen birlikler bu tur tekrar hareket edemez.`

  return createEvent(
    {
      ...clearActionPlan({
        ...state,
        cities: nextCities,
        selectedCityId: target.id,
        statusMessage: message,
      }),
    },
    'info',
    message,
  )
}

function resolveCapitalVictory(
  state: GameState,
  target: CityState,
  source: CityState,
  attackAmount: number,
  survivors: number,
) {
  const message = `${PLAYER_META[state.currentPlayer].shortLabel} oyuncu ${target.name} başkentini ele geçirerek savaşı kazandı.`

  return createEvent(
    {
      ...clearActionPlan({
        ...state,
        stage: 'GAME_OVER',
        winner: state.currentPlayer,
        selectedCityId: target.id,
        statusMessage: message,
        victorySummary: {
          cityId: target.id,
          cityName: target.name,
          attackingCityName: source.name,
          attackAmount,
          survivors,
        },
      }),
    },
    'success',
    message,
  )
}

function confirmAttack(state: GameState): GameState {
  if (state.conquestUsed) {
    return withStatus(state, 'Bu tur ana fetih aksiyonu zaten kullanıldı.')
  }

  const source = getCity(state, state.actionSourceCityId)
  const target = getCity(state, state.actionTargetCityId)

  if (!source || !target || !target.owner || target.owner === state.currentPlayer) {
    return withStatus(state, 'Saldırı için komşu düşman şehir seçmelisiniz.')
  }

  if (source.owner !== state.currentPlayer || !source.neighbors.includes(target.id)) {
    return withStatus(state, 'Seçilen hedef şehir bu saldırı için geçerli değil.')
  }

  const preview = getCurrentPreview(state)

  if (!preview) {
    return withStatus(state, 'Saldırı gücü hesaplanamadı.')
  }

  if (preview.attackAmount <= 0 || preview.attackAmount > source.readyArmy) {
    return withStatus(state, 'Gönderilecek saldırı gücü geçersiz.')
  }

  const nextSource = setCityArmy(source, source.army - preview.attackAmount, source.readyArmy - preview.attackAmount)

  if (preview.willCapture) {
    const nextTarget = setCityFort(
      setCityArmy(
        {
          ...target,
          owner: state.currentPlayer,
          isCapital: false,
          fortLevel: 0,
        },
        preview.survivors,
        0,
      ),
      0,
    )
    const nextCities = {
      ...state.cities,
      [source.id]: nextSource,
      [target.id]: nextTarget,
    }
    const resolvedState = {
      ...state,
      cities: nextCities,
      selectedCityId: target.id,
      conquestUsed: true,
      statusMessage: `${target.name} ele geçirildi. ${preview.survivors} saldırı birliği şehirde yorulmuş halde konuşlandı.`,
    }

    if (target.isCapital) {
      return resolveCapitalVictory(resolvedState, target, source, preview.attackAmount, preview.survivors)
    }

    return createEvent(
      clearActionPlan(resolvedState),
      'success',
      `${source.name} şehrinden çıkan birlikler ${target.name} şehrini ele geçirdi.`,
    )
  }

  const nextTarget = setCityFort(target, preview.fortAfter)
  const nextCities = {
    ...state.cities,
    [source.id]: nextSource,
    [target.id]: nextTarget,
  }
  const message = `${source.name} şehrinden ${target.name} hedefine yapılan saldırı başarısız oldu. ${preview.fortBroken > 0 ? `Ancak ${preview.fortBroken} sur seviyesi yıkıldı.` : 'Savunma hattı ayakta kaldı.'}`

  return createEvent(
    clearActionPlan({
      ...state,
      cities: nextCities,
      selectedCityId: target.id,
      conquestUsed: true,
      statusMessage: message,
    }),
    'danger',
    message,
  )
}

function confirmAction(state: GameState): GameState {
  if (state.stage !== 'PLAYING') {
    return state
  }

  if (state.actionMode === 'ANNEX') {
    return confirmAnnex(state)
  }

  if (state.actionMode === 'TRANSFER') {
    return confirmTransfer(state)
  }

  if (state.actionMode === 'ATTACK') {
    return confirmAttack(state)
  }

  return withStatus(state, 'Önce bir eylem modu seçmelisiniz.')
}

function spendTreasury(state: GameState, amount: number): GameState['players'] {
  return {
    ...state.players,
    [state.currentPlayer]: {
      ...state.players[state.currentPlayer],
      treasury: state.players[state.currentPlayer].treasury - amount,
    },
  }
}

function buildArmy(state: GameState, cityId?: string): GameState {
  if (state.stage !== 'PLAYING') {
    return state
  }

  const city = getCity(state, cityId ?? state.selectedCityId)

  if (!city || city.owner !== state.currentPlayer) {
    return withStatus(state, 'Ordu basmak için kendi şehirlerinizden birini seçmelisiniz.')
  }

  if (state.players[state.currentPlayer].treasury < ARMY_COST) {
    return withStatus(state, 'Kasada yeterli altın yok.', 'warning')
  }

  if (city.army >= CITY_ARMY_LIMIT) {
    return withStatus(state, `${city.name} şehir kapasitesine ulaştı.`)
  }

  const nextCities = {
    ...state.cities,
    [city.id]: setCityArmy(city, city.army + 1, city.readyArmy),
  }
  const message = `${city.name} şehrine 1 yeni birlik yazıldı. Bu birlik bu tur hareket edemez.`

  return createEvent(
    {
      ...state,
      cities: nextCities,
      players: spendTreasury(state, ARMY_COST),
      selectedCityId: city.id,
      statusMessage: message,
    },
    'info',
    message,
  )
}

function buildFort(state: GameState, cityId?: string): GameState {
  if (state.stage !== 'PLAYING') {
    return state
  }

  const city = getCity(state, cityId ?? state.selectedCityId)

  if (!city || city.owner !== state.currentPlayer) {
    return withStatus(state, 'Sur inşa etmek için kendi şehirlerinizden birini seçmelisiniz.')
  }

  if (state.players[state.currentPlayer].treasury < FORT_COST) {
    return withStatus(state, 'Kasada yeterli altın yok.', 'warning')
  }

  if (city.fortLevel >= CITY_FORT_LIMIT) {
    return withStatus(state, `${city.name} maksimum sur seviyesine ulaştı.`)
  }

  const nextCities = {
    ...state.cities,
    [city.id]: setCityFort(city, city.fortLevel + 1),
  }
  const message = `${city.name} şehrinin sur seviyesi ${nextCities[city.id].fortLevel} oldu.`

  return createEvent(
    {
      ...state,
      cities: nextCities,
      players: spendTreasury(state, FORT_COST),
      selectedCityId: city.id,
      statusMessage: message,
    },
    'info',
    message,
  )
}

function advanceTurn(state: GameState): GameState {
  if (state.stage !== 'PLAYING') {
    return state
  }

  const nextPlayer = getOpponentId(state.currentPlayer)
  const nextTurn = state.turn + 1
  return startTurn(state, nextPlayer, nextTurn)
}

function endTurn(state: GameState): GameState {
  if (state.stage !== 'PLAYING') {
    return state
  }

  const passMessage = `${PLAYER_META[state.currentPlayer].shortLabel} oyuncu turunu tamamladı.`
  const passedState = createEvent(
    {
      ...state,
      statusMessage: passMessage,
    },
    'info',
    passMessage,
  )

  return advanceTurn(passedState)
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_SETUP':
      return createSetupState()

    case 'START_NEW_GAME':
      return createNewGameState(state.playerNames)

    case 'SET_PLAYER_NAMES': {
      const sanitized: Record<PlayerId, string> = {
        P1: action.names.P1.trim() || DEFAULT_PLAYER_NAMES.P1,
        P2: action.names.P2.trim() || DEFAULT_PLAYER_NAMES.P2,
      }
      return {
        ...createNewGameState(sanitized),
        playerNames: sanitized,
      }
    }

    case 'RETURN_HOME':
      return createInitialGameState()

    case 'LOAD_SAVED_GAME':
      return action.state

    case 'SELECT_CITY':
      return selectCity(state, action.cityId)

    case 'CONFIRM_CAPITAL':
      return confirmCapital(state)

    case 'SET_ACTION_MODE':
      return setActionMode(state, action.mode)

    case 'CLEAR_ACTION_SELECTION':
      return clearActionPlan({
        ...state,
        selectedCityId: null,
        statusMessage: 'Seçim temizlendi.',
      })

    case 'SET_ACTION_AMOUNT':
      return {
        ...state,
        actionAmount: clampActionAmount(state, action.amount),
      }

    case 'CONFIRM_ACTION':
      return confirmAction(state)

    case 'BUILD_ARMY':
      return buildArmy(state, action.cityId)

    case 'BUILD_FORT':
      return buildFort(state, action.cityId)

    case 'END_TURN':
      return endTurn(state)

    default:
      return state
  }
}
