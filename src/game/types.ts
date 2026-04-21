import type { CardType } from './cards'

export type PlayerId = 'P1' | 'P2'

export type GameStage = 'HOME' | 'SETUP' | 'CAPITAL_SELECTION' | 'PLAYING' | 'GAME_OVER'

export type ActionMode = 'ANNEX' | 'TRANSFER' | 'ATTACK'

export type EventTone = 'info' | 'success' | 'warning' | 'danger'

/**
 * Casus kartının hedef şehre uyguladığı kilit. `lockedCount` cast anında
 * dondurulur; ancak şehir birlik kaybederse kilit canlı hesapta şehir
 * ordusuyla sınırlanır (bkz. `getEffectiveEspionageLock`).
 */
export interface EspionageLock {
  lockedCount: number
  expiresAtTurn: number
  casterId: PlayerId
}

export interface CityState {
  id: string
  name: string
  neighbors: string[]
  owner: PlayerId | null
  isCapital: boolean
  army: number
  readyArmy: number
  fortLevel: number
  baseTax: number
  /** Şehirde aktif casus kilidi. Süresi dolanlar tur başında otomatik silinir. */
  espionageLock?: EspionageLock | null
  /** Yatırım kartı ile kalıcı 2x vergi etkisi uygulandı mı. Şehir el değiştirse de kalır. */
  investmentApplied?: boolean
}

export interface PlayerState {
  id: PlayerId
  treasury: number
  lastCollectedTax: number
  /** Envanterdeki kartlar. */
  cards: Record<CardType, number>
  /** Oyuncunun yatırım yaptığı şehir id'leri. Oyun boyunca en fazla 5. */
  investedCityIds: string[]
  /** Bu tur Kudret kartı kullanıldı mı. Aynı tur ikinci kez kullanılamaz. */
  kudretUsedThisTurn: boolean
  /** Bu tur için ek saldırı hakkı sayısı (Kudret kartlarından). Tur başında sıfırlanır. */
  bonusAttacksRemaining: number
}

export interface GameEvent {
  id: number
  turn: number
  round: number
  tone: EventTone
  message: string
}

export interface AttackPreview {
  attackAmount: number
  sourceArmy: number
  readyArmy: number
  defenderArmy: number
  fortBefore: number
  fortBroken: number
  fortAfter: number
  capitalBonus: number
  defensePower: number
  survivors: number
  willCapture: boolean
}

export interface VictorySummary {
  cityId: string
  cityName: string
  attackingCityName: string
  attackAmount: number
  survivors: number
}

export interface GameState {
  version: number
  stage: GameStage
  currentPlayer: PlayerId
  capitalSelectionPlayer: PlayerId
  turn: number
  selectedCityId: string | null
  actionMode: ActionMode | null
  actionSourceCityId: string | null
  actionTargetCityId: string | null
  actionAmount: number
  conquestUsed: boolean
  statusMessage: string
  winner: PlayerId | null
  victorySummary: VictorySummary | null
  cities: Record<string, CityState>
  players: Record<PlayerId, PlayerState>
  playerNames: Record<PlayerId, string>
  events: GameEvent[]
  nextEventId: number
  /**
   * Hedef seçimi gerektiren bir kart kullanılmaya başlatıldıysa, bu alan doludur.
   * Harita üzerinde bir sonraki şehir tıklaması bu karta hedef olur.
   */
  pendingCardUse: { type: CardType } | null
}

export type GameAction =
  | { type: 'START_NEW_GAME' }
  | { type: 'RETURN_HOME' }
  | { type: 'START_SETUP' }
  | { type: 'SET_PLAYER_NAMES'; names: Record<PlayerId, string> }
  | { type: 'SELECT_CITY'; cityId: string }
  | { type: 'CONFIRM_CAPITAL' }
  | { type: 'SET_ACTION_MODE'; mode: ActionMode }
  | { type: 'CLEAR_ACTION_SELECTION' }
  | { type: 'SET_ACTION_AMOUNT'; amount: number }
  | { type: 'CONFIRM_ACTION' }
  | { type: 'BUILD_ARMY'; cityId?: string }
  | { type: 'BUILD_FORT'; cityId?: string }
  | { type: 'END_TURN' }
  | { type: 'LOAD_SAVED_GAME'; state: GameState }
  | { type: 'BUY_CARD'; cardType: CardType }
  | { type: 'BEGIN_CARD_USE'; cardType: CardType }
  | { type: 'CANCEL_CARD_USE' }
  | { type: 'USE_CARD_SELF'; cardType: CardType }
  | { type: 'USE_CARD_ON_CITY'; cardType: CardType; cityId: string }
