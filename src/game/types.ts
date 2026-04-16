export type PlayerId = 'P1' | 'P2'

export type GameStage = 'HOME' | 'SETUP' | 'CAPITAL_SELECTION' | 'PLAYING' | 'GAME_OVER'

export type ActionMode = 'ANNEX' | 'TRANSFER' | 'ATTACK'

export type EventTone = 'info' | 'success' | 'warning' | 'danger'

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
}

export interface PlayerState {
  id: PlayerId
  treasury: number
  lastCollectedTax: number
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
