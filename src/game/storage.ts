import { createInitialGameState, DEFAULT_PLAYER_NAMES } from './state'
import type { GameState } from './types'

const STORAGE_KEY = 'anadolu-stratejisi-save-v6'

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

    return parsed as GameState
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
