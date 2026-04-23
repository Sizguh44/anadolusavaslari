import { CITY_DEFINITIONS, getCityBaseTaxByName } from '../data/cityDefinitions'
import {
  CARD_CATALOG,
  CARD_PRICES,
  createEmptyCardInventory,
  distributeUnitsToFriendlyNeighbors,
  ESPIONAGE_LOCK_RATIO,
  ESPIONAGE_TURN_OFFSET,
  getAttackableReadyArmy,
  getEffectiveEspionageLock,
  getFriendlyNeighborIds,
  hasActiveEspionage,
  KUNDAKLAMA_STAYED_RATIO,
  roundDown,
  YATIRIM_MAX_PER_PLAYER,
  YATIRIM_TAX_MULTIPLIER,
  type CardType,
} from './cards'
import type { ActionMode, AttackPreview, CityState, EventTone, GameAction, GameState, PlayerId } from './types'

export const GAME_STATE_VERSION = 3
export const STARTING_CAPITAL_ARMY = 6
export const STARTING_CAPITAL_FORT = 1
export const CAPITAL_BASE_TAX = 200
export const NEUTRAL_CAPTURE_GARRISON = 1
export const CITY_ARMY_LIMIT = 50
export const CITY_FORT_LIMIT = 10
export const STARTING_TREASURY = 2000
export const ARMY_COST = 1000
export const FORT_COST = 1000
export const CAPITAL_DEFENSE_BONUS = 1
export const WALL_ARMY_EQUIVALENT = 2

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
      espionageLock: null,
      investmentApplied: false,
    }
    return accumulator
  }, {})
}

function createPlayer(id: PlayerId): GameState['players'][PlayerId] {
  return {
    id,
    treasury: STARTING_TREASURY,
    lastCollectedTax: 0,
    cards: createEmptyCardInventory(),
    investedCityIds: [],
    kudretUsedThisTurn: false,
    bonusAttacksRemaining: 0,
  }
}

function createPlayers(): GameState['players'] {
  return {
    P1: createPlayer('P1'),
    P2: createPlayer('P2'),
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
    pendingCardUse: null,
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

function createEvent(
  state: GameState,
  tone: EventTone,
  message: string,
  actor: GameState['events'][number]['actor'] = state.stage === 'PLAYING' || state.stage === 'CAPITAL_SELECTION'
    ? state.currentPlayer
    : 'SYSTEM',
): GameState {
  return {
    ...state,
    events: [
      {
        id: state.nextEventId,
        turn: state.turn,
        round: getRoundNumber(state.turn),
        tone,
        message,
        actor,
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

export function getCityTaxIncome(city: CityState): number {
  return city.investmentApplied ? city.baseTax * YATIRIM_TAX_MULTIPLIER : city.baseTax
}

export function getPlayerIncome(state: GameState, playerId: PlayerId): number {
  return getPlayerCities(state, playerId).reduce((total, city) => total + getCityTaxIncome(city), 0)
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

/** Süresi dolmuş casus kilitlerini temizler. Tur başında çağrılır. */
function clearExpiredEspionageLocks(cities: GameState['cities'], currentTurn: number): GameState['cities'] {
  let changed = false
  const next: GameState['cities'] = {}
  for (const [id, city] of Object.entries(cities)) {
    if (city.espionageLock && city.espionageLock.expiresAtTurn <= currentTurn) {
      next[id] = { ...city, espionageLock: null }
      changed = true
    } else {
      next[id] = city
    }
  }
  return changed ? next : cities
}

function startTurn(state: GameState, playerId: PlayerId, turn: number): GameState {
  const round = getRoundNumber(turn)
  const withLocksCleared = clearExpiredEspionageLocks(state.cities, turn)
  const cities = refreshPlayerArmyReadiness({ ...state, cities: withLocksCleared }, playerId)
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
      // Tur bazlı kart sayaçları sıfırlanır.
      kudretUsedThisTurn: false,
      bonusAttacksRemaining: 0,
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
    pendingCardUse: null,
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
          baseTax: CAPITAL_BASE_TAX,
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
        // Casus kilidinden sonra kalan etkili hazır birlik > 1 olmalı (garnizon + saldırı birliği).
        getAttackableReadyArmy(city, state.turn) > 1 &&
        city.neighbors.some((neighborId) => {
          const neighbor = state.cities[neighborId]
          return Boolean(neighbor && neighbor.owner && neighbor.owner !== playerId)
        }),
    )
    .map((city) => city.id)
}

/** Oyuncunun şu an bir saldırı yapma hakkı var mı (ana hamle veya Kudret bonusu). */
export function hasAttackOpportunity(state: GameState, playerId: PlayerId = state.currentPlayer): boolean {
  if (!state.conquestUsed) return true
  return state.players[playerId].bonusAttacksRemaining > 0
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

  if (!source || source.owner !== state.currentPlayer || getAttackableReadyArmy(source, state.turn) <= 0) {
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
  return hasAttackOpportunity(state) && getAttackSourceIds(state).length > 0
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
    // Garnizon kuralı: kaynak şehirde en az 1 birlik kalmalı.
    // Casus kilidi aktifse, kilitli birlikler saldırıya katılamaz.
    return Math.max(0, getAttackableReadyArmy(source, state.turn) - 1)
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

  const wallDefense = target.fortLevel * WALL_ARMY_EQUIVALENT
  const capitalBonus = getCapitalDefenseBonus(target)
  const defensePower = target.army + wallDefense + capitalBonus
  const willCapture = attackAmount > defensePower
  const survivors = Math.max(0, attackAmount - defensePower)
  const fortBroken = willCapture
    ? target.fortLevel
    : Math.min(target.fortLevel, Math.floor(attackAmount / 2))
  const fortAfter = target.fortLevel - fortBroken

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
    willCapture,
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

  if (!hasAttackOpportunity(state)) {
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

/**
 * Saldırı hakkını tüketir. Ana hamle hala kullanılabiliyorsa onu; aksi halde
 * Kudret bonus sayacından bir tane düşer.
 */
function consumeAttackOpportunity(state: GameState): {
  conquestUsed: boolean
  players: GameState['players']
} {
  if (!state.conquestUsed) {
    return { conquestUsed: true, players: state.players }
  }

  const current = state.players[state.currentPlayer]
  const bonus = Math.max(0, current.bonusAttacksRemaining - 1)
  return {
    conquestUsed: true,
    players: {
      ...state.players,
      [state.currentPlayer]: {
        ...current,
        bonusAttacksRemaining: bonus,
      },
    },
  }
}

function confirmAttack(state: GameState): GameState {
  if (!hasAttackOpportunity(state)) {
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
  const consumption = consumeAttackOpportunity(state)

  if (preview.willCapture) {
    const nextTarget = setCityFort(
      setCityArmy(
        {
          ...target,
          owner: state.currentPlayer,
          isCapital: false,
          fortLevel: 0,
          espionageLock: null,
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
      conquestUsed: consumption.conquestUsed,
      players: consumption.players,
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
      conquestUsed: consumption.conquestUsed,
      players: consumption.players,
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

// ─── Kart aksiyonları ────────────────────────────────────────────────────────

function setPlayer(state: GameState, playerId: PlayerId, patch: Partial<GameState['players'][PlayerId]>): GameState {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        ...patch,
      },
    },
  }
}

function decrementCardCount(state: GameState, playerId: PlayerId, cardType: CardType): GameState {
  const player = state.players[playerId]
  const current = player.cards[cardType] ?? 0
  const nextInventory = { ...player.cards, [cardType]: Math.max(0, current - 1) }
  return setPlayer(state, playerId, { cards: nextInventory })
}

function buyCard(state: GameState, cardType: CardType): GameState {
  if (state.stage !== 'PLAYING') return state

  const price = CARD_PRICES[cardType]
  const player = state.players[state.currentPlayer]

  if (player.treasury < price) {
    return withStatus(state, 'Kart almak için kasa yetersiz.', 'warning')
  }

  const definition = CARD_CATALOG[cardType]
  const nextInventory = { ...player.cards, [cardType]: (player.cards[cardType] ?? 0) + 1 }
  const nextState = setPlayer(state, state.currentPlayer, {
    cards: nextInventory,
    treasury: player.treasury - price,
  })
  const message = `${PLAYER_META[state.currentPlayer].shortLabel} oyuncu ${definition.name} kartı satın aldı. (${price} altın)`

  return createEvent({ ...nextState, statusMessage: message }, 'info', message)
}

function beginCardUse(state: GameState, cardType: CardType): GameState {
  if (state.stage !== 'PLAYING') return state

  const player = state.players[state.currentPlayer]
  if ((player.cards[cardType] ?? 0) <= 0) {
    return withStatus(state, `Envanterinizde ${CARD_CATALOG[cardType].name} kartı yok.`, 'warning')
  }

  // Tur bazlı kullanım kısıtı: Kudret bu tur kullanılmış olmamalı.
  if (cardType === 'KUDRET' && player.kudretUsedThisTurn) {
    return withStatus(state, 'Kudret kartı aynı tur içinde yalnızca bir kez kullanılabilir.', 'warning')
  }

  return {
    ...state,
    pendingCardUse: { type: cardType },
    statusMessage: getPendingCardPrompt(cardType),
  }
}

function cancelCardUse(state: GameState): GameState {
  if (!state.pendingCardUse) return state
  return { ...state, pendingCardUse: null, statusMessage: 'Kart kullanımı iptal edildi.' }
}

function getPendingCardPrompt(cardType: CardType): string {
  const definition = CARD_CATALOG[cardType]
  if (definition.targetKind === 'NONE') {
    return `${definition.name} kartı kullanılıyor…`
  }
  if (definition.targetKind === 'SELF_CITY') {
    return `${definition.name} için kendi şehirlerinizden birine tıklayın.`
  }
  return `${definition.name} için rakip şehre tıklayın.`
}

// ── CASUS ────────────────────────────────────────────────────────────────────
function applyCasus(state: GameState, targetCityId: string): GameState {
  const player = state.players[state.currentPlayer]
  if ((player.cards.CASUS ?? 0) <= 0) {
    return withStatus(state, 'Envanterinizde Casus kartı yok.', 'warning')
  }

  const target = state.cities[targetCityId]
  if (!target) {
    return withStatus(state, 'Hedef şehir bulunamadı.', 'warning')
  }

  if (!target.owner || target.owner === state.currentPlayer) {
    return withStatus(state, 'Casus kartı yalnızca rakip şehirlere uygulanabilir.', 'warning')
  }

  if (hasActiveEspionage(target, state.turn)) {
    return withStatus(state, `${target.name} üzerinde zaten aktif bir casus etkisi var.`, 'warning')
  }

  const lockedCount = roundDown(target.army * ESPIONAGE_LOCK_RATIO)
  if (lockedCount <= 0) {
    return withStatus(state, `${target.name} şehrinde casusun etkileyebileceği birlik yok.`, 'warning')
  }

  const nextCity: CityState = {
    ...target,
    espionageLock: {
      lockedCount,
      expiresAtTurn: state.turn + ESPIONAGE_TURN_OFFSET,
      casterId: state.currentPlayer,
    },
  }

  const afterInventory = decrementCardCount(state, state.currentPlayer, 'CASUS')
  const nextState: GameState = {
    ...afterInventory,
    cities: { ...afterInventory.cities, [targetCityId]: nextCity },
    pendingCardUse: null,
    selectedCityId: targetCityId,
  }

  const message = `Casus kartı kullanıldı: ${target.name} şehrinde ${lockedCount} birlik 1 tur boyunca saldırıya kapandı (savunmaya devam eder).`
  return createEvent({ ...nextState, statusMessage: message }, 'warning', message)
}

// ── KUNDAKLAMA ───────────────────────────────────────────────────────────────
function applyKundaklama(state: GameState, targetCityId: string): GameState {
  const player = state.players[state.currentPlayer]
  if ((player.cards.KUNDAKLAMA ?? 0) <= 0) {
    return withStatus(state, 'Envanterinizde Kundaklama kartı yok.', 'warning')
  }

  const target = state.cities[targetCityId]
  if (!target) {
    return withStatus(state, 'Hedef şehir bulunamadı.', 'warning')
  }

  if (!target.owner || target.owner === state.currentPlayer) {
    return withStatus(state, 'Kundaklama yalnızca rakip şehirlere uygulanabilir.', 'warning')
  }

  const targetOwner = target.owner
  const friendlyNeighbors = getFriendlyNeighborIds(target, targetOwner, state.cities)

  if (friendlyNeighbors.length === 0) {
    return withStatus(
      state,
      `${target.name} şehrinin dağılacağı dost komşu yok; Kundaklama kullanılamaz.`,
      'warning',
    )
  }

  const stayedInCity = roundDown(target.army * KUNDAKLAMA_STAYED_RATIO)
  const toDistribute = target.army - stayedInCity

  const { distribution, overflow } = distributeUnitsToFriendlyNeighbors(
    toDistribute,
    friendlyNeighbors,
    state.cities,
    CITY_ARMY_LIMIT,
  )

  const nextFort = Math.max(0, target.fortLevel - 1)
  const nextTargetArmy = stayedInCity + overflow // Komşular dolarsa geri kaynak şehre döner — toplam birlik korunur.
  const nextTarget: CityState = setCityFort(
    setCityArmy(target, nextTargetArmy, Math.min(target.readyArmy, nextTargetArmy)),
    nextFort,
  )

  const nextCities: Record<string, CityState> = { ...state.cities, [targetCityId]: nextTarget }
  const distributedEntries: Array<{ name: string; count: number }> = []

  for (const [neighborId, count] of Object.entries(distribution)) {
    if (count <= 0) continue
    const neighbor = state.cities[neighborId]
    if (!neighbor) continue
    const updated = setCityArmy(neighbor, neighbor.army + count, neighbor.readyArmy) // Gelen birlikler bu tur yorulmuş gibi.
    nextCities[neighborId] = updated
    distributedEntries.push({ name: neighbor.name, count })
  }

  const afterInventory = decrementCardCount(state, state.currentPlayer, 'KUNDAKLAMA')

  const distributionText =
    distributedEntries.length > 0
      ? distributedEntries.map((entry) => `${entry.name} (+${entry.count})`).join(', ')
      : 'hiçbir komşuya yerleşmedi'
  const overflowNote = overflow > 0 ? `, ${overflow} birlik komşu kapasitesi dolduğu için şehirde kaldı` : ''

  const nextState: GameState = {
    ...afterInventory,
    cities: nextCities,
    pendingCardUse: null,
    selectedCityId: targetCityId,
  }

  const message = `Kundaklama: ${target.name} şehrinde ${nextTargetArmy} birlik kaldı, ${toDistribute - overflow} birlik ${distributionText} olarak dağıldı${overflowNote}. Sur ${target.fortLevel} → ${nextFort}.`

  return createEvent({ ...nextState, statusMessage: message }, 'danger', message)
}

// ── KUDRET ───────────────────────────────────────────────────────────────────
function applyKudret(state: GameState): GameState {
  const player = state.players[state.currentPlayer]
  if ((player.cards.KUDRET ?? 0) <= 0) {
    return withStatus(state, 'Envanterinizde Kudret kartı yok.', 'warning')
  }

  if (player.kudretUsedThisTurn) {
    return withStatus(state, 'Kudret kartı aynı tur içinde yalnızca bir kez kullanılabilir.', 'warning')
  }

  const afterInventory = decrementCardCount(state, state.currentPlayer, 'KUDRET')
  const nextState = setPlayer(afterInventory, state.currentPlayer, {
    bonusAttacksRemaining: afterInventory.players[state.currentPlayer].bonusAttacksRemaining + 1,
    kudretUsedThisTurn: true,
  })

  const message = `Kudret kartı kullanıldı: ${PLAYER_META[state.currentPlayer].shortLabel} oyuncu bu tur +1 saldırı hakkı kazandı.`
  return createEvent(
    { ...nextState, pendingCardUse: null, statusMessage: message },
    'success',
    message,
  )
}

// ── YATIRIM ──────────────────────────────────────────────────────────────────
function applyYatirim(state: GameState, targetCityId: string): GameState {
  const player = state.players[state.currentPlayer]
  if ((player.cards.YATIRIM ?? 0) <= 0) {
    return withStatus(state, 'Envanterinizde Yatırım kartı yok.', 'warning')
  }

  if (player.investedCityIds.length >= YATIRIM_MAX_PER_PLAYER) {
    return withStatus(
      state,
      `Oyun boyunca en fazla ${YATIRIM_MAX_PER_PLAYER} şehirde Yatırım kartı kullanabilirsiniz.`,
      'warning',
    )
  }

  const target = state.cities[targetCityId]
  if (!target) {
    return withStatus(state, 'Hedef şehir bulunamadı.', 'warning')
  }

  if (target.owner !== state.currentPlayer) {
    return withStatus(state, 'Yatırım yalnızca kendi şehirlerinizde yapılabilir.', 'warning')
  }

  if (target.isCapital) {
    return withStatus(state, `${target.name} başkent olduğu için Yatırım kartı kullanılamaz.`, 'warning')
  }

  if (target.investmentApplied) {
    return withStatus(state, `${target.name} şehrine zaten Yatırım uygulanmış.`, 'warning')
  }

  const nextCity: CityState = { ...target, investmentApplied: true }
  const afterInventory = decrementCardCount(state, state.currentPlayer, 'YATIRIM')
  const nextState = setPlayer(afterInventory, state.currentPlayer, {
    investedCityIds: [...afterInventory.players[state.currentPlayer].investedCityIds, targetCityId],
  })

  const message = `${target.name} şehrine yatırım yapıldı. Vergi geliri kalıcı olarak ${YATIRIM_TAX_MULTIPLIER} katına çıktı.`

  return createEvent(
    {
      ...nextState,
      cities: { ...nextState.cities, [targetCityId]: nextCity },
      pendingCardUse: null,
      selectedCityId: targetCityId,
      statusMessage: message,
    },
    'success',
    message,
  )
}

function applyCardOnCity(state: GameState, cardType: CardType, cityId: string): GameState {
  if (state.stage !== 'PLAYING') return state

  switch (cardType) {
    case 'CASUS':
      return applyCasus(state, cityId)
    case 'KUNDAKLAMA':
      return applyKundaklama(state, cityId)
    case 'YATIRIM':
      return applyYatirim(state, cityId)
    case 'KUDRET':
      return withStatus(state, 'Kudret kartı hedef gerektirmez.', 'warning')
    default:
      return state
  }
}

function applyCardOnSelf(state: GameState, cardType: CardType): GameState {
  if (state.stage !== 'PLAYING') return state

  if (cardType === 'KUDRET') return applyKudret(state)

  return withStatus(state, 'Bu kart hedef seçimi gerektirir.', 'warning')
}

// ─── Kart yardımcıları: yatırım ekran bilgisi ────────────────────────────────
export function getPlayerInvestmentCount(state: GameState, playerId: PlayerId): number {
  return state.players[playerId].investedCityIds.length
}

export function isCityInvested(state: GameState, cityId: string): boolean {
  return Boolean(state.cities[cityId]?.investmentApplied)
}

export function getCityEspionageLock(state: GameState, cityId: string): number {
  const city = state.cities[cityId]
  return city ? getEffectiveEspionageLock(city, state.turn) : 0
}

export { getEffectiveEspionageLock, getAttackableReadyArmy, hasActiveEspionage, CARD_CATALOG, CARD_PRICES }

/**
 * Bekleyen kart kullanımı için geçerli hedef şehir id'lerini döner.
 * Saf selector — reducer'ı etkilemez. UI harita işaretlemesi için tüketir.
 */
export function getCardTargetIds(state: GameState, cardType: CardType): string[] {
  const currentPlayer = state.currentPlayer

  if (cardType === 'CASUS') {
    return Object.values(state.cities)
      .filter(
        (city) =>
          city.owner &&
          city.owner !== currentPlayer &&
          !hasActiveEspionage(city, state.turn) &&
          Math.floor(city.army * (1 / 3)) > 0,
      )
      .map((city) => city.id)
  }

  if (cardType === 'KUNDAKLAMA') {
    return Object.values(state.cities)
      .filter(
        (city) =>
          city.owner &&
          city.owner !== currentPlayer &&
          city.neighbors.some((neighborId) => state.cities[neighborId]?.owner === city.owner),
      )
      .map((city) => city.id)
  }

  if (cardType === 'YATIRIM') {
    return Object.values(state.cities)
      .filter(
        (city) =>
          city.owner === currentPlayer &&
          !city.isCapital &&
          !city.investmentApplied,
      )
      .map((city) => city.id)
  }

  // KUDRET hedef gerektirmez.
  return []
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

    case 'BUY_CARD':
      return buyCard(state, action.cardType)

    case 'BEGIN_CARD_USE':
      return beginCardUse(state, action.cardType)

    case 'CANCEL_CARD_USE':
      return cancelCardUse(state)

    case 'USE_CARD_SELF':
      return applyCardOnSelf(state, action.cardType)

    case 'USE_CARD_ON_CITY':
      return applyCardOnCity(state, action.cardType, action.cityId)

    default:
      return state
  }
}
