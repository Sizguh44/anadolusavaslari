/// <reference types="node" />
// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import App from '../App'
import {
  ARMY_COST,
  FORT_COST,
  STARTING_TREASURY,
  createNewGameState,
  gameReducer,
} from '../game/state'
import type { GameAction, GameState } from '../game/types'

function dispatchActions(initialState: GameState, actions: GameAction[]) {
  return actions.reduce((state, action) => gameReducer(state, action), initialState)
}

function completeCapitalSelection() {
  return dispatchActions(createNewGameState(), [
    { type: 'SELECT_CITY', cityId: '06' },
    { type: 'CONFIRM_CAPITAL' },
    { type: 'SELECT_CITY', cityId: '34' },
    { type: 'CONFIRM_CAPITAL' },
  ])
}

function withCity(state: GameState, cityId: string, patch: Partial<GameState['cities'][string]>) {
  return {
    ...state,
    cities: {
      ...state.cities,
      [cityId]: {
        ...state.cities[cityId],
        ...patch,
      },
    },
  }
}

function installMockLocalStorage() {
  const store = new Map<string, string>()

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
      clear: () => {
        store.clear()
      },
    },
  })
}

function getMapFixture() {
  return JSON.parse(readFileSync(`${process.cwd()}/public/maps/tr-cities.geojson`, 'utf8'))
}

function createJsonResponse(payload: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  }
}

async function flushUi() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

async function renderApp() {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse(getMapFixture()) as unknown as Response)

  const container = document.createElement('div')
  document.body.appendChild(container)
  const root: Root = createRoot(container)

  await act(async () => {
    root.render(<App />)
  })

  await flushUi()

  return { container, root }
}

async function clickButtonByText(container: HTMLElement, text: string) {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.includes(text),
  )

  if (!button) {
    throw new Error(`Button not found: ${text}`)
  }

  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  await flushUi()
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  installMockLocalStorage()
})

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
  document.body.innerHTML = ''
})

describe('kurulum ve ekonomi akışı', () => {
  test('iki başkent seçildikten sonra ilk oyuncu vergisini toplar ve hazır birliklerini açar', () => {
    const state = completeCapitalSelection()

    expect(state.stage).toBe('PLAYING')
    expect(state.currentPlayer).toBe('P1')
    expect(state.cities['06'].isCapital).toBe(true)
    expect(state.cities['06'].fortLevel).toBe(1)
    expect(state.cities['06'].army).toBe(6)
    expect(state.cities['06'].readyArmy).toBe(6)
    expect(state.cities['34'].readyArmy).toBe(0)
    expect(state.players.P1.treasury).toBe(STARTING_TREASURY + state.cities['06'].baseTax)
    expect(state.players.P2.treasury).toBe(STARTING_TREASURY)
  })

  test('ordu ve sur inşası altın düşer, yeni birlik hazır sayılmaz', () => {
    let state = completeCapitalSelection()

    state = dispatchActions(state, [
      { type: 'SELECT_CITY', cityId: '06' },
      { type: 'BUILD_ARMY' },
      { type: 'BUILD_FORT' },
    ])

    expect(state.cities['06'].army).toBe(7)
    expect(state.cities['06'].readyArmy).toBe(6)
    expect(state.cities['06'].fortLevel).toBe(2)
    expect(state.players.P1.treasury).toBe(STARTING_TREASURY + state.cities['06'].baseTax - ARMY_COST - FORT_COST)
  })
})

describe('ilhak, intikal ve saldırı', () => {
  test('ilhak ücretsizdir ve aynı tur intikal yapılabilir', () => {
    let state = completeCapitalSelection()

    state = dispatchActions(state, [
      { type: 'SET_ACTION_MODE', mode: 'ANNEX' },
      { type: 'SELECT_CITY', cityId: '06' },
      { type: 'SELECT_CITY', cityId: '71' },
      { type: 'CONFIRM_ACTION' },
    ])

    expect(state.currentPlayer).toBe('P1')
    expect(state.conquestUsed).toBe(true)
    expect(state.cities['71'].owner).toBe('P1')
    expect(state.cities['71'].army).toBe(1)
    expect(state.cities['71'].readyArmy).toBe(0)

    state = dispatchActions(state, [
      { type: 'SET_ACTION_MODE', mode: 'TRANSFER' },
      { type: 'SELECT_CITY', cityId: '06' },
      { type: 'SELECT_CITY', cityId: '71' },
      { type: 'SET_ACTION_AMOUNT', amount: 3 },
      { type: 'CONFIRM_ACTION' },
    ])

    expect(state.cities['06'].army).toBe(3)
    expect(state.cities['06'].readyArmy).toBe(3)
    expect(state.cities['71'].army).toBe(4)
    expect(state.cities['71'].readyArmy).toBe(0)
  })

  test('başarısız saldırı sur kırabilir ama şehri düşürmez', () => {
    let state = completeCapitalSelection()
    state = withCity(state, '41', { owner: 'P1', army: 8, readyArmy: 8, isCapital: false })
    state = withCity(state, '16', { owner: 'P2', army: 5, readyArmy: 0, isCapital: false, fortLevel: 4 })

    state = dispatchActions(state, [
      { type: 'SET_ACTION_MODE', mode: 'ATTACK' },
      { type: 'SELECT_CITY', cityId: '41' },
      { type: 'SELECT_CITY', cityId: '16' },
      { type: 'SET_ACTION_AMOUNT', amount: 6 },
      { type: 'CONFIRM_ACTION' },
    ])

    expect(state.cities['41'].army).toBe(2)
    expect(state.cities['41'].readyArmy).toBe(2)
    expect(state.cities['16'].owner).toBe('P2')
    expect(state.cities['16'].fortLevel).toBe(1)
    expect(state.conquestUsed).toBe(true)
  })

  test('başkent düşerse oyun anında biter ve zafer özeti oluşur', () => {
    let state = completeCapitalSelection()
    state = withCity(state, '41', { owner: 'P1', army: 9, readyArmy: 9, isCapital: false })
    state = withCity(state, '34', { owner: 'P2', army: 3, readyArmy: 0, isCapital: true, fortLevel: 1 })
    state = withCity(state, '41', { neighbors: [...new Set([...state.cities['41'].neighbors, '34'])] })
    state = withCity(state, '34', { neighbors: [...new Set([...state.cities['34'].neighbors, '41'])] })

    state = dispatchActions(state, [
      { type: 'SET_ACTION_MODE', mode: 'ATTACK' },
      { type: 'SELECT_CITY', cityId: '41' },
      { type: 'SELECT_CITY', cityId: '34' },
      { type: 'SET_ACTION_AMOUNT', amount: 8 },
      { type: 'CONFIRM_ACTION' },
    ])

    expect(state.stage).toBe('GAME_OVER')
    expect(state.winner).toBe('P1')
    expect(state.victorySummary?.cityId).toBe('34')
    expect(state.victorySummary?.survivors).toBe(4)
  })
})

describe('arayüz duman testi', () => {
  test('ana akış yüklenir ve tek ekran komuta yüzeyi görünür', async () => {
    const { container } = await renderApp()

    await clickButtonByText(container, 'Yeni savaşı başlat')
    await clickButtonByText(container, 'Savaşı Başlat')

    expect(container.textContent).toContain('Başkent Yap')
    expect(container.textContent).toContain('Temizle')
    expect(container.textContent).toContain('Günlük')
    expect(container.textContent).toContain('Menü')
  })
})
