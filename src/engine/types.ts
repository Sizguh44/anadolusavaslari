export type PlayerId = 'P1' | 'P2'

export type Phase = 'COMMAND' | 'INCOME_UPKEEP' | 'BUILD_REINFORCE' | 'MOVE' | 'COMBAT_OPS'

export type Screen = 'HOME' | 'GAME'

export type Overlay = 'NONE' | 'RULES' | 'SETTINGS'

export type GameStage = 'HOME' | 'CAPITAL_SELECTION' | 'PLAYING' | 'GAME_OVER'

export type GameMode = 'HOTSEAT' | 'SINGLE_PLAYER'

export type CitySpecialty =
  | 'GOLD'
  | 'IRON'
  | 'ENERGY'
  | 'FOOD'
  | 'RESEARCH'
  | 'POPULATION'

export type ArmedActionType = 'MOVE' | 'ATTACK' | 'MILITIA_RAID' | 'SABOTAGE' | 'OCCUPY'

export type CoinSide = 'HEADS' | 'TAILS'

export type VictoryReason = 'CAPITAL_VICTORY' | 'DOMINATION_VICTORY' | 'ECONOMIC_COLLAPSE' | 'MILITARY_COLLAPSE'

export interface Resources {
  gold: number
  iron: number
  energy: number
  food: number
  research: number
  population: number
}

export interface CaptureState {
  cpRemaining: number
  underSiegeBy: PlayerId | null
}

export interface ArmyStack {
  size: number
  actedThisTurn: boolean
}

export interface TurnBoundEffect {
  activeForPlayer: PlayerId
  activeOnTurn: number
}

export interface CityState {
  id: string
  name: string
  neighbors: string[]
  owner: PlayerId | null
  isCapital: boolean
  army: number
  stacks: ArmyStack[]
  armyCap: number
  fortLevel: number
  specialty: CitySpecialty
  baseTax: number
  baseFood: number
  basePopulation: number
  supplyConnected: boolean
  captureState: CaptureState
  unrest: number
  sabotage: TurnBoundEffect | null
  emergencySupport: TurnBoundEffect | null
}

export interface PlayerState {
  id: PlayerId
  resources: Resources
  crisisStreak: number
  freeReinforcementUsed: boolean
  paidReinforcementsUsed: number
  militiaRaidUsed: boolean
}

export interface GameEvent {
  id: number
  turn: number
  round: number
  phase: Phase | 'CAPITAL_SELECTION' | 'SYSTEM'
  actor: PlayerId | 'SYSTEM'
  type: string
  message: string
}

export interface IncomeEntry {
  cityId: string
  cityName: string
  gold: number
  iron: number
  energy: number
  food: number
  research: number
  population: number
  unrestSuppressed: boolean
  supplySuppressed: boolean
  sabotageSuppressed: boolean
}

export interface UpkeepSummary {
  armyGold: number
  armyFood: number
  fortGold: number
  totalGold: number
  totalFood: number
}

export interface TurnSummary {
  incomeEntries: IncomeEntry[]
  incomeTotal: Resources
  upkeep: UpkeepSummary
  crisisTriggered: boolean
  crisisCityId: string | null
  unrestCityId: string | null
}

export interface CombatReport {
  kind: 'NONE' | 'ACTION' | 'MOVE' | 'OCCUPY' | 'ARMY_ATTACK' | 'MILITIA_RAID'
  attacker: PlayerId | null
  fromCityId: string | null
  targetCityId: string | null
  attackPower: number
  defensePower: number
  supportBonus: number
  energyCost: number
  attackerLosses: number
  defenderLosses: number
  attackerSurvivors: number
  defenderSurvivors: number
  captured: boolean
  capitalHit: boolean
  capitalHitsRemaining: number | null
  wallsBefore: number
  wallsBroken: number
  wallsAfter: number
  stationedArmy: number
  returnedArmy: number
  coinChoice: CoinSide | null
  coinResult: CoinSide | null
  message: string
}

export interface PendingCoinFlip {
  type: 'MILITIA_RAID'
  player: PlayerId
  sourceCityId: string
  targetCityId: string
}

export interface ArmedAction {
  type: ArmedActionType
  sourceCityId: string
  targetCityId: string | null
  amount: number
}

export interface CaptureAllocationState {
  sourceCityId: string
  targetCityId: string
  survivingArmy: number
  stationedArmy: number
}

export interface InteractionState {
  selectedCityId: string | null
  armedAction: ArmedAction | null
  pendingCoinFlip: PendingCoinFlip | null
  pendingCaptureAllocation: CaptureAllocationState | null
}

export interface ValidationResult {
  ok: boolean
  reason?: string
}

export interface AttackPreview {
  energyCost: number
  attackPower: number
  defensePower: number
  supportBonus: number
  fortBonus: number
  capitalBonus: number
  supplyBonus: number
  wouldCapture: boolean
  wallsBefore: number
  wallsBroken: number
  wallsAfter: number
  attackerSurvivors: number
  defenderSurvivors: number
  attackerLosses: number
  defenderLosses: number
  outcomeCode:
    | 'OVERWHELMING_CAPTURE'
    | 'NARROW_CAPTURE'
    | 'STALEMATE'
    | 'FAILED_ASSAULT'
}

export interface GameState {
  version: number
  screen: Screen
  overlay: Overlay
  stage: GameStage
  gameMode: GameMode
  currentPlayer: PlayerId
  round: number
  turn: number
  phase: Phase
  setupCapitalPlayer: PlayerId
  winner: PlayerId | null
  victoryReason: VictoryReason | null
  warWeariness: number
  stagnationRounds: number
  capturesThisRound: number
  neutralCaptureUsed: boolean
  statusMessage: string
  players: Record<PlayerId, PlayerState>
  cities: Record<string, CityState>
  events: GameEvent[]
  nextEventId: number
  interaction: InteractionState
  turnSummary: TurnSummary | null
  lastCombat: CombatReport | null
}
