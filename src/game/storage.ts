import { createEmptyCardInventory } from './cards'
import { createInitialGameState, DEFAULT_PLAYER_NAMES, GAME_STATE_VERSION } from './state'
import type { GameState, PlayerId, PlayerState } from './types'

const STORAGE_KEY = 'anadolu-stratejisi-save-v7'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPlayerId(value: unknown): value is 'P1' | 'P2' {
  return value === 'P1' || value === 'P2'
}

function isGameState(value: unknown): value is GameState {
  if (!isRecord(value)) {
    return false
  }

  if (!['HOME', 'SETUP', 'CAPITAL_SELECTION', 'PLAYING', 'GAME_OVER'].includes(String(value.stage))) {
    return false
  }

  if (!isPlayerId(value.currentPlayer) || !isPlayerId(value.capitalSelectionPlayer)) {
    return false
  }

  if (!isRecord(value.players) || !isRecord(value.cities)) {
    return false
  }

  return (
    typeof value.version === 'number' &&
    typeof value.turn === 'number' &&
    typeof value.conquestUsed === 'boolean' &&
    typeof value.actionAmount === 'number'
  )
}

function ensurePlayerState(raw: unknown, id: PlayerId): PlayerState {
  const base: PlayerState = {
    id,
    treasury: 0,
    lastCollectedTax: 0,
    cards: createEmptyCardInventory(),
    investedCityIds: [],
    kudretUsedThisTurn: false,
    bonusAttacksRemaining: 0,
  }
  if (!isRecord(raw)) return base

  return {
    ...base,
    ...(raw as Partial<PlayerState>),
    id,
    cards: {
      ...createEmptyCardInventory(),
      ...(isRecord((raw as { cards?: unknown }).cards) ? ((raw as { cards: Record<string, number> }).cards) : {}),
    },
    investedCityIds: Array.isArray((raw as { investedCityIds?: unknown }).investedCityIds)
      ? ((raw as { investedCityIds: string[] }).investedCityIds)
      : [],
    kudretUsedThisTurn: Boolean((raw as { kudretUsedThisTurn?: unknown }).kudretUsedThisTurn),
    bonusAttacksRemaining: Number((raw as { bonusAttacksRemaining?: unknown }).bonusAttacksRemaining ?? 0) || 0,
  }
}

/**
 * Eski save'leri yeni kart alanlarıyla uyumlu hâle getirir. Eksik alanları
 * varsayılanlarla doldurur. Versiyon uyumsuz ise temiz başlangıç verilir.
 */
function migrateSave(parsed: GameState): GameState {
  if (typeof parsed.version !== 'number' || parsed.version < 2) {
    // Çok eski save — temiz başlat.
    return createInitialGameState()
  }

  const players = parsed.players as unknown as Record<string, unknown>
  const nextPlayers = {
    P1: ensurePlayerState(players.P1, 'P1'),
    P2: ensurePlayerState(players.P2, 'P2'),
  }

  const nextCities: GameState['cities'] = {}
  for (const [cityId, city] of Object.entries(parsed.cities ?? {})) {
    nextCities[cityId] = {
      ...city,
      espionageLock: city.espionageLock ?? null,
      investmentApplied: Boolean(city.investmentApplied),
    }
  }

  const nextEvents = Array.isArray(parsed.events)
    ? parsed.events.map((event) => ({
        ...event,
        actor: event.actor ?? 'SYSTEM',
      }))
    : []

  return {
    ...parsed,
    version: GAME_STATE_VERSION,
    cities: nextCities,
    players: nextPlayers,
    pendingCardUse: parsed.pendingCardUse ?? null,
    events: nextEvents,
  }
}

export function loadSavedGame(): GameState {
  if (typeof window === 'undefined') {
    return createInitialGameState()
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return createInitialGameState()
  }

  try {
    const parsed = JSON.parse(raw)

    if (!isGameState(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY)
      return createInitialGameState()
    }

    // Backward compat: older saves may not have playerNames
    if (!isRecord(parsed.playerNames)) {
      parsed.playerNames = { P1: DEFAULT_PLAYER_NAMES.P1, P2: DEFAULT_PLAYER_NAMES.P2 }
    }

    return migrateSave(parsed as GameState)
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return createInitialGameState()
  }
}

export function saveGame(state: GameState): void {
  if (typeof window === 'undefined') {
    return
  }

  if (state.stage === 'HOME') {
    window.localStorage.removeItem(STORAGE_KEY)
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function clearSavedGame(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(STORAGE_KEY)
}
